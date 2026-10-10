import express from 'express';
import Product from '../models/Product.js';
import { requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// GET /api/products — সব প্রোডাক্ট (ঐচ্ছিক ?category= ফিল্টার সহ)
router.get('/', async (req, res) => {
    try {
        const filter = req.query.category ? { category: req.query.category } : {};
        const products = await Product.find(filter).select('-variants.costPrice').sort({ createdAt: -1 });
        res.json(products);
    } catch (err) {
        res.status(500).json({ error: 'প্রোডাক্ট লোড করতে সমস্যা হয়েছে' });
    }
});

// ---------- বাল্ক ইমপোর্ট (CSV থেকে আসা সারি) ----------
const BN = '০১২৩৪৫৬৭৮৯';
const s = (v, max = 500) => (v == null ? '' : String(v).trim().slice(0, max));
// বাংলা অঙ্ক, কমা, ৳ চিহ্ন সামলে সংখ্যা বানায়; খালি হলে null
const num = (v) => {
    const t = s(v, 30).replace(/[০-৯]/g, (d) => BN.indexOf(d)).replace(/[,\s৳]/g, '');
    return t === '' ? null : Number(t);
};
const isUrl = (v) => /^https?:\/\//i.test(v);

// POST /api/products/bulk — শুধু অ্যাডমিন। body: { rows: [...], dryRun: true/false }
// প্রতিটা সারি = একটা ভ্যারিয়েন্ট। একই title + category-র সারিগুলো একটা প্রোডাক্টে জোড়া লাগে।
// কোনো সারিতে ভুল থাকলে কিছুই ঢোকে না। আগে থেকে থাকা (একই title + category) প্রোডাক্ট বাদ যায়।
router.post('/bulk', requireAdmin, async (req, res) => {
    try {
        const { rows, dryRun } = req.body || {};
        if (!Array.isArray(rows) || rows.length === 0) {
            return res.status(400).json({ error: 'কোনো সারি পাওয়া যায়নি' });
        }
        if (rows.length > 500) {
            return res.status(400).json({ error: 'একসাথে সর্বোচ্চ ৫০০ সারি ইমপোর্ট করা যাবে' });
        }

        const errors = [];
        const groups = new Map();

        rows.forEach((r, idx) => {
            const line = Number(r && r._line) || idx + 2;
            const err = (message) => errors.push({ line, message });
            if (!r || typeof r !== 'object') return err('অবৈধ সারি');

            const title = s(r.title, 200);
            const category = s(r.category, 60);
            const label = s(r.variantLabel, 60);
            const price = num(r.price);
            const original = num(r.originalPrice);
            let stock = num(r.stock);

            if (!title) return err('title খালি');
            if (!category) return err('category খালি');
            if (!label) return err('variantLabel খালি (যেমন: ৫০০ গ্রাম)');
            if (price === null || !Number.isFinite(price) || price < 0) return err('price সঠিক সংখ্যা নয়');
            if (original !== null && (!Number.isFinite(original) || original < price)) {
                return err('originalPrice, price-এর চেয়ে কম হতে পারে না');
            }
            const cost = req.admin.role === 'owner' ? num(r.costPrice) : null;
            if (cost !== null && (!Number.isFinite(cost) || cost < 0)) return err('costPrice সঠিক সংখ্যা নয়');
            if (stock === null) stock = 0;
            if (!Number.isInteger(stock) || stock < 0) return err('stock পূর্ণ সংখ্যা হতে হবে');

            const key = `${title}||${category}`;
            let g = groups.get(key);
            if (!g) {
                const images = s(r.images, 3000).split('|').map((u) => u.trim()).filter(Boolean).slice(0, 10);
                if (images.some((u) => !isUrl(u))) return err('images-এর প্রতিটা লিংক https:// দিয়ে শুরু হতে হবে (একাধিক হলে | দিয়ে আলাদা)');
                const videoUrl = s(r.videoUrl, 300);
                if (videoUrl && !isUrl(videoUrl)) return err('videoUrl https:// দিয়ে শুরু হতে হবে');

                g = {
                    key,
                    title,
                    category,
                    subCategory: s(r.subCategory, 60),
                    shortDescription: s(r.shortDescription, 200),
                    description: s(r.description, 3000),
                    icon: s(r.icon, 10) || '🛍️',
                    images,
                    videoUrl,
                    variants: [],
                };
                groups.set(key, g);
            }
            if (g.variants.some((v) => v.label === label)) {
                return err(`"${title}"-এ "${label}" ভ্যারিয়েন্ট আগেই আছে`);
            }
            g.variants.push({ label, price, ...(original !== null ? { originalPrice: original } : {}), ...(cost !== null ? { costPrice: cost } : {}), stock });
        });

        if (errors.length > 0) {
            return res.json({ ok: false, errors: errors.slice(0, 50), errorCount: errors.length });
        }

        const existing = await Product.find({}, 'title category').lean();
        const existingKeys = new Set(existing.map((p) => `${String(p.title).trim()}||${String(p.category).trim()}`));

        const fresh = [];
        const skipped = [];
        for (const g of groups.values()) (existingKeys.has(g.key) ? skipped : fresh).push(g);

        if (!dryRun && fresh.length > 0) {
            await Product.insertMany(fresh.map(({ key, ...p }) => p));
        }

        res.json({
            ok: true,
            dryRun: !!dryRun,
            newCount: fresh.length,
            variantCount: fresh.reduce((sum, g) => sum + g.variants.length, 0),
            skipped: skipped.map((g) => g.title),
            errors: [],
        });
    } catch (err) {
        res.status(500).json({ error: 'ইমপোর্টে সমস্যা হয়েছে: ' + err.message });
    }
});

// GET /api/products/admin/list — ক্রয়মূল্যসহ সব প্রোডাক্ট (শুধু অ্যাডমিন)
router.get('/admin/list', requireAdmin, async (req, res) => {
    try {
        const q = Product.find().sort({ createdAt: -1 });
        if (req.admin.role !== 'owner') q.select('-variants.costPrice'); // স্টাফ ক্রয়মূল্য দেখে না
        res.json(await q);
    } catch (err) {
        res.status(500).json({ error: 'প্রোডাক্ট লোড করতে সমস্যা হয়েছে' });
    }
});

// GET /api/products/:id — একটা নির্দিষ্ট প্রোডাক্টের বিস্তারিত
router.get('/:id', async (req, res) => {
    try {
        const product = await Product.findById(req.params.id).select('-variants.costPrice');
        if (!product) return res.status(404).json({ error: 'প্রোডাক্ট পাওয়া যায়নি' });
        res.json(product);
    } catch (err) {
        res.status(400).json({ error: 'অবৈধ প্রোডাক্ট ID' });
    }
});

// POST /api/products — নতুন প্রোডাক্ট যোগ (শুধু অ্যাডমিন)
router.post('/', requireAdmin, async (req, res) => {
    try {
        const body = { ...req.body };
        if (req.admin.role !== 'owner' && Array.isArray(body.variants)) {
            body.variants = body.variants.map((v) => ({ ...v, costPrice: 0 })); // স্টাফ ক্রয়মূল্য বসাতে পারে না
        }
        const product = await Product.create(body);
        res.status(201).json(product);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// PUT /api/products/:id — প্রোডাক্ট এডিট (শুধু অ্যাডমিন)
router.put('/:id', requireAdmin, async (req, res) => {
    try {
        const body = { ...req.body };
        if (req.admin.role !== 'owner' && Array.isArray(body.variants)) {
            // স্টাফ এডিট করলে আগের ক্রয়মূল্য (সাইজের নাম মিলিয়ে) অক্ষত থাকে
            const existing = await Product.findById(req.params.id).lean();
            const old = new Map(((existing && existing.variants) || []).map((v) => [v.label, v.costPrice || 0]));
            body.variants = body.variants.map((v) => ({ ...v, costPrice: old.get(v.label) || 0 }));
        }
        const product = await Product.findByIdAndUpdate(req.params.id, body, {
            new: true,
            runValidators: true,
        });
        if (!product) return res.status(404).json({ error: 'প্রোডাক্ট পাওয়া যায়নি' });
        res.json(product);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// DELETE /api/products/:id — প্রোডাক্ট ডিলিট (শুধু অ্যাডমিন)
router.delete('/:id', requireAdmin, async (req, res) => {
    try {
        const product = await Product.findByIdAndDelete(req.params.id);
        if (!product) return res.status(404).json({ error: 'প্রোডাক্ট পাওয়া যায়নি' });
        res.json({ message: 'প্রোডাক্ট ডিলিট হয়েছে' });
    } catch (err) {
        res.status(400).json({ error: 'অবৈধ প্রোডাক্ট ID' });
    }
});

export default router;
