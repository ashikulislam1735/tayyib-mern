import express from 'express';
import mongoose from 'mongoose';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import Setting from '../models/Setting.js';
import AbandonedCart from '../models/AbandonedCart.js';
import { requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// POST /api/orders — নতুন অর্ডার তৈরি
// নিরাপত্তার জন্য দাম ক্লায়েন্ট থেকে নেওয়া হয় না — ডাটাবেজ থেকে আসল দাম ধরে সার্ভারেই মোট হিসাব করা হয়
// স্টক কমানোর নিয়ম: আগে সব আইটেম যাচাই (স্টক না ছুঁয়ে), তারপর একটা একটা করে নিরাপদভাবে কমানো।
// মাঝপথে কোনোটা ব্যর্থ হলে আগে কমানো স্টক ফেরত দেওয়া হয়, তাই অর্ডার না হলে স্টকও কমে না।
router.post('/', async (req, res) => {
    const { customerName, phone, address, paymentMethod, items } = req.body;
    const deliveryArea = req.body.deliveryArea === 'outside' ? 'outside' : 'inside';

    if (!customerName || !phone || !address || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'নাম, ফোন, ঠিকানা ও কার্ট আইটেম দরকার' });
    }
    if (items.length > 50) {
        return res.status(400).json({ error: 'কার্টে সর্বোচ্চ ৫০টি আইটেম থাকতে পারবে' });
    }

    const reserved = []; // যেসব আইটেমের স্টক ইতোমধ্যে কমানো হয়েছে
    let orderCreated = false;

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
    };

    try {
        // ধাপ ১: স্টক না ছুঁয়ে সব আইটেম যাচাই ও দাম হিসাব
        let total = 0;
        const orderItems = [];
        const wanted = [];
        const productCache = new Map();

        for (const cartItem of items) {
            if (!cartItem || !mongoose.isValidObjectId(cartItem.productId) || !mongoose.isValidObjectId(cartItem.variantId)) {
                return res.status(400).json({ error: 'কার্টের একটি আইটেম সঠিক নয়' });
            }
            const qty = cartItem.quantity;
            if (!Number.isInteger(qty) || qty < 1 || qty > 100) {
                return res.status(400).json({ error: 'পরিমাণ ১ থেকে ১০০-এর মধ্যে পূর্ণ সংখ্যা হতে হবে' });
            }

            const pid = String(cartItem.productId);
            if (!productCache.has(pid)) productCache.set(pid, await Product.findById(pid).lean());
            const product = productCache.get(pid);
            if (!product) return res.status(400).json({ error: 'একটা প্রোডাক্ট আর পাওয়া যাচ্ছে না' });

            const variant = product.variants.find((v) => String(v._id) === String(cartItem.variantId));
            if (!variant) return res.status(400).json({ error: 'ভ্যারিয়েন্ট পাওয়া যায়নি' });
            if (variant.stock < qty) {
                return res.status(400).json({ error: `${product.title} (${variant.label}) পর্যাপ্ত স্টকে নেই` });
            }

            orderItems.push({
                productId: product._id,
                title: product.title,
                variantLabel: variant.label,
                price: variant.price,
                quantity: qty,
            });
            total += variant.price * qty;
            wanted.push({ productId: product._id, variantId: variant._id, qty, title: product.title, label: variant.label });
        }

        // ডেলিভারি চার্জ অ্যাডমিন সেটিংস থেকে আসে — ঢাকার ভেতরে ডিফল্ট ৬০, বাইরে ডিফল্ট ১২০
        const settingDoc = await Setting.findOne({ key: 'site' });
        const sd = (settingDoc && settingDoc.data) || {};
        const pick = (v, fallback) => (v !== undefined && v !== null && v !== '' && Number.isFinite(Number(v)) && Number(v) >= 0 ? Number(v) : fallback);
        const inside = pick(sd.deliveryInside, pick(sd.deliveryCharge, 60));
        const outside = pick(sd.deliveryOutside, 120);
        const deliveryCharge = deliveryArea === 'outside' ? outside : inside;
        total += deliveryCharge;

        // ধাপ ২: স্টক কমানো — শর্তসহ একক অপারেশন (একই সময়ে অন্য অর্ডার এলেও স্টক মাইনাসে যাবে না)
        for (const w of wanted) {
            const result = await Product.updateOne(
                { _id: w.productId, variants: { $elemMatch: { _id: w.variantId, stock: { $gte: w.qty } } } },
                { $inc: { 'variants.$.stock': -w.qty } },
            );
            if (result.modifiedCount !== 1) {
                await rollbackStock();
                return res.status(400).json({ error: `${w.title} (${w.label}) পর্যাপ্ত স্টকে নেই` });
            }
            reserved.push(w);
        }

        // ধাপ ৩: অর্ডার সংরক্ষণ — ব্যর্থ হলে বাইরের catch স্টক ফেরত দেবে
        const order = await Order.create({
            customerName, phone, address,
            paymentMethod: paymentMethod || 'cod',
            items: orderItems,
            deliveryArea,
            deliveryCharge,
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

        res.status(201).json(order);
    } catch (err) {
        if (!orderCreated) await rollbackStock();
        res.status(500).json({ error: 'অর্ডার তৈরি করতে সমস্যা হয়েছে: ' + err.message });
    }
});

// GET /api/orders — সব অর্ডার (শুধু লগইন করা অ্যাডমিনের জন্য)
router.get('/', requireAdmin, async (req, res) => {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.json(orders);
});

// PATCH /api/orders/:id/status — অর্ডারের স্ট্যাটাস বদলানো (শুধু অ্যাডমিন)
router.patch('/:id/status', requireAdmin, async (req, res) => {
    const { status } = req.body;
    const allowed = ['pending', 'confirmed', 'delivered', 'cancelled'];
    if (!allowed.includes(status)) {
        return res.status(400).json({ error: 'অবৈধ স্ট্যাটাস' });
    }

    const order = await Order.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!order) return res.status(404).json({ error: 'অর্ডার পাওয়া যায়নি' });
    res.json(order);
});

// GET /api/orders/track/:query — অর্ডার ID বা ফোন নম্বর দিয়ে ট্র্যাকিং
router.get('/track/:query', async (req, res) => {
    const { query } = req.params;
    const filter = mongoose.isValidObjectId(query)
        ? { _id: query }
        : { phone: query };

    const orders = await Order.find(filter).sort({ createdAt: -1 });
    if (orders.length === 0) return res.status(404).json({ error: 'কোনো অর্ডার পাওয়া যায়নি' });
    res.json(orders);
});

export default router;
