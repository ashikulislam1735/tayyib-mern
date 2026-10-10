import express from 'express';
import Order from '../models/Order.js';
import { requireAdmin } from '../middleware/auth.js';
import { buildCustomers, cleanPhone } from '../utils/customers.js';

const router = express.Router();
router.use(requireAdmin);

// GET /api/customers?q=... — ফোন ধরে কাস্টমারের সারাংশ (সর্বশেষ অর্ডার আগে)
router.get('/', async (req, res) => {
    try {
        const orders = await Order.find().select('phone customerName status total createdAt').lean();
        let list = buildCustomers(orders);
        const q = typeof req.query.q === 'string' ? req.query.q.trim().toLowerCase().slice(0, 60) : '';
        if (q) list = list.filter((c) => c.phone.includes(q) || c.name.toLowerCase().includes(q));
        res.json(list.slice(0, 500));
    } catch {
        res.status(500).json({ error: 'কাস্টমারের তালিকা আনতে সমস্যা হয়েছে' });
    }
});

// GET /api/customers/:phone — একজনের সব অর্ডার
router.get('/:phone', async (req, res) => {
    const phone = cleanPhone(req.params.phone);
    if (!/^[0-9+]{5,15}$/.test(phone)) return res.status(400).json({ error: 'ফোন নম্বর সঠিক নয়' });
    try {
        const orders = await Order.find({ phone }).sort({ createdAt: -1 }).limit(200).lean();
        if (orders.length === 0) return res.status(404).json({ error: 'এই নম্বরে কোনো অর্ডার নেই' });
        res.json(orders);
    } catch {
        res.status(500).json({ error: 'অর্ডারের ইতিহাস আনতে সমস্যা হয়েছে' });
    }
});

export default router;
