import express from 'express';
import mongoose from 'mongoose';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import Setting from '../models/Setting.js';
import AbandonedCart from '../models/AbandonedCart.js';
import { attachRisk } from '../utils/risk.js';
import { checkCoupon, claimCoupon, releaseCoupon } from '../utils/coupon.js';
import { requireAdmin } from '../middleware/auth.js';
import { makeLimiter } from '../utils/rateLimit.js';
import { restoreItems, reserveItems } from '../utils/stock.js';

const router = express.Router();

// ভুয়া অর্ডার ও নম্বর অনুমান করে খোঁজা ঠেকাতে IP-প্রতি সীমা
const orderLimiter = makeLimiter({ windowMs: 10 * 60 * 1000, max: 20, message: 'Too many orders from this connection. Please try again in a little while.' });
const trackLimiter = makeLimiter({ windowMs: 10 * 60 * 1000, max: 30, message: 'Too many lookups. Please try again in a little while.' });

// যেসব স্ট্যাটাসে অর্ডারের জন্য স্টক কাটা থাকে (বাতিল/ফেরত হলে স্টক ফেরত যায়)
const HOLDS_STOCK = ['pending', 'confirmed', 'delivered'];

// POST /api/orders — নতুন অর্ডার তৈরি
// নিরাপত্তার জন্য দাম ক্লায়েন্ট থেকে নেওয়া হয় না — ডাটাবেজ থেকে আসল দাম ধরে সার্ভারেই মোট হিসাব করা হয়
// স্টক কমানোর নিয়ম: আগে সব আইটেম যাচাই (স্টক না ছুঁয়ে), তারপর একটা একটা করে নিরাপদভাবে কমানো।
// মাঝপথে কোনোটা ব্যর্থ হলে আগে কমানো স্টক ফেরত দেওয়া হয়, তাই অর্ডার না হলে স্টকও কমে না।
router.post('/', orderLimiter, async (req, res) => {
    const { customerName, phone, address, paymentMethod, items } = req.body;
    const deliveryArea = req.body.deliveryArea === 'outside' ? 'outside' : 'inside';

    // পেমেন্ট পদ্ধতি যাচাই — ফাঁকা হলে ক্যাশ অন ডেলিভারি
    const method = paymentMethod === undefined || paymentMethod === '' ? 'cod' : paymentMethod;
    if (!['cod', 'bkash', 'nagad'].includes(method)) {
        return res.status(400).json({ error: 'Invalid payment method' });
    }
    // bKash/Nagad হলে ট্রানজেকশন আইডি লাগবে (ইংরেজি অক্ষর ও সংখ্যা, ৬–২০টি)
    let paymentTrxId = '';
    if (method !== 'cod') {
        paymentTrxId = typeof req.body.paymentTrxId === 'string' ? req.body.paymentTrxId.trim().toUpperCase() : '';
        if (!/^[A-Z0-9]{6,20}$/.test(paymentTrxId)) {
            return res.status(400).json({ error: 'Please enter your transaction ID (TrxID) — 6 to 20 letters or digits' });
        }
    }

    if (!customerName || !phone || !address || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'Name, phone, address and cart items are required' });
    }
    if (items.length > 50) {
        return res.status(400).json({ error: 'A cart can have at most 50 items' });
    }

    const reserved = []; // যেসব আইটেমের স্টক ইতোমধ্যে কমানো হয়েছে
    let orderCreated = false;
    let couponCode = '';
    let couponClaimed = false;

    // কমানো স্টক ফেরত দেওয়া
    const rollbackStock = async () => {
        for (const r of reserved) {
            try {
                await Product.updateOne(
                    { _id: r.productId, 'variants._id': r.variantId },
                    { $inc: { 'variants.$.stock': r.qty } },
                );
            } catch (e) {
                console.error('স্টক ফেরত দেওয়া যায়নি:', r.productId, r.variantId, r.qty, e.message);
            }
        }
        reserved.length = 0;
        // কুপনের ব্যবহারও ফেরত
        if (couponClaimed) {
            try { await releaseCoupon(couponCode); } catch (e) { console.error('কুপন ফেরত দেওয়া যায়নি:', couponCode, e.message); }
            couponClaimed = false;
        }
    };

    try {
        // একই ট্রানজেকশন আইডি দিয়ে দ্বিতীয়বার অর্ডার ঠেকানো (বাতিল/ফেরত অর্ডারের আইডি আবার ব্যবহার করা যাবে)
        if (paymentTrxId) {
            const dup = await Order.findOne({ paymentTrxId, status: { $nin: ['cancelled', 'returned'] } }).select('_id').lean();
            if (dup) return res.status(400).json({ error: 'This transaction ID has already been used for another order. Please enter the correct TrxID.' });
        }

        // ধাপ ১: স্টক না ছুঁয়ে সব আইটেম যাচাই ও দাম হিসাব
        let total = 0;
        const orderItems = [];
        const wanted = [];
        const productCache = new Map();

        for (const cartItem of items) {
            if (!cartItem || !mongoose.isValidObjectId(cartItem.productId) || !mongoose.isValidObjectId(cartItem.variantId)) {
                return res.status(400).json({ error: 'One of the cart items is invalid' });
            }
            const qty = cartItem.quantity;
            if (!Number.isInteger(qty) || qty < 1 || qty > 100) {
                return res.status(400).json({ error: 'Quantity must be a whole number between 1 and 100' });
            }

            const pid = String(cartItem.productId);
            if (!productCache.has(pid)) productCache.set(pid, await Product.findById(pid).lean());
            const product = productCache.get(pid);
            if (!product) return res.status(400).json({ error: 'One of the products is no longer available' });

            const variant = product.variants.find((v) => String(v._id) === String(cartItem.variantId));
            if (!variant) return res.status(400).json({ error: 'Product size/variant not found' });
            if (variant.stock < qty) {
                return res.status(400).json({ error: `${product.title} (${variant.label}) does not have enough stock` });
            }

            orderItems.push({
                productId: product._id,
                variantId: variant._id,
                title: product.title,
                variantLabel: variant.label,
                price: variant.price,
                costPrice: Number(variant.costPrice) || 0,
                quantity: qty,
            });
            total += variant.price * qty;
            wanted.push({ productId: product._id, variantId: variant._id, qty, title: product.title, label: variant.label });
        }

        // কুপন: সার্ভার নিজে যাচাই করে ছাড় হিসাব করে (ক্লায়েন্টের পাঠানো ছাড়ের সংখ্যা ধরা হয় না)
        const subtotal = total;
        let discount = 0;
        if (req.body.couponCode) {
            const check = await checkCoupon(req.body.couponCode, subtotal);
            if (!check.ok) return res.status(400).json({ error: check.error });
            discount = check.discount;
            couponCode = check.coupon.code;
        }

        // ডেলিভারি চার্জ অ্যাডমিন সেটিংস থেকে আসে — ঢাকার ভেতরে ডিফল্ট ৬০, বাইরে ডিফল্ট ১২০
        const settingDoc = await Setting.findOne({ key: 'site' });
        const sd = (settingDoc && settingDoc.data) || {};
        const pick = (v, fallback) => (v !== undefined && v !== null && v !== '' && Number.isFinite(Number(v)) && Number(v) >= 0 ? Number(v) : fallback);
        const inside = pick(sd.deliveryInside, pick(sd.deliveryCharge, 60));
        const outside = pick(sd.deliveryOutside, 120);
        const baseCharge = deliveryArea === 'outside' ? outside : inside;
        // ফ্রি ডেলিভারি: কুপন ছাড়ের পরের পণ্যের দাম সীমার সমান বা বেশি হলে চার্জ ০ (সার্ভার নিজে হিসাব করে)
        const freeMin = pick(sd.freeDeliveryMin, 0);
        const deliveryCharge = freeMin > 0 && subtotal - discount >= freeMin ? 0 : baseCharge;
        total = subtotal - discount + deliveryCharge;

        // কুরিয়ার ও প্যাকেজিং খরচ (শুধু অ্যাডমিনের হিসাবের জন্য, কাস্টমারকে দেখানো হয় না)
        const costsDoc = await Setting.findOne({ key: 'costs' });
        const cd = (costsDoc && costsDoc.data) || {};
        const courierCost = pick(deliveryArea === 'outside' ? cd.courierOutside : cd.courierInside, 0);
        const packagingCost = pick(cd.packaging, 0);

        // কুপনের ব্যবহার নিরাপদে ১ বাড়ানো — সীমা পেরিয়ে গেলে অর্ডার আটকাবে
        if (couponCode) {
            if (!(await claimCoupon(couponCode))) {
                return res.status(400).json({ error: 'This coupon can no longer be used' });
            }
            couponClaimed = true;
        }

        // ধাপ ২: স্টক কমানো — শর্তসহ একক অপারেশন (একই সময়ে অন্য অর্ডার এলেও স্টক মাইনাসে যাবে না)
        for (const w of wanted) {
            const result = await Product.updateOne(
                { _id: w.productId, variants: { $elemMatch: { _id: w.variantId, stock: { $gte: w.qty } } } },
                { $inc: { 'variants.$.stock': -w.qty } },
            );
            if (result.modifiedCount !== 1) {
                await rollbackStock();
                return res.status(400).json({ error: `${w.title} (${w.label}) does not have enough stock` });
            }
            reserved.push(w);
        }

        // ধাপ ৩: অর্ডার সংরক্ষণ — ব্যর্থ হলে বাইরের catch স্টক ফেরত দেবে
        const order = await Order.create({
            customerName, phone, address,
            paymentMethod: method,
            paymentTrxId,
            items: orderItems,
            deliveryArea,
            deliveryCharge,
            courierCost,
            packagingCost,
            couponCode,
            discount,
            total,
        });
        orderCreated = true;

        // অর্ডার হয়ে গেলে একই ফোনের অসম্পূর্ণ কার্ট "recovered" — এখানে সমস্যা হলেও অর্ডার আটকাবে না
        try {
            await AbandonedCart.updateMany(
                { phone: String(phone).trim(), status: { $in: ['open', 'contacted'] } },
                { $set: { status: 'recovered' } },
            );
        } catch (e) {
            console.error('অসম্পূর্ণ কার্ট আপডেট করা যায়নি:', e.message);
        }

        // ক্রয়মূল্য কাস্টমারকে পাঠানো হয় না
        const publicOrder = order.toObject();
        delete publicOrder.courierCost;
        delete publicOrder.packagingCost;
        publicOrder.items = publicOrder.items.map(({ costPrice, ...item }) => item);
        res.status(201).json(publicOrder);
    } catch (err) {
        if (!orderCreated) await rollbackStock();
        console.error('Order creation failed:', err);
        res.status(500).json({ error: 'Could not place your order. Please try again.' });
    }
});

