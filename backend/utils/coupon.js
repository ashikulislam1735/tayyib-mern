import Coupon from '../models/Coupon.js';

export const CODE_RE = /^[A-Z0-9_-]{3,20}$/;
export const normalizeCode = (c) => (typeof c === 'string' ? c.trim().toUpperCase() : '');

// ছাড়ের পরিমাণ হিসাব — পণ্যের দামের (subtotal) বেশি কখনো হবে না, ডেলিভারি চার্জে ছাড় নেই
export function computeDiscount(coupon, subtotal) {
    let d = coupon.type === 'percent' ? Math.floor((subtotal * coupon.value) / 100) : coupon.value;
    if (coupon.type === 'percent' && coupon.maxDiscount > 0) d = Math.min(d, coupon.maxDiscount);
    return Math.max(0, Math.min(d, subtotal));
}

// কুপন বৈধ কিনা যাচাই (ব্যবহার গণনা বাড়ায় না)
export async function checkCoupon(rawCode, subtotal) {
    const code = normalizeCode(rawCode);
    if (!CODE_RE.test(code)) return { ok: false, error: 'কুপন কোড সঠিক নয়' };

    const coupon = await Coupon.findOne({ code }).lean();
    if (!coupon || !coupon.active) return { ok: false, error: 'এই কুপনটি বৈধ নয়' };
    if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) return { ok: false, error: 'কুপনের মেয়াদ শেষ হয়ে গেছে' };
    if (coupon.usageLimit > 0 && coupon.usedCount >= coupon.usageLimit) return { ok: false, error: 'কুপনের ব্যবহারের সীমা শেষ' };
    if (subtotal < coupon.minOrder) return { ok: false, error: `এই কুপনে কমপক্ষে ৳${coupon.minOrder} টাকার পণ্য কিনতে হবে` };

    const discount = computeDiscount(coupon, subtotal);
    if (discount <= 0) return { ok: false, error: 'এই কুপনে কোনো ছাড় পাওয়া যাচ্ছে না' };
    return { ok: true, coupon, discount };
}

// অর্ডারের সময় ব্যবহারের গণনা নিরাপদে ১ বাড়ানো — একই সময়ে অনেকে চাইলেও সীমা পেরোবে না
export async function claimCoupon(code) {
    const now = new Date();
    const r = await Coupon.updateOne(
        {
            code,
            active: true,
            $and: [
                { $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }] },
                { $expr: { $or: [{ $eq: ['$usageLimit', 0] }, { $lt: ['$usedCount', '$usageLimit'] }] } },
            ],
        },
        { $inc: { usedCount: 1 } },
    );
    return r.modifiedCount === 1;
}

// অর্ডার ব্যর্থ হলে ব্যবহারের গণনা ফেরত
export async function releaseCoupon(code) {
    await Coupon.updateOne({ code, usedCount: { $gt: 0 } }, { $inc: { usedCount: -1 } });
}
