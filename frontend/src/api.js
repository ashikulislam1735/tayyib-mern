const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// পাবলিক GET কলের ৬০ সেকেন্ডের ক্যাশ — একই পেজে বারবার ঘুরলে ব্যাকএন্ডে আর
// কল যায় না, রিলোড অনেক দ্রুত মনে হয়। লগইন করা (অ্যাডমিন) কলে ক্যাশ চলে না,
// যাতে অ্যাডমিন সবসময় টাটকা ডেটা দেখে।
const CACHE_TTL = 60 * 1000;
const CACHEABLE_PREFIXES = ['/products', '/banners', '/categories', '/settings'];
const memoryCache = new Map();

function isCacheable(path, method, token) {
    if (method !== 'GET' || token) return false;
    return CACHEABLE_PREFIXES.some((p) => path === p || path.startsWith(`${p}?`) || path.startsWith(`${p}/`));
}

function readCache(path) {
    const mem = memoryCache.get(path);
    if (mem && Date.now() - mem.ts < CACHE_TTL) return mem.data;
    try {
        const raw = sessionStorage.getItem(`tayyib-api:${path}`);
        if (raw) {
            const entry = JSON.parse(raw);
            if (Date.now() - entry.ts < CACHE_TTL) {
                memoryCache.set(path, { ts: entry.ts, data: entry.data });
                return entry.data;
            }
            sessionStorage.removeItem(`tayyib-api:${path}`);
        }
    } catch { /* sessionStorage না থাকলে শুধু মেমোরি ক্যাশই চলবে */ }
    return undefined;
}

function writeCache(path, data) {
    memoryCache.set(path, { ts: Date.now(), data });
    try {
        sessionStorage.setItem(`tayyib-api:${path}`, JSON.stringify({ ts: Date.now(), data }));
    } catch { /* জায়গা না থাকলে ক্যাশ লেখা বাদ */ }
}

async function request(path, options = {}) {
    const method = (options.method || 'GET').toUpperCase();
    const token = localStorage.getItem('adminToken');
    const useCache = isCacheable(path, method, token);
    if (useCache) {
        const cached = readCache(path);
        if (cached !== undefined) return cached;
    }

    // ঘুমন্ত ব্যাকএন্ডে কল চিরকাল ঝুলে থাকবে না — ৬০ সেকেন্ডে সময় শেষ হবে
    const signal = typeof AbortSignal.timeout === 'function' ? AbortSignal.timeout(60000) : undefined;
    let res;
    try {
        res = await fetch(`${API_URL}${path}`, {
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            ...options,
            ...(signal ? { signal } : {}),
        });
    } catch (e) {
        if (e && e.name === 'AbortError') throw new Error('সার্ভার থেকে উত্তর আসতে দেরি হচ্ছে। একটু পরে আবার চেষ্টা করুন।');
        throw e;
    }
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Something went wrong. Please try again.');
    if (useCache) writeCache(path, data);
    return data;
}

