import { useState } from 'react';
import { api } from '../api';
import { useSite } from '../context/SiteContext';

function toForm(site) {
    return {
        name: site.name || '',
        tagline: site.tagline || '',
        logo: site.logo || '',
        deliveryInside: String(site.deliveryInside ?? 60),
        deliveryOutside: String(site.deliveryOutside ?? 120),
        phone: site.phone || '',
        email: site.email || '',
        address: site.address || '',
        openHours: site.openHours || '',
        facebook: site.social.facebook || '',
        instagram: site.social.instagram || '',
        youtube: site.social.youtube || '',
        whatsapp: site.social.whatsapp || '',
        aboutTitle: site.about.title || '',
        // প্যারাগ্রাফগুলো ফাঁকা লাইন দিয়ে আলাদা করে একটা ঘরে দেখানো হয়
        aboutText: (site.about.paragraphs || []).join('\n\n'),
        highlights: (site.about.highlights || []).map((h) => ({ ...h })),
    };
}

export default function AdminSettings() {
    const { site, setSite } = useSite();
    const [form, setForm] = useState(() => toForm(site));
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [msg, setMsg] = useState('');
    const [isError, setIsError] = useState(false);

    const set = (name, value) => { setMsg(''); setForm((f) => ({ ...f, [name]: value })); };
    const setHighlight = (i, key, value) => {
        setMsg('');
        setForm((f) => ({ ...f, highlights: f.highlights.map((h, idx) => (idx === i ? { ...h, [key]: value } : h)) }));
    };
    const addHighlight = () => setForm((f) => ({ ...f, highlights: [...f.highlights, { title: '', text: '' }] }));
    const removeHighlight = (i) => setForm((f) => ({ ...f, highlights: f.highlights.filter((_, idx) => idx !== i) }));

    async function handleLogoUpload(e) {
        const file = e.target.files && e.target.files[0];
        e.target.value = '';
        if (!file) return;
        if (!file.type.startsWith('image/')) { setIsError(true); setMsg('লোগো হিসেবে শুধু ছবি দেওয়া যাবে'); return; }
        setUploading(true);
        try {
            const { url } = await api.uploadFile(file);
            set('logo', url);
        } catch (err) {
            setIsError(true);
            setMsg(err.message);
        } finally {
            setUploading(false);
        }
    }

    async function handleSave() {
        if (!form.name.trim()) {
            setIsError(true);
            setMsg('দোকানের নাম খালি রাখা যাবে না');
            return;
        }
        const payload = {
            name: form.name,
            tagline: form.tagline,
            logo: form.logo,
            deliveryInside: form.deliveryInside === '' ? 60 : Number(form.deliveryInside),
            deliveryOutside: form.deliveryOutside === '' ? 120 : Number(form.deliveryOutside),
            phone: form.phone,
            email: form.email,
            address: form.address,
            openHours: form.openHours,
            social: { facebook: form.facebook, instagram: form.instagram, youtube: form.youtube, whatsapp: form.whatsapp },
            about: {
                title: form.aboutTitle,
                paragraphs: form.aboutText.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean),
                highlights: form.highlights,
            },
        };
        setSaving(true);
        try {
            const saved = await api.updateSettings(payload);
            setSite(saved);
            setIsError(false);
            setMsg('সেভ হয়েছে ✅ সাইটে এখনই দেখাবে');
        } catch (err) {
            setIsError(true);
            setMsg(err.message);
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="panel" style={{ maxWidth: 640 }}>
            <h3 style={{ marginTop: 0 }}>দোকানের তথ্য</h3>
            <label>দোকানের নাম</label>
            <input value={form.name} onChange={(e) => set('name', e.target.value)} maxLength={40} />
            <label>ট্যাগলাইন (নামের পাশে ছোট লেখা)</label>
            <input value={form.tagline} onChange={(e) => set('tagline', e.target.value)} maxLength={100} />

            <label>লোগো (খালি রাখলে হেডারে শুধু নাম দেখাবে)</label>
            {form.logo && (
                <div style={{ margin: '8px 0' }}>
                    <img src={form.logo} alt="লোগো" style={{ maxHeight: 60, maxWidth: 200, display: 'block', border: '1px solid var(--line)', borderRadius: 8, padding: 6 }} />
                    <button className="link-btn" style={{ marginTop: 6, color: 'var(--danger)' }} onClick={() => set('logo', '')}>লোগো সরান</button>
                </div>
            )}
            <input type="file" accept="image/*" onChange={handleLogoUpload} disabled={uploading} />
            {uploading && <p style={{ fontSize: 13, margin: '4px 0 0' }}>আপলোড হচ্ছে...</p>}
            <p style={{ fontSize: 12, color: 'var(--walnut-soft)', margin: '4px 0 0' }}>আপলোডের পর নিচের "সেভ করুন" চাপতে ভুলবেন না।</p>

            <h3>ডেলিভারি</h3>
            <p style={{ fontSize: 13, color: 'var(--walnut-soft)', margin: '0 0 4px' }}>কাস্টমার চেকআউটে এলাকা বেছে নেবে; সেই অনুযায়ী চার্জ যোগ হবে।</p>
            <label>ঢাকার ভেতরে ডেলিভারি চার্জ (৳)</label>
            <input type="number" min="0" max="10000" step="1" value={form.deliveryInside} onChange={(e) => set('deliveryInside', e.target.value)} />
            <label>ঢাকার বাইরে ডেলিভারি চার্জ (৳)</label>
            <input type="number" min="0" max="10000" step="1" value={form.deliveryOutside} onChange={(e) => set('deliveryOutside', e.target.value)} />

            <h3>যোগাযোগ</h3>
            <p style={{ fontSize: 13, color: 'var(--walnut-soft)', margin: '0 0 4px' }}>যে ঘর খালি থাকবে, সেটা সাইটে দেখানো হবে না।</p>
            <label>ফোন নম্বর (হেডারের "কল" বাটনে যাবে)</label>
            <input type="tel" value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="01XXXXXXXXX" />
            <label>ইমেইল</label>
            <input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} />
            <label>ঠিকানা</label>
            <input value={form.address} onChange={(e) => set('address', e.target.value)} />
            <label>খোলার সময়</label>
            <input value={form.openHours} onChange={(e) => set('openHours', e.target.value)} placeholder="প্রতিদিন সকাল ১০টা – রাত ৯টা" />

            <h3>সোশ্যাল লিংক</h3>
            <label>Facebook পেজের পুরো লিংক</label>
            <input value={form.facebook} onChange={(e) => set('facebook', e.target.value)} placeholder="https://facebook.com/..." />
            <label>Instagram লিংক</label>
            <input value={form.instagram} onChange={(e) => set('instagram', e.target.value)} placeholder="https://instagram.com/..." />
            <label>YouTube লিংক</label>
            <input value={form.youtube} onChange={(e) => set('youtube', e.target.value)} placeholder="https://youtube.com/..." />
            <label>WhatsApp নম্বর (দেশের কোডসহ, শুধু সংখ্যা — যেমন 8801XXXXXXXXX)</label>
            <input value={form.whatsapp} onChange={(e) => set('whatsapp', e.target.value)} inputMode="numeric" />

            <h3>About পেজ</h3>
            <label>শিরোনাম</label>
            <input value={form.aboutTitle} onChange={(e) => set('aboutTitle', e.target.value)} maxLength={80} />
            <label>লেখা (প্রতিটা অনুচ্ছেদের মাঝে একটা ফাঁকা লাইন রাখুন)</label>
            <textarea rows={9} value={form.aboutText} onChange={(e) => set('aboutText', e.target.value)} style={{ width: '100%' }} />

            <label>হাইলাইট কার্ড</label>
            {form.highlights.map((h, i) => (
                <div key={i} style={{ border: '1px solid var(--line)', borderRadius: 8, padding: 10, marginTop: 8 }}>
                    <input value={h.title} onChange={(e) => setHighlight(i, 'title', e.target.value)} placeholder="শিরোনাম" maxLength={60} />
                    <input value={h.text} onChange={(e) => setHighlight(i, 'text', e.target.value)} placeholder="ছোট বর্ণনা" maxLength={300} style={{ marginTop: 6 }} />
                    <button className="link-btn" style={{ marginTop: 6, color: 'var(--danger)' }} onClick={() => removeHighlight(i)}>এই কার্ড সরান</button>
                </div>
            ))}
            {form.highlights.length < 8 && (
                <button className="link-btn" style={{ marginTop: 8 }} onClick={addHighlight}>+ নতুন কার্ড</button>
            )}

            {msg && <p className={`status-msg ${isError ? 'error' : ''}`} style={{ padding: '12px 0 0' }}>{msg}</p>}
            <button className="btn-primary" style={{ marginTop: 16 }} disabled={saving} onClick={handleSave}>
                {saving ? 'সেভ হচ্ছে...' : 'সেভ করুন'}
            </button>
        </div>
    );
}
