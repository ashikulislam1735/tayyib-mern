import express from 'express';
import mongoose from 'mongoose';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import StockLog from '../models/StockLog.js';
import Setting from '../models/Setting.js';
import AbandonedCart from '../models/AbandonedCart.js';
import { attachRisk } from '../utils/risk.js';
import { checkCoupon, claimCoupon, releaseCoupon } from '../utils/coupon.js';
import { requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// POST /api/orders — নতুন অর্ডার তৈরি
// নিরাপত্তার জন্য দাম ক্লায়েন্ট থেকে নেওয়া হয় না — ডাটাবেজ থেকে আসল দাম ধরে সার্ভারেই মোট হিসাব করা হয়
// স্টক কমানোর নিয়ম: আগে সব আইটেম যাচাই (স্টক না ছুঁয়ে), তারপর একটা একটা করে নিরাপদভাবে কমানো।
// মাঝপথে কোনোটা ব্যর্থ হলে আগে কমানো স্টক ফেরত দেওয়া হয়, তাই অর্ডার না হলে স্টকও কমে না।
router.post('/', async (req, res) => {
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

// বাতিল/ফেরত হলে অর্ডারের পণ্য স্টকে ফেরত যায়; আবার চালু করলে স্টক থেকে কমে।
// অর্ডারে ভ্যারিয়েন্টের শুধু নাম (variantLabel) রাখা হয়, তাই নাম দিয়ে ভ্যারিয়েন্ট খোঁজা হয়।
const isClosed = (s) => s === 'cancelled' || s === 'returned';

async function logStock(order, item, variant, change, reason, by) {
    try {
        await StockLog.create({
            product: item.productId, productTitle: item.title,
            variantId: variant._id, variantLabel: variant.label,
            mode: change > 0 ? 'add' : 'subtract',
            before: variant.stock - change, after: variant.stock, change,
            reason, note: `অর্ডার #${String(order._id).slice(-6)}`, by,
        });
    } catch (e) { console.error('স্টকের ইতিহাস লেখা যায়নি:', e.message); }
}

// স্টক ফেরত দেওয়া। যে আইটেম পাওয়া যায়নি সেগুলোর তালিকা ফেরত দেয়।
async function giveBackStock(order, by) {
    const missing = [];
    for (const it of order.items) {
        const prod = it.productId && await Product.findOneAndUpdate(
            { _id: it.productId, variants: { $elemMatch: { label: it.variantLabel } } },
            { $inc: { 'variants.$[v].stock': it.quantity } },
            { new: true, arrayFilters: [{ 'v.label': it.variantLabel }] },
        );
        const variant = prod && prod.variants.find((v) => v.label === it.variantLabel);
        if (!variant) { missing.push(`${it.title} (${it.variantLabel})`); continue; }
        await logStock(order, it, variant, it.quantity, 'return', by);
    }
    return missing;
}

// আবার চালু করলে স্টক কমানো। কোনোটায় স্টক কম পড়লে আগে কমানোগুলো ফেরত দিয়ে ব্যর্থ হয়।
async function takeStockAgain(order, by) {
    const done = [];
    for (const it of order.items) {
        const prod = it.productId && await Product.findOneAndUpdate(
            { _id: it.productId, variants: { $elemMatch: { label: it.variantLabel, stock: { $gte: it.quantity } } } },
            { $inc: { 'variants.$[v].stock': -it.quantity } },
            { new: true, arrayFilters: [{ 'v.label': it.variantLabel, 'v.stock': { $gte: it.quantity } }] },
        );
        const variant = prod && prod.variants.find((v) => v.label === it.variantLabel);
        if (!variant) {
            for (const d of done) {
                await Product.updateOne(
                    { _id: d.productId },
                    { $inc: { 'variants.$[v].stock': d.quantity } },
                    { arrayFilters: [{ 'v.label': d.variantLabel }] },
                ).catch((e) => console.error('স্টক ফেরত দেওয়া যায়নি:', e.message));
            }
            return { ok: false, failed: `${it.title} (${it.variantLabel})` };
        }
        done.push(it);
        await logStock(order, it, variant, -it.quantity, 'other', by);
    }
    return { ok: true };
}

// PATCH /api/orders/:id/status — অর্ডারের স্ট্যাটাস বদলানো (শুধু অ্যাডমিন)
router.patch('/:id/status', requireAdmin, async (req, res) => {
    try {
        const { status } = req.body;
        const allowed = ['pending', 'confirmed', 'delivered', 'cancelled', 'returned'];
        if (!allowed.includes(status)) {
            return res.status(400).json({ error: 'অবৈধ স্ট্যাটাস' });
        }
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(404).json({ error: 'অর্ডার পাওয়া যায়নি' });
        }

        const current = await Order.findById(req.params.id).select('status stockRestored items _id').lean();
        if (!current) return res.status(404).json({ error: 'অর্ডার পাওয়া যায়নি' });

        const by = req.admin.username;
        const update = { status };
        const claim = { _id: current._id };
        let stockNote = '';

        if (!isClosed(current.status) && isClosed(status)) {
            // বাতিল/ফেরত: একবারই স্টক ফেরত। আগে চিহ্ন বসিয়ে নিই, যাতে একসাথে দুবার চাপলেও দুবার যোগ না হয়।
            const claimed = await Order.findOneAndUpdate(
                { _id: current._id, stockRestored: { $ne: true } },
                { $set: { status, stockRestored: true } },
            );
            if (claimed) {
                const missing = await giveBackStock(current, by);
                if (missing.length) stockNote = `এই পণ্যের স্টক ফেরত দেওয়া যায়নি (ভ্যারিয়েন্ট পাওয়া যায়নি): ${missing.join(', ')}`;
            }
            update.status = status; // নিচের সাধারণ আপডেটেও একই স্ট্যাটাস থাকবে
        } else if (isClosed(current.status) && !isClosed(status)) {
            // আবার চালু: আগে স্টক ফেরত দেওয়া হয়ে থাকলেই কেবল আবার কমাতে হবে
            if (current.stockRestored) {
                const r = await takeStockAgain(current, by);
                if (!r.ok) {
                    return res.status(400).json({ error: `স্টক পর্যাপ্ত নেই, তাই অর্ডার আবার চালু করা গেল না: ${r.failed}` });
                }
                const flipped = await Order.findOneAndUpdate(
                    { _id: current._id, stockRestored: true },
                    { $set: { stockRestored: false } },
                );
                if (!flipped) {
                    // একই সময়ে অন্য কেউ বদলে ফেলেছে — কমানো স্টক ফেরত দিয়ে থামি
                    await giveBackStock(current, by);
                    return res.status(409).json({ error: 'অর্ডারটি এইমাত্র অন্য জায়গা থেকে বদলেছে, পাতা রিফ্রেশ করে আবার চেষ্টা করুন' });
                }
            }
        }

        const q = Order.findOneAndUpdate(claim, { $set: update }, { new: true });
        if (req.admin.role !== 'owner') q.select('-items.costPrice -courierCost -packagingCost');
        const order = await q;
        if (!order) return res.status(404).json({ error: 'অর্ডার পাওয়া যায়নি' });
        res.json(stockNote ? { ...order.toObject(), stockNote } : order);
    } catch (e) {
        console.error('স্ট্যাটাস বদলাতে সমস্যা:', e);
        res.status(500).json({ error: 'স্ট্যাটাস বদলানো যায়নি' });
    }
});

// GET /api/orders/track/:query — অর্ডার ID বা ফোন নম্বর দিয়ে ট্র্যাকিং
router.get('/track/:query', async (req, res) => {
    const { query } = req.params;
    const filter = mongoose.isValidObjectId(query)
        ? { _id: query }
        : { phone: query };

    const orders = await Order.find(filter).select('-items.costPrice -courierCost -packagingCost').sort({ createdAt: -1 });
    if (orders.length === 0) return res.status(404).json({ error: 'No orders found' });
    res.json(orders);
});

export default router;
