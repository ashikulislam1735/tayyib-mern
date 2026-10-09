import mongoose from 'mongoose';

const expenseSchema = new mongoose.Schema({
    amount: { type: Number, required: true, min: 0.01 },
    note: { type: String, trim: true, maxlength: 200, default: '' },
    category: { type: String, trim: true, maxlength: 40, default: '' },
    date: { type: Date, required: true, default: Date.now },
}, { timestamps: true });

export default mongoose.model('Expense', expenseSchema);
