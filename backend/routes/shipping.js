import express from 'express';
import mongoose from 'mongoose';
import Order from '../models/Order.js';
import { requireAdmin, requireOwner } from '../middleware/auth.js';
import { steadfastConfigured, steadfastRequest, steadfastErrorText } from '../utils/steadfast.js';
import { pathaoConfigured, pathaoRequest, pathaoErrorText } from '../utils/pathao.js';

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
        const cid = order && order.shipment && order.shipment.courier === 'steadfast' && order.shipment.consignmentId;
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

// ---------------- Pathao ----------------

// POST /api/shipping/pathao/:orderId — Pathao-তে পার্সেল বুক
// শহর/জোন/এরিয়া আমরা পাঠাই না; Pathao ঠিকানা দেখে নিজে নির্ধারণ করে।
router.post('/pathao/:orderId', async (req, res) => {
    if (!checkId(req, res)) return;
    if (!pathaoConfigured()) {
        return res.status(503).json({ error: 'Pathao-র তথ্য সেট করা নেই। সার্ভারের Environment-এ PATHAO_CLIENT_ID, PATHAO_CLIENT_SECRET, PATHAO_USERNAME, PATHAO_PASSWORD ও PATHAO_STORE_ID বসান।' });
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
        const address = String(order.address || '').trim();
        if (address.length < 10) {
            return res.status(400).json({ error: 'ঠিকানা অন্তত ১০ অক্ষরের হতে হবে (Pathao-র নিয়ম)। অর্ডারের ঠিকানা সম্পূর্ণ কিনা দেখুন।' });
        }

        // দুইবার বুক হওয়া ঠেকাতে আগে "দাবি" করা
        const claimed = await Order.findOneAndUpdate(
            {
                _id: orderId,
                $or: [
                    { 'shipment.courier': { $exists: false } },
                    { 'shipment.status': 'sending', 'shipment.sentAt': { $lt: new Date(Date.now() - STALE_SENDING_MS) } },
                ],
            },
            { $set: { shipment: { courier: 'pathao', status: 'sending', sentAt: new Date() } } },
            { new: true },
        );
        if (!claimed) return res.status(409).json({ error: 'এই অর্ডার ইতোমধ্যে কুরিয়ারে পাঠানো হয়েছে বা পাঠানো হচ্ছে' });

        const unclaim = () => Order.updateOne({ _id: orderId, 'shipment.status': 'sending' }, { $unset: { shipment: 1 } });

        const payload = {
            store_id: Number(process.env.PATHAO_STORE_ID),
            merchant_order_id: String(order._id),
            recipient_name: String(order.customerName).slice(0, 100),
            recipient_phone: phone,
            recipient_address: address.slice(0, 220),
            delivery_type: 48, // সাধারণ ডেলিভারি
            item_type: 2, // পার্সেল
            item_quantity: Math.max(1, order.items.reduce((sum, i) => sum + (i.quantity || 0), 0)),
            item_weight: 0.5, // কেজি; Pathao-র সর্বনিম্ন
            amount_to_collect: order.paymentMethod === 'cod' ? Math.round(order.total) : 0,
            item_description: order.items.map((i) => `${i.title} (${i.variantLabel}) x${i.quantity}`).join(', ').slice(0, 200),
        };

        let result;
        try {
            result = await pathaoRequest('/aladdin/api/v1/orders', { method: 'POST', body: payload });
        } catch (err) {
            await unclaim();
            const timedOut = err && err.name === 'AbortError';
            return res.status(502).json({ error: timedOut ? 'Pathao সময়মতো উত্তর দেয়নি, আবার চেষ্টা করুন' : (err.message || 'Pathao-র সাথে যোগাযোগ করা যায়নি') });
        }

        const d = result.data && result.data.data;
        if (!result.ok || !d || !d.consignment_id) {
            await unclaim();
            return res.status(502).json({ error: `Pathao: ${pathaoErrorText(result)}` });
        }

        const updated = await Order.findByIdAndUpdate(
            orderId,
            {
                $set: {
                    shipment: {
                        courier: 'pathao',
                        consignmentId: String(d.consignment_id),
                        trackingCode: String(d.consignment_id), // Pathao-তে কনসাইনমেন্ট আইডিই ট্র্যাকিং কোড
                        status: d.order_status ? String(d.order_status) : 'Pending',
                        sentAt: new Date(),
                    },
                    ...(order.status === 'pending' ? { status: 'confirmed' } : {}),
                },
            },
            { new: true },
        );
        res.json(updated);
    } catch (err) {
        console.error('Pathao বুকিং ত্রুটি:', err.message);
        res.status(500).json({ error: 'কুরিয়ারে পাঠাতে সমস্যা হয়েছে' });
    }
});

