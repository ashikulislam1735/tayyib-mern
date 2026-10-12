import mongoose from 'mongoose';

const orderItemSchema = new mongoose.Schema({
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    variantId: { type: mongoose.Schema.Types.ObjectId },   // কোন সাইজ — বাতিল হলে সঠিক সাইজের স্টক ফেরত দিতে লাগে
    title: { type: String, required: true },
    variantLabel: { type: String, required: true },
    price: { type: Number, required: true },
    costPrice: { type: Number, default: 0 },   // অর্ডারের সময়ের ক্রয়মূল্য (লাভ হিসাবের জন্য)
    quantity: { type: Number, required: true },
}, { _id: false });

// কুরিয়ার শিপমেন্টের তথ্য (Steadfast / Pathao)
const shipmentSchema = new mongoose.Schema({
    courier: { type: String, enum: ['steadfast', 'pathao'] },
    consignmentId: { type: String },
    trackingCode: { type: String, default: '' },
    status: { type: String, default: '' }, // sending / in_review / pending / delivered / cancelled / hold ...
    sentAt: { type: Date },
}, { _id: false });

const orderSchema = new mongoose.Schema({
    customerName: { type: String, required: true },
    phone: { type: String, required: true },
    address: { type: String, required: true },
    paymentMethod: { type: String, enum: ['cod', 'bkash', 'nagad'], default: 'cod' },
    paymentTrxId: { type: String, default: '' },   // bKash/Nagad-এর ট্রানজেকশন আইডি (হাতে মিলিয়ে নেওয়ার জন্য)
    items: { type: [orderItemSchema], required: true },
    deliveryArea: { type: String, enum: ['inside', 'outside'], default: 'inside' }, // ঢাকার ভেতরে / বাইরে
    deliveryCharge: { type: Number, default: 60 },
    courierCost: { type: Number, default: 0 },     // কুরিয়ারকে দেওয়া খরচ (অর্ডারের সময়ের রেট)
    packagingCost: { type: Number, default: 0 },   // প্যাকেজিং খরচ (অর্ডারের সময়ের রেট)
    couponCode: { type: String, default: '' },   // ব্যবহৃত কুপন (থাকলে)
    discount: { type: Number, default: 0 },      // কুপনের ছাড় (পণ্যের দাম থেকে)
    total: { type: Number, required: true },
    status: { type: String, enum: ['pending', 'confirmed', 'delivered', 'cancelled', 'returned'], default: 'pending' },
    shipment: { type: shipmentSchema, default: undefined },
}, { timestamps: true });

// ইনডেক্স: অর্ডার বাড়লেও ফোন, স্ট্যাটাস ও তারিখ ধরে খোঁজা দ্রুত থাকে
orderSchema.index({ phone: 1, createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ createdAt: -1 });

export default mongoose.model('Order', orderSchema);
