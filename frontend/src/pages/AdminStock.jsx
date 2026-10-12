import { useEffect, useMemo, useState } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { dhakaDateTime } from '../utils/download';

const LOW_STOCK = 5;
const money = (v) => `৳${Number(v || 0).toLocaleString('en-BD', { maximumFractionDigits: 2 })}`;
const REASONS = [
    ['restock', 'নতুন মাল এলো'],
    ['damaged', 'নষ্ট / হারানো'],
    ['return', 'ফেরত মাল'],
    ['correction', 'গণনা ঠিক করা'],
    ['other', 'অন্য কারণ'],
];
const REASON_LABEL = Object.fromEntries(REASONS);
const MODES = [['add', 'যোগ করুন (+)'], ['subtract', 'কমান (−)'], ['set', 'সরাসরি সংখ্যা বসান']];

function statusOf(stock) {
    if (stock <= 0) return 'out';
    if (stock <= LOW_STOCK) return 'low';
    return 'ok';
}
const STATUS_TEXT = { out: 'স্টক নেই', low: 'কম', ok: 'ঠিক আছে' };

function ChangeText({ log }) {
    const sign = log.change > 0 ? '+' : '';
    return (
        <span>
            {log.before} → <strong>{log.after}</strong>{' '}
            <span style={{ color: log.change < 0 ? 'var(--danger)' : '#1b6b3a' }}>({sign}{log.change})</span>
        </span>
    );
}

