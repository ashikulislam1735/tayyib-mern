const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

async function request(path, options = {}) {
    const token = localStorage.getItem('adminToken');
    const res = await fetch(`${API_URL}${path}`, {
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        ...options,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'কিছু একটা সমস্যা হয়েছে');
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
    if (!res.ok) throw new Error(data.error || 'আপলোড ব্যর্থ হয়েছে');
    return data; // { url, type }
}

export const api = {
    getProduct: (id) => request(`/products/${id}`),
    uploadFile,
    getCosts: () => request('/settings/costs'),
    updateCosts: (data) => request('/settings/costs', { method: 'PUT', body: JSON.stringify(data) }),
    getAdminProducts: () => request('/products/admin/list'),
    getProducts: (category) => request(category ? `/products?category=${encodeURIComponent(category)}` : '/products'),
    getProduct: (id) => request(`/products/${id}`),
    createOrder: (payload) => request('/orders', { method: 'POST', body: JSON.stringify(payload) }),
    // অসম্পূর্ণ অর্ডার: গ্রাহকের দিক থেকে কার্ট সেভ (লগইন লাগে না)
    saveAbandonedCart: (payload) => request('/abandoned', { method: 'POST', body: JSON.stringify(payload) }),
    getAbandonedCarts: (minutes) => request(`/abandoned?minutes=${encodeURIComponent(minutes)}`),
    markAbandonedContacted: (id) => request(`/abandoned/${id}/contacted`, { method: 'PATCH' }),
    deleteAbandonedCart: (id) => request(`/abandoned/${id}`, { method: 'DELETE' }),
    sendToSteadfast: (orderId) => request(`/shipping/steadfast/${orderId}`, { method: 'POST' }),
    refreshSteadfastStatus: (orderId) => request(`/shipping/steadfast/${orderId}/status`),
    // কুপন
    validateCoupon: (payload) => request('/coupons/validate', { method: 'POST', body: JSON.stringify(payload) }),
    getCoupons: () => request('/coupons'),
    createCoupon: (data) => request('/coupons', { method: 'POST', body: JSON.stringify(data) }),
    setCouponActive: (id, active) => request(`/coupons/${id}`, { method: 'PATCH', body: JSON.stringify({ active }) }),
    deleteCoupon: (id) => request(`/coupons/${id}`, { method: 'DELETE' }),
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
    getReportSummary: () => request('/reports/summary'),
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
