import express from 'express';
import mongoose from 'mongoose';
import Order from '../models/Order.js';
import { requireAdmin } from '../middleware/auth.js';
import { steadfastConfigured, steadfastRequest, steadfastErrorText } from '../utils/steadfast.js';

const router = express.Router();
router.use(requireAdmin);

const PHONE_RE = /^01[0-9]{9}$/;
const STALE_SENDING_MS = 2 * 60 * 1000; // 'sending' অবস্থায় আটকে থাকলে ২ মিনিট পর আবার চেষ্টা করা যাবে

function checkId(req, res) {
    if (!mongoose.isValidObjectId(req.params.orderId)) {
        res.status(400).json({ error: 'অর্ডারের আইডি সঠিক নয়' });
        return false;
    }
    return true;
}

// POST /api/shipping/steadfast/:orderId — Steadfast-এ পার্সেল বুক
router.post('/steadfast/:orderId', async (req, res) => {
    if (!checkId(req, res)) return;
    if (!steadfastConfigured()) {
        return res.status(503).json({ error: 'Steadfast-এর API কী সেট করা নেই। সার্ভারের Environment-এ STEADFAST_API_KEY ও STEADFAST_SECRET_KEY বসান।' });
    }

    const orderId = req.params.orderId;
    try {
        const order = await Order.findById(orderId).lean();
        if (!order) return res.status(404).json({ error: 'অর্ডার পাওয়া যায়নি' });
        if (order.status === 'cancelled' || order.status === 'delivered' || order.status === 'returned') {
            return res.status(400).json({ error: 'বাতিল, ফেরত বা ডেলিভারড অর্ডার কুরিয়ারে পাঠানো যাবে না' });
        }
        const phone = String(order.phone || '').replace(/\s+/g, '');
        if (!PHONE_RE.test(phone)) {
            return res.status(400).json({ error: 'এই অর্ডারের মোবাইল নম্বর ১১ ডিজিটের (01XXXXXXXXX) নয়, তাই কুরিয়ারে পাঠানো যাবে না' });
        }

        // দুইবার বুক হওয়া ঠেকাতে আগে "দাবি" করা: শুধু তখনই এগোবে যখন কোনো শিপমেন্ট নেই
        // (বা আগের চেষ্টা 'sending'-এ আটকে ২ মিনিটের বেশি পুরনো)
        const claimed = await Order.findOneAndUpdate(
            {
                _id: orderId,
                $or: [
                    { 'shipment.courier': { $exists: false } },
                    { 'shipment.status': 'sending', 'shipment.sentAt': { $lt: new Date(Date.now() - STALE_SENDING_MS) } },
                ],
            },
            { $set: { shipment: { courier: 'steadfast', status: 'sending', sentAt: new Date() } } },
            { new: true },
        );
        if (!claimed) return res.status(409).json({ error: 'এই অর্ডার ইতোমধ্যে কুরিয়ারে পাঠানো হয়েছে বা পাঠানো হচ্ছে' });

        // COD হলে কুরিয়ার মোট টাকা তুলবে; bKash/Nagad হলে ০ (আগেই পরিশোধ ধরা হয়)
        const codAmount = order.paymentMethod === 'cod' ? order.total : 0;
        const payload = {
            invoice: String(order._id), // অনন্য হতে হয় — অর্ডার আইডিই ব্যবহার
            recipient_name: String(order.customerName).slice(0, 100),
            recipient_phone: phone,
            recipient_address: String(order.address).slice(0, 250),
            cod_amount: codAmount,
            item_description: order.items.map((i) => `${i.title} (${i.variantLabel}) x${i.quantity}`).join(', ').slice(0, 200),
        };

        let result;
        try {
            result = await steadfastRequest('/create_order', { method: 'POST', body: payload });
        } catch (err) {
            await Order.updateOne({ _id: orderId, 'shipment.status': 'sending' }, { $unset: { shipment: 1 } });
            const timedOut = err && err.name === 'AbortError';
            return res.status(502).json({ error: timedOut ? 'Steadfast সময়মতো উত্তর দেয়নি, আবার চেষ্টা করুন' : 'Steadfast-এর সাথে যোগাযোগ করা যায়নি' });
        }

        const consignment = result.data && result.data.consignment;
        if (!result.ok || !consignment || !consignment.consignment_id) {
            await Order.updateOne({ _id: orderId, 'shipment.status': 'sending' }, { $unset: { shipment: 1 } });
            return res.status(502).json({ error: `Steadfast: ${steadfastErrorText(result)}` });
        }

        const updated = await Order.findByIdAndUpdate(
            orderId,
            {
                $set: {
                    shipment: {
                        courier: 'steadfast',
                        consignmentId: String(consignment.consignment_id),
                        trackingCode: consignment.tracking_code ? String(consignment.tracking_code) : '',
                        status: consignment.status ? String(consignment.status) : 'in_review',
                        sentAt: new Date(),
                    },
                    // পাঠানো হয়ে গেলে অর্ডার pending থাকলে confirmed করা
                    ...(order.status === 'pending' ? { status: 'confirmed' } : {}),
                },
            },
            { new: true },
        );
        res.json(updated);
    } catch (err) {
        console.error('Steadfast বুকিং ত্রুটি:', err.message);
        res.status(500).json({ error: 'কুরিয়ারে পাঠাতে সমস্যা হয়েছে' });
    }
});

// GET /api/shipping/steadfast/:orderId/status — Steadfast থেকে বর্তমান অবস্থা এনে সেভ
router.get('/steadfast/:orderId/status', async (req, res) => {
    if (!checkId(req, res)) return;
    if (!steadfastConfigured()) return res.status(503).json({ error: 'Steadfast-এর API কী সেট করা নেই' });

    try {
        const order = await Order.findById(req.params.orderId);
        const cid = order && order.shipment && order.shipment.consignmentId;
        if (!cid) return res.status(404).json({ error: 'এই অর্ডারের কোনো Steadfast শিপমেন্ট নেই' });

        let result;
        try {
            result = await steadfastRequest(`/status_by_cid/${encodeURIComponent(cid)}`);
        } catch {
            return res.status(502).json({ error: 'Steadfast-এর সাথে যোগাযোগ করা যায়নি' });
        }
        const status = result.data && result.data.delivery_status;
        if (!result.ok || !status) return res.status(502).json({ error: `Steadfast: ${steadfastErrorText(result)}` });

        order.shipment.status = String(status);
        await order.save();
        res.json(order);
    } catch (err) {
        console.error('Steadfast স্ট্যাটাস ত্রুটি:', err.message);
        res.status(500).json({ error: 'স্ট্যাটাস আনতে সমস্যা হয়েছে' });
    }
});

export default router;
