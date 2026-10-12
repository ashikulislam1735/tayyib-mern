import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api';

const STATUS_LABEL = { pending: 'Order placed', confirmed: 'Confirmed', delivered: 'Delivered', cancelled: 'Cancelled', returned: 'Returned' };

export default function OrderConfirmed() {
    const { id } = useParams();
    const [order, setOrder] = useState(null);
    const [error, setError] = useState('');

    useEffect(() => {
        api.trackOrder(id)
            .then((orders) => setOrder(orders[0]))
            .catch((e) => setError(e.message));
    }, [id]);

    if (error) return <p className="status-msg error">{error}</p>;
    if (!order) return <p className="status-msg">Loading...</p>;

    return (
        <div className="panel" style={{ maxWidth: 480, margin: '0 auto', textAlign: 'center' }}>
            <div style={{ fontSize: '3rem' }}>✅</div>
            <h2>Order placed!</h2>
            <p>Thank you, {order.customerName}. Please save your order ID.</p>
            <div className="order-line"><span>Order ID</span><span><code>{order._id}</code></span></div>
            <div className="order-line"><span>Status</span><span>{STATUS_LABEL[order.status] || order.status}</span></div>
            <div className="order-total"><span>Total</span><span>৳{order.total}</span></div>
            <Link className="btn-primary" style={{ display: 'inline-block', marginTop: 16 }} to="/track">
                Track Order
            </Link>
        </div>
    );
}
