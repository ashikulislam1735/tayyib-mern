// Steadfast Courier API-র সাথে যোগাযোগের ছোট সহায়ক।
// API কী ও সিক্রেট শুধু Render/লোকাল .env থেকে আসে — কোডে বা লগে কখনো লেখা হয় না।
//   STEADFAST_API_KEY=...
//   STEADFAST_SECRET_KEY=...
//   STEADFAST_BASE_URL=https://portal.packzy.com/api/v1   (ঐচ্ছিক)

const DEFAULT_BASE = 'https://portal.packzy.com/api/v1';
const TIMEOUT_MS = 15000;

export function steadfastConfigured() {
    return Boolean(process.env.STEADFAST_API_KEY && process.env.STEADFAST_SECRET_KEY);
}

export async function steadfastRequest(path, { method = 'GET', body } = {}) {
    const base = (process.env.STEADFAST_BASE_URL || DEFAULT_BASE).replace(/\/$/, '');
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
        const res = await fetch(`${base}${path}`, {
            method,
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
                'Api-Key': process.env.STEADFAST_API_KEY,
                'Secret-Key': process.env.STEADFAST_SECRET_KEY,
            },
            body: body ? JSON.stringify(body) : undefined,
            signal: controller.signal,
        });

        let data = null;
        try { data = await res.json(); } catch { /* JSON নয় */ }
        return { ok: res.ok, httpStatus: res.status, data };
    } finally {
        clearTimeout(timer);
    }
}

// Steadfast-এর এরর বার্তা থেকে পড়ার মতো একটা লেখা বের করা
export function steadfastErrorText(result) {
    const d = result && result.data;
    if (d && typeof d.message === 'string' && d.message) return d.message;
    if (d && d.errors && typeof d.errors === 'object') {
        const first = Object.values(d.errors).flat()[0];
        if (first) return String(first);
    }
    return `Steadfast থেকে সঠিক উত্তর আসেনি (কোড ${result ? result.httpStatus : '?'})`;
}
