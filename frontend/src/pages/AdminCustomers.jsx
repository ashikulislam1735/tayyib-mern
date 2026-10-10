import { useEffect, useState } from 'react';
import { api } from '../api';

const money = (v) => `৳${Number(v || 0).toLocaleString('en-BD', { maximumFractionDigits: 2 })}`;
const fmtDate = (d) => new Date(d).toLocaleDateString('bn-BD', { timeZone: 'Asia/Dhaka', year: 'numeric', month: 'short', day: 'numeric' });
const STATUS_LABEL = { pending: 'Pending', confirmed: 'Confirmed', delivered: 'Delivered', cancelled: 'Cancelled', returned: 'ফেরত' };
const RISK = { high: ['⚠️ High Risk', 'high'], medium: ['⚠️ Medium Risk', 'medium'], low: ['✅ নিরাপদ', 'low'], new: ['🆕 নতুন/অল্প ইতিহাস', 'new'] };

export default function AdminCustomers() {
    const [customers, setCustomers] = useState([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [openPhone, setOpenPhone] = useState('');
    const [history, setHistory] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(false);

    // টাইপ থামার একটু পর খোঁজা (প্রতিটা অক্ষরে সার্ভারে না যেতে)
    useEffect(() => {
        const t = setTimeout(async () => {
            setLoading(true);
            setError('');
            try {
                setCustomers(await api.getCustomers(search.trim()));
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        }, 300);
        return () => clearTimeout(t);
    }, [search]);

    async function toggle(phone) {
        if (openPhone === phone) { setOpenPhone(''); return; }
        setOpenPhone(phone);
        setHistory([]);
        setHistoryLoading(true);
        try {
            setHistory(await api.getCustomerOrders(phone));
        } catch (err) {
            setError(err.message);
        } finally {
            setHistoryLoading(false);
        }
    }

    return (
        <div>
            <input className="admin-search" type="search" placeholder="নাম বা ফোন নম্বর দিয়ে খুঁজুন..." value={search} onChange={(e) => setSearch(e.target.value)} />

            {error && <p className="status-msg error">{error}</p>}
            {loading && <p className="status-msg">লোড হচ্ছে...</p>}
            {!loading && !error && customers.length === 0 && <p className="status-msg">কোনো কাস্টমার পাওয়া যায়নি।</p>}

            {customers.map((c) => {
                const [riskText, riskClass] = RISK[c.risk] || RISK.new;
                return (
                    <div className="order-card" key={c.phone}>
                        <div className="order-line">
                            <strong>{c.name || 'নাম নেই'} — {c.phone}</strong>
                            {c.delivered >= 3 && c.risk !== 'high' && <span className="status-badge delivered">নিয়মিত</span>}
                        </div>
                        <div className="risk-row">
                            <span className={`risk-badge ${riskClass}`}>{riskText}</span>
                        </div>
                        <div style={{ fontSize: 14 }}>
                            মোট অর্ডার {c.totalOrders} · ডেলিভারড {c.delivered} · বাতিল {c.cancelled}{c.active > 0 ? ` · চলমান ${c.active}` : ''}
                        </div>
                        <div style={{ fontSize: 14 }}>মোট কেনা (বাতিল বাদে): <strong>{money(c.totalSpent)}</strong></div>
                        <div className="abandoned-ago">প্রথম অর্ডার {fmtDate(c.firstOrderAt)} · শেষ অর্ডার {fmtDate(c.lastOrderAt)}</div>
                        <div className="abandoned-actions">
                            <button className="link-btn" onClick={() => toggle(c.phone)}>{openPhone === c.phone ? 'ইতিহাস বন্ধ করুন' : 'অর্ডারের ইতিহাস দেখুন'}</button>
                            <a className="link-btn" href={`https://wa.me/88${c.phone}`} target="_blank" rel="noopener noreferrer">WhatsApp</a>
                        </div>

                        {openPhone === c.phone && (
                            <div style={{ marginTop: 8, borderTop: '1px solid var(--line)', paddingTop: 8 }}>
                                {historyLoading && <p className="status-msg">লোড হচ্ছে...</p>}
                                {history.map((o) => (
                                    <div key={o._id} style={{ fontSize: 13, padding: '6px 0', borderBottom: '1px dashed var(--line)' }}>
                                        <div className="order-line">
                                            <span>{fmtDate(o.createdAt)} · {STATUS_LABEL[o.status] || o.status}</span>
                                            <strong>{money(o.total)}</strong>
                                        </div>
                                        <div>{o.items.map((i) => `${i.title} (${i.variantLabel}) × ${i.quantity}`).join(', ')}</div>
                                        <div style={{ color: 'var(--walnut-soft)' }}>{o.address}</div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                );
            })}
            <p className="report-muted">অর্ডারের ফোন নম্বর ধরে কাস্টমার চেনা হয়। একই মানুষ ভিন্ন নম্বরে অর্ডার করলে আলাদা কাস্টমার দেখাবে।</p>
        </div>
    );
}
