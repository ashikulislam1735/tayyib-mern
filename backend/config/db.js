import mongoose from 'mongoose';

// .env ফাইলে দেওয়া MONGO_URI দিয়ে MongoDB-তে কানেক্ট করা।
// লোকাল MongoDB হলে: mongodb://127.0.0.1:27017/tayyib_shop
// MongoDB Atlas (ফ্রি ক্লাউড) হলে: mongodb+srv://<user>:<pass>@cluster.mongodb.net/tayyib_shop
export async function connectDB() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ MongoDB কানেক্টেড হয়েছে');
    } catch (err) {
        console.error('❌ MongoDB কানেকশন ব্যর্থ হয়েছে:', err.message);
        process.exit(1);
    }
}
