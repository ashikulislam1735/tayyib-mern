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

export const api = {
    getProducts: (category) => request(category ? `/products?category=${encodeURIComponent(category)}` : '/products'),
    getProduct: (id) => request(`/products/${id}`),
    createOrder: (payload) => request('/orders', { method: 'POST', body: JSON.stringify(payload) }),
    trackOrder: (query) => request(`/orders/track/${encodeURIComponent(query)}`),

    // admin
    login: (username, password) => request('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
    changePassword: (currentPassword, newPassword) => request('/auth/change-password', { method: 'POST', body: JSON.stringify({ currentPassword, newPassword }) }),
    getAllOrders: () => request('/orders'),
    createProduct: (data) => request('/products', { method: 'POST', body: JSON.stringify(data) }),
    updateProduct: (id, data) => request(`/products/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteProduct: (id) => request(`/products/${id}`, { method: 'DELETE' }),
    updateOrderStatus: (id, status) => request(`/orders/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
};
