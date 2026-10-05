import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Admin from '../models/Admin.js';

const router = express.Router();

// POST /api/auth/login — username + password দিয়ে লগইন, সফল হলে JWT টোকেন ফেরত দেয়
router.post('/login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'ইউজারনেম ও পাসওয়ার্ড দিন' });
    }

    const admin = await Admin.findOne({ username });
    if (!admin) {
        return res.status(401).json({ error: 'ভুল ইউজারনেম বা পাসওয়ার্ড' });
    }

    const match = await bcrypt.compare(password, admin.passwordHash);
    if (!match) {
        return res.status(401).json({ error: 'ভুল ইউজারনেম বা পাসওয়ার্ড' });
    }

    const token = jwt.sign(
        { id: admin._id, username: admin.username },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
    );

    res.json({ token, username: admin.username });
});

export default router;
