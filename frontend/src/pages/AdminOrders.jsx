import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import Invoice from '../components/Invoice';
import { downloadCsv, dhakaDate, dhakaDateTime } from '../utils/download';

const PAGE_SIZE = 30;
const STATUS_OPTIONS = ['pending', 'confirmed', 'delivered', 'cancelled', 'returned'];
const STATUS_LABEL = { pending: 'Pending', confirmed: 'Confirmed', delivered: 'Delivered', cancelled: 'Cancelled', returned: 'ফেরত' };
const RISK_LABEL = { high: '⚠️ High Risk', medium: '⚠️ Medium Risk', low: '✅ নিরাপদ', new: '🆕 নতুন/অল্প ইতিহাস' };

function riskNote(r) {
    if (!r || r.otherOrders === 0) return 'এই নম্বরে আগে কোনো অর্ডার নেই';
    return `আগে শেষ হয়েছে ${r.delivered + r.cancelled}টি অর্ডার — ডেলিভারড ${r.delivered}, বাতিল ${r.cancelled}`;
}

const SHIP_LABEL = {
    sending: 'পাঠানো হচ্ছে...', in_review: 'রিভিউতে আছে', pending: 'কুরিয়ারে পেন্ডিং',
    delivered_approval_pending: 'ডেলিভারড (অনুমোদনের অপেক্ষায়)', partial_delivered_approval_pending: 'আংশিক ডেলিভারড (অনুমোদনের অপেক্ষায়)',
    cancelled_approval_pending: 'বাতিল (অনুমোদনের অপেক্ষায়)', unknown_approval_pending: 'অজানা (অনুমোদনের অপেক্ষায়)',
    delivered: 'ডেলিভারড', partial_delivered: 'আংশিক ডেলিভারড', cancelled: 'বাতিল', hold: 'হোল্ড', unknown: 'অজানা',
};

const PAYMENT_LABEL = { cod: 'ক্যাশ অন ডেলিভারি', bkash: 'bKash', nagad: 'Nagad' };

