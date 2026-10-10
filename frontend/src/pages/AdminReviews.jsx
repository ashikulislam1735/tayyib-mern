import { useEffect, useState } from 'react';
import { api } from '../api';
import Stars from '../components/Stars';

export default function AdminReviews() {
    const [tab, setTab] = useState('pending');
    const [list, setList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    async function load(status = tab) {
        setLoading(true);
        setError('');
        try {
            setList(await api.getAdminReviews(status));
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }
    useEffect(() => { load(tab); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [tab]);

    async function approve(r) {
        try {
            await api.approveReview(r._id);
            setList((p) => p.filter((x) => x._id !== r._id));
        } catch (err) { alert(err.message); }
    }

    async function remove(r) {
        if (!window.confirm('এই রিভিউ মুছে ফেলতে চান?')) return;
        try {
            await api.deleteReview(r._id);
            setList((p) => p.filter((x) => x._id !== r._id));
        } catch (err) { alert(err.message); }
    }

    return (
        <div>
            <div className="variant-row" style={{ marginBottom: 14 }}>
                <button className={`variant-chip ${tab === 'pending' ? 'active' : ''}`} onClick={() => setTab('pending')}>অনুমোদনের অপেক্ষায়</button>
                <button className={`variant-chip ${tab === 'approved' ? 'active' : ''}`} onClick={() => setTab('approved')}>অনুমোদিত</button>
            </div>
            {error && <p className="status-msg error">{error}</p>}
            {loading && <p className="status-msg">লোড হচ্ছে...</p>}
            {!loading && list.length === 0 && !error && <p className="panel" style={{ margin: 0 }}>কোনো রিভিউ নেই।</p>}
            {list.map((r) => (
                <div className="panel review-admin" key={r._id}>
                    <div className="expense-details">
                        <strong>{r.product ? r.product.title : '(প্রোডাক্ট মুছে গেছে)'}</strong>
                        <span><Stars value={r.rating} /> {r.name} {r.verifiedBuyer && <strong style={{ color: '#1f7a3a' }}>✅ ক্রেতা (যাচাইকৃত)</strong>} · {new Date(r.createdAt).toLocaleString('bn-BD', { timeZone: 'Asia/Dhaka' })}</span>
                        <p style={{ margin: '6px 0 0' }}>{r.comment}</p>
                    </div>
                    <div className="review-actions">
                        {tab === 'pending' && <button className="btn-primary" style={{ width: 'auto', padding: '8px 16px' }} onClick={() => approve(r)}>অনুমোদন</button>}
                        <button className="expense-delete" onClick={() => remove(r)}>{tab === 'pending' ? 'বাতিল' : 'মুছুন'}</button>
                    </div>
                </div>
            ))}
        </div>
    );
}
