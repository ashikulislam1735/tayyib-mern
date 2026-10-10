import express from 'express';
import mongoose from 'mongoose';
import Coupon from '../models/Coupon.js';
import { requireAdmin } from '../middleware/auth.js';
import { checkCoupon, CODE_RE, normalizeCode } from '../utils/coupon.js';

const router = express.Router();

// ---------- পাবলিক: কুপন যাচাই (শুধু ছাড় কত হবে দেখানোর জন্য) ----------
// কোড অনুমান করে খোঁজা ঠেকাতে প্রতি IP থেকে ১০ মিনিটে ৩০টি অনুরোধ।
const WINDOW_MS = 10 * 60 * 1000;
const MAX_REQ = 30;
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
    return rec.count > MAX_REQ;
}

// POST /api/coupons/validate  { code, subtotal }
// এটা শুধু প্রিভিউ; আসল ছাড় অর্ডার তৈরির সময় সার্ভার নতুন করে হিসাব করে।
router.post('/validate', async (req, res) => {
    if (limited(req.ip)) return res.status(429).json({ error: 'অনেকগুলো অনুরোধ হয়েছে। কিছুক্ষণ পরে চেষ্টা করুন।' });
    try {
        const subtotal = Number(req.body && req.body.subtotal);
        if (!Number.isFinite(subtotal) || subtotal <= 0 || subtotal > 100000000) {
            return res.status(400).json({ error: 'কার্টের মোট দাম সঠিক নয়' });
        }
        const r = await checkCoupon(req.body.code, subtotal);
        if (!r.ok) return res.status(400).json({ error: r.error });
        res.json({ code: r.coupon.code, discount: r.discount });
    } catch {
        res.status(500).json({ error: 'কুপন যাচাই করা যায়নি' });
    }
});

// ---------- এখান থেকে নিচে শুধু অ্যাডমিন ----------
function cleanBody(body = {}) {
    const code = normalizeCode(body.code);
    if (!CODE_RE.test(code)) throw new Error('কোড ৩–২০ অক্ষরের হতে হবে (ইংরেজি বড় হাতের অক্ষর, সংখ্যা, - বা _)');
    if (!['percent', 'fixed'].includes(body.type)) throw new Error('ছাড়ের ধরন বেছে নিন');

    const num = (v, label, { min = 0, max = 100000000 } = {}) => {
        const n = Number(v === '' || v === undefined || v === null ? 0 : v);
        if (!Number.isFinite(n) || !Number.isInteger(n) || n < min || n > max) throw new Error(`${label} সঠিক নয়`);
        return n;
    };
    const value = num(body.value, 'ছাড়ের পরিমাণ', { min: 1, max: body.type === 'percent' ? 100 : 100000000 });
    const out = {
        code, type: body.type, value,
        minOrder: num(body.minOrder, 'ন্যূনতম অর্ডার'),
        maxDiscount: num(body.maxDiscount, 'সর্বোচ্চ ছাড়'),
        usageLimit: num(body.usageLimit, 'ব্যবহারের সীমা'),
        active: body.active === undefined ? true : Boolean(body.active),
        expiresAt: null,
    };
    if (body.expiresAt) {
        if (typeof body.expiresAt !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(body.expiresAt)) throw new Error('মেয়াদের তারিখ YYYY-MM-DD হতে হবে');
        const d = new Date(`${body.expiresAt}T23:59:59.999+06:00`); // ঢাকার দিনের শেষ পর্যন্ত
        if (Number.isNaN(d.getTime())) throw new Error('মেয়াদের তারিখ সঠিক নয়');
        out.expiresAt = d;
    }
    return out;
}

router.get('/', requireAdmin, async (req, res) => {
    try {
        res.json(await Coupon.find().sort({ createdAt: -1 }).limit(200).lean());
    } catch {
        res.status(500).json({ error: 'কুপনের তালিকা আনতে সমস্যা হয়েছে' });
    }
});

router.post('/', requireAdmin, async (req, res) => {
    let data;
    try { data = cleanBody(req.body); } catch (e) { return res.status(400).json({ error: e.message }); }
    try {
        res.status(201).json(await Coupon.create(data));
    } catch (e) {
        if (e && e.code === 11000) return res.status(409).json({ error: 'এই কোডে কুপন আগেই আছে' });
        res.status(500).json({ error: 'কুপন সংরক্ষণ করা যায়নি' });
    }
});

// PATCH /api/coupons/:id — চালু/বন্ধ (active)
router.patch('/:id', requireAdmin, async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: 'আইডি সঠিক নয়' });
    if (typeof (req.body && req.body.active) !== 'boolean') return res.status(400).json({ error: 'active true/false হতে হবে' });
    try {
        const c = await Coupon.findByIdAndUpdate(req.params.id, { $set: { active: req.body.active } }, { new: true });
        if (!c) return res.status(404).json({ error: 'কুপন পাওয়া যায়নি' });
        res.json(c);
    } catch {
        res.status(500).json({ error: 'আপডেট করা যায়নি' });
    }
});

router.delete('/:id', requireAdmin, async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: 'আইডি সঠিক নয়' });
    try {
        const c = await Coupon.findByIdAndDelete(req.params.id);
        if (!c) return res.status(404).json({ error: 'কুপন পাওয়া যায়নি' });
        res.json({ message: 'কুপন মুছে ফেলা হয়েছে' });
    } catch {
        res.status(500).json({ error: 'মুছতে সমস্যা হয়েছে' });
    }
});

export default router;
