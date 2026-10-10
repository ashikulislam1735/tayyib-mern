import mongoose from 'mongoose';

// অসম্পূর্ণ অর্ডার: কাস্টমার চেকআউটে ফোন নম্বর দিয়েছে কিন্তু অর্ডার করেনি
const itemSchema = new mongoose.Schema({
    productId: { type: mongoose.Schema.Types.ObjectId },
    title: { type: String, required: true },
    variantLabel: { type: String, default: '' },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true },
}, { _id: false });

const abandonedCartSchema = new mongoose.Schema({
    phone: { type: String, required: true, index: true },
    customerName: { type: String, trim: true, maxlength: 60, default: '' },
    items: {
        type: [itemSchema],
        validate: [(v) => v.length <= 30, 'সর্বোচ্চ ৩০টি আইটেম'],
    },
    cartTotal: { type: Number, default: 0 },
    status: { type: String, enum: ['open', 'contacted', 'recovered'], default: 'open' },
    lastActivityAt: { type: Date, default: Date.now },
}, { timestamps: true });

// শেষ কার্যকলাপের ৩০ দিন পর ডকুমেন্ট নিজে থেকেই মুছে যাবে
abandonedCartSchema.index({ lastActivityAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

export default mongoose.model('AbandonedCart', abandonedCartSchema);
