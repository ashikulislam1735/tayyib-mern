import { useEffect, useState } from 'react';
import { api } from '../api';

const FIELDS = [
    ['courierInside', 'কুরিয়ার খরচ — ঢাকার ভেতরে (৳ প্রতি অর্ডার)'],
    ['courierOutside', 'কুরিয়ার খরচ — ঢাকার বাইরে (৳ প্রতি অর্ডার)'],
    ['packaging', 'প্যাকেজিং খরচ (৳ প্রতি অর্ডার)'],
];

export default function AdminCosts() {
    const [form, setForm] = useState({ courierInside: '', courierOutside: '', packaging: '' });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState('');
    const [isError, setIsError] = useState(false);

    useEffect(() => {
        api.getCosts()
            .then((d) => setForm({
                courierInside: String(d.courierInside ?? 0),
                courierOutside: String(d.courierOutside ?? 0),
                packaging: String(d.packaging ?? 0),
            }))
            .catch((e) => { setIsError(true); setMsg(e.message); })
            .finally(() => setLoading(false));
    }, []);

    async function handleSave() {
        setSaving(true);
        setMsg('');
        try {
            await api.updateCosts({
                courierInside: form.courierInside === '' ? 0 : Number(form.courierInside),
                courierOutside: form.courierOutside === '' ? 0 : Number(form.courierOutside),
                packaging: form.packaging === '' ? 0 : Number(form.packaging),
            });
            setIsError(false);
            setMsg('সেভ হয়েছে ✅ নতুন অর্ডার থেকে এই রেট কাজ করবে।');
        } catch (e) {
            setIsError(true);
            setMsg(e.message);
        } finally {
            setSaving(false);
        }
    }

    if (loading) return <p className="status-msg">লোড হচ্ছে...</p>;

    return (
        <div className="panel">
            <h2 style={{ marginTop: 0 }}>কুরিয়ার ও প্যাকেজিং খরচ</h2>
            <p style={{ color: 'var(--walnut-soft)', fontSize: '0.9rem', lineHeight: 1.7 }}>
                এগুলো আপনার নিজের খরচ, কাস্টমার দেখতে পায় না। প্রতিটা নতুন অর্ডারে এই রেট নিজে থেকে লাভের হিসাব থেকে বাদ যাবে।
                পুরোনো অর্ডারে রেট বদলাবে না। এখানে দিলে খরচ পেজে আলাদা করে একই খরচ লিখবেন না, নইলে দুবার বাদ যাবে।
            </p>

            {FIELDS.map(([key, label]) => (
                <div key={key}>
                    <label>{label}</label>
                    <input
                        type="number" min="0" max="10000" step="1"
                        value={form[key]}
                        onChange={(e) => { setMsg(''); setForm((f) => ({ ...f, [key]: e.target.value })); }}
                    />
                </div>
            ))}

            {msg && <p className={isError ? 'error' : ''} style={{ marginTop: 12 }}>{msg}</p>}
            <button className="btn-primary" style={{ marginTop: 14 }} disabled={saving} onClick={handleSave}>
                {saving ? 'সেভ হচ্ছে...' : 'সেভ করুন'}
            </button>
        </div>
    );
}
