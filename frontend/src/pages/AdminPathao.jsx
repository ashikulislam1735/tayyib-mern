import { useState } from 'react';
import { api } from '../api';

// Pathao-র স্টোর আইডি দেখার সহায়ক (শুধু owner)
export default function AdminPathao() {
    const [data, setData] = useState(null);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [busy, setBusy] = useState(false);

    async function load() {
        setBusy(true); setError(''); setMessage('');
        try { setData(await api.getPathaoStores()); } catch (err) { setError(err.message); } finally { setBusy(false); }
    }

    async function createTest() {
        setBusy(true); setError(''); setMessage('');
        try {
            const r = await api.createPathaoTestStore();
            setMessage(r.message);
            setData(await api.getPathaoStores());
        } catch (err) { setError(err.message); } finally { setBusy(false); }
    }

    return (
        <div>
            <div className="panel">
                <p style={{ marginTop: 0 }}>এই পেজ দিয়ে দেখা যায় সার্ভার এখন Pathao-র কোন অ্যাকাউন্টে যুক্ত আছে এবং তার স্টোর আইডি কত।</p>
                <button className="btn-primary" style={{ width: 'auto', padding: '10px 18px' }} onClick={load} disabled={busy}>{busy ? 'অপেক্ষা করুন...' : 'স্টোর তালিকা দেখুন'}</button>
                {data && data.stores.length === 0 && (
                    <button className="btn-primary" style={{ width: 'auto', padding: '10px 18px', marginLeft: 8 }} onClick={createTest} disabled={busy}>টেস্ট স্টোর তৈরি করুন</button>
                )}
            </div>
            {error && <p className="status-msg error">{error}</p>}
            {message && <p className="status-msg">{message}</p>}
            {data && (
                <div className="panel" style={{ marginTop: 14 }}>
                    <p style={{ marginTop: 0 }}>সার্ভার: <strong>{data.baseUrl}</strong><br />PATHAO_STORE_ID এখন: <strong>{data.currentStoreId || '(বসানো নেই)'}</strong></p>
                    {data.stores.length === 0 && <p style={{ margin: 0 }}>এই অ্যাকাউন্টে কোনো স্টোর নেই।</p>}
                    {data.stores.map((s) => (
                        <div className="expense-row" key={s.id}>
                            <div className="expense-details"><strong>আইডি: {s.id}</strong><span>{s.name} — {s.address}</span></div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
