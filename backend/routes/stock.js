import express from 'express';
import mongoose from 'mongoose';
import Product from '../models/Product.js';
import StockLog from '../models/StockLog.js';
import { requireAdmin } from '../middleware/auth.js';

const router = express.Router();
const REASONS = ['restock', 'damaged', 'return', 'correction', 'other'];
const MAX_QTY = 1000000;

router.use(requireAdmin);

// GET /api/stock — সব প্রোডাক্টের প্রতিটা সাইজের স্টক (ক্রয়মূল্য শুধু মালিক দেখে)
router.get('/', async (req, res) => {
    try {
        const isOwner = req.admin.role === 'owner';
        const products = await Product.find().sort({ category: 1, title: 1 }).select('title category variants').lean();
        const rows = [];
        for (const p of products) {
            for (const v of p.variants || []) {
                rows.push({
                    productId: String(p._id),
                    variantId: String(v._id),
                    title: p.title,
                    category: p.category,
                    label: v.label,
                    stock: v.stock || 0,
                    ...(isOwner ? { costPrice: v.costPrice || 0 } : {}),
                });
            }
        }
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: 'স্টক লোড করতে সমস্যা হয়েছে' });
    }
});

// POST /api/stock/adjust — { productId, variantId, mode: add|subtract|set, quantity, reason, note }
router.post('/adjust', async (req, res) => {
    try {
        const { productId, variantId, mode, quantity, reason, note } = req.body || {};
        if (!mongoose.isValidObjectId(productId) || !mongoose.isValidObjectId(variantId)) {
            return res.status(400).json({ error: 'প্রোডাক্ট বা সাইজ ঠিক নেই' });
        }
        if (!['add', 'subtract', 'set'].includes(mode)) return res.status(400).json({ error: 'পরিবর্তনের ধরন ঠিক নেই' });
        const qty = Number(quantity);
        if (!Number.isInteger(qty) || qty < 0 || qty > MAX_QTY) {
            return res.status(400).json({ error: 'সংখ্যা পূর্ণ সংখ্যা হতে হবে (০ বা তার বেশি)' });
        }
        if (mode !== 'set' && qty < 1) return res.status(400).json({ error: 'সংখ্যা কমপক্ষে ১ হতে হবে' });

        const cleanReason = REASONS.includes(reason) ? reason : 'other';
        const cleanNote = String(note || '').trim().slice(0, 200);

        // একসাথে দুজন বদলালেও ভুল হয় না: ডাটাবেজেই যোগ/বিয়োগ হয়, কমানোর সময় স্টকের চেয়ে বেশি কমানো যায় না
        const match = {
            _id: productId,
            variants: { $elemMatch: { _id: variantId, ...(mode === 'subtract' ? { stock: { $gte: qty } } : {}) } },
        };
        const update = mode === 'set'
            ? { $set: { 'variants.$.stock': qty } }
            : { $inc: { 'variants.$.stock': mode === 'add' ? qty : -qty } };
        const prev = await Product.findOneAndUpdate(match, update, { new: false }).select('title variants').lean();

        if (!prev) {
            const exists = await Product.exists({ _id: productId, 'variants._id': variantId });
            if (exists) return res.status(400).json({ error: 'কমানোর সংখ্যা বর্তমান স্টকের চেয়ে বেশি' });
            return res.status(404).json({ error: 'প্রোডাক্ট বা সাইজ পাওয়া যায়নি' });
        }

        const variant = prev.variants.find((v) => String(v._id) === String(variantId));
        const before = variant.stock || 0;
        const after = mode === 'set' ? qty : mode === 'add' ? before + qty : before - qty;

        if (after !== before) {
            try {
                await StockLog.create({
                    product: productId, productTitle: prev.title, variantId, variantLabel: variant.label,
                    mode, before, after, change: after - before,
                    reason: cleanReason, note: cleanNote, by: req.admin.username,
                });
            } catch (logErr) {
                console.error('স্টকের ইতিহাস সেভ হয়নি:', logErr);
            }
        }
        res.json({ productId, variantId, stock: after });
    } catch (err) {
        console.error('স্টক বদলাতে সমস্যা:', err);
        res.status(500).json({ error: 'স্টক বদলাতে সমস্যা হয়েছে' });
    }
});

// GET /api/stock/logs?variantId=&limit= — স্টক বদলের ইতিহাস (নতুন আগে)
router.get('/logs', async (req, res) => {
    try {
        const filter = {};
        if (req.query.variantId) {
            if (!mongoose.isValidObjectId(req.query.variantId)) return res.status(400).json({ error: 'সাইজ ঠিক নেই' });
            filter.variantId = req.query.variantId;
        }
        const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 30, 1), 200);
        res.json(await StockLog.find(filter).sort({ createdAt: -1 }).limit(limit).lean());
    } catch (err) {
        res.status(500).json({ error: 'ইতিহাস লোড করতে সমস্যা হয়েছে' });
    }
});

export default router;
