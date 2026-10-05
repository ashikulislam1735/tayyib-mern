import 'dotenv/config';
import { connectDB } from './config/db.js';
import Product from './models/Product.js';
import mongoose from 'mongoose';

// এই স্ক্রিপ্ট চালালে ডেমো প্রোডাক্ট ডাটাবেজে ভরে দেবে (npm run seed)
const sampleProducts = [
    {
        title: 'খাঁটি সুন্দরবনের মধু',
        category: 'মধু',
        icon: '🍯',
        description: 'সুন্দরবনের গহীন থেকে সংগ্রহ করা ১০০% খাঁটি মধু।',
        variants: [
            { label: '৫০০ গ্রাম', price: 850, originalPrice: 950, stock: 35 },
            { label: '১ কেজি', price: 1600, originalPrice: 1800, stock: 20 },
        ],
    },
    {
        title: 'সৌদি আজওয়া খেজুর',
        category: 'খেজুর',
        icon: '🌴',
        description: 'মদিনার বিখ্যাত আজওয়া খেজুর, প্রিমিয়াম মানের।',
        variants: [
            { label: '৫০০ গ্রাম', price: 1200, originalPrice: 1350, stock: 25 },
        ],
    },
    {
        title: 'খাঁটি গাওয়া ঘি',
        category: 'ঘি',
        icon: '🧈',
        description: 'দেশি গরুর দুধ থেকে ঐতিহ্যবাহী পদ্ধতিতে তৈরি খাঁটি গাওয়া ঘি।',
        variants: [
            { label: '৫০০ মিলি', price: 1400, originalPrice: 1550, stock: 22 },
            { label: '১ কেজি', price: 2700, originalPrice: 3000, stock: 15 },
        ],
    },
];

async function seed() {
    await connectDB();
    await Product.deleteMany({});
    await Product.insertMany(sampleProducts);
    console.log('✅ ডেমো প্রোডাক্ট যোগ করা হয়েছে');
    await mongoose.disconnect();
    process.exit(0);
}

seed();
