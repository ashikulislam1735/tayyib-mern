import 'dotenv/config';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { connectDB } from './config/db.js';
import Admin from './models/Admin.js';

// এই স্ক্রিপ্ট চালালে একটা অ্যাডমিন ইউজার তৈরি হবে (npm run seed:admin)
// ডিফল্ট ইউজারনেম/পাসওয়ার্ড নিচে — প্রথমবার লগইন করার পর চাইলে বদলে নিতে পারেন
const USERNAME = process.env.SEED_ADMIN_USERNAME || 'admin';
const PASSWORD = process.env.SEED_ADMIN_PASSWORD;

// নিরাপত্তা: কোডে কোনো ডিফল্ট পাসওয়ার্ড নেই। .env-এ নিজের মজবুত পাসওয়ার্ড দিতে হবে।
if (!PASSWORD || PASSWORD.length < 10) {
    console.error('❌ backend/.env ফাইলে SEED_ADMIN_PASSWORD দিন (কমপক্ষে ১০ অক্ষরের মজবুত পাসওয়ার্ড), তারপর আবার চালান।');
    process.exit(1);
}

async function run() {
    await connectDB();

    const existing = await Admin.findOne({ username: USERNAME });
    if (existing) {
        console.log(`⚠️  "${USERNAME}" নামে অ্যাডমিন ইতিমধ্যে আছে, নতুন করে বানানো হলো না।`);
    } else {
        const passwordHash = await bcrypt.hash(PASSWORD, 10);
        await Admin.create({ username: USERNAME, passwordHash, role: 'owner' });
        console.log(`✅ অ্যাডমিন তৈরি হয়েছে — ইউজারনেম: ${USERNAME} (পাসওয়ার্ড .env-এ দেওয়াটাই)`);
    }

    await mongoose.disconnect();
    process.exit(0);
}

run();