// GET /api/orders — সব অর্ডার (শুধু লগইন করা অ্যাডমিনের জন্য)
router.get('/', requireAdmin, async (req, res) => {
    try {
        const orders = await Order.find().sort({ createdAt: -1 }).lean();
        if (req.admin.role !== 'owner') {
            // স্টাফ ক্রয়মূল্য ও কুরিয়ার/প্যাকেজিং খরচ দেখে না
            orders.forEach((o) => {
                delete o.courierCost;
                delete o.packagingCost;
                (o.items || []).forEach((i) => { delete i.costPrice; });
            });
        }
        res.json(attachRisk(orders)); // প্রতিটা অর্ডারে ফোন নম্বরের ইতিহাস থেকে ঝুঁকির লেভেল
    } catch {
        res.status(500).json({ error: 'অর্ডারের তালিকা আনতে সমস্যা হয়েছে' });
    }
});

// PATCH /api/orders/:id/status — অর্ডারের স্ট্যাটাস বদলানো (শুধু অ্যাডমিন)
// বাতিল/ফেরত করলে স্টক ও কুপনের ব্যবহার ফেরত যায়; বাতিল অর্ডার আবার চালু করলে স্টক আবার কাটে (স্টক না থাকলে আটকায়)।
router.patch('/:id/status', requireAdmin, async (req, res) => {
    const { status } = req.body || {};
    const allowed = ['pending', 'confirmed', 'delivered', 'cancelled', 'returned'];
    if (!allowed.includes(status)) {
        return res.status(400).json({ error: 'অবৈধ স্ট্যাটাস' });
    }
    if (!mongoose.isValidObjectId(req.params.id)) {
        return res.status(400).json({ error: 'অবৈধ অর্ডার ID' });
    }

    // স্টাফ ক্রয়মূল্য ও কুরিয়ার/প্যাকেজিং খরচ দেখে না
    const present = (o) => {
        const x = { ...o };
        if (req.admin.role !== 'owner') {
            delete x.courierCost;
            delete x.packagingCost;
            x.items = (x.items || []).map(({ costPrice, ...item }) => item);
        }
        return x;
    };

    try {
        const current = await Order.findById(req.params.id).lean();
        if (!current) return res.status(404).json({ error: 'অর্ডার পাওয়া যায়নি' });
        if (current.status === status) return res.json(present(current));

        const wasHolding = HOLDS_STOCK.includes(current.status);
        const willHold = HOLDS_STOCK.includes(status);
        const ctx = { by: req.admin.username, note: `অর্ডার #${String(current._id).slice(-6).toUpperCase()}: ${current.status} → ${status}` };

        // বাতিল/ফেরত অর্ডার আবার চালু: আগে স্টক কাটা, না পারলে স্ট্যাটাস বদলানো হবে না
        if (!wasHolding && willHold) {
            const r = await reserveItems(current.items, ctx);
            if (!r.ok) {
                return res.status(400).json({ error: `"${r.title}" (${r.label}) এর স্টক পর্যাপ্ত নেই, তাই অর্ডারটি আবার চালু করা গেল না` });
            }
        }

        // পুরোনো স্ট্যাটাস মিললে তবেই বদলায় — দুজন একসাথে বদলালে স্টক দুইবার ফেরত যাওয়া ঠেকায়
        const updated = await Order.findOneAndUpdate({ _id: current._id, status: current.status }, { status }, { new: true }).lean();
        if (!updated) {
            if (!wasHolding && willHold) await restoreItems(current.items, ctx, { silent: true });
            return res.status(409).json({ error: 'অর্ডারটি এইমাত্র অন্য কেউ বদলেছে। পেজ রিলোড করে আবার চেষ্টা করুন।' });
        }

        if (wasHolding && !willHold) {
            await restoreItems(current.items, ctx);
            if (current.couponCode) {
                try { await releaseCoupon(current.couponCode); } catch (e) { console.error('কুপন ফেরত দেওয়া যায়নি:', e.message); }
            }
        } else if (!wasHolding && willHold && current.couponCode) {
            try { await claimCoupon(current.couponCode); } catch (e) { console.error('কুপন আবার গণনা করা যায়নি:', e.message); }
        }

        res.json(present(updated));
    } catch (err) {
        console.error('status update error:', err);
        res.status(500).json({ error: 'স্ট্যাটাস বদলাতে সমস্যা হয়েছে' });
    }
});

