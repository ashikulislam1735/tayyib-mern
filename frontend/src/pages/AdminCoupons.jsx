import { useEffect, useState } from 'react';
import { api } from '../api';

const EMPTY = { code: '', type: 'percent', value: '', minOrder: '', maxDiscount: '', usageLimit: '', expiresAt: '' };

function describe(c) {
    return c.type === 'percent'
        ? `${c.value}% ছাড়${c.maxDiscount > 0 ? ` (সর্বোচ্চ ৳${c.maxDiscount})` : ''}`
        : `৳${c.value} ছাড়`;
}

export default function AdminCoupons() {
    const [coupons, setCoupons] = useState([]);
    const [form, setForm] = useState(EMPTY);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');

    async function load() {
        try {
            setCoupons(await api.getCoupons());
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }
    useEffect(() => { load(); }, []);

    const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

    async function handleSubmit(e) {
        e.preventDefault();
        setError('');
        setMessage('');
        setSaving(true);
        try {
            await api.createCoupon({
                code: form.code,
                type: form.type,
                value: Number(form.value),
                minOrder: form.minOrder === '' ? 0 : Number(form.minOrder),
                maxDiscount: form.maxDiscount === '' ? 0 : Number(form.maxDiscount),
                usageLimit: form.usageLimit === '' ? 0 : Number(form.usageLimit),
                expiresAt: form.expiresAt || undefined,
            });
            setForm(EMPTY);
            setMessage('কুপন তৈরি হয়েছে।');
            await load();
        } catch (err) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    }

    async function toggle(c) {
        try {
            const updated = await api.setCouponActive(c._id, !c.active);
            setCoupons((prev) => prev.map((x) => (x._id === c._id ? updated : x)));
        } catch (err) {
            alert(err.message);
        }
    }

    async function remove(c) {
        if (!window.confirm(`${c.code} কুপনটি মুছে ফেলতে চান?`)) return;
        try {
            await api.deleteCoupon(c._id);
            setCoupons((prev) => prev.filter((x) => x._id !== c._id));
        } catch (err) {
            alert(err.message);
        }
    }

    return (
        <div>
            {error && <p className="status-msg error">{error}</p>}
            {message && <p className="status-msg">{message}</p>}

            <form className="panel" onSubmit={handleSubmit}>
                <h3 style={{ marginTop: 0 }}>নতুন কুপন</h3>
                <div className="expense-form-grid">
                    <label>কোড (ইংরেজি, সংখ্যা)
                        <input value={form.code} onChange={(e) => set('code', e.target.value.toUpperCase())} maxLength={20} required placeholder="WELCOME10" />
                    </label>
                    <label>ছাড়ের ধরন
                        <select value={form.type} onChange={(e) => set('type', e.target.value)}>
                            <option value="percent">শতাংশ (%)</option>
                            <option value="fixed">নির্দিষ্ট টাকা (৳)</option>
                        </select>
                    </label>
                    <label>{form.type === 'percent' ? 'কত শতাংশ (১–১০০)' : 'কত টাকা'}
                        <input type="number" min="1" max={form.type === 'percent' ? 100 : undefined} step="1" required value={form.value} onChange={(e) => set('value', e.target.value)} />
                    </label>
                    <label>ন্যূনতম অর্ডার (৳, ঐচ্ছিক)
                        <input type="number" min="0" step="1" value={form.minOrder} onChange={(e) => set('minOrder', e.target.value)} />
                    </label>
                    {form.type === 'percent' && (
                        <label>সর্বোচ্চ ছাড় (৳, ঐচ্ছিক)
                            <input type="number" min="0" step="1" value={form.maxDiscount} onChange={(e) => set('maxDiscount', e.target.value)} />
                        </label>
                    )}
                    <label>মোট কতবার ব্যবহার করা যাবে (ফাঁকা = সীমাহীন)
                        <input type="number" min="0" step="1" value={form.usageLimit} onChange={(e) => set('usageLimit', e.target.value)} />
                    </label>
                    <label>মেয়াদ শেষের তারিখ (ঐচ্ছিক)
                        <input type="date" value={form.expiresAt} onChange={(e) => set('expiresAt', e.target.value)} />
                    </label>
                </div>
                <button className="btn-primary" type="submit" disabled={saving}>{saving ? 'সংরক্ষণ হচ্ছে...' : 'কুপন তৈরি করুন'}</button>
                <p className="report-muted">ছাড় শুধু পণ্যের দামে লাগে, ডেলিভারি চার্জে নয়। এক কাস্টমার কয়বার ব্যবহার করতে পারবে তার আলাদা সীমা নেই; শুধু মোট ব্যবহারের সীমা আছে।</p>
            </form>

            <div className="panel" style={{ marginTop: 18 }}>
                <h3 style={{ marginTop: 0 }}>কুপনের তালিকা</h3>
                {loading && <p className="status-msg">লোড হচ্ছে...</p>}
                {!loading && coupons.length === 0 && <p style={{ margin: 0 }}>এখনো কোনো কুপন নেই।</p>}
                {coupons.map((c) => {
                    const expired = c.expiresAt && new Date(c.expiresAt) < new Date();
                    const used = c.usageLimit > 0 ? `${c.usedCount}/${c.usageLimit}` : `${c.usedCount} (সীমাহীন)`;
                    return (
                        <div className="expense-row" key={c._id}>
                            <div className="expense-details">
                                <strong>{c.code} — {describe(c)}</strong>
                                <span>
                                    ব্যবহার: {used}
                                    {c.minOrder > 0 ? ` · ন্যূনতম ৳${c.minOrder}` : ''}
                                    {c.expiresAt ? ` · মেয়াদ: ${new Date(c.expiresAt).toLocaleDateString('bn-BD', { timeZone: 'Asia/Dhaka' })}` : ''}
                                    {expired ? ' · মেয়াদ শেষ' : ''}
                                </span>
                            </div>
                            <span className={`status-badge ${c.active && !expired ? 'delivered' : 'cancelled'}`}>{c.active && !expired ? 'চালু' : 'বন্ধ'}</span>
                            <button className="link-btn" onClick={() => toggle(c)}>{c.active ? 'বন্ধ করুন' : 'চালু করুন'}</button>
                            <button className="expense-delete" onClick={() => remove(c)}>মুছুন</button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
