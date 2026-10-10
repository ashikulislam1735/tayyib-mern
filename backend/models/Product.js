import mongoose from 'mongoose';

// প্রতিটা প্রোডাক্টের একাধিক ভ্যারিয়েন্ট (সাইজ) থাকতে পারে — ঠিক PHP সাইটের মতোই
const variantSchema = new mongoose.Schema({
    label: { type: String, required: true },       // যেমন: "৫০০ গ্রাম"
    price: { type: Number, required: true },
    originalPrice: { type: Number },                // ছাড়ের আগের দাম (ঐচ্ছিক)
    stock: { type: Number, required: true, default: 0 },
    costPrice: { type: Number, min: 0, default: 0 },  // ক্রয়মূল্য (শুধু অ্যাডমিন দেখে, কাস্টমারকে পাঠানো হয় না)
}, { _id: true });

const productSchema = new mongoose.Schema({
    title: { type: String, required: true },
    category: { type: String, required: true },     // মধু / খেজুর / ঘি
    subCategory: { type: String, default: '' },     // সাব-ক্যাটাগরি (ঐচ্ছিক), যেমন: কাজুবাদাম
    images: { type: [String], default: [] },          // Cloudinary ছবির URL-এর তালিকা (গ্যালারি)
    videoUrl: { type: String, default: '' },          // YouTube লিংক অথবা Cloudinary ভিডিও URL
    shortDescription: { type: String, default: '' },  // কার্ডে দেখানোর এক লাইন
    icon: { type: String, default: '🛍️' },
    description: { type: String, default: '' },
    variants: { type: [variantSchema], required: true },
}, { timestamps: true });

export default mongoose.model('Product', productSchema);
