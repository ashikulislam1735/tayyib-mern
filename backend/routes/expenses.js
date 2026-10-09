import express from 'express';
import mongoose from 'mongoose';
import Expense from '../models/Expense.js';
import { requireAdmin } from '../middleware/auth.js';

const router = express.Router();
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function parseDhakaDate(value, endOfDay = false) {
    if (typeof value !== 'string' || !DATE_RE.test(value)) return null;
    const [year, month, day] = value.split('-').map(Number);
    const check = new Date(Date.UTC(year, month - 1, day));
    if (check.getUTCFullYear() !== year || check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day) return null;
    return new Date(`${value}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}+06:00`);
}

router.use(requireAdmin);

// GET /api/expenses?from=YYYY-MM-DD&to=YYYY-MM-DD
router.get('/', async (req, res) => {
    try {
        const filter = {};
        if (req.query.from !== undefined) {
            const from = parseDhakaDate(req.query.from);
            if (!from) return res.status(400).json({ error: 'শুরুর তারিখ সঠিক নয়' });
            filter.date = { ...filter.date, $gte: from };
        }
        if (req.query.to !== undefined) {
            const to = parseDhakaDate(req.query.to, true);
            if (!to) return res.status(400).json({ error: 'শেষের তারিখ সঠিক নয়' });
            filter.date = { ...filter.date, $lte: to };
        }
        if (filter.date?.$gte && filter.date?.$lte && filter.date.$gte > filter.date.$lte) {
            return res.status(400).json({ error: 'শুরুর তারিখ শেষের তারিখের পরে হতে পারবে না' });
        }
        const expenses = await Expense.find(filter).sort({ date: -1, createdAt: -1 }).limit(500).lean();
        res.json(expenses);
    } catch {
        res.status(500).json({ error: 'খরচের তালিকা আনতে সমস্যা হয়েছে' });
    }
});

// POST /api/expenses
router.post('/', async (req, res) => {
    try {
        const body = req.body || {};
        if (typeof body.amount !== 'number' || !Number.isFinite(body.amount) || body.amount <= 0 || body.amount > 1000000000) {
            return res.status(400).json({ error: 'খরচের পরিমাণ শূন্যের বেশি এবং ১০০ কোটি বা তার কম হতে হবে' });
        }
        if (body.note !== undefined && (typeof body.note !== 'string' || body.note.trim().length > 200)) {
            return res.status(400).json({ error: 'বিবরণ সর্বোচ্চ ২০০ অক্ষরের হতে হবে' });
        }
        if (body.category !== undefined && (typeof body.category !== 'string' || body.category.trim().length > 40)) {
            return res.status(400).json({ error: 'খরচের ধরন সর্বোচ্চ ৪০ অক্ষরের হতে হবে' });
        }
        const date = body.date === undefined || body.date === '' ? new Date() : parseDhakaDate(body.date);
        if (!date) return res.status(400).json({ error: 'তারিখ YYYY-MM-DD ফরম্যাটে দিন' });

        const expense = await Expense.create({
            amount: Math.round(body.amount * 100) / 100,
            note: (body.note || '').trim(),
            category: (body.category || '').trim(),
            date,
        });
        res.status(201).json(expense);
    } catch {
        res.status(500).json({ error: 'খরচ সংরক্ষণ করা যায়নি' });
    }
});

// DELETE /api/expenses/:id
router.delete('/:id', async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) {
        return res.status(400).json({ error: 'খরচের আইডি সঠিক নয়' });
    }
    try {
        const expense = await Expense.findByIdAndDelete(req.params.id);
        if (!expense) return res.status(404).json({ error: 'খরচটি পাওয়া যায়নি' });
        res.json({ message: 'খরচ মুছে ফেলা হয়েছে' });
    } catch {
        res.status(500).json({ error: 'খরচ মুছে ফেলতে সমস্যা হয়েছে' });
    }
});

export default router;
