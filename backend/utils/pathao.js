// Pathao Courier (Merchant API) সহায়ক। গোপন তথ্য শুধু Render/লোকাল .env থেকে আসে — কোডে বা লগে লেখা হয় না।
//   PATHAO_CLIENT_ID=...
//   PATHAO_CLIENT_SECRET=...
//   PATHAO_USERNAME=...   (মার্চেন্ট লগইন ইমেইল)
//   PATHAO_PASSWORD=...
//   PATHAO_STORE_ID=...   (সংখ্যা; Pathao মার্চেন্ট প্যানেলের স্টোর আইডি)
//   PATHAO_BASE_URL=https://api-hermes.pathao.com   (ঐচ্ছিক; টেস্টের জন্য sandbox URL বসানো যায়)

const DEFAULT_BASE = 'https://api-hermes.pathao.com';
const TIMEOUT_MS = 15000;

export function pathaoConfigured() {
    const e = process.env;
    return Boolean(e.PATHAO_CLIENT_ID && e.PATHAO_CLIENT_SECRET && e.PATHAO_USERNAME && e.PATHAO_PASSWORD && e.PATHAO_STORE_ID);
}

const base = () => (process.env.PATHAO_BASE_URL || DEFAULT_BASE).replace(/\/$/, '');

async function rawFetch(path, { method = 'GET', body, token } = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
        const res = await fetch(`${base()}${path}`, {
            method,
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
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

// টোকেন মেমোরিতে রাখা হয় (মেয়াদ শেষের ১ মিনিট আগে নতুন নেয়)
let cached = { token: '', exp: 0 };

async function getToken(force = false) {
    if (!force && cached.token && Date.now() < cached.exp) return cached.token;
    const r = await rawFetch('/aladdin/api/v1/issue-token', {
        method: 'POST',
        body: {
            client_id: process.env.PATHAO_CLIENT_ID,
            client_secret: process.env.PATHAO_CLIENT_SECRET,
            grant_type: 'password',
            username: process.env.PATHAO_USERNAME,
            password: process.env.PATHAO_PASSWORD,
        },
    });
    const t = r.data && r.data.access_token;
    if (!r.ok || !t) {
        cached = { token: '', exp: 0 };
        throw new Error(`Pathao লগইন ব্যর্থ (কোড ${r.httpStatus}) — Client ID/Secret, ইমেইল ও পাসওয়ার্ড ঠিক আছে কিনা দেখুন`);
    }
    const ttl = Number(r.data.expires_in) > 120 ? Number(r.data.expires_in) : 3600;
    cached = { token: t, exp: Date.now() + (ttl - 60) * 1000 };
    return t;
}

export async function pathaoRequest(path, opts = {}) {
    let token = await getToken();
    let r = await rawFetch(path, { ...opts, token });
    if (r.httpStatus === 401) { // টোকেন বাতিল হয়ে থাকলে একবার নতুন নিয়ে আবার চেষ্টা
        token = await getToken(true);
        r = await rawFetch(path, { ...opts, token });
    }
    return r;
}

export function pathaoErrorText(result) {
    const d = result && result.data;
    if (d && d.errors && typeof d.errors === 'object') {
        const first = Object.values(d.errors).flat()[0];
        if (first) return String(first);
    }
    if (d && typeof d.message === 'string' && d.message) return d.message;
    return `Pathao থেকে সঠিক উত্তর আসেনি (কোড ${result ? result.httpStatus : '?'})`;
}
