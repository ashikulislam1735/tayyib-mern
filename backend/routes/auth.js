import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Admin from '../models/Admin.js';
import { requireAdmin } from '../middleware/auth.js';
import { loginLimiter, recordLoginFailure, recordLoginSuccess } from '../middleware/loginLimiter.js';

const router = express.Router();

// POST /api/auth/login — username + password দিয়ে লগইন, সফল হলে JWT টোকেন ফেরত দেয়
router.post('/login', loginLimiter, async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password || typeof username !== 'string' || typeof password !== 'string') {
        return res.status(400).json({ error: 'ইউজারনেম ও পাসওয়ার্ড দিন' });
    }

    const admin = await Admin.findOne({ username });
    if (!admin) {
        recordLoginFailure(req);
        return res.status(401).json({ error: 'ভুল ইউজারনেম বা পাসওয়ার্ড' });
    }

    const match = await bcrypt.compare(password, admin.passwordHash);
    if (!match) {
        recordLoginFailure(req);
        return res.status(401).json({ error: 'ভুল ইউজারনেম বা পাসওয়ার্ড' });
    }
    recordLoginSuccess(req);

    const token = jwt.sign(
        { id: admin._id, username: admin.username, role: admin.role || 'owner' },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
    );

    res.json({ token, username: admin.username, role: admin.role || 'owner' });
});

// POST /api/auth/change-password — লগইন করা অ্যাডমিন নিজের পাসওয়ার্ড বদলাবে
router.post('/change-password', requireAdmin, async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: 'বর্তমান ও নতুন পাসওয়ার্ড দিন' });
    }
    if (newPassword.length < 8) {
        return res.status(400).json({ error: 'নতুন পাসওয়ার্ড কমপক্ষে ৮ অক্ষরের হতে হবে' });
    }

    const admin = await Admin.findById(req.admin.id);
    if (!admin) {
        return res.status(404).json({ error: 'অ্যাডমিন পাওয়া যায়নি' });
    }

    const match = await bcrypt.compare(currentPassword, admin.passwordHash);
    if (!match) {
        return res.status(401).json({ error: 'বর্তমান পাসওয়ার্ড ভুল' });
    }

    admin.passwordHash = await bcrypt.hash(newPassword, 10);
    await admin.save();
    res.json({ message: 'পাসওয়ার্ড বদলানো হয়েছে' });
});

export default router;
