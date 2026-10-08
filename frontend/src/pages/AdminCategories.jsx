import { useState } from 'react';
import { api } from '../api';
import { useCatalog } from '../context/CatalogContext';
import { thumb } from '../utils/cloudinary';

export default function AdminCategories() {
    const { categories, reloadImages } = useCatalog();
    const [busy, setBusy] = useState('');

    async function handleFile(name, e) {
        const file = e.target.files && e.target.files[0];
        e.target.value = '';
        if (!file) return;
        setBusy(name);
        try {
            const { url, type } = await api.uploadFile(file);
            if (type !== 'image') throw new Error('শুধু ছবি দিন, ভিডিও নয়');
            await api.setCategoryImage(name, url);
            await reloadImages();
        } catch (err) {
            alert(err.message);
        } finally {
            setBusy('');
        }
    }

    async function handleRemove(name) {
        if (!window.confirm(`"${name}"-এর ছবি সরিয়ে আবার ইমোজি আইকন দেখাবেন?`)) return;
        setBusy(name);
        try {
            await api.setCategoryImage(name, '');
            await reloadImages();
        } catch (err) {
            alert(err.message);
        } finally {
            setBusy('');
        }
    }

    return (
        <div>
            <p className="page-sub" style={{ marginTop: 0 }}>
                প্রতিটা ক্যাটাগরির জন্য একটা ছবি দিন। বর্গাকার ছবি (যেমন ৫০০×৫০০ পিক্সেল) সবচেয়ে ভালো দেখায়, গোল আইকনে মাঝখানটা দেখাবে।
                ক্যাটাগরি তৈরি হয় প্রোডাক্ট যোগ করলে, তাই আগে সেই ক্যাটাগরির একটা প্রোডাক্ট থাকতে হবে।
            </p>

            {categories.length === 0 && <p className="status-msg">এখনো কোনো ক্যাটাগরি নেই — আগে প্রোডাক্ট যোগ করুন।</p>}

            {categories.map((c) => (
                <div className="order-card" key={c.name} style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                    <span className="cat-circle" style={{ flexShrink: 0 }}>
                        {c.image ? <img src={thumb(c.image)} alt="" /> : c.icon}
                    </span>
                    <div style={{ flex: 1, minWidth: 120 }}>
                        <strong>{c.name}</strong>
                        <div style={{ fontSize: 13, color: 'var(--walnut-soft)' }}>
                            {c.count}টি প্রোডাক্ট · {c.image ? 'ছবি আছে' : 'ছবি নেই (ইমোজি দেখাচ্ছে)'}
                        </div>
                    </div>
                    <label className="btn-primary" style={{ width: 'auto', padding: '6px 14px', cursor: 'pointer', opacity: busy === c.name ? 0.6 : 1 }}>
                        {busy === c.name ? 'অপেক্ষা করুন...' : c.image ? 'ছবি বদলান' : 'ছবি আপলোড'}
                        <input type="file" accept="image/*" style={{ display: 'none' }} disabled={busy !== ''} onChange={(e) => handleFile(c.name, e)} />
                    </label>
                    {c.image && (
                        <button className="btn-primary" style={{ width: 'auto', padding: '6px 14px', background: 'var(--danger)' }} disabled={busy !== ''} onClick={() => handleRemove(c.name)}>
                            ছবি সরান
                        </button>
                    )}
                </div>
            ))}
        </div>
    );
}
