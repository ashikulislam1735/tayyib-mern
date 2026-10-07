import express from 'express';
import Product from '../models/Product.js';
import { requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// GET /api/products — সব প্রোডাক্ট (ঐচ্ছিক ?category= ফিল্টার সহ)
router.get('/', async (req, res) => {
    try {
        const filter = req.query.category ? { category: req.query.category } : {};
        const products = await Product.find(filter).sort({ createdAt: -1 });
        res.json(products);
    } catch (err) {
        res.status(500).json({ error: 'প্রোডাক্ট লোড করতে সমস্যা হয়েছে' });
    }
});

// GET /api/products/:id — একটা নির্দিষ্ট প্রোডাক্টের বিস্তারিত
router.get('/:id', async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) return res.status(404).json({ error: 'প্রোডাক্ট পাওয়া যায়নি' });
        res.json(product);
    } catch (err) {
        res.status(400).json({ error: 'অবৈধ প্রোডাক্ট ID' });
    }
});

// POST /api/products — নতুন প্রোডাক্ট যোগ (শুধু অ্যাডমিন)
router.post('/', requireAdmin, async (req, res) => {
    try {
        const product = await Product.create(req.body);
        res.status(201).json(product);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// PUT /api/products/:id — প্রোডাক্ট এডিট (শুধু অ্যাডমিন)
router.put('/:id', requireAdmin, async (req, res) => {
    try {
        const product = await Product.findByIdAndUpdate(req.params.id, req.body, {
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
