import express from 'express';
import Category from '../models/Category.js';
import { requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// GET /api/categories — সবার জন্য, [{ name, image }]
router.get('/', async (req, res) => {
    try {
        const list = await Category.find({}, 'name image -_id');
        res.json(list);
    } catch (err) {
        res.status(500).json({ error: 'ক্যাটাগরির ছবি লোড করতে সমস্যা হয়েছে' });
    }
});

// PUT /api/categories — শুধু অ্যাডমিন। { name, image } দিলে ছবি সেট/বদল, image খালি দিলে ছবি মুছে যায়
router.put('/', requireAdmin, async (req, res) => {
    try {
        const name = typeof req.body.name === 'string' ? req.body.name.trim().slice(0, 60) : '';
        const image = typeof req.body.image === 'string' ? req.body.image.trim() : '';

        if (!name) return res.status(400).json({ error: 'ক্যাটাগরির নাম দরকার' });
        if (image && !/^https?:\/\//i.test(image)) {
            return res.status(400).json({ error: 'ছবির লিংক https:// দিয়ে শুরু হতে হবে' });
        }

        if (!image) {
            await Category.deleteOne({ name });
            return res.json({ name, image: '' });
        }

        const doc = await Category.findOneAndUpdate(
            { name },
            { name, image },
            { upsert: true, new: true, runValidators: true }
        );
        res.json({ name: doc.name, image: doc.image });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

export default router;
