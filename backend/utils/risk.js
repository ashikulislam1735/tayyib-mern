// ফ্রড/ঝুঁকি যাচাই — আপনার নিজের অর্ডারের ইতিহাস থেকে (বাইরের কোনো API ছাড়া)
//
// একই ফোন নম্বরের *অন্য* অর্ডারগুলো দেখা হয়। শুধু "শেষ হয়ে যাওয়া" অর্ডার ধরা হয়:
//   ডেলিভারড = ভালো, বাতিল = খারাপ। pending/confirmed অর্ডার হিসাবে ধরা হয় না।
//
// লেভেল:
//   new    — আগে শেষ হওয়া অর্ডার ৩টির কম, তাই ইতিহাস দিয়ে বিচার করা যায় না
//   low    — বাতিলের হার ২৫%-এর কম
//   medium — বাতিলের হার ২৫% বা তার বেশি, কিন্তু ৫০%-এর কম
//   high   — বাতিলের হার ৫০% বা তার বেশি

const MIN_HISTORY = 3;

export function riskLevel(delivered, cancelled) {
    const resolved = delivered + cancelled;
    if (resolved < MIN_HISTORY) return 'new';
    const ratio = cancelled / resolved;
    if (ratio >= 0.5) return 'high';
    if (ratio >= 0.25) return 'medium';
    return 'low';
}

// orders: সব অর্ডারের তালিকা (plain object, phone/status/_id সহ)
// প্রতিটা অর্ডারে `risk` যোগ করে নতুন তালিকা ফেরত দেয়
export function attachRisk(orders) {
    const byPhone = new Map(); // phone -> { delivered, cancelled, pending }
    const phoneOf = (o) => String(o.phone || '').replace(/\s+/g, '');

    for (const o of orders) {
        const key = phoneOf(o);
        const rec = byPhone.get(key) || { delivered: 0, cancelled: 0, pending: 0 };
        if (o.status === 'delivered') rec.delivered += 1;
        else if (isBad(o)) rec.cancelled += 1;
        else rec.pending += 1;
        byPhone.set(key, rec);
    }

    return orders.map((o) => {
        const rec = byPhone.get(phoneOf(o));
        // এই অর্ডারটা নিজেকে বাদ দিয়ে ইতিহাস
        let delivered = rec.delivered;
        let cancelled = rec.cancelled;
        if (o.status === 'delivered') delivered -= 1;
        else if (isBad(o)) cancelled -= 1;
        const others = delivered + cancelled + rec.pending - (o.status === 'delivered' || isBad(o) ? 0 : 1);

        return {
            ...o,
            risk: { level: riskLevel(delivered, cancelled), delivered, cancelled, otherOrders: others },
        };
    });
}

// বাতিল বা ফেরত — দুটোই "খারাপ" ফল হিসেবে ধরা হয়
function isBad(o) {
    return o.status === 'cancelled' || o.status === 'returned';
}
