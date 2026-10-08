import mongoose from 'mongoose';

// হোম পেজের ব্যানার — slider (বড় স্লাইডার) অথবা side (ডান পাশের ছোট ব্যানার)
const bannerSchema = new mongoose.Schema({
    image: { type: String, required: true },          // Cloudinary ছবির URL
    position: { type: String, enum: ['slider', 'side'], default: 'slider' },
    title: { type: String, default: '' },             // ছবির বিকল্প লেখা (alt) ও অ্যাডমিনে চিনতে সুবিধার জন্য
    link: {
        type: String,
        default: '',
        // শুধু সাইটের ভেতরের পথ (/category/...) অথবা http(s) লিংক চলবে — javascript: ইত্যাদি বন্ধ
        validate: {
            validator: (v) => v === '' || /^\/(?!\/)/.test(v) || /^https?:\/\//i.test(v),
            message: 'লিংক / দিয়ে (যেমন /category/মধু) অথবা https:// দিয়ে শুরু হতে হবে',
        },
    },
    order: { type: Number, default: 0 },              // ছোট নম্বর আগে দেখাবে
    active: { type: Boolean, default: true },
}, { timestamps: true });

export default mongoose.model('Banner', bannerSchema);
