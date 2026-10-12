// সহজ IP-ভিত্তিক রেট লিমিটার (মেমোরিতে থাকে, রিস্টার্টে শূন্য হয়) — বাইরের প্যাকেজ লাগে না।
// ব্যবহার: router.post('/', makeLimiter({ windowMs, max, message }), handler)
export function makeLimiter({ windowMs, max, message }) {
    const hits = new Map(); // ip -> { count, first }
    let lastSweep = Date.now();

    return function limiter(req, res, next) {
        const now = Date.now();
        if (now - lastSweep > 60 * 1000) {
            for (const [k, v] of hits) if (now - v.first > windowMs) hits.delete(k);
            lastSweep = now;
        }
        const rec = hits.get(req.ip);
        if (!rec || now - rec.first > windowMs) {
            hits.set(req.ip, { count: 1, first: now });
            return next();
        }
        rec.count += 1;
        if (rec.count > max) {
            res.set('Retry-After', String(Math.ceil((rec.first + windowMs - now) / 1000)));
            return res.status(429).json({ error: message || 'Too many requests. Please try again in a little while.' });
        }
        next();
    };
}
