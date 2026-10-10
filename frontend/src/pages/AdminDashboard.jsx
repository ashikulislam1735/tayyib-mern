import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';

const LOW_STOCK = 5;
const money = (v) => `৳${Number(v || 0).toLocaleString('en-BD', { maximumFractionDigits: 2 })}`;
const STATUS_LABEL = { pending: 'Pending', confirmed: 'Confirmed', delivered: 'Delivered', cancelled: 'Cancelled' };
const PERIODS = [['today', 'আজ'], ['last7Days', 'শেষ ৭ দিন'], ['last30Days', 'শেষ ৩০ দিন']];

export default function AdminDashboard() {
    const [orders, setOrders] = useState([]);
    const [products, setProducts] = useState([]);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);
    const [report, setReport] = useState(null);
    const [reportError, setReportError] = useState('');

    useEffect(() => {
        Promise.all([api.getAllOrders(), api.getProducts()])
            .then(([o, p]) => {
                setOrders(o);
                setProducts(p);
            })
            .catch((e) => setError(e.message))
            .finally(() => setLoading(false));
    }, []);

    // বিক্রির সারাংশ আলাদা লোড হয় — এটা ব্যর্থ হলেও বাকি ড্যাশবোর্ড চলবে
    useEffect(() => {
        api.getReportSummary().then(setReport).catch((e) => setReportError(e.message));
    }, []);

    const maxDaily = report ? Math.max(1, ...report.daily.map((d) => d.sales)) : 1;

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
            <div className="panel">
                <h3 style={{ marginTop: 0 }}>বিক্রি ও খরচের সারাংশ</h3>
                {reportError && <p className="status-msg error">{reportError}</p>}
                {!report && !reportError && <p style={{ margin: 0 }}>সারাংশ লোড হচ্ছে...</p>}
                {report && (
                    <>
                        <div className="report-periods">
                            {PERIODS.map(([key, label]) => {
                                const r = report[key];
                                return (
                                    <div className="report-period" key={key}>
                                        <strong>{label}</strong>
                                        <div className="order-line"><span>অর্ডার (বাতিল বাদে)</span><span>{r.orders}</span></div>
                                        <div className="order-line"><span>বিক্রি</span><span>{money(r.sales)}</span></div>
                                        <div className="order-line"><span>খরচ</span><span>{money(r.expenses)}</span></div>
                                        <div className="order-line"><strong>নিট (বিক্রি − খরচ)</strong><strong style={{ color: r.net < 0 ? 'var(--danger)' : 'inherit' }}>{money(r.net)}</strong></div>
                                    </div>
                                );
                            })}
                        </div>
                        <p className="report-muted">মোট বিক্রি বলতে ডেলিভারি চার্জসহ, বাতিল বাদে সব অর্ডার। এটা পণ্যের কেনা দাম বাদ দেওয়া আসল লাভ নয়। শেষ ৩০ দিনে ডেলিভারড অর্ডারের বিক্রি: {money(report.deliveredSales30Days)}</p>

                        <h4 style={{ margin: '14px 0 6px' }}>শেষ ৩০ দিনের দৈনিক বিক্রি</h4>
                        <div className="report-chart">
                            {report.daily.map((d) => (
                                <div className="report-bar-wrap" key={d.date} title={`${d.date}: ${money(d.sales)} (${d.orders}টি অর্ডার)`}>
                                    <div className="report-bar" style={{ height: `${Math.max(2, (d.sales / maxDaily) * 100)}%` }} />
                                </div>
                            ))}
                        </div>

                        <h4 style={{ margin: '14px 0 6px' }}>সেরা ৫ প্রোডাক্ট (শেষ ৩০ দিন)</h4>
                        {report.topProducts.length === 0 && <p style={{ margin: 0 }}>এখনো কোনো বিক্রি নেই।</p>}
                        {report.topProducts.map((t) => (
                            <div className="order-line" key={t.title}><span>{t.title} × {t.quantity}</span><span>{money(t.revenue)}</span></div>
                        ))}

                        <h4 style={{ margin: '14px 0 6px' }}>অর্ডারের অবস্থা (সব সময়)</h4>
                        <div className="chip-row">
                            {Object.keys(STATUS_LABEL).map((s) => (
                                <span className="cat-chip" key={s}>{STATUS_LABEL[s]} ({report.statusCounts[s]})</span>
                            ))}
                        </div>
                    </>
                )}
            </div>

            <div className="admin-cards" style={{ marginTop: 18 }}>
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
