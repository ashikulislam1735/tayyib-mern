import { useEffect, useState } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';

const ROLE_LABEL = { owner: 'মালিক', staff: 'স্টাফ' };

export default function AdminUsers() {
    const { username: me } = useAuth();
    const [admins, setAdmins] = useState([]);
    const [loading, setLoading] = useState(true);
    const [msg, setMsg] = useState('');
    const [isError, setIsError] = useState(false);
    const [form, setForm] = useState({ username: '', password: '', role: 'staff' });
    const [saving, setSaving] = useState(false);

    function notify(text, error = false) { setMsg(text); setIsError(error); }

    async function load() {
        try { setAdmins(await api.getAdmins()); }
        catch (e) { notify(e.message, true); }
        finally { setLoading(false); }
    }
    useEffect(() => { load(); }, []);

    async function handleCreate() {
        setSaving(true);
        try {
            await api.createAdmin({ username: form.username.trim(), password: form.password, role: form.role });
            setForm({ username: '', password: '', role: 'staff' });
            notify('নতুন অ্যাডমিন যোগ হয়েছে ✅');
            await load();
        } catch (e) { notify(e.message, true); }
        finally { setSaving(false); }
    }

    async function changeRole(a, role) {
        try { await api.updateAdmin(a.id, { role }); notify(`${a.username}-এর ভূমিকা বদলেছে ✅`); await load(); }
        catch (e) { notify(e.message, true); }
    }

    async function resetPassword(a) {
        const password = window.prompt(`${a.username}-এর নতুন পাসওয়ার্ড লিখুন (কমপক্ষে ৮ অক্ষর):`);
        if (!password) return;
        try { await api.updateAdmin(a.id, { password }); notify(`${a.username}-এর পাসওয়ার্ড বদলেছে ✅`); }
        catch (e) { notify(e.message, true); }
    }

    async function remove(a) {
        if (!window.confirm(`"${a.username}" কে মুছে ফেলবেন?`)) return;
        try { await api.deleteAdmin(a.id); notify('মুছে ফেলা হয়েছে ✅'); await load(); }
        catch (e) { notify(e.message, true); }
    }

    if (loading) return <p className="status-msg">লোড হচ্ছে...</p>;

    return (
        <div>
            <div className="panel">
                <h2 style={{ marginTop: 0 }}>অ্যাডমিন ব্যবহারকারী</h2>
                <p style={{ color: 'var(--walnut-soft)', fontSize: '0.9rem', lineHeight: 1.7 }}>
                    <strong>মালিক:</strong> সবকিছু দেখতে ও করতে পারে। <strong>স্টাফ:</strong> শুধু অর্ডার, প্রোডাক্ট, কাস্টমার, কুপন ইত্যাদি।
                    লাভ, ক্রয়মূল্য, খরচ, সেটিংস ও অ্যাডমিন পেজ স্টাফ দেখে না।
                </p>
                {msg && <p className={isError ? 'error' : ''}>{msg}</p>}

                {admins.map((a) => (
                    <div className="order-line" key={a.id} style={{ flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                        <span>
                            <strong>{a.username}</strong> {a.username === me && '(আপনি)'}
                            <span className="cat-chip" style={{ marginLeft: 8 }}>{ROLE_LABEL[a.role]}</span>
                        </span>
                        <span style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            {a.username !== me && (
                                <select value={a.role} onChange={(e) => changeRole(a, e.target.value)}>
                                    <option value="staff">স্টাফ</option>
                                    <option value="owner">মালিক</option>
                                </select>
                            )}
                            <button className="btn-primary" style={{ width: 'auto', padding: '5px 12px' }} onClick={() => resetPassword(a)}>পাসওয়ার্ড রিসেট</button>
                            {a.username !== me && (
                                <button className="btn-primary" style={{ width: 'auto', padding: '5px 12px', background: 'var(--danger)' }} onClick={() => remove(a)}>মুছুন</button>
                            )}
                        </span>
                    </div>
                ))}
            </div>

            <div className="panel" style={{ marginTop: 18 }}>
                <h3 style={{ marginTop: 0 }}>নতুন অ্যাডমিন যোগ করুন</h3>
                <label>ইউজারনেম (ইংরেজিতে)</label>
                <input value={form.username} onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))} autoComplete="off" />
                <label>পাসওয়ার্ড (কমপক্ষে ৮ অক্ষর)</label>
                <input type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} autoComplete="new-password" />
                <label>ভূমিকা</label>
                <select value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}>
                    <option value="staff">স্টাফ</option>
                    <option value="owner">মালিক</option>
                </select>
                <button className="btn-primary" style={{ marginTop: 14 }} disabled={saving} onClick={handleCreate}>
                    {saving ? 'যোগ হচ্ছে...' : 'যোগ করুন'}
                </button>
            </div>
        </div>
    );
}
