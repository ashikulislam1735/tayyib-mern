import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { downloadCsv, dhakaDate, dhakaDateTime } from '../utils/download';

const LOW_STOCK = 5;
const money = (v) => `৳${Number(v || 0).toLocaleString('en-BD', { maximumFractionDigits: 2 })}`;
const STATUS_LABEL = { pending: 'Pending', confirmed: 'Confirmed', delivered: 'Delivered', cancelled: 'Cancelled', returned: 'ফেরত' };
const addDaysStr = (dateStr, n) => dhakaDate(new Date(new Date(`${dateStr}T00:00:00+06:00`).getTime() + n * 86400000));
// দ্রুত বাছাইয়ের বাটন: [নাম, শুরুর তারিখ, শেষ তারিখ]
function quickRanges() {
    const t = dhakaDate();
    return [
        ['আজ', t, t],
        ['গতকাল', addDaysStr(t, -1), addDaysStr(t, -1)],
        ['শেষ ৭ দিন', addDaysStr(t, -6), t],
        ['শেষ ৩০ দিন', addDaysStr(t, -29), t],
        ['এই মাস', `${t.slice(0, 8)}01`, t],
    ];
}

export default function AdminDashboard() {
    const { isOwner } = useAuth();
    const [orders, setOrders] = useState([]);
    const [products, setProducts] = useState([]);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);
    const [report, setReport] = useState(null);
    const [reportError, setReportError] = useState('');
    const [reportLoading, setReportLoading] = useState(false);
    const [from, setFrom] = useState(() => addDaysStr(dhakaDate(), -6));
    const [to, setTo] = useState(() => dhakaDate());

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
    // তারিখ বদলালেই নতুন করে হিসাব আনে (দুটো তারিখ ঠিক থাকলে)
    useEffect(() => {
        if (!isOwner || !from || !to || from > to) return;
        let stale = false;
        setReportLoading(true);
        setReportError('');
        api.getReportSummary(from, to)
            .then((r) => { if (!stale) setReport(r); })
            .catch((e) => { if (!stale) setReportError(e.message); })
            .finally(() => { if (!stale) setReportLoading(false); });
        return () => { stale = true; };
    }, [isOwner, from, to]);

    const maxDaily = report ? Math.max(1, ...report.daily.map((d) => d.sales)) : 1;

    const stats = useMemo(() => {
        const today = new Date().toDateString();
        const todayOrders = orders.filter((o) => new Date(o.createdAt).toDateString() === today);
        const todaySales = todayOrders
            .filter((o) => o.status !== 'cancelled' && o.status !== 'returned')
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

    // সারাংশ CSV — স্ক্রিনে যে হিসাব দেখাচ্ছে (সার্ভারের হিসাব) হুবহু সেটাই ডাউনলোড হয়
    function downloadSummary() {
        const r = report.range;
        const rows = [
            ['বিক্রি ও লাভের সামারি'],
            ['তৈরির সময় (ঢাকা)', dhakaDateTime(new Date())],
            ['সময়কাল', `${r.from} থেকে ${r.to}`],
            [],
            ['অর্ডার (বাতিল ও ফেরত বাদে)', 'বিক্রি', 'পণ্যের ক্রয়মূল্য', 'কুরিয়ার ও প্যাকেজিং', 'খরচ', 'নিট (বিক্রি − খরচ)', 'আসল লাভ'],
            [r.orders, r.sales, r.cogs, r.fees, r.expenses, r.net, r.profit],
            [],
            ['দৈনিক হিসাব'],
            ['তারিখ', 'অর্ডার', 'বিক্রি', 'পণ্যের ক্রয়মূল্য', 'কুরিয়ার ও প্যাকেজিং', 'খরচ'],
            ...report.daily.map((d) => [d.date, d.orders, d.sales, d.cogs, d.fees, d.expenses]),
            [],
            ['সেরা ৫ প্রোডাক্ট (এই সময়ে)'],
            ['নাম', 'বিক্রির সংখ্যা', 'বিক্রি'],
            ...report.topProducts.map((t) => [t.title, t.quantity, t.revenue]),
            [],
            ['অর্ডারের অবস্থা (সব সময়)'],
            ...Object.keys(STATUS_LABEL).map((s) => [STATUS_LABEL[s], report.statusCounts[s]]),
            [],
            ['নোট', 'আসল লাভ = বিক্রি − পণ্যের ক্রয়মূল্য − কুরিয়ার ও প্যাকেজিং − খরচ। ক্রয়মূল্য দেওয়া নেই এমন অর্ডারে ক্রয়মূল্য ০ ধরা হয়।'],
        ];
        downloadCsv(`tayyib-summary-${r.from}_${r.to}.csv`, rows);
    }

    if (loading) return <p className="status-msg">লোড হচ্ছে...</p>;
    if (error) return <p className="status-msg error">{error}</p>;

    return (
        <div>
            {isOwner && <div className="panel">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                    <h3 style={{ margin: 0 }}>বিক্রি ও খরচের সারাংশ</h3>
                    {report && <button className="link-btn" onClick={downloadSummary}>📥 সামারি ডাউনলোড (Excel/CSV)</button>}
                </div>
                <div className="chip-row" style={{ marginTop: 12, marginBottom: 10 }}>
                    {quickRanges().map(([label, f, t]) => (
                        <button key={label} type="button" className={`cat-chip ${from === f && to === t ? 'active' : ''}`} onClick={() => { setFrom(f); setTo(t); }}>{label}</button>
                    ))}
                </div>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 12 }}>
                    <div>
                        <label style={{ marginTop: 0 }}>থেকে</label>
                        <input type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} style={{ width: 'auto' }} />
                    </div>
                    <div>
                        <label style={{ marginTop: 0 }}>পর্যন্ত</label>
                        <input type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} style={{ width: 'auto' }} />
                    </div>
                </div>
                {from && to && from > to && <p className="status-msg error">"থেকে" তারিখ "পর্যন্ত" তারিখের আগে হতে হবে</p>}
                {reportError && <p className="status-msg error">{reportError}</p>}
                {!report && !reportError && <p style={{ margin: 0 }}>সারাংশ লোড হচ্ছে...</p>}
                {report && (
                    <div style={{ opacity: reportLoading ? 0.5 : 1 }}>
                        <div className="report-period">
                            <strong>{report.range.from === report.range.to ? report.range.from : `${report.range.from} থেকে ${report.range.to}`}</strong>
                            <div className="order-line"><span>অর্ডার (বাতিল বাদে)</span><span>{report.range.orders}</span></div>
                            <div className="order-line"><span>বিক্রি</span><span>{money(report.range.sales)}</span></div>
                            <div className="order-line"><span>পণ্যের ক্রয়মূল্য</span><span>{money(report.range.cogs)}</span></div>
                            <div className="order-line"><span>কুরিয়ার ও প্যাকেজিং</span><span>{money(report.range.fees)}</span></div>
                            <div className="order-line"><span>খরচ</span><span>{money(report.range.expenses)}</span></div>
                            <div className="order-line"><span>নিট (বিক্রি − খরচ)</span><span>{money(report.range.net)}</span></div>
                            <div className="order-line"><strong>আসল লাভ</strong><strong style={{ color: report.range.profit < 0 ? 'var(--danger)' : 'inherit' }}>{money(report.range.profit)}</strong></div>
                        </div>
                        <p className="report-muted">মোট বিক্রি বলতে ডেলিভারি চার্জসহ, বাতিল বাদে সব অর্ডার। আসল লাভ = বিক্রি − পণ্যের ক্রয়মূল্য − কুরিয়ার ও প্যাকেজিং − খরচ। বাতিল ও ফেরত অর্ডারের বিক্রি ধরা হয় না, তবে ফেরত অর্ডারের কুরিয়ার ও প্যাকেজিং খরচ লোকসান হিসেবে বাদ যায়। যেসব অর্ডারে বা প্রোডাক্টে ক্রয়মূল্য দেওয়া নেই (পুরোনো অর্ডারসহ), সেগুলোর ক্রয়মূল্য ০ ধরা হয়, তাই লাভ বেশি দেখাতে পারে। এই সময়ে ডেলিভারড অর্ডারের বিক্রি: {money(report.deliveredSales)}</p>

                        <h4 style={{ margin: '14px 0 6px' }}>দৈনিক বিক্রি</h4>
                        <div className="report-chart">
                            {report.daily.map((d) => (
                                <div className="report-bar-wrap" key={d.date} title={`${d.date}: ${money(d.sales)} (${d.orders}টি অর্ডার)`}>
                                    <div className="report-bar" style={{ height: `${Math.max(2, (d.sales / maxDaily) * 100)}%` }} />
                                </div>
                            ))}
                        </div>

                        <h4 style={{ margin: '14px 0 6px' }}>সেরা ৫ প্রোডাক্ট (এই সময়ে)</h4>
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
                    </div>
                )}
            </div>}

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
