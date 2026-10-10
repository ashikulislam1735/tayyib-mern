import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';

const EMPTY_VARIANT = { label: '', price: '', originalPrice: '', costPrice: '', stock: '' };
const EMPTY_FORM = { title: '', category: '', subCategory: '', icon: '🛍️', shortDescription: '', videoUrl: '', images: [], description: '', variants: [{ ...EMPTY_VARIANT }] };

export default function AdminProducts() {
    const { isOwner } = useAuth();
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [form, setForm] = useState(null); // null = ফর্ম বন্ধ
    const [editId, setEditId] = useState(null); // null = নতুন প্রোডাক্ট
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [params, setParams] = useSearchParams();
    const formParam = params.get('form') || '';
    const openedRef = useRef('');

    function load() {
        setLoading(true);
        api.getAdminProducts()
            .then(setProducts)
            .catch((e) => setError(e.message))
            .finally(() => setLoading(false));
    }
    useEffect(load, []);

    function openNew() {
        setEditId(null);
        setForm({ ...EMPTY_FORM, variants: [{ ...EMPTY_VARIANT }] });
    }

    function openEdit(p) {
        setEditId(p._id);
        setForm({
            title: p.title,
            category: p.category,
            subCategory: p.subCategory || '',
            icon: p.icon || '',
            shortDescription: p.shortDescription || '',
            videoUrl: p.videoUrl || '',
            images: p.images || [],
            description: p.description || '',
            variants: p.variants.map((v) => ({
                label: v.label,
                price: v.price,
                originalPrice: v.originalPrice ?? '',
                costPrice: v.costPrice ?? '',
                stock: v.stock,
            })),
        });
    }

    // ফর্ম খোলা/বন্ধ ঠিকানা (?form=new বা ?form=ID) থেকে নিয়ন্ত্রিত হয়, তাই ব্রাউজারের ব্যাক বোতাম কাজ করে
    useEffect(() => {
        if (!formParam) {
            openedRef.current = '';
            setForm(null);
            setEditId(null);
            return;
        }
        if (openedRef.current === formParam) return;
        if (formParam === 'new') {
            openedRef.current = 'new';
            openNew();
            return;
        }
        const p = products.find((x) => x._id === formParam);
        if (p) {
            openedRef.current = formParam;
            openEdit(p);
        }
    }, [formParam, products]);

    function startNew() {
        setParams({ form: 'new' });
    }

    function startEdit(p) {
        setParams({ form: p._id });
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

    async function handleImages(e) {
        const files = Array.from(e.target.files || []);
        e.target.value = '';
        if (files.length === 0) return;
        setUploading(true);
        try {
            for (const file of files) {
                const { url } = await api.uploadFile(file);
                setForm((f) => ({ ...f, images: [...f.images, url] }));
            }
        } catch (err) {
            alert(err.message);
        } finally {
            setUploading(false);
        }
    }

    function removeImage(i) {
        setForm((f) => ({ ...f, images: f.images.filter((_, idx) => idx !== i) }));
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
            subCategory: form.subCategory.trim(),
            icon: form.icon.trim() || '🛍️',
            shortDescription: form.shortDescription.trim(),
            videoUrl: form.videoUrl.trim(),
            images: form.images,
            description: form.description,
            variants: form.variants.map((v) => ({
                label: v.label.trim(),
                price: Number(v.price),
                originalPrice: v.originalPrice === '' ? undefined : Number(v.originalPrice),
                costPrice: v.costPrice === '' ? 0 : Number(v.costPrice),
                stock: Number(v.stock),
            })),
        };
        setSaving(true);
        try {
            if (editId) await api.updateProduct(editId, payload);
            else await api.createProduct(payload);
            setParams({});
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
                            <div className="order-line" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                                <strong style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    {p.images && p.images[0]
                                        ? <img src={p.images[0]} alt="" style={{ width: 40, height: 40, borderRadius: 6, objectFit: 'cover' }} />
                                        : p.icon}
                                    {p.title}
                                </strong>
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
                    <button className="link-btn" style={{ marginBottom: 10 }} onClick={() => setParams({})}>← তালিকায় ফিরে যান</button>
                    <h3 style={{ marginTop: 0 }}>{editId ? 'প্রোডাক্ট এডিট' : 'নতুন প্রোডাক্ট'}</h3>
                    <label>নাম</label>
                    <input value={form.title} onChange={(e) => setField('title', e.target.value)} />
                    <label>ক্যাটাগরি (যেমন: মধু / খেজুর / ঘি)</label>
                    <input list="cat-list" value={form.category} onChange={(e) => setField('category', e.target.value)} />
                    <datalist id="cat-list">
                        {[...new Set(products.map((p) => p.category))].map((c) => <option key={c} value={c} />)}
                    </datalist>
                    <label>সাব-ক্যাটাগরি (ঐচ্ছিক, যেমন: কাজুবাদাম)</label>
                    <input list="sub-list" value={form.subCategory} onChange={(e) => setField('subCategory', e.target.value)} />
                    <datalist id="sub-list">
                        {[...new Set(products.filter((p) => p.category === form.category && p.subCategory).map((p) => p.subCategory))].map((s) => <option key={s} value={s} />)}
                    </datalist>
                    <label>আইকন (একটা ইমোজি)</label>
                    <input value={form.icon} onChange={(e) => setField('icon', e.target.value)} />
                    <label>সংক্ষিপ্ত বিবরণ (কার্ডে এক লাইন)</label>
                    <input value={form.shortDescription} onChange={(e) => setField('shortDescription', e.target.value)} />
                    <label>ছবি (একাধিক বাছাই করা যাবে, প্রতিটা ১৫ MB-এর কম)</label>
                    <input type="file" accept="image/*" multiple onChange={handleImages} disabled={uploading} />
                    {uploading && <p style={{ fontSize: 13 }}>আপলোড হচ্ছে... একটু অপেক্ষা করুন</p>}
                    {form.images.length > 0 && (
                        <div className="image-gallery-preview">
                            {form.images.map((url, i) => (
                                <div className="gallery-thumb" key={url}>
                                    <img src={url} alt="" />
                                    <button type="button" onClick={() => removeImage(i)}>✕</button>
                                </div>
                            ))}
                        </div>
                    )}
                    <label>ভিডিও লিংক (YouTube, ঐচ্ছিক)</label>
                    <input value={form.videoUrl} onChange={(e) => setField('videoUrl', e.target.value)} placeholder="https://www.youtube.com/watch?v=..." />
                    <label>বিস্তারিত বিবরণ</label>
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
                            {isOwner && (
                                <>
                                    <label>ক্রয়মূল্য (৳) — শুধু মালিক দেখবেন, কাস্টমার ও স্টাফ দেখবে না</label>
                                    <input type="number" value={v.costPrice} onChange={(e) => setVariant(i, 'costPrice', e.target.value)} />
                                </>
                            )}
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
                        <button className="btn-primary" style={{ width: 'auto', padding: '8px 18px' }} disabled={saving || uploading} onClick={handleSave}>
                            {saving ? 'সেভ হচ্ছে...' : 'সেভ করুন'}
                        </button>
                        <button
                            className="btn-primary"
                            style={{ width: 'auto', padding: '8px 18px', background: 'var(--walnut-soft)' }}
                            onClick={() => setParams({})}
                        >
                            বাতিল
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
