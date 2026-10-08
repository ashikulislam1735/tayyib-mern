import mongoose from 'mongoose';

// সাইট সেটিংস — পুরো ডাটাবেসে মাত্র একটা ডকুমেন্ট (key = 'site')
const settingSchema = new mongoose.Schema({
    key: { type: String, default: 'site', unique: true },
    data: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true });

export default mongoose.model('Setting', settingSchema);
