import { useEffect, useState } from 'react';
import { api } from '../api';
import Stars from './Stars';

// প্রোডাক্ট ডিটেইল পেজের রিভিউ অংশ: বাঁয়ে রেটিংয়ের সারাংশ, ডানে রিভিউয়ের তালিকা ও নতুন রিভিউয়ের ফর্ম
export default function Reviews({ productId, title }) {
    const [reviews, setReviews] = useState(null);
    const [form, setForm] = useState({ name: '', phone: '', rating: 0, comment: '' });
    const [sending, setSending] = useState(false);
    const [error, setError] = useState('');
    const [done, setDone] = useState('');

    useEffect(() => {
        api.getProductReviews(productId).then(setReviews).catch(() => setReviews([]));
    }, [productId]);

    const count = reviews ? reviews.length : 0;
    const avg = count ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / count) * 10) / 10 : 0;
    // ৫ থেকে ১ স্টারের প্রতিটার সংখ্যা
    const dist = [5, 4, 3, 2, 1].map((n) => ({ n, c: reviews ? reviews.filter((r) => r.rating === n).length : 0 }));

    async function submit(e) {
        e.preventDefault();
        setError('');
        if (!form.rating) return setError('১ থেকে ৫ স্টার বেছে নিন');
        setSending(true);
        try {
            const r = await api.submitReview({ productId, ...form });
            setDone(r.message);
            setForm({ name: '', phone: '', rating: 0, comment: '' });
        } catch (err) {
            setError(err.message);
        } finally {
            setSending(false);
        }
    }

    return (
        <section className="reviews">
            <div className="reviews-card">
                <h3>{title ? `${title} — কাস্টমার রিভিউ` : 'কাস্টমার রিভিউ'}</h3>

                <div className="reviews-layout">
                    <aside className="rating-summary">
                        <div className="rating-big">{avg.toFixed(1)}</div>
                        <Stars value={avg} size={22} />
                        <div className="rating-count">{count}টি রিভিউ</div>
                        <div className="dist">
                            {dist.map(({ n, c }) => (
                                <div className="dist-row" key={n}>
                                    <span>{n}</span>
                                    <div className="dist-bar"><div style={{ width: count ? `${(c / count) * 100}%` : '0%' }} /></div>
                                    <span>{c}</span>
                                </div>
                            ))}
                        </div>
                    </aside>

                    <div className="reviews-main">
                        {reviews === null && <p className="report-muted">লোড হচ্ছে...</p>}
                        {reviews && count === 0 && <p className="report-muted">এখনো কোনো রিভিউ নেই — প্রথম রিভিউ আপনিই দিন!</p>}

                        {reviews && reviews.map((r) => (
                            <div className="review-item" key={r._id}>
                                <div><Stars value={r.rating} /> <strong>{r.name}</strong> {r.verifiedBuyer && <span className="verified-badge">✅ ক্রেতা</span>}</div>
                                <p>{r.comment}</p>
                                <small>{new Date(r.createdAt).toLocaleDateString('bn-BD', { timeZone: 'Asia/Dhaka' })}</small>
                            </div>
                        ))}

                        {done ? (
                            <p className="status-msg" style={{ padding: 16 }}>{done}</p>
                        ) : (
                            <form className="review-form" onSubmit={submit}>
                                <h4>আপনার অভিজ্ঞতা জানান</h4>

                                <label className="rf-label">আপনার নাম</label>
                                <input
                                    value={form.name}
                                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                                    placeholder="আপনার নাম"
                                    maxLength={40}
                                    required
                                />

                                <label className="rf-label">আপনার রেটিং</label>
                                <div className="star-pick" role="radiogroup" aria-label="রেটিং">
                                    {[1, 2, 3, 4, 5].map((n) => (
                                        <button
                                            type="button"
                                            key={n}
                                            className={n <= form.rating ? 'on' : ''}
                                            onClick={() => setForm((f) => ({ ...f, rating: n }))}
                                            aria-label={`${n} স্টার`}
                                        >★</button>
                                    ))}
                                </div>

                                <label className="rf-label">মোবাইল নম্বর (ঐচ্ছিক)</label>
                                <input
                                    type="tel"
                                    value={form.phone}
                                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                                    placeholder="01XXXXXXXXX"
                                    pattern="01[0-9]{9}"
                                    maxLength={11}
                                />
                                <small className="report-muted" style={{ display: 'block', marginTop: -4 }}>অর্ডারের নম্বর দিলে আপনার রিভিউতে "✅ ক্রেতা" ব্যাজ বসতে পারে। নম্বরটা সাইটে দেখানো বা সংরক্ষণ করা হয় না।</small>

                                <label className="rf-label">আপনার রিভিউ</label>
                                <textarea
                                    value={form.comment}
                                    onChange={(e) => setForm((f) => ({ ...f, comment: e.target.value }))}
                                    placeholder="কী ভালো লেগেছে? স্বাদ, প্যাকেজিং, ডেলিভারির গতি..."
                                    maxLength={600}
                                    rows={4}
                                    required
                                />
                                {error && <p className="status-msg error" style={{ padding: 6 }}>{error}</p>}
                                <button className="btn-primary" type="submit" disabled={sending} style={{ width: 'auto', alignSelf: 'flex-start', padding: '10px 22px' }}>
                                    {sending ? 'জমা হচ্ছে...' : 'রিভিউ দিন'}
                                </button>
                            </form>
                        )}
                    </div>
                </div>
            </div>
        </section>
    );
}
