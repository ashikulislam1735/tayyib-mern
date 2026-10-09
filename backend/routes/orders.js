import express from 'express';
import mongoose from 'mongoose';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import Setting from '../models/Setting.js';
import { requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// POST /api/orders — নতুন অর্ডার তৈরি
// নিরাপত্তার জন্য দাম ক্লায়েন্ট থেকে নেওয়া হয় না — ডাটাবেজ থেকে আসল দাম ধরে সার্ভারেই মোট হিসাব করা হয়
router.post('/', async (req, res) => {
    const { customerName, phone, address, paymentMethod, items } = req.body;

    if (!customerName || !phone || !address || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'নাম, ফোন, ঠিকানা ও কার্ট আইটেম দরকার' });
    }

    try {
        let total = 0;
        const orderItems = [];

        for (const cartItem of items) {
            const product = await Product.findById(cartItem.productId);
            if (!product) return res.status(400).json({ error: 'একটা প্রোডাক্ট আর পাওয়া যাচ্ছে না' });

            const variant = product.variants.id(cartItem.variantId);
            if (!variant) return res.status(400).json({ error: 'ভ্যারিয়েন্ট পাওয়া যায়নি' });
            if (variant.stock < cartItem.quantity) {
                return res.status(400).json({ error: `${product.title} (${variant.label}) পর্যাপ্ত স্টকে নেই` });
            }

            orderItems.push({
                productId: product._id,
                title: product.title,
                variantLabel: variant.label,
                price: variant.price,
                quantity: cartItem.quantity,
            });
            total += variant.price * cartItem.quantity;

            // স্টক কমানো
            variant.stock -= cartItem.quantity;
            await product.save();
        }

        // ডেলিভারি চার্জ অ্যাডমিন সেটিংস থেকে আসে (সেভ না থাকলে ডিফল্ট ৬০)
        const settingDoc = await Setting.findOne({ key: 'site' });
        const saved = settingDoc && settingDoc.data && Number(settingDoc.data.deliveryCharge);
        const deliveryCharge = Number.isFinite(saved) && saved >= 0 ? saved : 60;
        total += deliveryCharge;

        const order = await Order.create({
            customerName, phone, address,
            paymentMethod: paymentMethod || 'cod',
            items: orderItems,
            deliveryCharge,
            total,
        });

        res.status(201).json(order);
    } catch (err) {
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
