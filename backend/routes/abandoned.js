import express from 'express';
import mongoose from 'mongoose';
import AbandonedCart from '../models/AbandonedCart.js';
import Product from '../models/Product.js';
import { requireAdmin } from '../middleware/auth.js';

const router = express.Router();

const PHONE_RE = /^01[0-9]{9}$/;
const ACTIVE = ['open', 'contacted'];

// ---------- হাতে লেখা সহজ রেট লিমিট (পাবলিক এন্ডপয়েন্ট স্প্যাম থেকে বাঁচাতে) ----------
// প্রতি IP থেকে ১০ মিনিটে সর্বোচ্চ ২০টি অনুরোধ। মেমোরিতে থাকে, তাই রিস্টার্টে শূন্য হয়।
const WINDOW_MS = 10 * 60 * 1000;
const MAX_REQUESTS = 20;
const hits = new Map(); // ip -> { count, first }
let lastSweep = Date.now();

function rateLimited(ip) {
    const now = Date.now();

    // পুরনো এন্ট্রি অনুরোধের ভেতরেই সাফ করা হয় (setInterval নেই)
    if (now - lastSweep > 60 * 1000) {
        for (const [key, rec] of hits) if (now - rec.first > WINDOW_MS) hits.delete(key);
        lastSweep = now;
    }

    const rec = hits.get(ip);
    if (!rec || now - rec.first > WINDOW_MS) {
        hits.set(ip, { count: 1, first: now });
        return false;
    }
    rec.count += 1;
    return rec.count > MAX_REQUESTS;
}

// POST /api/abandoned — পাবলিক: চেকআউটে ফোন নম্বর লেখা শেষ হলে কার্ট সেভ
// দাম/নাম ক্লায়েন্ট থেকে নেওয়া হয় না — সব ডাটাবেজ থেকে আসে
router.post('/', async (req, res) => {
    if (rateLimited(req.ip)) {
        return res.status(429).json({ error: 'অনেকগুলো অনুরোধ হয়েছে। কিছুক্ষণ পরে চেষ্টা করুন।' });
    }

    try {
        const body = req.body || {};
        const phone = typeof body.phone === 'string' ? body.phone.trim() : '';
        if (!PHONE_RE.test(phone)) return res.status(400).json({ error: 'মোবাইল নম্বর সঠিক নয়' });

        const customerName = typeof body.customerName === 'string' ? body.customerName.trim().slice(0, 60) : '';

        if (!Array.isArray(body.items) || body.items.length === 0 || body.items.length > 30) {
            return res.status(400).json({ error: 'কার্টে ১ থেকে ৩০টি আইটেম থাকতে হবে' });
        }

        // একই ভ্যারিয়েন্ট বারবার থাকলে সংখ্যা যোগ করে একটা করে নেওয়া
        const wanted = new Map(); // `${productId}:${variantId}` -> { productId, variantId, quantity }
        for (const it of body.items) {
            if (!it || !mongoose.isValidObjectId(it.productId) || !mongoose.isValidObjectId(it.variantId)) continue;
            const qty = it.quantity;
            if (!Number.isInteger(qty) || qty < 1 || qty > 100) continue;
            const key = `${it.productId}:${it.variantId}`;
            const prev = wanted.get(key);
            wanted.set(key, {
                productId: String(it.productId),
                variantId: String(it.variantId),
                quantity: Math.min((prev ? prev.quantity : 0) + qty, 100),
            });
        }

        const productIds = [...new Set([...wanted.values()].map((w) => w.productId))];
        const products = await Product.find({ _id: { $in: productIds } }).select('title variants').lean();
        const productMap = new Map(products.map((p) => [String(p._id), p]));

        const items = [];
        let cartTotal = 0;
        for (const w of wanted.values()) {
            const product = productMap.get(w.productId);
            const variant = product && product.variants.find((v) => String(v._id) === w.variantId);
            if (!variant) continue; // প্রোডাক্ট/ভ্যারিয়েন্ট আর নেই — বাদ
            items.push({
                productId: product._id,
                title: product.title,
                variantLabel: variant.label,
                price: variant.price,
                quantity: w.quantity,
            });
            cartTotal += variant.price * w.quantity;
        }

        if (items.length === 0) return res.status(400).json({ error: 'কার্টে বৈধ কোনো আইটেম নেই' });

        const set = { items, cartTotal, lastActivityAt: new Date() };
        if (customerName) set.customerName = customerName;

        // প্রতি ফোনে একটাই open/contacted কার্ট — না থাকলে নতুন বানাবে
        await AbandonedCart.findOneAndUpdate(
            { phone, status: { $in: ACTIVE } },
            { $set: set, $setOnInsert: { status: 'open' } },
            { upsert: true },
        );

        res.json({ ok: true });
    } catch {
        res.status(500).json({ error: 'সংরক্ষণ করা যায়নি' });
    }
});

// ---------- এখান থেকে নিচে সবকিছু শুধু অ্যাডমিনের ----------

// GET /api/abandoned?minutes=30 — যেগুলোর শেষ কার্যকলাপ N মিনিটের বেশি পুরনো
router.get('/', requireAdmin, async (req, res) => {
    try {
        let minutes = 30;
        if (req.query.minutes !== undefined) {
            minutes = Number(req.query.minutes);
            if (!Number.isInteger(minutes) || minutes < 1 || minutes > 1440) {
                return res.status(400).json({ error: 'সময় ১ থেকে ১৪৪০ মিনিটের মধ্যে হতে হবে' });
            }
        }
        const cutoff = new Date(Date.now() - minutes * 60 * 1000);
        const carts = await AbandonedCart.find({ status: { $in: ACTIVE }, lastActivityAt: { $lt: cutoff } })
            .sort({ lastActivityAt: -1 })
            .limit(200)
            .lean();
        res.json(carts);
    } catch {
        res.status(500).json({ error: 'তালিকা আনতে সমস্যা হয়েছে' });
    }
});

// PATCH /api/abandoned/:id/contacted — যোগাযোগ হয়েছে বলে চিহ্নিত
router.patch('/:id/contacted', requireAdmin, async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: 'আইডি সঠিক নয়' });
    try {
        const cart = await AbandonedCart.findOneAndUpdate(
            { _id: req.params.id, status: { $in: ACTIVE } },
            { $set: { status: 'contacted' } },
            { new: true },
        );
        if (!cart) return res.status(404).json({ error: 'কার্ট পাওয়া যায়নি' });
        res.json(cart);
    } catch {
        res.status(500).json({ error: 'আপডেট করা যায়নি' });
    }
});

// DELETE /api/abandoned/:id
router.delete('/:id', requireAdmin, async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: 'আইডি সঠিক নয়' });
    try {
        const cart = await AbandonedCart.findByIdAndDelete(req.params.id);
        if (!cart) return res.status(404).json({ error: 'কার্ট পাওয়া যায়নি' });
        res.json({ message: 'মুছে ফেলা হয়েছে' });
    } catch {
        res.status(500).json({ error: 'মুছতে সমস্যা হয়েছে' });
    }
});

export default router;
