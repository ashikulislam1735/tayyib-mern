import { useState } from 'react';
import { api } from '../api';
import Invoice from '../components/Invoice';

const STATUS_LABEL = { pending: 'Order placed', confirmed: 'Confirmed', delivered: 'Delivered', cancelled: 'Cancelled', returned: 'Returned' };

export default function Track() {
    const [query, setQuery] = useState('');
    const [orders, setOrders] = useState([]);
    const [error, setError] = useState('');
    const [invoiceOrder, setInvoiceOrder] = useState(null);

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
            <h2>Track Your Order</h2>
            <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8 }}>
                <input
                    placeholder="Order ID or phone number"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    style={{ flex: 1 }}
                />
                <button className="btn-primary" style={{ width: 'auto', padding: '0 20px' }} type="submit">
                    Search
                </button>
            </form>

            {error && <p className="status-msg error">{error}</p>}

            {invoiceOrder && <Invoice order={invoiceOrder} onClose={() => setInvoiceOrder(null)} />}

            {orders.map((o) => (
                <div className="order-card" key={o._id || o.ref}>
                    <div className="order-line">
                        <strong>Order #{o.ref || o._id.slice(-6).toUpperCase()}</strong>
                        <span className="badge">{STATUS_LABEL[o.status]}</span>
                    </div>
                    <div style={{ fontSize: 14, color: '#888' }}>{new Date(o.createdAt).toLocaleString('en-GB', { timeZone: 'Asia/Dhaka', dateStyle: 'medium', timeStyle: 'short' })}</div>
                    {o.items.map((it, idx) => (
                        <div key={idx} style={{ fontSize: 14 }}>{it.title} ({it.variantLabel}) × {it.quantity}</div>
                    ))}
                    <div className="order-total"><span>Total</span><span>৳{o.total}</span></div>
                    {o.address && <button className="link-btn" onClick={() => setInvoiceOrder(o)}>🧾 View / Download Invoice</button>}
                </div>
            ))}
        </div>
    );
}
