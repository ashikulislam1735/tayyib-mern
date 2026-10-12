import express from 'express';
import mongoose from 'mongoose';
import Review from '../models/Review.js';
import Product from '../models/Product.js';
import Order from '../models/Order.js';
import { requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// ---------- হাতে লেখা সহজ রেট লিমিট (রিভিউ স্প্যাম ঠেকাতে) ----------
// প্রতি IP থেকে ১ ঘণ্টায় সর্বোচ্চ ৫টি রিভিউ জমা দেওয়া যাবে।
const WINDOW_MS = 60 * 60 * 1000;
const MAX_POSTS = 5;
const hits = new Map();
let lastSweep = Date.now();
function limited(ip) {
    const now = Date.now();
    if (now - lastSweep > 60000) {
        for (const [k, v] of hits) if (now - v.first > WINDOW_MS) hits.delete(k);
        lastSweep = now;
    }
    const rec = hits.get(ip);
    if (!rec || now - rec.first > WINDOW_MS) { hits.set(ip, { count: 1, first: now }); return false; }
    rec.count += 1;
    return rec.count > MAX_POSTS;
}

// অনুমোদিত রিভিউ থেকে গড় রেটিং ও সংখ্যা হিসাব করে প্রোডাক্টে বসায়
async function recalc(productId) {
    const [agg] = await Review.aggregate([
        { $match: { product: new mongoose.Types.ObjectId(String(productId)), status: 'approved' } },
        { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
    ]);
    await Product.findByIdAndUpdate(productId, {
        ratingAvg: agg ? Math.round(agg.avg * 10) / 10 : 0,
        ratingCount: agg ? agg.count : 0,
    });
}

// ---------- পাবলিক ----------

// GET /api/reviews/product/:id — শুধু অনুমোদিত রিভিউ
router.get('/product/:id', async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: 'Invalid product ID' });
        const reviews = await Review.find({ product: req.params.id, status: 'approved' })
            .select('name rating comment verifiedBuyer createdAt')
            .sort({ createdAt: -1 })
            .limit(100)
            .lean();
        res.json(reviews);
    } catch {
        res.status(500).json({ error: 'Could not load reviews' });
    }
});

// POST /api/reviews  { productId, name, rating, comment } — অনুমোদনের অপেক্ষায় জমা হয়
router.post('/', async (req, res) => {
    if (limited(req.ip)) return res.status(429).json({ error: 'Too many reviews submitted. Please try again in a little while.' });
    try {
        const b = req.body || {};
        const name = typeof b.name === 'string' ? b.name.trim().slice(0, 40) : '';
        const comment = typeof b.comment === 'string' ? b.comment.trim().slice(0, 600) : '';
        const rating = Number(b.rating);

        if (!mongoose.isValidObjectId(b.productId)) return res.status(400).json({ error: 'Invalid product' });
        if (name.length < 2) return res.status(400).json({ error: 'Please enter your name' });
        if (!Number.isInteger(rating) || rating < 1 || rating > 5) return res.status(400).json({ error: 'Please select a rating from 1 to 5 stars' });
        if (comment.length < 5) return res.status(400).json({ error: 'Please write a review of at least 5 characters' });

        const exists = await Product.exists({ _id: b.productId });
        if (!exists) return res.status(404).json({ error: 'Product not found' });

        // ঐচ্ছিক ফোন নম্বর: শুধু "✅ ক্রেতা" ব্যাজ যাচাইয়ের জন্য। নম্বরটা সেভ করা হয় না, উত্তরেও কিছু বলা হয় না
        // (যাতে কেউ রিভিউ ফর্ম দিয়ে "এই নম্বর কিনেছে কিনা" জানতে না পারে)
        let verifiedBuyer = false;
        const rawPhone = typeof b.phone === 'string' ? b.phone.replace(/\s+/g, '') : '';
        if (rawPhone) {
            if (!/^01[0-9]{9}$/.test(rawPhone)) return res.status(400).json({ error: 'Mobile number must be 11 digits (01XXXXXXXXX)' });
            verifiedBuyer = Boolean(await Order.exists({ phone: rawPhone, status: 'delivered', 'items.productId': b.productId }));
        }

        await Review.create({ product: b.productId, name, rating, comment, verifiedBuyer, status: 'pending' });
        res.status(201).json({ message: 'Thank you! Your review will appear on the site after approval.' });
    } catch {
        res.status(500).json({ error: 'Could not submit your review' });
    }
});

// ---------- এখান থেকে নিচে শুধু অ্যাডমিন (owner ও staff দুজনই) ----------

// GET /api/reviews?status=pending|approved
router.get('/', requireAdmin, async (req, res) => {
    try {
        const status = req.query.status === 'approved' ? 'approved' : 'pending';
        const list = await Review.find({ status })
            .populate('product', 'title')
            .sort({ createdAt: -1 })
            .limit(200)
            .lean();
        res.json(list);
    } catch {
        res.status(500).json({ error: 'রিভিউ লোড করতে সমস্যা হয়েছে' });
    }
});

// PATCH /api/reviews/:id/approve
router.patch('/:id/approve', requireAdmin, async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: 'অবৈধ ID' });
        const r = await Review.findByIdAndUpdate(req.params.id, { status: 'approved' }, { new: true });
        if (!r) return res.status(404).json({ error: 'রিভিউ পাওয়া যায়নি' });
        await recalc(r.product);
        res.json({ message: 'অনুমোদিত হয়েছে' });
    } catch {
        res.status(500).json({ error: 'অনুমোদন করা যায়নি' });
    }
});

// DELETE /api/reviews/:id — বাতিল/মুছে ফেলা
router.delete('/:id', requireAdmin, async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: 'অবৈধ ID' });
        const r = await Review.findByIdAndDelete(req.params.id);
        if (!r) return res.status(404).json({ error: 'রিভিউ পাওয়া যায়নি' });
        await recalc(r.product);
        res.json({ message: 'মুছে ফেলা হয়েছে' });
    } catch {
        res.status(500).json({ error: 'মুছতে সমস্যা হয়েছে' });
    }
});

export default router;
