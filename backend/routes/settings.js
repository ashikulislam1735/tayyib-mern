import express from 'express';
import Setting from '../models/Setting.js';
import { requireAdmin } from '../middleware/auth.js';

const router = express.Router();

const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
// শুধু https:// বা http:// লিংক চলবে (javascript: ইত্যাদি বন্ধ)
const url = (v) => {
    const s = str(v, 300);
    return s === '' || /^https?:\/\//i.test(s) ? s : null;
};
const digits = (v, max) => str(v, max + 10).replace(/[^\d]/g, '').slice(0, max);

// ইনপুট পরিষ্কার করে শুধু জানা ঘরগুলো রাখে
function clean(body = {}) {
    const social = body.social || {};
    const about = body.about || {};

    const facebook = url(social.facebook);
    const instagram = url(social.instagram);
    const youtube = url(social.youtube);
    if (facebook === null || instagram === null || youtube === null) {
        throw new Error('সোশ্যাল লিংক https:// দিয়ে শুরু হতে হবে');
    }

    const phone = str(body.phone, 20).replace(/[^\d+]/g, '');

    return {
        name: str(body.name, 40) || 'Tayyib',
        tagline: str(body.tagline, 100),
        phone,
        email: str(body.email, 100),
        address: str(body.address, 200),
        openHours: str(body.openHours, 100),
        social: { facebook, instagram, youtube, whatsapp: digits(social.whatsapp, 15) },
        about: {
            title: str(about.title, 80) || 'আমাদের সম্পর্কে',
            paragraphs: (Array.isArray(about.paragraphs) ? about.paragraphs : [])
                .map((p) => str(p, 1500)).filter(Boolean).slice(0, 10),
            highlights: (Array.isArray(about.highlights) ? about.highlights : [])
                .map((h) => ({ title: str(h && h.title, 60), text: str(h && h.text, 300) }))
                .filter((h) => h.title || h.text).slice(0, 8),
        },
    };
}

// GET /api/settings — সবার জন্য। কিছু সেভ করা না থাকলে {} (ফ্রন্টএন্ড ডিফল্ট ব্যবহার করবে)
router.get('/', async (req, res) => {
    try {
        const doc = await Setting.findOne({ key: 'site' });
        res.json(doc ? doc.data : {});
    } catch (err) {
        res.status(500).json({ error: 'সেটিংস লোড করতে সমস্যা হয়েছে' });
    }
});

// PUT /api/settings — শুধু অ্যাডমিন
router.put('/', requireAdmin, async (req, res) => {
    try {
        const data = clean(req.body);
        await Setting.findOneAndUpdate({ key: 'site' }, { key: 'site', data }, { upsert: true, new: true });
        res.json(data);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

export default router;
