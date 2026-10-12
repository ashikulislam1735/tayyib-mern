import Product from '../models/Product.js';
import StockLog from '../models/StockLog.js';

// অর্ডারের আইটেম থেকে ভ্যারিয়েন্ট খোঁজার শর্ত — নতুন অর্ডারে variantId থাকে, পুরোনো অর্ডারে শুধু সাইজের নাম (label)
const match = (it) => (it.variantId ? { _id: it.variantId } : { label: it.variantLabel });

async function logChange(prev, it, delta, { by, reason, note }) {
    const v = (prev.variants || []).find((x) => (it.variantId ? String(x._id) === String(it.variantId) : x.label === it.variantLabel));
    if (!v) return;
    const before = v.stock || 0;
    try {
        await StockLog.create({
            product: prev._id, productTitle: prev.title, variantId: v._id, variantLabel: v.label,
            mode: delta > 0 ? 'add' : 'subtract', before, after: before + delta, change: delta,
            reason, note, by,
        });
    } catch (e) {
        console.error('স্টকের ইতিহাস সেভ হয়নি:', e.message);
    }
}

// স্টক ফেরত দেওয়া (অর্ডার বাতিল/ফেরত হলে)। প্রোডাক্ট বা সাইজ মুছে গেলে চুপচাপ বাদ যায়।
export async function restoreItems(items, ctx = {}, { silent = false } = {}) {
    for (const it of items || []) {
        if (!it.productId || !it.quantity) continue;
        try {
            const prev = await Product.findOneAndUpdate(
                { _id: it.productId, variants: { $elemMatch: match(it) } },
                { $inc: { 'variants.$.stock': it.quantity } },
                { new: false },
            ).select('title variants').lean();
            if (prev && !silent) await logChange(prev, it, it.quantity, { reason: 'return', ...ctx });
        } catch (e) {
            console.error('স্টক ফেরত দেওয়া যায়নি:', it.productId, it.variantLabel, it.quantity, e.message);
        }
    }
}

// স্টক আবার কমানো (বাতিল অর্ডার আবার চালু করলে)। কোনোটার স্টক কম থাকলে আগেরগুলো ফেরত দিয়ে { ok:false } দেয়।
export async function reserveItems(items, ctx = {}) {
    const done = [];
    for (const it of items || []) {
        if (!it.productId || !it.quantity) continue;
        const prev = await Product.findOneAndUpdate(
            { _id: it.productId, variants: { $elemMatch: { ...match(it), stock: { $gte: it.quantity } } } },
            { $inc: { 'variants.$.stock': -it.quantity } },
            { new: false },
        ).select('title variants').lean();
        if (!prev) {
            await restoreItems(done.map((d) => d.it), ctx, { silent: true });
            return { ok: false, title: it.title, label: it.variantLabel };
        }
        done.push({ it, prev });
    }
    for (const d of done) await logChange(d.prev, d.it, -d.it.quantity, { reason: 'correction', ...ctx });
    return { ok: true };
}
