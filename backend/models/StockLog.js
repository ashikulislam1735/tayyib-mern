import mongoose from 'mongoose';

// স্টক হাতে বদলানোর ইতিহাস (কে, কখন, কত থেকে কত, কেন)
const stockLogSchema = new mongoose.Schema({
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    productTitle: { type: String, default: '' },
    variantId: { type: mongoose.Schema.Types.ObjectId, required: true },
    variantLabel: { type: String, default: '' },
    mode: { type: String, enum: ['add', 'subtract', 'set'], required: true },
    before: { type: Number, required: true },
    after: { type: Number, required: true },
    change: { type: Number, required: true },
    reason: { type: String, enum: ['restock', 'damaged', 'return', 'correction', 'other'], default: 'other' },
    note: { type: String, default: '' },
    by: { type: String, default: '' },
}, { timestamps: { createdAt: true, updatedAt: false } });

stockLogSchema.index({ createdAt: -1 });
stockLogSchema.index({ variantId: 1, createdAt: -1 });

export default mongoose.model('StockLog', stockLogSchema);
