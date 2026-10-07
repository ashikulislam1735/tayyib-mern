import { useEffect, useState } from 'react';
import { api } from '../api';

const EMPTY_VARIANT = { label: '', price: '', originalPrice: '', stock: '' };
const EMPTY_FORM = { title: '', category: '', icon: '🛍️', description: '', variants: [{ ...EMPTY_VARIANT }] };

export default function AdminProducts() {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [form, setForm] = useState(null); // null = ফর্ম বন্ধ
    const [editId, setEditId] = useState(null); // null = নতুন প্রোডাক্ট
    const [saving, setSaving] = useState(false);

    function load() {
        setLoading(true);
        api.getProducts()
            .then(setProducts)
            .catch((e) => setError(e.message))
            .finally(() => setLoading(false));
    }
    useEffect(load, []);

    function startNew() {
        setEditId(null);
        setForm({ ...EMPTY_FORM, variants: [{ ...EMPTY_VARIANT }] });
    }

    function startEdit(p) {
        setEditId(p._id);
        setForm({
            title: p.title,
            category: p.category,
            icon: p.icon || '',
            description: p.description || '',
            variants: p.variants.map((v) => ({
                label: v.label,
                price: v.price,
                originalPrice: v.originalPrice ?? '',
                stock: v.stock,
            })),
        });
    }

    function setField(name, value) {
        setForm((f) => ({ ...f, [name]: value }));
    }

    function setVariant(i, name, value) {
        setForm((f) => ({
            ...f,
            variants: f.variants.map((v, idx) => (idx === i ? { ...v, [name]: value } : v)),
        }));
    }

    function addVariant() {
        setForm((f) => ({ ...f, variants: [...f.variants, { ...EMPTY_VARIANT }] }));
    }

    function removeVariant(i) {
        setForm((f) => ({ ...f, variants: f.variants.filter((_, idx) => idx !== i) }));
    }

    async function handleSave() {
        if (!form.title.trim() || !form.category.trim()) {
            alert('নাম ও ক্যাটাগরি লিখুন');
            return;
        }
        if (form.variants.length === 0 || form.variants.some((v) => !v.label.trim() || v.price === '' || v.stock === '')) {
            alert('প্রতিটা সাইজে নাম, দাম ও স্টক লিখুন');
            return;
        }
        const payload = {
            title: form.title.trim(),
            category: form.category.trim(),
            icon: form.icon.trim() || '🛍️',
            description: form.description,
            variants: form.variants.map((v) => ({
                label: v.label.trim(),
                price: Number(v.price),
                originalPrice: v.originalPrice === '' ? undefined : Number(v.originalPrice),
                stock: Number(v.stock),
            })),
        };
        setSaving(true);
        try {
            if (editId) await api.updateProduct(editId, payload);
            else await api.createProduct(payload);
            setForm(null);
            setEditId(null);
            load();
        } catch (err) {
            alert(err.message);
        } finally {
            setSaving(false);
        }
    }

    async function handleDelete(p) {
        if (!window.confirm(`"${p.title}" ডিলিট করবেন? এটা ফেরানো যাবে না।`)) return;
        try {
            await api.deleteProduct(p._id);
            setProducts((prev) => prev.filter((x) => x._id !== p._id));
        } catch (err) {
            alert(err.message);
        }
    }

    return (
        <div>
            {error && <p className="status-msg error">{error}</p>}

            {!form && (
                <>
                    <button className="btn-primary" style={{ width: 'auto', padding: '8px 16px' }} onClick={startNew}>
                        + নতুন প্রোডাক্ট
                    </button>
                    {loading && <p className="status-msg">লোড হচ্ছে...</p>}
                    {!loading && products.length === 0 && <p className="status-msg">কোনো প্রোডাক্ট নেই।</p>}
                    {products.map((p) => (
                        <div className="order-card" key={p._id}>
                            <div className="order-line" style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <strong>{p.icon} {p.title}</strong>
                                <span className="badge">{p.category}</span>
                            </div>
                            {p.variants.map((v) => (
                                <div key={v._id} style={{ fontSize: 14 }}>
                                    {v.label} — ৳{v.price} (স্টক: {v.stock})
                                </div>
                            ))}
                            <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
                                <button className="btn-primary" style={{ width: 'auto', padding: '6px 14px' }} onClick={() => startEdit(p)}>
                                    এডিট
                                </button>
                                <button
                                    className="btn-primary"
                                    style={{ width: 'auto', padding: '6px 14px', background: 'var(--danger)' }}
                                    onClick={() => handleDelete(p)}
                                >
                                    ডিলিট
                                </button>
                            </div>
                        </div>
                    ))}
                </>
            )}

            {form && (
                <div className="panel" style={{ marginTop: 8 }}>
                    <h3 style={{ marginTop: 0 }}>{editId ? 'প্রোডাক্ট এডিট' : 'নতুন প্রোডাক্ট'}</h3>
                    <label>নাম</label>
                    <input value={form.title} onChange={(e) => setField('title', e.target.value)} />
                    <label>ক্যাটাগরি (যেমন: মধু / খেজুর / ঘি)</label>
                    <input value={form.category} onChange={(e) => setField('category', e.target.value)} />
                    <label>আইকন (একটা ইমোজি)</label>
                    <input value={form.icon} onChange={(e) => setField('icon', e.target.value)} />
                    <label>বিবরণ</label>
                    <textarea rows={3} value={form.description} onChange={(e) => setField('description', e.target.value)} />

                    <h4 style={{ marginBottom: 0 }}>সাইজ ও দাম</h4>
                    {form.variants.map((v, i) => (
                        <div key={i} style={{ border: '1px solid var(--line)', borderRadius: 8, padding: 10, marginTop: 10 }}>
                            <label>সাইজের নাম (যেমন: ৫০০ গ্রাম)</label>
                            <input value={v.label} onChange={(e) => setVariant(i, 'label', e.target.value)} />
                            <label>দাম (৳)</label>
                            <input type="number" value={v.price} onChange={(e) => setVariant(i, 'price', e.target.value)} />
                            <label>ছাড়ের আগের দাম (ঐচ্ছিক)</label>
                            <input type="number" value={v.originalPrice} onChange={(e) => setVariant(i, 'originalPrice', e.target.value)} />
                            <label>স্টক</label>
                            <input type="number" value={v.stock} onChange={(e) => setVariant(i, 'stock', e.target.value)} />
                            {form.variants.length > 1 && (
                                <button
                                    className="btn-primary"
                                    style={{ width: 'auto', padding: '5px 12px', marginTop: 8, background: 'var(--danger)' }}
                                    onClick={() => removeVariant(i)}
                                >
                                    এই সাইজ বাদ দিন
                                </button>
                            )}
                        </div>
                    ))}
                    <button className="btn-primary" style={{ width: 'auto', padding: '6px 14px', marginTop: 10 }} onClick={addVariant}>
                        + আরেকটা সাইজ
                    </button>

                    <div style={{ marginTop: 18, display: 'flex', gap: 8 }}>
                        <button className="btn-primary" style={{ width: 'auto', padding: '8px 18px' }} disabled={saving} onClick={handleSave}>
                            {saving ? 'সেভ হচ্ছে...' : 'সেভ করুন'}
                        </button>
                        <button
                            className="btn-primary"
                            style={{ width: 'auto', padding: '8px 18px', background: 'var(--walnut-soft)' }}
                            onClick={() => { setForm(null); setEditId(null); }}
                        >
                            বাতিল
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
