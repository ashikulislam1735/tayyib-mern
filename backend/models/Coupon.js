import mongoose from 'mongoose';

// কুপন: শতাংশ (percent) বা নির্দিষ্ট টাকা (fixed) ছাড়
const couponSchema = new mongoose.Schema({
    code: { type: String, required: true, unique: true, uppercase: true, trim: true, match: /^[A-Z0-9_-]{3,20}$/ },
    type: { type: String, enum: ['percent', 'fixed'], required: true },
    value: { type: Number, required: true, min: 1 },          // percent হলে ১–১০০, fixed হলে টাকা
    minOrder: { type: Number, default: 0, min: 0 },            // ন্যূনতম পণ্যের দাম (ডেলিভারি ছাড়া)
    maxDiscount: { type: Number, default: 0, min: 0 },         // শতাংশ কুপনের সর্বোচ্চ ছাড় (০ = সীমা নেই)
    usageLimit: { type: Number, default: 0, min: 0 },          // মোট কতবার ব্যবহার করা যাবে (০ = সীমাহীন)
    usedCount: { type: Number, default: 0, min: 0 },
    expiresAt: { type: Date, default: null },                  // না থাকলে মেয়াদ নেই
    active: { type: Boolean, default: true },
}, { timestamps: true });

export default mongoose.model('Coupon', couponSchema);
