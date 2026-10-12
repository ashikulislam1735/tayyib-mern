import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { connectDB } from './config/db.js';
import productRoutes from './routes/products.js';
import orderRoutes from './routes/orders.js';
import authRoutes from './routes/auth.js';
import uploadRoutes from './routes/upload.js';
import bannerRoutes from './routes/banners.js';
import settingsRoutes from './routes/settings.js';
import categoryRoutes from './routes/categories.js';
import expenseRoutes from './routes/expenses.js';
import reportRoutes from './routes/reports.js';
import abandonedRoutes from './routes/abandoned.js';
import shippingRoutes from './routes/shipping.js';
import couponRoutes from './routes/coupons.js';
import customerRoutes from './routes/customers.js';
import adminRoutes from './routes/admins.js';
import reviewRoutes from './routes/reviews.js';
import stockRoutes from './routes/stock.js';
import { apiLimiter, orderCreateLimiter } from './middleware/rateLimiters.js';

// ⚠️ JWT_SECRET দুর্বল বা না থাকলে সার্ভার চালুই হবে না
const secret = process.env.JWT_SECRET || '';
if (secret.length < 32) {
    console.error('❌ JWT_SECRET নেই বা ৩২ অক্ষরের কম। Render Environment-এ কমপক্ষে ৩২ (রিকমেন্ডেড ৯৬) অক্ষরের র‍্যান্ডম মান বসান।');
    process.exit(1);
}

const app = express();

// Render/Vercel-এর মতো প্রক্সির পেছনে থাকলে আসল ক্লায়েন্ট IP পেতে (লগইন লিমিটারের জন্য জরুরি)
app.set('trust proxy', 1);

// CORS: CORS_ORIGINS-এ কমা দিয়ে অনুমোদিত ওয়েবসাইট দিন, যেমন:
//   CORS_ORIGINS=https://tayyib.vercel.app,https://www.tayyib.com
// না দিলে (শেখার/ডেভেলপমেন্ট মোডে) যেকোনো সাইট থেকে ডাকা যাবে — সার্ভার চালুর সময় সতর্কবার্তা দেখাবে।
const allowedOrigins = (process.env.CORS_ORIGINS || '')
    .split(',').map((o) => o.trim().replace(/\/$/, '')).filter(Boolean);

if (allowedOrigins.length === 0) {
    console.warn('⚠️ CORS_ORIGINS সেট করা নেই — ব্যাকএন্ড এখন যেকোনো ওয়েবসাইট থেকে ডাকা যাবে। আসল ব্যবসায় গেলে সীমাবদ্ধ করুন।');
    app.use(cors());
} else {
    app.use(cors({
        origin(origin, cb) {
            // origin না থাকলে (Postman, সার্ভার-টু-সার্ভার, UptimeRobot) ব্রাউজারের ঝুঁকি নেই, তাই চলবে
            if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
            return cb(null, false);
        },
    }));
}
app.use(express.json({ limit: '1mb' })); // প্রোডাক্ট বাল্ক ইমপোর্টের জন্য একটু বড় সীমা

// হালকা health-check — ডাটাবেজ ছোঁয় না, UptimeRobot-এর জন্য
app.get('/health', (req, res) => {
    res.status(200).json({ ok: true });
});

app.use('/api/auth', authRoutes);
// রিকোয়েস্টের সীমা: আগে সাধারণ সীমা, আর নতুন অর্ডারের (POST) জন্য আলাদা কড়া সীমা
app.use('/api', apiLimiter);
app.post('/api/orders', orderCreateLimiter);

app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/banners', bannerRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/abandoned', abandonedRoutes);
app.use('/api/shipping', shippingRoutes);
app.use('/api/coupons', couponRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/admins', adminRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/stock', stockRoutes);

app.get('/', (req, res) => {
    res.send('Tayyib MERN ব্যাকএন্ড চালু আছে ✅');
});

// অজানা /api ঠিকানা
app.use('/api', (req, res) => {
    res.status(404).json({ error: 'Not found' });
});

// সার্বজনীন এরর হ্যান্ডলার — কোনো অপ্রত্যাশিত ভুলে সার্ভার থেমে না গিয়ে পরিষ্কার বার্তা দেয়
app.use((err, req, res, next) => {
    if (err && err.type === 'entity.parse.failed') {
        return res.status(400).json({ error: 'Invalid request format' });
    }
    if (err && err.type === 'entity.too.large') {
        return res.status(413).json({ error: 'Request is too large' });
    }
    console.error('Unhandled error:', err);
    if (res.headersSent) return next(err);
    res.status(500).json({ error: 'Server error. Please try again.' });
});

// অপ্রত্যাশিত async ভুলে পুরো সার্ভার বন্ধ হওয়া ঠেকাতে শুধু লগ করা হয়
process.on('unhandledRejection', (reason) => {
    console.error('Unhandled rejection:', reason);
});

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
    app.listen(PORT, () => {
        console.log(`🚀 সার্ভার চলছে: http://localhost:${PORT}`);
    });
});
