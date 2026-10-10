import express from 'express';
import bcrypt from 'bcryptjs';
import Admin from '../models/Admin.js';
import { requireAdmin, requireOwner } from '../middleware/auth.js';

const router = express.Router();
router.use(requireAdmin, requireOwner);

const ROLES = ['owner', 'staff'];
const USERNAME_RE = /^[A-Za-z0-9_.-]{3,30}$/;

const view = (a) => ({ id: String(a._id), username: a.username, role: a.role || 'owner', createdAt: a.createdAt });

async function ownerCount() {
    // role না থাকা পুরোনো অ্যাডমিনও মালিক
    return Admin.countDocuments({ $or: [{ role: 'owner' }, { role: { $exists: false } }] });
}

// GET /api/admins — সব অ্যাডমিনের তালিকা
router.get('/', async (req, res) => {
    try {
        const admins = await Admin.find().sort({ createdAt: 1 }).lean();
        res.json(admins.map(view));
    } catch {
        res.status(500).json({ error: 'তালিকা আনতে সমস্যা হয়েছে' });
    }
});

// POST /api/admins — নতুন অ্যাডমিন
router.post('/', async (req, res) => {
    try {
        const username = String(req.body.username || '').trim();
        const password = String(req.body.password || '');
        const role = req.body.role === undefined ? 'staff' : req.body.role;

        if (!USERNAME_RE.test(username)) {
            return res.status(400).json({ error: 'ইউজারনেম ৩-৩০ অক্ষরের হতে হবে (ইংরেজি অক্ষর, সংখ্যা, _ . - চলবে)' });
        }
        if (password.length < 8) {
            return res.status(400).json({ error: 'পাসওয়ার্ড কমপক্ষে ৮ অক্ষরের হতে হবে' });
        }
        if (!ROLES.includes(role)) {
            return res.status(400).json({ error: 'ভূমিকা সঠিক নয়' });
        }
        if (await Admin.findOne({ username })) {
            return res.status(400).json({ error: 'এই ইউজারনেম আগে থেকেই আছে' });
        }

        const admin = await Admin.create({ username, passwordHash: await bcrypt.hash(password, 10), role });
        res.status(201).json(view(admin));
    } catch (err) {
        res.status(500).json({ error: 'অ্যাডমিন বানাতে সমস্যা হয়েছে' });
    }
});

// PUT /api/admins/:id — ভূমিকা বদলানো এবং/অথবা পাসওয়ার্ড রিসেট
router.put('/:id', async (req, res) => {
    try {
        const admin = await Admin.findById(req.params.id);
        if (!admin) return res.status(404).json({ error: 'অ্যাডমিন পাওয়া যায়নি' });

        if (req.body.role !== undefined) {
            if (!ROLES.includes(req.body.role)) return res.status(400).json({ error: 'ভূমিকা সঠিক নয়' });
            const currentlyOwner = (admin.role || 'owner') === 'owner';
            if (currentlyOwner && req.body.role !== 'owner' && (await ownerCount()) <= 1) {
                return res.status(400).json({ error: 'শেষ মালিককে স্টাফ বানানো যাবে না' });
            }
            admin.role = req.body.role;
        }

        if (req.body.password !== undefined) {
            const password = String(req.body.password);
            if (password.length < 8) return res.status(400).json({ error: 'পাসওয়ার্ড কমপক্ষে ৮ অক্ষরের হতে হবে' });
            admin.passwordHash = await bcrypt.hash(password, 10);
        }

        await admin.save();
        res.json(view(admin));
    } catch {
        res.status(500).json({ error: 'আপডেট করতে সমস্যা হয়েছে' });
    }
});

// DELETE /api/admins/:id
router.delete('/:id', async (req, res) => {
    try {
        if (String(req.params.id) === req.admin.id) {
            return res.status(400).json({ error: 'নিজের আইডি মোছা যাবে না' });
        }
        const admin = await Admin.findById(req.params.id);
        if (!admin) return res.status(404).json({ error: 'অ্যাডমিন পাওয়া যায়নি' });
        if ((admin.role || 'owner') === 'owner' && (await ownerCount()) <= 1) {
            return res.status(400).json({ error: 'শেষ মালিককে মোছা যাবে না' });
        }
        await admin.deleteOne();
        res.json({ message: 'মুছে ফেলা হয়েছে' });
    } catch {
        res.status(500).json({ error: 'মুছতে সমস্যা হয়েছে' });
    }
});

export default router;
