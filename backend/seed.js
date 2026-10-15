import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import { connectDB } from './config/db.js';
import Product from './models/Product.js';

// npm run seed — /content/honey-products.json থেকে মধু ও খেজুরের প্রোডাক্ট ডাটাবেজে ঢোকায়।
//
// ডিফল্ট (নিরাপদ): যে নামের প্রোডাক্ট আগে থেকে আছে সেটা ছোঁয়া হয় না (আপনার স্টক/দাম অক্ষত), শুধু নতুনগুলো যোগ হয়।
//   node seed.js                  → শুধু নতুন প্রোডাক্ট যোগ
//   node seed.js --update         → একই নামের প্রোডাক্টের তথ্যও ফাইল থেকে বদলে দেয় (স্টক/দাম সহ!)
//   node seed.js --prune          → মধু/খেজুর ছাড়া অন্য ক্যাটাগরির প্রোডাক্ট কী কী আছে শুধু দেখায় (মোছে না)
//   node seed.js --prune --yes    → সেই অন্য ক্যাটাগরির প্রোডাক্ট মুছে দেয়
//   node seed.js --replace --yes  → ⚠️ সব প্রোডাক্ট মুছে ফাইলেরগুলো বসায় (আগের seed এভাবেই কাজ করত)
const here = path.dirname(fileURLToPath(import.meta.url));
const FILE = process.env.CONTENT_FILE || path.join(here, '..', 'content', 'honey-products.json');
const ALLOWED = ['মধু', 'খেজুর'];
const args = new Set(process.argv.slice(2));

function loadProducts() {
    const list = JSON.parse(fs.readFileSync(FILE, 'utf8'));
    if (!Array.isArray(list) || list.length === 0) throw new Error('ফাইলে প্রোডাক্টের তালিকা (array) নেই');
    list.forEach((p, i) => {
        const where = `প্রোডাক্ট #${i + 1} (${p && p.title})`;
        if (!p.title) throw new Error(`${where}: title নেই`);
        if (!ALLOWED.includes(p.category)) throw new Error(`${where}: category শুধু ${ALLOWED.join(' / ')} হতে পারে`);
        if (!Array.isArray(p.variants) || p.variants.length === 0) throw new Error(`${where}: variants (সাইজ) নেই`);
        p.variants.forEach((v) => {
            if (!v.label || !(v.price >= 0) || !(v.stock >= 0)) throw new Error(`${where}: প্রতিটা সাইজে label, price ও stock লাগবে`);
        });
    });
    const titles = list.map((p) => p.title);
    if (new Set(titles).size !== titles.length) throw new Error('একই নামে দুইটা প্রোডাক্ট আছে');
    return list;
}

async function seed() {
    const products = loadProducts();
    await connectDB();

    if (args.has('--replace')) {
        if (!args.has('--yes')) {
            console.log('⚠️ --replace সব প্রোডাক্ট মুছে দেবে। নিশ্চিত হলে শেষে --yes যোগ করুন।');
        } else {
            await Product.deleteMany({});
            await Product.insertMany(products);
            console.log(`✅ সব মুছে ${products.length}টি প্রোডাক্ট বসানো হয়েছে`);
        }
    } else {
        let added = 0, updated = 0, skipped = 0;
        for (const p of products) {
            const existing = await Product.findOne({ title: p.title });
            if (!existing) { await Product.create(p); added += 1; }
            else if (args.has('--update')) { Object.assign(existing, p); await existing.save(); updated += 1; }
            else skipped += 1;
        }
        console.log(`✅ নতুন ${added}টি যোগ, ${updated}টি আপডেট, ${skipped}টি আগে থেকেই ছিল (ছোঁয়া হয়নি)`);
    }

    if (args.has('--prune')) {
        const others = await Product.find({ category: { $nin: ALLOWED } }).select('title category').lean();
        if (others.length === 0) {
            console.log('মধু/খেজুর ছাড়া অন্য কোনো প্রোডাক্ট নেই।');
        } else {
            console.log(`মধু/খেজুর ছাড়া ${others.length}টি প্রোডাক্ট পাওয়া গেছে:`);
            others.forEach((o) => console.log(`  - ${o.title} (${o.category})`));
            if (args.has('--yes')) {
                await Product.deleteMany({ _id: { $in: others.map((o) => o._id) } });
                console.log('🗑️ এগুলো মুছে ফেলা হয়েছে');
            } else {
                console.log('মুছতে চাইলে আবার চালান: node seed.js --prune --yes');
            }
        }
    }

    await mongoose.disconnect();
}

seed().then(() => process.exit(0)).catch(async (e) => {
    console.error('❌ seed ব্যর্থ:', e.message);
    try { await mongoose.disconnect(); } catch { /* ignore */ }
    process.exit(1);
});
