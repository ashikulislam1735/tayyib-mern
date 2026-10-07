import { useState } from 'react';
import { api } from '../api';

export default function AdminPassword() {
    const [current, setCurrent] = useState('');
    const [next, setNext] = useState('');
    const [again, setAgain] = useState('');
    const [msg, setMsg] = useState('');
    const [isError, setIsError] = useState(false);
    const [saving, setSaving] = useState(false);

    async function handleSubmit() {
        setMsg('');
        if (next.length < 8) {
            setIsError(true);
            setMsg('নতুন পাসওয়ার্ড কমপক্ষে ৮ অক্ষরের দিন');
            return;
        }
        if (next !== again) {
            setIsError(true);
            setMsg('নতুন পাসওয়ার্ড দুই ঘরে একই হয়নি');
            return;
        }
        setSaving(true);
        try {
            await api.changePassword(current, next);
            setIsError(false);
            setMsg('পাসওয়ার্ড বদলানো হয়েছে ✅');
            setCurrent('');
            setNext('');
            setAgain('');
        } catch (err) {
            setIsError(true);
            setMsg(err.message);
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="panel" style={{ maxWidth: 420 }}>
            <h3 style={{ marginTop: 0 }}>পাসওয়ার্ড বদলান</h3>
            <label>বর্তমান পাসওয়ার্ড</label>
            <input type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} />
            <label>নতুন পাসওয়ার্ড (কমপক্ষে ৮ অক্ষর)</label>
            <input type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} />
            <label>নতুন পাসওয়ার্ড আবার লিখুন</label>
            <input type="password" autoComplete="new-password" value={again} onChange={(e) => setAgain(e.target.value)} />
            {msg && <p className={`status-msg ${isError ? 'error' : ''}`} style={{ padding: '12px 0 0' }}>{msg}</p>}
            <button className="btn-primary" style={{ marginTop: 14 }} disabled={saving} onClick={handleSubmit}>
                {saving ? 'সেভ হচ্ছে...' : 'পাসওয়ার্ড বদলান'}
            </button>
        </div>
    );
}