export default function AdminOrders() {
    const [invoiceOrder, setInvoiceOrder] = useState(null);
    const [orders, setOrders] = useState([]);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);
    const [status, setStatus] = useState('all');
    const [search, setSearch] = useState('');
    const [term, setTerm] = useState(''); // search বক্স থেমে গেলে (০.৪ সেকেন্ড) এটা বদলায়, তখনই সার্ভারে খোঁজা হয়
    const [page, setPage] = useState(1);
    const [pages, setPages] = useState(1);
    const [total, setTotal] = useState(0);
    const [counts, setCounts] = useState({ all: 0 });

    useEffect(() => {
        const t = setTimeout(() => { setTerm(search.trim()); setPage(1); }, 400);
        return () => clearTimeout(t);
    }, [search]);

    // সার্ভার থেকে শুধু এই পেজের ৩০টা অর্ডার আসে (সব অর্ডার একসাথে নয়) — ফোনেও দ্রুত
    const load = useCallback(() => {
        setLoading(true);
        setError('');
        api.getOrdersPage({ page, limit: PAGE_SIZE, status, q: term })
            .then((d) => {
                setOrders(d.items);
                setPages(d.pages);
                setTotal(d.total);
                setCounts(d.counts);
            })
            .catch((e) => setError(e.message))
            .finally(() => setLoading(false));
    }, [page, status, term]);

    useEffect(() => { load(); }, [load]);

    async function handleStatusChange(id, newStatus) {
        try {
            await api.updateOrderStatus(id, newStatus);
            setOrders((prev) => prev.map((o) => (o._id === id ? { ...o, status: newStatus } : o)));
            load(); // ট্যাবের সংখ্যা ও ফিল্টার ঠিক রাখতে তালিকা আবার আনা
        } catch (err) {
            alert(err.message);
        }
    }

    function replaceOrder(updated) {
        // নতুন ডেটায় risk থাকে না, তাই পুরনো risk ধরে রাখা
        setOrders((prev) => prev.map((o) => (o._id === updated._id ? { ...updated, risk: o.risk } : o)));
    }

    async function handleSendToSteadfast(o) {
        const cod = o.paymentMethod === 'cod' ? o.total : 0;
        const ok = window.confirm(`Steadfast-এ পাঠাবেন?\n\n${o.customerName} — ${o.phone}\n${o.address}\nকুরিয়ার যে টাকা তুলবে (COD): ৳${cod}`);
        if (!ok) return;
        try {
            replaceOrder(await api.sendToSteadfast(o._id));
        } catch (err) {
            alert(err.message);
        }
    }

    async function handleSendToPathao(o) {
        const cod = o.paymentMethod === 'cod' ? o.total : 0;
        const ok = window.confirm(`Pathao-তে পাঠাবেন?\n\n${o.customerName} — ${o.phone}\n${o.address}\nকুরিয়ার যে টাকা তুলবে (COD): ৳${cod}`);
        if (!ok) return;
        try {
            replaceOrder(await api.sendToPathao(o._id));
        } catch (err) {
            alert(err.message);
        }
    }

    async function handleRefreshShipment(o) {
        try {
            replaceOrder(await (o.shipment.courier === 'pathao' ? api.refreshPathaoStatus(o._id) : api.refreshSteadfastStatus(o._id)));
        } catch (err) {
            alert(err.message);
        }
    }

    const isFiltering = status !== 'all' || term !== '';

    // এখন যে শর্ত (ফিল্টার/খোঁজা) চলছে তার সব অর্ডার CSV হিসেবে ডাউনলোড (সব পেজ ঘুরে আনা হয়)
    async function exportOrders() {
        let filtered = [];
        try {
            for (let pg = 1, last = 1; pg <= last; pg += 1) {
                const d = await api.getOrdersPage({ page: pg, limit: 200, status, q: term });
                filtered = filtered.concat(d.items);
                last = d.pages;
            }
        } catch (err) {
            alert(err.message);
            return;
        }
        const hasCosts = filtered.some((o) => 'courierCost' in o); // স্টাফের ডেটায় খরচ থাকে না
        const head = ['অর্ডার নং', 'তারিখ', 'নাম', 'ফোন', 'ঠিকানা', 'পেমেন্ট', 'TrxID', 'স্ট্যাটাস', 'পণ্য', 'পণ্যের দাম', 'কুপন ছাড়', 'ডেলিভারি চার্জ', 'মোট'];
        if (hasCosts) head.push('ক্রয়মূল্য', 'কুরিয়ার খরচ', 'প্যাকেজিং খরচ');
        const rows = [head];
        filtered.forEach((o) => {
            const items = (o.items || []).map((i) => `${i.title} (${i.variantLabel}) x${i.quantity}`).join('; ');
            const goods = (o.items || []).reduce((s, i) => s + i.price * i.quantity, 0);
            const row = [String(o._id).slice(-6).toUpperCase(), dhakaDateTime(o.createdAt), o.customerName, o.phone, o.address,
                PAYMENT_LABEL[o.paymentMethod] || o.paymentMethod || '', o.paymentTrxId || '', STATUS_LABEL[o.status] || o.status,
                items, goods, o.discount || 0, o.deliveryCharge || 0, o.total || 0];
            if (hasCosts) {
                row.push((o.items || []).reduce((s, i) => s + (i.costPrice || 0) * i.quantity, 0), o.courierCost || 0, o.packagingCost || 0);
            }
            rows.push(row);
        });
        downloadCsv(`tayyib-orders-${dhakaDate()}.csv`, rows);
    }

    return (
        <div>
            <input
                className="admin-search"
                type="search"
                placeholder="নাম, ফোন নম্বর বা ঠিকানা দিয়ে খুঁজুন..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
            />

            <button className="link-btn" onClick={exportOrders} disabled={total === 0}>📥 এই তালিকা ডাউনলোড (CSV)</button>
            <div className="chip-row">
                <button className={`cat-chip ${status === 'all' ? 'active' : ''}`} onClick={() => { setStatus('all'); setPage(1); }}>
                    সব ({counts.all})
                </button>
                {STATUS_OPTIONS.map((s) => (
                    <button key={s} className={`cat-chip ${status === s ? 'active' : ''}`} onClick={() => { setStatus(s); setPage(1); }}>
                        {STATUS_LABEL[s]} ({counts[s]})
                    </button>
                ))}
            </div>

            {error && <p className="status-msg error">{error}</p>}
            {loading && <p className="status-msg">লোড হচ্ছে...</p>}
            {!loading && !error && counts.all === 0 && <p className="status-msg">এখনো কোনো অর্ডার নেই।</p>}

            {!loading && isFiltering && counts.all > 0 && (
                <p className="result-note">
                    {total}টি অর্ডার পাওয়া গেছে{' '}
                    <button className="link-btn" onClick={() => { setStatus('all'); setSearch(''); setTerm(''); setPage(1); }}>সব দেখুন</button>
                </p>
            )}
            {!loading && isFiltering && counts.all > 0 && total === 0 && (
                <p className="status-msg">এই শর্তে কোনো অর্ডার মেলেনি।</p>
            )}

            {invoiceOrder && <Invoice order={invoiceOrder} onClose={() => setInvoiceOrder(null)} />}

            {orders.map((o) => (
                <div className="order-card" key={o._id}>
                    <div className="order-line">
                        <strong>{o.customerName} — {o.phone}</strong>
                        <span className={`status-badge ${o.status}`}>{STATUS_LABEL[o.status] || o.status}</span>
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--walnut-soft)', margin: '4px 0' }}>
                        {new Date(o.createdAt).toLocaleString('bn-BD')}
                        {o.paymentMethod ? ` · ${PAYMENT_LABEL[o.paymentMethod] || o.paymentMethod}` : ''}
                        {o.paymentTrxId ? ` · TrxID: ${o.paymentTrxId}` : ''}
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--walnut-soft)', margin: '4px 0' }}>ঠিকানা: {o.address}</div>
                    {o.risk && (
                        <div className="risk-row">
                            <span className={`risk-badge ${o.risk.level}`}>{RISK_LABEL[o.risk.level]}</span>
                            <span className="risk-note">{riskNote(o.risk)}</span>
                        </div>
                    )}
                    {o.items.map((it, idx) => (
                        <div key={idx} style={{ fontSize: 14 }}>{it.title} ({it.variantLabel}) × {it.quantity} — ৳{it.price * it.quantity}</div>
                    ))}
                    <div style={{ fontSize: 13, color: 'var(--walnut-soft)', margin: '4px 0' }}>
                        ডেলিভারি: {o.deliveryArea === 'outside' ? 'ঢাকার বাইরে' : 'ঢাকার ভেতরে'} · ৳{o.deliveryCharge}
                    </div>
                    {o.discount > 0 && (
                        <div style={{ fontSize: 13, color: 'var(--walnut-soft)', margin: '4px 0' }}>কুপন {o.couponCode}: − ৳{o.discount}</div>
                    )}
                    <div className="order-total"><span>সর্বমোট (ডেলিভারিসহ)</span><span>৳{o.total}</span></div>
                    {o.shipment && o.shipment.courier ? (
                        <div className="ship-row">
                            <span>🚚 {o.shipment.courier === 'pathao' ? 'Pathao' : 'Steadfast'}{o.shipment.trackingCode ? ` · ট্র্যাকিং: ${o.shipment.trackingCode}` : ''}</span>
                            <strong>{SHIP_LABEL[o.shipment.status] || o.shipment.status}</strong>
                            {o.shipment.consignmentId && (
                                <button className="link-btn" onClick={() => handleRefreshShipment(o)}>স্ট্যাটাস আপডেট</button>
                            )}
                        </div>
                    ) : (
                        (o.status === 'pending' || o.status === 'confirmed') && (
                            <div className="ship-row">
                                <button className="btn-primary" onClick={() => handleSendToSteadfast(o)}>Steadfast-এ পাঠান</button>
                                <button className="btn-primary" onClick={() => handleSendToPathao(o)}>Pathao-তে পাঠান</button>
                            </div>
                        )
                    )}
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
                        <button className="link-btn" style={{ marginLeft: 12 }} onClick={() => setInvoiceOrder(o)}>🧾 ইনভয়েস</button>
                    </div>
                </div>
            ))}

            {pages > 1 && (
                <div className="chip-row" style={{ justifyContent: 'center', alignItems: 'center', margin: '16px 0' }}>
                    <button className="cat-chip" disabled={page <= 1 || loading} onClick={() => { setPage((p) => p - 1); window.scrollTo(0, 0); }}>← আগের</button>
                    <span style={{ fontSize: 14 }}>পেজ {page} / {pages}</span>
                    <button className="cat-chip" disabled={page >= pages || loading} onClick={() => { setPage((p) => p + 1); window.scrollTo(0, 0); }}>পরের →</button>
                </div>
            )}
        </div>
    );
}
