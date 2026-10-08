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

// ⚠️ JWT_SECRET দুর্বল বা না থাকলে সার্ভার চালুই হবে না
const secret = process.env.JWT_SECRET || '';
if (secret.length < 32) {
    console.error('❌ JWT_SECRET নেই বা ৩২ অক্ষরের কম। Render Environment-এ কমপক্ষে ৩২ (রিকমেন্ডেড ৯৬) অক্ষরের র‍্যান্ডম মান বসান।');
    process.exit(1);
}

const app = express();

app.use(cors());
app.use(express.json({ limit: '1mb' })); // প্রোডাক্ট বাল্ক ইমপোর্টের জন্য একটু বড় সীমা

// হালকা health-check — ডাটাবেজ ছোঁয় না, UptimeRobot-এর জন্য
app.get('/health', (req, res) => {
    res.status(200).json({ ok: true });
});

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/banners', bannerRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/categories', categoryRoutes);

app.get('/', (req, res) => {
    res.send('Tayyib MERN ব্যাকএন্ড চালু আছে ✅');
});

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
    app.listen(PORT, () => {
        console.log(`🚀 সার্ভার চলছে: http://localhost:${PORT}`);
    });
});
