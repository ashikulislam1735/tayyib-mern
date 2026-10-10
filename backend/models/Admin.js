import mongoose from 'mongoose';

const adminSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    // owner = সবকিছু; staff = শুধু অর্ডার, প্রোডাক্ট, কাস্টমার ইত্যাদি (লাভ/খরচ/সেটিংস নয়)
    // আগে থেকে থাকা অ্যাডমিনের role না থাকলে "owner" ধরা হয়
    role: { type: String, enum: ['owner', 'staff'], default: 'owner' },
}, { timestamps: true });

export default mongoose.model('Admin', adminSchema);
