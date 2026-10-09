// লগইনে বারবার ভুল চেষ্টা আটকানোর সহজ লিমিটার (মেমোরিতে রাখা হয়, বাইরের প্যাকেজ লাগে না)।
// নিয়ম:
//   • একই IP + একই ইউজারনেমে ১৫ মিনিটে ৫ বার ভুল হলে ১৫ মিনিট লক
//   • একই IP থেকে ১৫ মিনিটে মোট ২০ বার ভুল হলে ওই IP ১৫ মিনিট লক
// সফল লগইনে ওই IP + ইউজারনেমের গণনা মুছে যায়।
// মনে রাখবেন: সার্ভার রিস্টার্ট বা ঘুমিয়ে গেলে (Render ফ্রি প্ল্যান) গণনা শূন্য হয়ে যায়।

const WINDOW_MS = 15 * 60 * 1000;
const MAX_PER_USER = 5;
const MAX_PER_IP = 20;

const failures = new Map(); // key -> { count, first }

function bump(key) {
    const now = Date.now();
    const rec = failures.get(key);
    if (!rec || now - rec.first > WINDOW_MS) failures.set(key, { count: 1, first: now });
    else rec.count += 1;
}

function isBlocked(key, max) {
    const rec = failures.get(key);
    if (!rec) return 0;
    const left = rec.first + WINDOW_MS - Date.now();
    if (left <= 0) { failures.delete(key); return 0; }
    return rec.count >= max ? left : 0;
}

// পুরনো এন্ট্রি মাঝে মাঝে সাফ করা, যাতে মেমোরি ফুলে না ওঠে
setInterval(() => {
    const now = Date.now();
    for (const [k, v] of failures) if (now - v.first > WINDOW_MS) failures.delete(k);
}, 10 * 60 * 1000).unref();

const userKey = (req) => `u:${req.ip}:${String((req.body && req.body.username) || '').toLowerCase().slice(0, 60)}`;
const ipKey = (req) => `i:${req.ip}`;

export function loginLimiter(req, res, next) {
    const left = Math.max(isBlocked(userKey(req), MAX_PER_USER), isBlocked(ipKey(req), MAX_PER_IP));
    if (left > 0) {
        const mins = Math.ceil(left / 60000);
        res.set('Retry-After', String(Math.ceil(left / 1000)));
        return res.status(429).json({ error: `অনেকবার ভুল চেষ্টা হয়েছে। ${mins} মিনিট পরে আবার চেষ্টা করুন।` });
    }
    next();
}

export function recordLoginFailure(req) {
    bump(userKey(req));
    bump(ipKey(req));
}

export function recordLoginSuccess(req) {
    failures.delete(userKey(req));
}