export default function AdminStock() {
    const { isOwner } = useAuth();
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState('all');
    const [category, setCategory] = useState('');
    const [openId, setOpenId] = useState(null);      // স্টক বদলানোর ফর্ম খোলা সাইজ
    const [histId, setHistId] = useState(null);      // ইতিহাস খোলা সাইজ
    const [histLogs, setHistLogs] = useState([]);
    const [histLoading, setHistLoading] = useState(false);
    const [form, setForm] = useState({ mode: 'add', quantity: '', reason: 'restock', note: '' });
    const [saving, setSaving] = useState(false);
    const [formError, setFormError] = useState('');
    const [msg, setMsg] = useState('');
    const [recent, setRecent] = useState([]);

    function loadRecent() {
        api.getStockLogs(null, 30).then(setRecent).catch(() => {});
    }

    useEffect(() => {
        api.getStock()
            .then(setRows)
            .catch((e) => setError(e.message))
            .finally(() => setLoading(false));
        loadRecent();
    }, []);

    const categories = useMemo(() => [...new Set(rows.map((r) => r.category))].sort(), [rows]);

    const summary = useMemo(() => {
        let low = 0, out = 0, units = 0, value = 0, noCost = 0;
        rows.forEach((r) => {
            const st = statusOf(r.stock);
            if (st === 'low') low += 1;
            if (st === 'out') out += 1;
            units += Math.max(0, r.stock);
            if (isOwner) {
                value += Math.max(0, r.stock) * (r.costPrice || 0);
                if (r.stock > 0 && !r.costPrice) noCost += 1;
            }
        });
        return { sizes: rows.length, low, out, units, value, noCost };
    }, [rows, isOwner]);

    const visible = useMemo(() => {
        const term = search.trim().toLowerCase();
        const list = rows.filter((r) => {
            if (category && r.category !== category) return false;
            const st = statusOf(r.stock);
            if (filter === 'low' && st !== 'low') return false;
            if (filter === 'out' && st !== 'out') return false;
            if (term && !`${r.title} ${r.label}`.toLowerCase().includes(term)) return false;
            return true;
        });
        if (filter !== 'all') list.sort((a, b) => a.stock - b.stock);
        return list;
    }, [rows, search, filter, category]);

    function openForm(r) {
        if (openId === r.variantId) { setOpenId(null); return; }
        setOpenId(r.variantId);
        setForm({ mode: 'add', quantity: '', reason: 'restock', note: '' });
        setFormError('');
    }

    async function toggleHistory(r) {
        if (histId === r.variantId) { setHistId(null); return; }
        setHistId(r.variantId);
        setHistLogs([]);
        setHistLoading(true);
        try {
            setHistLogs(await api.getStockLogs(r.variantId, 20));
        } catch (e) {
            setHistLogs([]);
        } finally {
            setHistLoading(false);
        }
    }

    function previewStock(r) {
        const q = Number(form.quantity);
        if (form.quantity === '' || !Number.isInteger(q) || q < 0) return null;
        if (form.mode === 'add') return r.stock + q;
        if (form.mode === 'subtract') return r.stock - q;
        return q;
    }

    async function save(r) {
        setFormError('');
        const q = Number(form.quantity);
        if (form.quantity === '' || !Number.isInteger(q) || q < 0) return setFormError('সংখ্যাটা পূর্ণ সংখ্যায় লিখুন (যেমন: 10)');
        if (form.mode !== 'set' && q < 1) return setFormError('সংখ্যা কমপক্ষে ১ হতে হবে');
        if (form.mode === 'subtract' && q > r.stock) return setFormError('কমানোর সংখ্যা বর্তমান স্টকের চেয়ে বেশি');
        setSaving(true);
        try {
            const res = await api.adjustStock({
                productId: r.productId, variantId: r.variantId,
                mode: form.mode, quantity: q, reason: form.reason, note: form.note,
            });
            setRows((prev) => prev.map((x) => (x.variantId === r.variantId ? { ...x, stock: res.stock } : x)));
            setMsg(`✅ ${r.title} (${r.label}): স্টক এখন ${res.stock}`);
            setOpenId(null);
            if (histId === r.variantId) setHistId(null);
            loadRecent();
        } catch (e) {
            setFormError(e.message);
        } finally {
            setSaving(false);
        }
    }

    if (loading) return <p className="status-msg">লোড হচ্ছে...</p>;
    if (error) return <p className="status-msg error">{error}</p>;

    return (
        <div>
            <div className="admin-cards">
                <div className="admin-card">
                    <span className="admin-card-num">{summary.sizes}</span>
                    <span className="admin-card-label">মোট সাইজ / ভ্যারিয়েন্ট</span>
                </div>
                <div className="admin-card">
                    <span className="admin-card-num">{summary.units}</span>
                    <span className="admin-card-label">মোট পিস স্টকে আছে</span>
                </div>
                <div className={`admin-card ${summary.low > 0 ? 'alert' : ''}`}>
                    <span className="admin-card-num">{summary.low}</span>
                    <span className="admin-card-label">কম স্টক ({LOW_STOCK}টি বা কম)</span>
                </div>
                <div className={`admin-card ${summary.out > 0 ? 'alert' : ''}`}>
                    <span className="admin-card-num">{summary.out}</span>
                    <span className="admin-card-label">স্টক শেষ</span>
                </div>
                {isOwner && (
                    <div className="admin-card">
                        <span className="admin-card-num">{money(summary.value)}</span>
                        <span className="admin-card-label">স্টকের মূল্য (ক্রয়মূল্য হিসেবে)</span>
                    </div>
                )}
            </div>
            {isOwner && summary.noCost > 0 && (
                <p className="report-muted">{summary.noCost}টি সাইজে ক্রয়মূল্য দেওয়া নেই, তাই স্টকের মূল্য কম দেখাতে পারে।</p>
            )}

            <div className="panel" style={{ marginTop: 18 }}>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12 }}>
                    <input
                        type="search"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="প্রোডাক্ট বা সাইজ খুঁজুন..."
                        style={{ flex: '1 1 200px', width: 'auto' }}
                    />
                    <select value={category} onChange={(e) => setCategory(e.target.value)} style={{ width: 'auto' }}>
                        <option value="">সব ক্যাটাগরি</option>
                        {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>
                <div className="chip-row" style={{ marginBottom: 6 }}>
                    {[['all', `সব (${rows.length})`], ['low', `কম স্টক (${summary.low})`], ['out', `স্টক শেষ (${summary.out})`]].map(([key, label]) => (
                        <button key={key} type="button" className={`cat-chip ${filter === key ? 'active' : ''}`} onClick={() => setFilter(key)}>{label}</button>
                    ))}
                </div>

                {msg && <p style={{ margin: '8px 0', color: '#1b6b3a', fontWeight: 600 }}>{msg}</p>}
                {visible.length === 0 && <p className="status-msg">কিছু পাওয়া যায়নি।</p>}

                {visible.map((r) => {
                    const st = statusOf(r.stock);
                    const preview = openId === r.variantId ? previewStock(r) : null;
                    return (
                        <div key={r.variantId} style={{ borderBottom: '1px solid var(--cream-2)', padding: '10px 0' }}>
                            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'space-between' }}>
                                <div style={{ flex: '1 1 220px', minWidth: 0 }}>
                                    <strong>{r.title}</strong>
                                    <div className="report-muted" style={{ margin: 0 }}>{r.label} · {r.category}</div>
                                </div>
                                <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                                    <span style={{ fontSize: '1.2rem', fontWeight: 700, minWidth: 36, textAlign: 'right' }}>{r.stock}</span>
                                    <span className={`stock-badge ${st === 'ok' ? '' : st}`}>{STATUS_TEXT[st]}</span>
                                    <button type="button" className="cat-chip active" onClick={() => openForm(r)}>স্টক বদলান</button>
                                    <button type="button" className="link-btn" onClick={() => toggleHistory(r)}>ইতিহাস</button>
                                </div>
                            </div>

                            {openId === r.variantId && (
                                <div style={{ background: 'var(--cream)', border: '1px solid var(--line)', borderRadius: 8, padding: 12, marginTop: 10 }}>
                                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                                        <div style={{ flex: '1 1 160px' }}>
                                            <label style={{ marginTop: 0 }}>কী করবেন</label>
                                            <select value={form.mode} onChange={(e) => setForm({ ...form, mode: e.target.value })}>
                                                {MODES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                                            </select>
                                        </div>
                                        <div style={{ flex: '1 1 120px' }}>
                                            <label style={{ marginTop: 0 }}>{form.mode === 'set' ? 'নতুন স্টক' : 'কত পিস'}</label>
                                            <input type="number" min="0" step="1" inputMode="numeric" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
                                        </div>
                                        <div style={{ flex: '1 1 160px' }}>
                                            <label style={{ marginTop: 0 }}>কারণ</label>
                                            <select value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })}>
                                                {REASONS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                    <label>নোট (ঐচ্ছিক)</label>
                                    <input type="text" maxLength={200} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="যেমন: সরবরাহকারীর কাছ থেকে নতুন চালান" />
                                    {preview !== null && (
                                        <p style={{ margin: '10px 0 0' }}>
                                            স্টক হবে: {r.stock} → <strong style={{ color: preview < 0 ? 'var(--danger)' : 'inherit' }}>{preview}</strong>
                                        </p>
                                    )}
                                    {formError && <p className="status-msg error" style={{ padding: '8px 0 0', textAlign: 'left' }}>{formError}</p>}
                                    <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
                                        <button type="button" className="btn-primary" style={{ width: 'auto', padding: '10px 22px' }} disabled={saving} onClick={() => save(r)}>
                                            {saving ? 'সেভ হচ্ছে...' : 'সেভ করুন'}
                                        </button>
                                        <button type="button" className="cat-chip" onClick={() => setOpenId(null)}>বাতিল</button>
                                    </div>
                                </div>
                            )}

                            {histId === r.variantId && (
                                <div style={{ marginTop: 10, paddingLeft: 10, borderLeft: '3px solid var(--line)' }}>
                                    {histLoading && <p className="report-muted">লোড হচ্ছে...</p>}
                                    {!histLoading && histLogs.length === 0 && <p className="report-muted">এই সাইজে হাতে স্টক বদলানোর কোনো ইতিহাস নেই।</p>}
                                    {histLogs.map((l) => (
                                        <div key={l._id} className="admin-low-row" style={{ flexWrap: 'wrap' }}>
                                            <span>{dhakaDateTime(l.createdAt)} · {REASON_LABEL[l.reason] || l.reason}{l.note ? ` · ${l.note}` : ''} · {l.by}</span>
                                            <ChangeText log={l} />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            <div className="panel" style={{ marginTop: 18 }}>
                <h3 style={{ marginTop: 0 }}>সাম্প্রতিক স্টক পরিবর্তন</h3>
                {recent.length === 0 && <p style={{ margin: 0 }}>এখনো হাতে কোনো স্টক বদলানো হয়নি।</p>}
                {recent.map((l) => (
                    <div key={l._id} className="admin-low-row" style={{ flexWrap: 'wrap' }}>
                        <span>
                            <strong>{l.productTitle}</strong> ({l.variantLabel}) · {REASON_LABEL[l.reason] || l.reason}
                            <span className="report-muted" style={{ margin: 0, display: 'block' }}>
                                {dhakaDateTime(l.createdAt)} · {l.by}{l.note ? ` · ${l.note}` : ''}
                            </span>
                        </span>
                        <ChangeText log={l} />
                    </div>
                ))}
                <p className="report-muted">এখানে শুধু এই পেজ থেকে হাতে করা পরিবর্তন দেখায়। অর্ডার দিলে বা বাতিল করলে যে স্টক নিজে নিজে বদলায়, তা এই ইতিহাসে আসে না।</p>
            </div>
        </div>
    );
}