// ফাইল আপলোডের জন্য আলাদা ফাংশন — এখানে Content-Type হেডার বসানো যাবে না,
// ব্রাউজার নিজেই multipart/form-data-র সঠিক boundary সেট করবে
async function uploadFile(file) {
    const token = localStorage.getItem('adminToken');
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch(`${API_URL}/upload`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Upload failed');
    return data; // { url, type }
}

export const api = {
    getProduct: (id) => request(`/products/${id}`),
    uploadFile,
    getAdmins: () => request('/admins'),
    createAdmin: (data) => request('/admins', { method: 'POST', body: JSON.stringify(data) }),
    updateAdmin: (id, data) => request(`/admins/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteAdmin: (id) => request(`/admins/${id}`, { method: 'DELETE' }),
    getCosts: () => request('/settings/costs'),
    updateCosts: (data) => request('/settings/costs', { method: 'PUT', body: JSON.stringify(data) }),
    getAdminProducts: () => request('/products/admin/list'),
    getTopProducts: (limit = 6) => request(`/products/top?limit=${limit}`),
    // পেজ ধরে প্রোডাক্ট: { items, total, page, pages } — গ্রাহকের তালিকার জন্য
    getProductsPage: ({ page = 1, limit = 20, category = '', sub = '', q = '', featured = false } = {}) => {
        const qs = new URLSearchParams({ page: String(page), limit: String(limit) });
        if (category) qs.set('category', category);
        if (sub) qs.set('sub', sub);
        if (q) qs.set('q', q);
        if (featured) qs.set('featured', 'true');
        return request(`/products?${qs.toString()}`);
    },
    // হেডারের মেনুর জন্য হালকা ক্যাটাগরি তালিকা
    getCatalogCategories: () => request('/products/categories'),
    getProducts: (category) => request(category ? `/products?category=${encodeURIComponent(category)}` : '/products'),
    createOrder: (payload) => request('/orders', { method: 'POST', body: JSON.stringify(payload) }),
    // অসম্পূর্ণ অর্ডার: গ্রাহকের দিক থেকে কার্ট সেভ (লগইন লাগে না)
    saveAbandonedCart: (payload) => request('/abandoned', { method: 'POST', body: JSON.stringify(payload) }),
    getAbandonedCarts: (minutes) => request(`/abandoned?minutes=${encodeURIComponent(minutes)}`),
    markAbandonedContacted: (id) => request(`/abandoned/${id}/contacted`, { method: 'PATCH' }),
    deleteAbandonedCart: (id) => request(`/abandoned/${id}`, { method: 'DELETE' }),
    sendToSteadfast: (orderId) => request(`/shipping/steadfast/${orderId}`, { method: 'POST' }),
    refreshSteadfastStatus: (orderId) => request(`/shipping/steadfast/${orderId}/status`),
    sendToPathao: (orderId) => request(`/shipping/pathao/${orderId}`, { method: 'POST' }),
    refreshPathaoStatus: (orderId) => request(`/shipping/pathao/${orderId}/status`),
    getPathaoStores: () => request('/shipping/pathao-stores'),
    createPathaoTestStore: () => request('/shipping/pathao-stores/test', { method: 'POST' }),
    // কুপন
    validateCoupon: (payload) => request('/coupons/validate', { method: 'POST', body: JSON.stringify(payload) }),
    getCoupons: () => request('/coupons'),
    createCoupon: (data) => request('/coupons', { method: 'POST', body: JSON.stringify(data) }),
    setCouponActive: (id, active) => request(`/coupons/${id}`, { method: 'PATCH', body: JSON.stringify({ active }) }),
    deleteCoupon: (id) => request(`/coupons/${id}`, { method: 'DELETE' }),
    // রিভিউ
    getProductReviews: (id) => request(`/reviews/product/${id}`),
    submitReview: (data) => request('/reviews', { method: 'POST', body: JSON.stringify(data) }),
    getAdminReviews: (status) => request(`/reviews?status=${status}`),
    approveReview: (id) => request(`/reviews/${id}/approve`, { method: 'PATCH' }),
    deleteReview: (id) => request(`/reviews/${id}`, { method: 'DELETE' }),
    // CRM
    getCustomers: (q) => request(`/customers${q ? `?q=${encodeURIComponent(q)}` : ''}`),
    getCustomerOrders: (phone) => request(`/customers/${encodeURIComponent(phone)}`),
    trackOrder: (query) => request(`/orders/track/${encodeURIComponent(query)}`),

    // admin
    login: (username, password) => request('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
    changePassword: (currentPassword, newPassword) => request('/auth/change-password', { method: 'POST', body: JSON.stringify({ currentPassword, newPassword }) }),
    getSettings: () => request('/settings'),
    updateSettings: (data) => request('/settings', { method: 'PUT', body: JSON.stringify(data) }),
    getBanners: () => request('/banners'),
    getAllBanners: () => request('/banners/all'),
    createBanner: (data) => request('/banners', { method: 'POST', body: JSON.stringify(data) }),
    updateBanner: (id, data) => request(`/banners/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteBanner: (id) => request(`/banners/${id}`, { method: 'DELETE' }),
    getCategoryImages: () => request('/categories'),
    setCategoryImage: (name, image) => request('/categories', { method: 'PUT', body: JSON.stringify({ name, image }) }),
    importProducts: (rows, dryRun) => request('/products/bulk', { method: 'POST', body: JSON.stringify({ rows, dryRun }) }),
    getAllOrders: () => request('/orders'),
    // পেজ ধরে অর্ডার: { items, total, page, pages, counts } — অ্যাডমিন অর্ডার তালিকার জন্য
    getOrdersPage: ({ page = 1, limit = 30, status = 'all', q = '' } = {}) => {
        const qs = new URLSearchParams({ page: String(page), limit: String(limit) });
        if (status && status !== 'all') qs.set('status', status);
        if (q) qs.set('q', q);
        return request(`/orders?${qs.toString()}`);
    },
    getStock: () => request('/stock'),
    getStockSettings: () => request('/stock/settings'),
    saveStockSettings: (lowStockLimit) => request('/stock/settings', { method: 'PUT', body: JSON.stringify({ lowStockLimit }) }),
    adjustStock: (data) => request('/stock/adjust', { method: 'POST', body: JSON.stringify(data) }),
    getStockLogs: (variantId, limit = 30) => request(`/stock/logs?limit=${limit}${variantId ? `&variantId=${variantId}` : ''}`),
    getReportSummary: (from, to) => request(from && to ? `/reports/summary?from=${from}&to=${to}` : '/reports/summary'),
    getExpenses: (f = {}) => {
        const q = new URLSearchParams();
        if (f.from) q.set('from', f.from);
        if (f.to) q.set('to', f.to);
        const qs = q.toString();
        return request(`/expenses${qs ? `?${qs}` : ''}`);
    },
    createExpense: (data) => request('/expenses', { method: 'POST', body: JSON.stringify(data) }),
    deleteExpense: (id) => request(`/expenses/${id}`, { method: 'DELETE' }),
    createProduct: (data) => request('/products', { method: 'POST', body: JSON.stringify(data) }),
    updateProduct: (id, data) => request(`/products/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteProduct: (id) => request(`/products/${id}`, { method: 'DELETE' }),
    updateOrderStatus: (id, status) => request(`/orders/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
};