// GET /api/orders/track/:query — অর্ডার ID বা ফোন নম্বর দিয়ে ট্র্যাকিং
// • পুরো অর্ডার ID (অনুমান করা অসম্ভব) দিলে: পুরো অর্ডার, ইনভয়েসসহ।
// • ফোন নম্বর দিলে: নাম/ঠিকানা/পূর্ণ ID ছাড়া শুধু অবস্থা, তারিখ, পণ্য ও মোট — যাতে অন্যের নম্বর দিয়ে ঠিকানা বের করা না যায়।
router.get('/track/:query', trackLimiter, async (req, res) => {
    try {
        const query = String(req.params.query || '').trim();

        if (/^[a-f0-9]{24}$/i.test(query)) {
            const order = await Order.findById(query).select('-items.costPrice -courierCost -packagingCost').lean();
            if (!order) return res.status(404).json({ error: 'No orders found' });
            return res.json([order]);
        }

        const phone = query.replace(/[\s-]/g, '');
        if (!/^01[0-9]{9}$/.test(phone)) {
            return res.status(400).json({ error: 'Enter your full order ID or an 11-digit mobile number (01XXXXXXXXX)' });
        }

        const orders = await Order.find({ phone })
            .select('status total createdAt items.title items.variantLabel items.quantity')
            .sort({ createdAt: -1 }).limit(20).lean();
        if (orders.length === 0) return res.status(404).json({ error: 'No orders found' });

        res.json(orders.map((o) => ({
            redacted: true,
            shortId: String(o._id).slice(-6).toUpperCase(),
            status: o.status,
            total: o.total,
            createdAt: o.createdAt,
            items: (o.items || []).map((i) => ({ title: i.title, variantLabel: i.variantLabel, quantity: i.quantity })),
        })));
    } catch (err) {
        console.error('track error:', err);
        res.status(500).json({ error: 'Could not look up your order. Please try again.' });
    }
});

export default router;
