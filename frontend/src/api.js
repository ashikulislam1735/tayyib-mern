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
    getProducts: (category) => request(category ? `/products?category=${encodeURIComponent(category)}` : '/products'),
    getProduct: (id) => request(`/products/${id}`),
    createOrder: (payload) => request('/orders', { method: 'POST', body: JSON.stringify(payload) }),
    trackOrder: (query) => request(`/orders/track/${encodeURIComponent(query)}`),

    // admin
    login: (username, password) => request('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
    changePassword: (currentPassword, newPassword) => request('/auth/change-password', { method: 'POST', body: JSON.stringify({ currentPassword, newPassword }) }),
    getBanners: () => request('/banners'),
    getAllBanners: () => request('/banners/all'),
    createBanner: (data) => request('/banners', { method: 'POST', body: JSON.stringify(data) }),
    updateBanner: (id, data) => request(`/banners/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteBanner: (id) => request(`/banners/${id}`, { method: 'DELETE' }),
    getAllOrders: () => request('/orders'),
    createProduct: (data) => request('/products', { method: 'POST', body: JSON.stringify(data) }),
    updateProduct: (id, data) => request(`/products/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteProduct: (id) => request(`/products/${id}`, { method: 'DELETE' }),
    updateOrderStatus: (id, status) => request(`/orders/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
};
