import express from 'express';
import Product from '../models/Product.js';
import StockLog from '../models/StockLog.js';
import Order from '../models/Order.js';
import Review from '../models/Review.js';
import { requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// GET /api/products — সব প্রোডাক্ট (ঐচ্ছিক ?category= ফিল্টার সহ)
router.get('/', async (req, res) => {
    try {
        const filter = req.query.category ? { category: String(req.query.category) } : {};

        // ঐচ্ছিক পেজিনেশন: ?page=1&limit=20 দিলে { items, total, page, pages } ফেরত আসে।
        // না দিলে আগের মতোই অ্যারে আসে (সর্বোচ্চ ১০০০টি), তাই বর্তমান সাইট ভাঙে না।
        if (req.query.page !== undefined) {
            const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
            const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
            // পেজ ধরে আনার সময় বাড়তি ফিল্টারও চলে: ?sub=সাব-ক্যাটাগরি &featured=true &q=খোঁজার-শব্দ
            if (req.query.sub) filter.subCategory = String(req.query.sub);
            if (req.query.featured === 'true') filter.featured = true;
            const q = String(req.query.q || '').trim().slice(0, 100);
            if (q) {
                const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
                filter.$or = [{ title: rx }, { category: rx }, { description: rx }];
            }
            const [items, total] = await Promise.all([
                Product.find(filter).select('-variants.costPrice').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
                Product.countDocuments(filter),
            ]);
            return res.json({ items, total, page, pages: Math.max(1, Math.ceil(total / limit)) });
        }

        const products = await Product.find(filter).select('-variants.costPrice').sort({ createdAt: -1 }).limit(1000);
        res.json(products);
    } catch (err) {
        res.status(500).json({ error: 'Could not load products' });
    }
});

// GET /api/products/categories — হেডারের মেনুর জন্য হালকা তালিকা: ক্যাটাগরি, আইকন, সংখ্যা, সাব-ক্যাটাগরি
// (আগে সাইট মেনু বানাতে সব প্রোডাক্ট টেনে আনত। এখন শুধু এই ছোট তালিকা আসে।)
// ক্রম আর আইকন আগের মতোই: যে ক্যাটাগরির নতুন প্রোডাক্ট আগে, সেটা আগে; আইকন সেই ক্যাটাগরির সবচেয়ে নতুন প্রোডাক্টের।
router.get('/categories', async (req, res) => {
    try {
        const rows = await Product.aggregate([
            { $sort: { createdAt: -1 } },
            { $group: { _id: '$category', icon: { $first: '$icon' }, count: { $sum: 1 }, newest: { $first: '$createdAt' }, subs: { $push: '$subCategory' } } },
            { $sort: { newest: -1 } },
        ]);
        res.json(rows.map((r) => ({
            name: r._id,
            icon: r.icon,
            count: r.count,
            subs: [...new Set(r.subs.filter(Boolean))],
        })));
    } catch (err) {
        res.status(500).json({ error: 'Could not load categories' });
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

// GET /api/products/top?limit=6 — গত ৩০ দিনে সবচেয়ে বেশি বিক্রি হওয়া প্রোডাক্ট (পাবলিক; শুধু প্রোডাক্ট ফেরত আসে, বিক্রির হিসাব নয়)
router.get('/top', async (req, res) => {
    try {
        const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 6, 1), 12);
        const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const rows = await Order.aggregate([
            { $match: { createdAt: { $gte: since }, status: { $nin: ['cancelled', 'returned'] } } },
            { $unwind: '$items' },
            { $match: { 'items.productId': { $ne: null } } },
            { $group: { _id: '$items.productId', qty: { $sum: '$items.quantity' } } },
            { $sort: { qty: -1 } },
            { $limit: limit },
        ]);
        const ids = rows.map((r) => r._id);
        const found = await Product.find({ _id: { $in: ids } }).select('-variants.costPrice');
        const byId = new Map(found.map((p) => [String(p._id), p]));
        res.json(ids.map((id) => byId.get(String(id))).filter(Boolean));
    } catch (err) {
        res.status(500).json({ error: 'Could not load best sellers' });
    }
});

// GET /api/products/sitemap.xml — গুগলের জন্য সাইটম্যাপ (পাবলিক পেজ, ক্যাটাগরি ও সব প্রোডাক্ট)
// Vercel-এর /sitemap.xml এখানে ঘুরিয়ে আনা হয় (frontend/vercel.json দেখুন)।
// সাইটের ঠিকানা আসে SITE_URL থেকে; সেট না থাকলে CORS_ORIGINS-এর প্রথম ঠিকানা।
router.get('/sitemap.xml', async (req, res) => {
    try {
        const base = (process.env.SITE_URL || (process.env.CORS_ORIGINS || '').split(',')[0] || '').trim().replace(/\/$/, '');
        if (!/^https?:\/\/[^\s<>"']+$/.test(base)) {
            return res.status(503).type('text/plain').send('SITE_URL or CORS_ORIGINS is not set');
        }
        const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
        const [products, categories] = await Promise.all([
            Product.find().select('_id updatedAt').sort({ updatedAt: -1 }).limit(5000).lean(),
            Product.distinct('category'),
        ]);

        const urls = ['/', '/offers', '/about', '/privacy', '/categories'].map((p) => ({ loc: `${base}${p}` }));
        categories.filter(Boolean).forEach((c) => urls.push({ loc: `${base}/category/${encodeURIComponent(c)}` }));
        products.forEach((p) => urls.push({ loc: `${base}/product/${p._id}`, lastmod: new Date(p.updatedAt).toISOString().slice(0, 10) }));

        const xml = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
            + urls.map((u) => `  <url><loc>${esc(u.loc)}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}</url>`).join('\n')
            + '\n</urlset>\n';
        res.set('Cache-Control', 'public, max-age=3600').type('application/xml').send(xml);
    } catch {
        res.status(500).type('text/plain').send('Could not generate sitemap');
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
        if (!product) return res.status(404).json({ error: 'Product not found' });
        res.json(product);
    } catch (err) {
        res.status(400).json({ error: 'Invalid product ID' });
    }
});

// POST /api/products — নতুন প্রোডাক্ট যোগ (শুধু অ্যাডমিন)
router.post('/', requireAdmin, async (req, res) => {
    try {
        const body = { ...req.body };
        delete body.ratingAvg; delete body.ratingCount; // রেটিং শুধু রিভিউ থেকে আসে
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
        delete body.ratingAvg; delete body.ratingCount; // রেটিং শুধু রিভিউ থেকে আসে
        if (req.admin.role !== 'owner' && Array.isArray(body.variants)) {
            // স্টাফ এডিট করলে আগের ক্রয়মূল্য (সাইজের নাম মিলিয়ে) অক্ষত থাকে
            const existing = await Product.findById(req.params.id).lean();
            const old = new Map(((existing && existing.variants) || []).map((v) => [v.label, v.costPrice || 0]));
            body.variants = body.variants.map((v) => ({ ...v, costPrice: old.get(v.label) || 0 }));
        }
        // স্টক: ফর্ম খোলার সময়ের স্টক (baseStock) আর সেভের সময়ের সংখ্যার পার্থক্যটুকুই এখনকার স্টকে যোগ/বিয়োগ হয়।
        // তাই ফর্ম খোলা থাকাকালীন অর্ডার এসে স্টক কমলে, সেভ করলে সেই কমানো স্টক আর মুছে যায় না।
        const stockLogs = [];
        if (Array.isArray(body.variants)) {
            const existing = await Product.findById(req.params.id).lean();
            if (existing) {
                const byLabel = new Map(existing.variants.map((v) => [v.label, v]));
                body.variants = body.variants.map((v) => {
                    const { origLabel, baseStock, ...rest } = v;
                    const cur = byLabel.get(origLabel ?? rest.label);
                    const base = Number(baseStock);
                    const typed = Number(rest.stock);
                    if (cur && baseStock !== undefined && baseStock !== null && Number.isFinite(base) && Number.isFinite(typed)) {
                        const delta = typed - base;
                        const newStock = Math.max(0, (Number(cur.stock) || 0) + delta);
                        if (newStock !== cur.stock) stockLogs.push({ label: rest.label, before: cur.stock, after: newStock });
                        return { ...rest, stock: newStock };
                    }
                    return rest; // নতুন সাইজ, বা পুরনো ফর্ম (baseStock নেই) — আগের মতো সরাসরি বসবে
                });
            } else {
                body.variants = body.variants.map(({ origLabel, baseStock, ...rest }) => rest);
            }
        }
        const product = await Product.findByIdAndUpdate(req.params.id, body, {
            new: true,
            runValidators: true,
        });
        if (!product) return res.status(404).json({ error: 'প্রোডাক্ট পাওয়া যায়নি' });
        for (const l of stockLogs) {
            try {
                const variant = product.variants.find((v) => v.label === l.label);
                await StockLog.create({
                    product: product._id, productTitle: product.title,
                    variantId: variant ? variant._id : product._id, variantLabel: l.label,
                    mode: l.after > l.before ? 'add' : 'subtract',
                    before: l.before, after: l.after, change: l.after - l.before,
                    reason: 'correction', note: 'প্রোডাক্ট এডিট ফর্ম থেকে', by: req.admin.username,
                });
            } catch (e) { console.error('স্টকের ইতিহাস লেখা যায়নি:', e.message); }
        }
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
        await Review.deleteMany({ product: product._id });
        res.json({ message: 'প্রোডাক্ট ডিলিট হয়েছে' });
    } catch (err) {
        res.status(400).json({ error: 'অবৈধ প্রোডাক্ট ID' });
    }
});

export default router;
