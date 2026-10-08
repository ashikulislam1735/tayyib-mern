import { useEffect, useMemo, useState } from 'react';
import { api } from '../api';

const STATUS_OPTIONS = ['pending', 'confirmed', 'delivered', 'cancelled'];
const STATUS_LABEL = { pending: 'Pending', confirmed: 'Confirmed', delivered: 'Delivered', cancelled: 'Cancelled' };
const PAYMENT_LABEL = { cod: 'ক্যাশ অন ডেলিভারি', bkash: 'bKash', nagad: 'Nagad' };

// বাংলা অঙ্ককে ইংরেজি অঙ্কে বদলে নেয়, যাতে ফোন নম্বর দুভাবেই খোঁজা যায়
function normalize(text) {
    return String(text || '')
        .replace(/[০-৯]/g, (d) => '০১২৩৪৫৬৭৮৯'.indexOf(d))
        .toLowerCase();
}

export default function AdminOrders() {
    const [orders, setOrders] = useState([]);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);
    const [status, setStatus] = useState('all');
    const [search, setSearch] = useState('');

    useEffect(() => {
        api.getAllOrders()
            .then(setOrders)
            .catch((e) => setError(e.message))
            .finally(() => setLoading(false));
    }, []);

    async function handleStatusChange(id, newStatus) {
        try {
            await api.updateOrderStatus(id, newStatus);
            setOrders((prev) => prev.map((o) => (o._id === id ? { ...o, status: newStatus } : o)));
        } catch (err) {
            alert(err.message);
        }
    }

    const counts = useMemo(() => {
        const c = { all: orders.length };
        STATUS_OPTIONS.forEach((s) => { c[s] = orders.filter((o) => o.status === s).length; });
        return c;
    }, [orders]);

    const filtered = useMemo(() => {
        const term = normalize(search.trim());
        return orders.filter((o) => {
            if (status !== 'all' && o.status !== status) return false;
            if (!term) return true;
            const haystack = normalize([o.customerName, o.phone, o.address, o._id].join(' '));
            return haystack.includes(term);
        });
    }, [orders, status, search]);

    const isFiltering = status !== 'all' || search.trim() !== '';

    return (
        <div>
            <input
                className="admin-search"
                type="search"
                placeholder="নাম, ফোন নম্বর বা ঠিকানা দিয়ে খুঁজুন..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
            />

            <div className="chip-row">
                <button className={`cat-chip ${status === 'all' ? 'active' : ''}`} onClick={() => setStatus('all')}>
                    সব ({counts.all})
                </button>
                {STATUS_OPTIONS.map((s) => (
                    <button key={s} className={`cat-chip ${status === s ? 'active' : ''}`} onClick={() => setStatus(s)}>
                        {STATUS_LABEL[s]} ({counts[s]})
                    </button>
                ))}
            </div>

            {error && <p className="status-msg error">{error}</p>}
            {loading && <p className="status-msg">লোড হচ্ছে...</p>}
            {!loading && !error && orders.length === 0 && <p className="status-msg">এখনো কোনো অর্ডার নেই।</p>}

            {!loading && isFiltering && orders.length > 0 && (
                <p className="result-note">
                    {filtered.length}টি অর্ডার পাওয়া গেছে{' '}
                    <button className="link-btn" onClick={() => { setStatus('all'); setSearch(''); }}>সব দেখুন</button>
                </p>
            )}
            {!loading && isFiltering && orders.length > 0 && filtered.length === 0 && (
                <p className="status-msg">এই শর্তে কোনো অর্ডার মেলেনি।</p>
            )}

            {filtered.map((o) => (
                <div className="order-card" key={o._id}>
                    <div className="order-line">
                        <strong>{o.customerName} — {o.phone}</strong>
                        <span className={`status-badge ${o.status}`}>{STATUS_LABEL[o.status] || o.status}</span>
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--walnut-soft)', margin: '4px 0' }}>
                        {new Date(o.createdAt).toLocaleString('bn-BD')}
                        {o.paymentMethod ? ` · ${PAYMENT_LABEL[o.paymentMethod] || o.paymentMethod}` : ''}
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--walnut-soft)', margin: '4px 0' }}>ঠিকানা: {o.address}</div>
                    {o.items.map((it, idx) => (
                        <div key={idx} style={{ fontSize: 14 }}>{it.title} ({it.variantLabel}) × {it.quantity} — ৳{it.price * it.quantity}</div>
                    ))}
                    <div className="order-total"><span>সর্বমোট (ডেলিভারিসহ)</span><span>৳{o.total}</span></div>
                    <div style={{ marginTop: 8 }}>
                        <label style={{ margin: '0 8px 0 0', display: 'inline' }}>স্ট্যাটাস বদলান:</label>
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
