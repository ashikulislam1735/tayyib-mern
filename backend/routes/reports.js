import express from 'express';
import Order from '../models/Order.js';
import Expense from '../models/Expense.js';
import { requireAdmin } from '../middleware/auth.js';

const router = express.Router();
const TIME_ZONE = 'Asia/Dhaka';
const DAY_MS = 24 * 60 * 60 * 1000;

function dhakaDateString(date) {
    return new Intl.DateTimeFormat('en-CA', {
        timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(date);
}

function dateAtDhakaStart(dateString) {
    return new Date(`${dateString}T00:00:00.000+06:00`);
}

function addDays(dateString, amount) {
    const date = dateAtDhakaStart(dateString);
    date.setTime(date.getTime() + amount * DAY_MS);
    return dhakaDateString(date);
}

function money(value) {
    return Math.round((Number(value) || 0) * 100) / 100;
}

router.use(requireAdmin);

router.get('/summary', async (req, res) => {
    try {
        const todayString = dhakaDateString(new Date());
        const todayStart = dateAtDhakaStart(todayString);
        const sevenStart = dateAtDhakaStart(addDays(todayString, -6));
        const thirtyStart = dateAtDhakaStart(addDays(todayString, -29));
        const tomorrowStart = dateAtDhakaStart(addDays(todayString, 1));

        const [periodOrders, periodExpenses, statusRows, productRows, deliveredRows] = await Promise.all([
            Order.aggregate([
                { $match: { createdAt: { $gte: thirtyStart, $lt: tomorrowStart } } },
                { $project: {
                    status: 1, total: { $ifNull: ['$total', 0] },
                    day: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: TIME_ZONE } },
                } },
                { $group: {
                    _id: '$day',
                    orders: { $sum: 1 },
                    sales: { $sum: { $cond: [{ $ne: ['$status', 'cancelled'] }, '$total', 0] } },
                } },
            ]),
            Expense.aggregate([
                { $match: { date: { $gte: thirtyStart, $lt: tomorrowStart } } },
                { $project: {
                    amount: 1,
                    day: { $dateToString: { format: '%Y-%m-%d', date: '$date', timezone: TIME_ZONE } },
                } },
                { $group: { _id: '$day', expenses: { $sum: '$amount' } } },
            ]),
            Order.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
            Order.aggregate([
                { $match: { status: 'delivered', createdAt: { $gte: thirtyStart, $lt: tomorrowStart } } },
                { $group: { _id: null, sales: { $sum: { $ifNull: ['$total', 0] } } } },
            ]),
        ]);

        const salesByDay = new Map(periodOrders.map((row) => [row._id, row]));
        const expensesByDay = new Map(periodExpenses.map((row) => [row._id, row.expenses]));
        const daily = [];
        for (let offset = -29; offset <= 0; offset += 1) {
            const date = addDays(todayString, offset);
            const orderRow = salesByDay.get(date);
            daily.push({
                date,
                sales: money(orderRow?.sales),
                orders: orderRow?.orders || 0,
                expenses: money(expensesByDay.get(date)),
            });
        }

        function summarize(fromDate) {
            const days = daily.filter((row) => row.date >= fromDate);
            const sales = money(days.reduce((sum, row) => sum + row.sales, 0));
            const expenses = money(days.reduce((sum, row) => sum + row.expenses, 0));
            const orders = days.reduce((sum, row) => sum + row.orders, 0);
            return { orders, sales, expenses, net: money(sales - expenses) };
        }

        const statusCounts = { pending: 0, confirmed: 0, delivered: 0, cancelled: 0 };
        for (const row of statusRows) {
            if (Object.hasOwn(statusCounts, row._id)) statusCounts[row._id] = row.count;
        }

        res.json({
            today: summarize(todayString),
            last7Days: summarize(addDays(todayString, -6)),
            last30Days: summarize(addDays(todayString, -29)),
            deliveredSales30Days: money(deliveredRows[0]?.sales),
            statusCounts,
            daily,
            topProducts: productRows.map((row) => ({
                title: row.title,
                quantity: row.quantity,
                revenue: money(row.revenue),
            })),
        });
    } catch (error) {
        console.error('রিপোর্ট তৈরি করতে সমস্যা হয়েছে:', error);
        res.status(500).json({ error: 'রিপোর্ট তৈরি করতে সমস্যা হয়েছে' });
    }
});

export default router;
