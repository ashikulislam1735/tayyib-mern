import mongoose from 'mongoose';

// ক্যাটাগরির ছবি — ক্যাটাগরির নাম প্রোডাক্ট থেকে আসে, এখানে শুধু নামের সাথে ছবির URL জোড়া থাকে
const categorySchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    image: { type: String, required: true },   // Cloudinary ছবির URL
}, { timestamps: true });

export default mongoose.model('Category', categorySchema);
