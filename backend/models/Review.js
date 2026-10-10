import mongoose from 'mongoose';

// কাস্টমার রিভিউ — অ্যাডমিন অনুমোদন (approved) না করা পর্যন্ত সাইটে দেখা যায় না
const reviewSchema = new mongoose.Schema({
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 40 },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, required: true, trim: true, maxlength: 600 },
    status: { type: String, enum: ['pending', 'approved'], default: 'pending', index: true },
}, { timestamps: true });

export default mongoose.model('Review', reviewSchema);
