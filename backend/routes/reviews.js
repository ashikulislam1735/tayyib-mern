import express from 'express';
import mongoose from 'mongoose';
import Review from '../models/Review.js';
import Product from '../models/Product.js';
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
        if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: 'অবৈধ প্রোডাক্ট ID' });
        const reviews = await Review.find({ product: req.params.id, status: 'approved' })
            .select('name rating comment createdAt')
            .sort({ createdAt: -1 })
            .limit(100)
            .lean();
        res.json(reviews);
    } catch {
        res.status(500).json({ error: 'রিভিউ লোড করতে সমস্যা হয়েছে' });
    }
});

// POST /api/reviews  { productId, name, rating, comment } — অনুমোদনের অপেক্ষায় জমা হয়
router.post('/', async (req, res) => {
    if (limited(req.ip)) return res.status(429).json({ error: 'অনেকগুলো রিভিউ জমা হয়েছে। কিছুক্ষণ পরে চেষ্টা করুন।' });
    try {
        const b = req.body || {};
        const name = typeof b.name === 'string' ? b.name.trim().slice(0, 40) : '';
        const comment = typeof b.comment === 'string' ? b.comment.trim().slice(0, 600) : '';
        const rating = Number(b.rating);

        if (!mongoose.isValidObjectId(b.productId)) return res.status(400).json({ error: 'অবৈধ প্রোডাক্ট' });
        if (name.length < 2) return res.status(400).json({ error: 'আপনার নাম লিখুন' });
        if (!Number.isInteger(rating) || rating < 1 || rating > 5) return res.status(400).json({ error: '১ থেকে ৫ স্টার বেছে নিন' });
        if (comment.length < 5) return res.status(400).json({ error: 'মন্তব্য কমপক্ষে ৫ অক্ষরের লিখুন' });

        const exists = await Product.exists({ _id: b.productId });
        if (!exists) return res.status(404).json({ error: 'প্রোডাক্ট পাওয়া যায়নি' });

        await Review.create({ product: b.productId, name, rating, comment, status: 'pending' });
        res.status(201).json({ message: 'ধন্যবাদ! আপনার রিভিউ অনুমোদনের পর সাইটে দেখা যাবে।' });
    } catch {
        res.status(500).json({ error: 'রিভিউ জমা দেওয়া যায়নি' });
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
