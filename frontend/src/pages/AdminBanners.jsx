import { useEffect, useState } from 'react';
import { api } from '../api';
import { useCatalog } from '../context/CatalogContext';

const EMPTY = { image: '', position: 'slider', title: '', link: '', order: 0, active: true };
const POSITION_LABEL = { slider: 'স্লাইডার', side: 'পাশের ব্যানার' };

export default function AdminBanners() {
    const { categories } = useCatalog();
    const [banners, setBanners] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [form, setForm] = useState(null);
    const [editId, setEditId] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [saving, setSaving] = useState(false);

    function load() {
        setLoading(true);
        api.getAllBanners()
            .then(setBanners)
            .catch((e) => setError(e.message))
            .finally(() => setLoading(false));
    }
    useEffect(load, []);

    function startNew() {
        setEditId(null);
        setForm({ ...EMPTY, order: banners.length });
    }

    function startEdit(b) {
        setEditId(b._id);
        setForm({ image: b.image, position: b.position, title: b.title || '', link: b.link || '', order: b.order ?? 0, active: b.active });
    }

    function setField(name, value) {
        setForm((f) => ({ ...f, [name]: value }));
    }

    async function handleImage(e) {
        const file = e.target.files && e.target.files[0];
        e.target.value = '';
        if (!file) return;
        setUploading(true);
        try {
            const { url } = await api.uploadFile(file);
            setField('image', url);
        } catch (err) {
            alert(err.message);
        } finally {
            setUploading(false);
        }
    }

    async function handleSave() {
        if (!form.image) {
            alert('আগে ব্যানারের ছবি আপলোড করুন');
            return;
        }
        const payload = { ...form, link: form.link.trim(), title: form.title.trim(), order: Number(form.order) || 0 };
        setSaving(true);
        try {
            if (editId) await api.updateBanner(editId, payload);
            else await api.createBanner(payload);
            setForm(null);
            setEditId(null);
            load();
        } catch (err) {
            alert(err.message);
        } finally {
            setSaving(false);
        }
    }

    async function toggleActive(b) {
        try {
            const updated = await api.updateBanner(b._id, { ...b, active: !b.active });
            setBanners((prev) => prev.map((x) => (x._id === b._id ? updated : x)));
        } catch (err) {
            alert(err.message);
        }
    }

    async function handleDelete(b) {
        if (!window.confirm('এই ব্যানারটা মুছে ফেলবেন? এটা ফেরানো যাবে না।')) return;
        try {
            await api.deleteBanner(b._id);
            setBanners((prev) => prev.filter((x) => x._id !== b._id));
        } catch (err) {
            alert(err.message);
        }
    }

    if (form) {
        return (
            <div className="panel">
                <button className="link-btn" style={{ marginBottom: 10 }} onClick={() => { setForm(null); setEditId(null); }}>← তালিকায় ফিরে যান</button>
                <h3 style={{ marginTop: 0 }}>{editId ? 'ব্যানার এডিট' : 'নতুন ব্যানার'}</h3>

                <label>কোথায় দেখাবে</label>
                <select value={form.position} onChange={(e) => setField('position', e.target.value)}>
                    <option value="slider">স্লাইডার (বড়, চওড়া — ১২০০×৫০০ পিক্সেল)</option>
                    <option value="side">পাশের ব্যানার (লম্বাটে — ৬০০×৭৫০ পিক্সেল)</option>
                </select>

                <label>ছবি (১৫ MB-এর কম)</label>
                <input type="file" accept="image/*" onChange={handleImage} disabled={uploading} />
                {uploading && <p style={{ fontSize: 13 }}>আপলোড হচ্ছে... একটু অপেক্ষা করুন</p>}
                {form.image && <img src={form.image} alt="" style={{ marginTop: 8, maxWidth: '100%', maxHeight: 200, borderRadius: 8, border: '1px solid var(--line)' }} />}

                <label>নাম (শুধু আপনার চেনার জন্য, ঐচ্ছিক)</label>
                <input value={form.title} onChange={(e) => setField('title', e.target.value)} placeholder="যেমন: ঘি অফার" />

                <label>ক্লিক করলে কোথায় যাবে (ঐচ্ছিক)</label>
                <select value="" onChange={(e) => e.target.value && setField('link', e.target.value)}>
                    <option value="">— দ্রুত বাছুন —</option>
                    <option value="/products">সব প্রোডাক্ট</option>
                    <option value="/offers">অফার পেজ</option>
                    {categories.map((c) => (
                        <option key={c.name} value={`/category/${encodeURIComponent(c.name)}`}>ক্যাটাগরি: {c.name}</option>
                    ))}
                </select>
                <input value={form.link} onChange={(e) => setField('link', e.target.value)} placeholder="/category/মধু অথবা https://..." style={{ marginTop: 6 }} />

                <label>ক্রম নম্বর (ছোট নম্বর আগে আসবে)</label>
                <input type="number" value={form.order} onChange={(e) => setField('order', e.target.value)} />

                <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 14 }}>
                    <input type="checkbox" style={{ width: 'auto' }} checked={form.active} onChange={(e) => setField('active', e.target.checked)} />
                    সাইটে দেখান
                </label>

                <div style={{ marginTop: 18, display: 'flex', gap: 8 }}>
                    <button className="btn-primary" style={{ width: 'auto', padding: '8px 18px' }} disabled={saving || uploading} onClick={handleSave}>
                        {saving ? 'সেভ হচ্ছে...' : 'সেভ করুন'}
                    </button>
                    <button className="btn-primary" style={{ width: 'auto', padding: '8px 18px', background: 'var(--walnut-soft)' }} onClick={() => { setForm(null); setEditId(null); }}>
                        বাতিল
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div>
            {error && <p className="status-msg error">{error}</p>}
            <button className="btn-primary" style={{ width: 'auto', padding: '8px 16px' }} onClick={startNew}>+ নতুন ব্যানার</button>
            {loading && <p className="status-msg">লোড হচ্ছে...</p>}
            {!loading && !error && banners.length === 0 && <p className="status-msg">এখনো কোনো ব্যানার নেই।</p>}

            {banners.map((b) => (
                <div className="order-card" key={b._id} style={{ opacity: b.active ? 1 : 0.55 }}>
                    <img src={b.image} alt="" style={{ width: '100%', maxHeight: 140, objectFit: 'cover', borderRadius: 8 }} />
                    <div className="order-line" style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginTop: 8 }}>
                        <strong>{b.title || 'নামহীন ব্যানার'}</strong>
                        <span className="badge">{POSITION_LABEL[b.position]}</span>
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--walnut-soft)' }}>
                        ক্রম: {b.order} · {b.active ? 'সাইটে দেখাচ্ছে' : 'বন্ধ আছে'}{b.link ? ` · লিংক: ${b.link}` : ''}
                    </div>
                    <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <button className="btn-primary" style={{ width: 'auto', padding: '6px 14px' }} onClick={() => startEdit(b)}>এডিট</button>
                        <button className="btn-primary" style={{ width: 'auto', padding: '6px 14px', background: 'var(--walnut-soft)' }} onClick={() => toggleActive(b)}>
                            {b.active ? 'বন্ধ করুন' : 'চালু করুন'}
                        </button>
                        <button className="btn-primary" style={{ width: 'auto', padding: '6px 14px', background: 'var(--danger)' }} onClick={() => handleDelete(b)}>ডিলিট</button>
                    </div>
                </div>
            ))}
        </div>
    );
}
