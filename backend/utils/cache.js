// ছোট in-memory ক্যাশ — বারবার একই ভারী কোয়েরি না চালিয়ে ৬০ সেকেন্ডের
// জন্য ফলাফল ধরে রাখা হয়। Render ফ্রি টিয়ারে প্রতিটা সেকেন্ড দামি, তাই
// পাবলিক তালিকা (ক্যাটাগরি, সেরা বিক্রিত, ব্যানার) এখানে ক্যাশ করা হয়।
// TTL ছোট (৬০ সেকেন্ড), তাই অ্যাডমিন কিছু বদলালে সর্বোচ্চ ১ মিনিট পরেই
// সেটা দেখা যাবে।
const store = new Map();

export function getCached(key) {
    const entry = store.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expires) {
        store.delete(key);
        return undefined;
    }
    return entry.value;
}

export function setCached(key, value, ttlMs = 60000) {
    if (store.size > 200) store.delete(store.keys().next().value);
    store.set(key, { value, expires: Date.now() + ttlMs });
}