// GET /api/shipping/pathao/:orderId/status — Pathao থেকে বর্তমান অবস্থা এনে সেভ
router.get('/pathao/:orderId/status', async (req, res) => {
    if (!checkId(req, res)) return;
    if (!pathaoConfigured()) return res.status(503).json({ error: 'Pathao-র তথ্য সেট করা নেই' });

    try {
        const order = await Order.findById(req.params.orderId);
        const cid = order && order.shipment && order.shipment.courier === 'pathao' && order.shipment.consignmentId;
        if (!cid) return res.status(404).json({ error: 'এই অর্ডারের কোনো Pathao শিপমেন্ট নেই' });

        let result;
        try {
            result = await pathaoRequest(`/aladdin/api/v1/orders/${encodeURIComponent(cid)}/info`);
        } catch (err) {
            return res.status(502).json({ error: err.message || 'Pathao-র সাথে যোগাযোগ করা যায়নি' });
        }
        const d = result.data && result.data.data;
        const status = d && d.order_status;
        if (!result.ok || !status) return res.status(502).json({ error: `Pathao: ${pathaoErrorText(result)}` });

        order.shipment.status = String(status);
        await order.save();
        res.json(order);
    } catch (err) {
        console.error('Pathao স্ট্যাটাস ত্রুটি:', err.message);
        res.status(500).json({ error: 'স্ট্যাটাস আনতে সমস্যা হয়েছে' });
    }
});

// ---------- Pathao সেটআপ সহায়ক (শুধু owner) ----------
const hasPathaoLogin = () => Boolean(process.env.PATHAO_CLIENT_ID && process.env.PATHAO_CLIENT_SECRET && process.env.PATHAO_USERNAME && process.env.PATHAO_PASSWORD);
const listOf = (r) => (r && r.data && r.data.data && Array.isArray(r.data.data.data) ? r.data.data.data : []);

// GET /api/shipping/pathao-stores — এই Pathao অ্যাকাউন্টের স্টোর তালিকা (আইডিসহ)
router.get('/pathao-stores', requireOwner, async (req, res) => {
    if (!hasPathaoLogin()) return res.status(503).json({ error: 'আগে Render-এ PATHAO_CLIENT_ID, PATHAO_CLIENT_SECRET, PATHAO_USERNAME, PATHAO_PASSWORD বসান' });
    try {
        const r = await pathaoRequest('/aladdin/api/v1/stores');
        if (!r.ok) return res.status(502).json({ error: `Pathao: ${pathaoErrorText(r)}` });
        res.json({
            baseUrl: process.env.PATHAO_BASE_URL || 'https://api-hermes.pathao.com',
            currentStoreId: process.env.PATHAO_STORE_ID || '',
            stores: listOf(r).map((s) => ({ id: s.store_id, name: s.store_name, address: s.store_address })),
        });
    } catch (err) {
        res.status(502).json({ error: err.message || 'Pathao-র সাথে যোগাযোগ করা যায়নি' });
    }
});

// POST /api/shipping/pathao-stores/test — টেস্ট স্টোর তৈরি (প্রথম শহর/জোন/এরিয়া ধরে)
router.post('/pathao-stores/test', requireOwner, async (req, res) => {
    if (!hasPathaoLogin()) return res.status(503).json({ error: 'আগে Render-এ Pathao-র লগইন তথ্য বসান' });
    try {
        const city = listOf(await pathaoRequest('/aladdin/api/v1/city-list'))[0];
        if (!city) return res.status(502).json({ error: 'Pathao থেকে শহরের তালিকা আসেনি' });
        const zone = listOf(await pathaoRequest(`/aladdin/api/v1/cities/${city.city_id}/zone-list`))[0];
        if (!zone) return res.status(502).json({ error: 'Pathao থেকে জোনের তালিকা আসেনি' });
        const area = listOf(await pathaoRequest(`/aladdin/api/v1/zones/${zone.zone_id}/area-list`))[0];
        if (!area) return res.status(502).json({ error: 'Pathao থেকে এরিয়ার তালিকা আসেনি' });

        const r = await pathaoRequest('/aladdin/api/v1/stores', {
            method: 'POST',
            body: {
                name: 'Test Store',
                contact_name: 'Test Owner',
                contact_number: '01700000000',
                address: 'House 1, Road 1, Test Area, Dhaka 1200',
                city_id: city.city_id,
                zone_id: zone.zone_id,
                area_id: area.area_id,
            },
        });
        if (!r.ok) return res.status(502).json({ error: `Pathao: ${pathaoErrorText(r)}` });
        res.json({ message: 'টেস্ট স্টোর তৈরি হয়েছে। এবার তালিকা রিফ্রেশ করে আইডি দেখুন।' });
    } catch (err) {
        res.status(502).json({ error: err.message || 'Pathao-র সাথে যোগাযোগ করা যায়নি' });
    }
});

export default router;
