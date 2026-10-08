import express from 'express';
import Banner from '../models/Banner.js';
import { requireAdmin } from '../middleware/auth.js';

const router = express.Router();

const sortOrder = { order: 1, createdAt: -1 };

// GET /api/banners — সবার জন্য, শুধু চালু ব্যানার
router.get('/', async (req, res) => {
    try {
        const banners = await Banner.find({ active: true }).sort(sortOrder);
        res.json(banners);
    } catch (err) {
        res.status(500).json({ error: 'ব্যানার লোড করতে সমস্যা হয়েছে' });
    }
});

// GET /api/banners/all — শুধু অ্যাডমিন, বন্ধ করা ব্যানারসহ সব
router.get('/all', requireAdmin, async (req, res) => {
    try {
        const banners = await Banner.find().sort(sortOrder);
        res.json(banners);
    } catch (err) {
        res.status(500).json({ error: 'ব্যানার লোড করতে সমস্যা হয়েছে' });
    }
});

// POST /api/banners — নতুন ব্যানার (শুধু অ্যাডমিন)
router.post('/', requireAdmin, async (req, res) => {
    try {
        const { image, position, title, link, order, active } = req.body;
        const banner = await Banner.create({ image, position, title, link, order, active });
        res.status(201).json(banner);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// PUT /api/banners/:id — ব্যানার আপডেট (শুধু অ্যাডমিন)
router.put('/:id', requireAdmin, async (req, res) => {
    try {
        const { image, position, title, link, order, active } = req.body;
        const banner = await Banner.findByIdAndUpdate(
            req.params.id,
            { image, position, title, link, order, active },
            { new: true, runValidators: true }
        );
        if (!banner) return res.status(404).json({ error: 'ব্যানার পাওয়া যায়নি' });
        res.json(banner);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// DELETE /api/banners/:id — ব্যানার মোছা (শুধু অ্যাডমিন)
router.delete('/:id', requireAdmin, async (req, res) => {
    try {
        const banner = await Banner.findByIdAndDelete(req.params.id);
        if (!banner) return res.status(404).json({ error: 'ব্যানার পাওয়া যায়নি' });
        res.json({ ok: true });
    } catch (err) {
        res.status(400).json({ error: 'অবৈধ ব্যানার ID' });
    }
});

export default router;
