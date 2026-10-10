import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import { useSite } from '../context/SiteContext';

const THRESHOLDS = [[30, '৩০ মিনিট'], [60, '১ ঘণ্টা'], [360, '৬ ঘণ্টা'], [1440, '২৪ ঘণ্টা']];
const STATUS_LABEL = { open: 'নতুন', contacted: 'যোগাযোগ হয়েছে' };
const bn = (n) => Number(n).toLocaleString('bn-BD');
const money = (v) => `৳${Number(v || 0).toLocaleString('en-BD', { maximumFractionDigits: 2 })}`;

// "৪৫ মিনিট আগে", "২ ঘণ্টা আগে", "১ দিন আগে"
function timeAgo(date) {
    const mins = Math.max(1, Math.floor((Date.now() - new Date(date).getTime()) / 60000));
    if (mins < 60) return `${bn(mins)} মিনিট আগে`;
    if (mins < 1440) return `${bn(Math.floor(mins / 60))} ঘণ্টা আগে`;
    return `${bn(Math.floor(mins / 1440))} দিন আগে`;
}

// 01XXXXXXXXX → 8801XXXXXXXXX
const intlNumber = (phone) => `88${phone}`;

export default function AdminAbandoned() {
    const { site } = useSite();
    const [minutes, setMinutes] = useState(30);
    const [carts, setCarts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const load = useCallback(async (m) => {
        setLoading(true);
        setError('');
        try {
            setCarts(await api.getAbandonedCarts(m));
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(minutes); }, [minutes, load]);

    function markLocal(id, status) {
        setCarts((prev) => prev.map((c) => (c._id === id ? { ...c, status } : c)));
    }

    async function markContacted(id) {
        try {
            await api.markAbandonedContacted(id);
            markLocal(id, 'contacted');
        } catch (err) {
            alert(err.message);
        }
    }

    function openWhatsApp(cart) {
        const names = cart.items.map((i) => i.title).join(', ');
        const greeting = cart.customerName ? `আসসালামু আলাইকুম ${cart.customerName},` : 'আসসালামু আলাইকুম,';
        const text = `${greeting} ${site.name || 'আমাদের শপ'} থেকে বলছি। আপনি আমাদের শপে ${names} কার্টে রেখেছিলেন, কিন্তু অর্ডারটি সম্পূর্ণ হয়নি। কোনো সমস্যা হলে বা কিছু জানার থাকলে আমাদের জানাতে পারেন। ধন্যবাদ।`;
        window.open(`https://wa.me/${intlNumber(cart.phone)}?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
        if (cart.status === 'open') markContacted(cart._id);
    }

    async function remove(cart) {
        if (!window.confirm(`${cart.phone}-এর এই অসম্পূর্ণ অর্ডারটি মুছে ফেলতে চান?`)) return;
        try {
            await api.deleteAbandonedCart(cart._id);
            setCarts((prev) => prev.filter((c) => c._id !== cart._id));
        } catch (err) {
            alert(err.message);
        }
    }

    return (
        <div>
            <p className="page-sub">যারা চেকআউটে ফোন নম্বর দিয়েছে কিন্তু অর্ডার করেনি। অর্ডার করলে তালিকা থেকে নিজে থেকেই চলে যায়।</p>

            <div className="chip-row">
                {THRESHOLDS.map(([m, label]) => (
                    <button key={m} className={`cat-chip ${minutes === m ? 'active' : ''}`} onClick={() => setMinutes(m)}>
                        {label}+ আগে
                    </button>
                ))}
            </div>

            {error && <p className="status-msg error">{error}</p>}
            {loading && <p className="status-msg">লোড হচ্ছে...</p>}
            {!loading && !error && carts.length === 0 && <p className="status-msg">কোনো অসম্পূর্ণ অর্ডার নেই ✅</p>}

            {!loading && carts.map((c) => (
                <div className="order-card" key={c._id}>
                    <div className="order-line">
                        <strong>{c.customerName ? `${c.customerName} — ` : ''}{c.phone}</strong>
                        <span className={`status-badge ${c.status === 'contacted' ? 'confirmed' : 'pending'}`}>{STATUS_LABEL[c.status] || c.status}</span>
                    </div>
                    <div className="abandoned-ago">{timeAgo(c.lastActivityAt)}</div>
                    {c.items.map((it, idx) => (
                        <div key={idx} style={{ fontSize: 14 }}>{it.title} ({it.variantLabel}) × {it.quantity} — {money(it.price * it.quantity)}</div>
                    ))}
                    <div className="order-total"><span>কার্টের মোট (ডেলিভারি ছাড়া)</span><span>{money(c.cartTotal)}</span></div>
                    <div className="abandoned-actions">
                        <button className="btn-primary" onClick={() => openWhatsApp(c)}>WhatsApp-এ মেসেজ দিন</button>
                        {c.status === 'open' && <button className="link-btn" onClick={() => markContacted(c._id)}>যোগাযোগ হয়েছে</button>}
                        <button className="link-btn" style={{ color: 'var(--danger)' }} onClick={() => remove(c)}>মুছুন</button>
                    </div>
                </div>
            ))}
        </div>
    );
}
