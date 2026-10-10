import express from 'express';
import Order from '../models/Order.js';
import Expense from '../models/Expense.js';
import { requireAdmin } from '../middleware/auth.js';

const router = express.Router();
const TIME_ZONE = 'Asia/Dhaka';
const DAY_MS = 24 * 60 * 60 * 1000;
// বাতিল ও ফেরত অর্ডারের বিক্রি ধরা হয় না
const COUNTS = { $not: [{ $in: ['$status', ['cancelled', 'returned']] }] };

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
                    fees: { $add: [{ $ifNull: ['$courierCost', 0] }, { $ifNull: ['$packagingCost', 0] }] },
                    cogs: { $sum: { $map: { input: { $ifNull: ['$items', []] }, as: 'i', in: { $multiply: [{ $ifNull: ['$$i.costPrice', 0] }, { $ifNull: ['$$i.quantity', 0] }] } } } },
                    day: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: TIME_ZONE } },
                } },
                { $group: {
                    _id: '$day',
                    orders: { $sum: { $cond: [COUNTS, 1, 0] } },
                    sales: { $sum: { $cond: [COUNTS, '$total', 0] } },
                    cogs: { $sum: { $cond: [COUNTS, '$cogs', 0] } },
                    // কুরিয়ার ও প্যাকেজিং খরচ: ফেরত অর্ডারেও লাগে (লোকসান), বাতিল অর্ডারে লাগে না
                    fees: { $sum: { $cond: [{ $ne: ['$status', 'cancelled'] }, '$fees', 0] } },
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
            // শেষ ৩০ দিনের সেরা ৫ প্রোডাক্ট (বাতিল অর্ডার বাদে)
            Order.aggregate([
                { $match: { status: { $nin: ['cancelled', 'returned'] }, createdAt: { $gte: thirtyStart, $lt: tomorrowStart } } },
                { $unwind: '$items' },
                { $group: {
                    _id: '$items.title',
                    quantity: { $sum: '$items.quantity' },
                    revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
                } },
                { $sort: { quantity: -1, revenue: -1 } },
                { $limit: 5 },
                { $project: { _id: 0, title: '$_id', quantity: 1, revenue: 1 } },
            ]),
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
                cogs: money(orderRow?.cogs),
                fees: money(orderRow?.fees),
                orders: orderRow?.orders || 0,
                expenses: money(expensesByDay.get(date)),
            });
        }

        function summarize(fromDate) {
            const days = daily.filter((row) => row.date >= fromDate);
            const sales = money(days.reduce((sum, row) => sum + row.sales, 0));
            const expenses = money(days.reduce((sum, row) => sum + row.expenses, 0));
            const cogs = money(days.reduce((sum, row) => sum + row.cogs, 0));
            const fees = money(days.reduce((sum, row) => sum + row.fees, 0));
            const orders = days.reduce((sum, row) => sum + row.orders, 0);
            return { orders, sales, cogs, fees, expenses, net: money(sales - expenses), profit: money(sales - cogs - fees - expenses) };
        }

        const statusCounts = { pending: 0, confirmed: 0, delivered: 0, cancelled: 0, returned: 0 };
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
