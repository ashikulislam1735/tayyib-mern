import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';

const LOW_STOCK = 5;

export default function AdminDashboard() {
    const [orders, setOrders] = useState([]);
    const [products, setProducts] = useState([]);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([api.getAllOrders(), api.getProducts()])
            .then(([o, p]) => {
                setOrders(o);
                setProducts(p);
            })
            .catch((e) => setError(e.message))
            .finally(() => setLoading(false));
    }, []);

    const stats = useMemo(() => {
        const today = new Date().toDateString();
        const todayOrders = orders.filter((o) => new Date(o.createdAt).toDateString() === today);
        const todaySales = todayOrders
            .filter((o) => o.status !== 'cancelled')
            .reduce((sum, o) => sum + (o.total || 0), 0);
        const pending = orders.filter((o) => o.status === 'pending').length;

        const low = [];
        products.forEach((p) => {
            p.variants.forEach((v) => {
                if (v.stock <= LOW_STOCK) low.push({ id: p._id + v._id, title: p.title, label: v.label, stock: v.stock });
            });
        });
        low.sort((a, b) => a.stock - b.stock);

        return { todayCount: todayOrders.length, todaySales, pending, low };
    }, [orders, products]);

    if (loading) return <p className="status-msg">লোড হচ্ছে...</p>;
    if (error) return <p className="status-msg error">{error}</p>;

    return (
        <div>
            <div className="admin-cards">
                <Link to="/admin/orders" className="admin-card">
                    <span className="admin-card-num">{stats.todayCount}</span>
                    <span className="admin-card-label">আজকের অর্ডার</span>
                </Link>
                <Link to="/admin/orders" className="admin-card">
                    <span className="admin-card-num">৳{stats.todaySales}</span>
                    <span className="admin-card-label">আজকের বিক্রি (বাতিল বাদে)</span>
                </Link>
                <Link to="/admin/orders" className={`admin-card ${stats.pending > 0 ? 'alert' : ''}`}>
                    <span className="admin-card-num">{stats.pending}</span>
                    <span className="admin-card-label">Pending অর্ডার</span>
                </Link>
                <Link to="/admin/products" className="admin-card">
                    <span className="admin-card-num">{products.length}</span>
                    <span className="admin-card-label">মোট প্রোডাক্ট</span>
                </Link>
            </div>

            <div className="panel" style={{ marginTop: 18 }}>
                <h3 style={{ marginTop: 0 }}>স্টক কম ({LOW_STOCK}টি বা তার কম)</h3>
                {stats.low.length === 0 && <p style={{ margin: 0 }}>সব প্রোডাক্টের স্টক ঠিক আছে ✅</p>}
                {stats.low.slice(0, 8).map((x) => (
                    <div className="admin-low-row" key={x.id}>
                        <span>{x.title} ({x.label})</span>
                        <strong className={x.stock <= 0 ? 'out' : ''}>{x.stock <= 0 ? 'স্টক নেই' : `${x.stock}টি বাকি`}</strong>
                    </div>
                ))}
                {stats.low.length > 8 && <p style={{ margin: '8px 0 0', fontSize: 13 }}>আরও {stats.low.length - 8}টি আছে।</p>}
                {stats.low.length > 0 && <p style={{ margin: '12px 0 0' }}><Link to="/admin/products" className="link-btn">প্রোডাক্টে গিয়ে স্টক বাড়ান</Link></p>}
            </div>
        </div>
    );
}
