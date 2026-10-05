import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api';

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
    if (!order) return <p className="status-msg">লোড হচ্ছে...</p>;

    return (
        <div className="panel" style={{ maxWidth: 480, margin: '0 auto', textAlign: 'center' }}>
            <div style={{ fontSize: '3rem' }}>✅</div>
            <h2>অর্ডার সম্পন্ন হয়েছে!</h2>
            <p>ধন্যবাদ, {order.customerName}। অর্ডার আইডিটা সংরক্ষণ করুন।</p>
            <div className="order-line"><span>অর্ডার আইডি</span><span><code>{order._id}</code></span></div>
            <div className="order-line"><span>স্ট্যাটাস</span><span>{order.status}</span></div>
            <div className="order-total"><span>সর্বমোট</span><span>৳{order.total}</span></div>
            <Link className="btn-primary" style={{ display: 'inline-block', marginTop: 16 }} to="/track">
                অর্ডার ট্র্যাক করুন
            </Link>
        </div>
    );
}
