import { useState } from 'react';
import { api } from '../api';

const STATUS_LABEL = { pending: 'অর্ডার সম্পন্ন হয়েছে', confirmed: 'কনফার্ম হয়েছে', delivered: 'ডেলিভারি সম্পন্ন', cancelled: 'বাতিল' };

export default function Track() {
    const [query, setQuery] = useState('');
    const [orders, setOrders] = useState([]);
    const [error, setError] = useState('');

    async function handleSearch(e) {
        e.preventDefault();
        setError('');
        setOrders([]);
        try {
            const result = await api.trackOrder(query.trim());
            setOrders(result);
        } catch (err) {
            setError(err.message);
        }
    }

    return (
        <div className="panel" style={{ maxWidth: 560, margin: '0 auto' }}>
            <h2>অর্ডার ট্র্যাক করুন</h2>
            <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8 }}>
                <input
                    placeholder="অর্ডার আইডি বা ফোন নম্বর"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    style={{ flex: 1 }}
                />
                <button className="btn-primary" style={{ width: 'auto', padding: '0 20px' }} type="submit">
                    খুঁজুন
                </button>
            </form>

            {error && <p className="status-msg error">{error}</p>}

            {orders.map((o) => (
                <div className="order-card" key={o._id}>
                    <div className="order-line">
                        <strong>অর্ডার #{o._id.slice(-6).toUpperCase()}</strong>
                        <span className="badge">{STATUS_LABEL[o.status]}</span>
                    </div>
                    <div style={{ fontSize: 13, color: '#888' }}>{new Date(o.createdAt).toLocaleString('bn-BD')}</div>
                    {o.items.map((it, idx) => (
                        <div key={idx} style={{ fontSize: 14 }}>{it.title} ({it.variantLabel}) × {it.quantity}</div>
                    ))}
                    <div className="order-total"><span>সর্বমোট</span><span>৳{o.total}</span></div>
                </div>
            ))}
        </div>
    );
}
