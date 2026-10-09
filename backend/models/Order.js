import mongoose from 'mongoose';

const orderItemSchema = new mongoose.Schema({
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    title: { type: String, required: true },
    variantLabel: { type: String, required: true },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true },
}, { _id: false });

const orderSchema = new mongoose.Schema({
    customerName: { type: String, required: true },
    phone: { type: String, required: true },
    address: { type: String, required: true },
    paymentMethod: { type: String, enum: ['cod', 'bkash', 'nagad'], default: 'cod' },
    items: { type: [orderItemSchema], required: true },
    deliveryArea: { type: String, enum: ['inside', 'outside'], default: 'inside' }, // ঢাকার ভেতরে / বাইরে
    deliveryCharge: { type: Number, default: 60 },
    total: { type: Number, required: true },
    status: { type: String, enum: ['pending', 'confirmed', 'delivered', 'cancelled'], default: 'pending' },
}, { timestamps: true });

export default mongoose.model('Order', orderSchema);
