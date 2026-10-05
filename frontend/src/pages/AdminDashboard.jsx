import { useEffect, useState } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';

const STATUS_OPTIONS = ['pending', 'confirmed', 'delivered', 'cancelled'];
const STATUS_LABEL = { pending: 'Pending', confirmed: 'Confirmed', delivered: 'Delivered', cancelled: 'Cancelled' };

export default function AdminDashboard() {
    const [orders, setOrders] = useState([]);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);
    const { username, logout } = useAuth();

    function loadOrders() {
        setLoading(true);
        api.getAllOrders()
            .then(setOrders)
            .catch((e) => setError(e.message))
            .finally(() => setLoading(false));
    }

    useEffect(loadOrders, []);

    async function handleStatusChange(id, status) {
        try {
            await api.updateOrderStatus(id, status);
            setOrders((prev) => prev.map((o) => (o._id === id ? { ...o, status } : o)));
        } catch (err) {
            alert(err.message);
        }
    }

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                <h2 style={{ margin: 0 }}>অ্যাডমিন ড্যাশবোর্ড — {username}</h2>
                <button className="btn-primary" style={{ width: 'auto', padding: '8px 16px' }} onClick={logout}>
                    লগআউট
                </button>
            </div>

            {error && <p className="status-msg error">{error}</p>}
            {loading && <p className="status-msg">লোড হচ্ছে...</p>}

            {!loading && orders.length === 0 && <p className="status-msg">এখনো কোনো অর্ডার নেই।</p>}

            {orders.map((o) => (
                <div className="order-card" key={o._id}>
                    <div className="order-line">
                        <strong>{o.customerName} — {o.phone}</strong>
                        <span>{new Date(o.createdAt).toLocaleString('bn-BD')}</span>
                    </div>
                    <div style={{ fontSize: 13, color: '#777', margin: '4px 0' }}>ঠিকানা: {o.address}</div>
                    {o.items.map((it, idx) => (
                        <div key={idx} style={{ fontSize: 14 }}>{it.title} ({it.variantLabel}) × {it.quantity} — ৳{it.price * it.quantity}</div>
                    ))}
                    <div className="order-total"><span>সর্বমোট (ডেলিভারিসহ)</span><span>৳{o.total}</span></div>
                    <div style={{ marginTop: 8 }}>
                        <label style={{ margin: '0 8px 0 0', display: 'inline' }}>স্ট্যাটাস:</label>
                        <select
                            style={{ width: 'auto', display: 'inline-block' }}
                            value={o.status}
                            onChange={(e) => handleStatusChange(o._id, e.target.value)}
                        >
                            {STATUS_OPTIONS.map((s) => (
                                <option key={s} value={s}>{STATUS_LABEL[s]}</option>
                            ))}
                        </select>
                    </div>
                </div>
            ))}
        </div>
    );
}
