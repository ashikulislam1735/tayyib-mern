import { useEffect, useState } from 'react';
import { api } from '../api';
import Stars from './Stars';

// প্রোডাক্ট ডিটেইল পেজের রিভিউ অংশ: অনুমোদিত রিভিউ দেখায় + নতুন রিভিউ নেয়
export default function Reviews({ productId }) {
    const [reviews, setReviews] = useState(null);
    const [form, setForm] = useState({ name: '', rating: 0, comment: '' });
    const [sending, setSending] = useState(false);
    const [error, setError] = useState('');
    const [done, setDone] = useState('');

    useEffect(() => {
        api.getProductReviews(productId).then(setReviews).catch(() => setReviews([]));
    }, [productId]);

    const count = reviews ? reviews.length : 0;
    const avg = count ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / count) * 10) / 10 : 0;

    async function submit(e) {
        e.preventDefault();
        setError('');
        if (!form.rating) return setError('১ থেকে ৫ স্টার বেছে নিন');
        setSending(true);
        try {
            const r = await api.submitReview({ productId, ...form });
            setDone(r.message);
            setForm({ name: '', rating: 0, comment: '' });
        } catch (err) {
            setError(err.message);
        } finally {
            setSending(false);
        }
    }

    return (
        <section className="reviews">
            <h3>কাস্টমার রিভিউ</h3>
            {reviews && count > 0 && (
                <p className="reviews-summary"><Stars value={avg} size={20} /> <strong>{avg}</strong> ({count}টি রিভিউ)</p>
            )}
            {reviews && count === 0 && <p className="report-muted">এখনো কোনো রিভিউ নেই। আপনিই প্রথম রিভিউ দিন!</p>}

            {reviews && reviews.map((r) => (
                <div className="review-item" key={r._id}>
                    <div><Stars value={r.rating} /> <strong>{r.name}</strong></div>
                    <p>{r.comment}</p>
                    <small>{new Date(r.createdAt).toLocaleDateString('bn-BD', { timeZone: 'Asia/Dhaka' })}</small>
                </div>
            ))}

            {done ? (
                <p className="status-msg" style={{ padding: 16 }}>{done}</p>
            ) : (
                <form className="review-form" onSubmit={submit}>
                    <h4>আপনার রিভিউ লিখুন</h4>
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
                    <input
                        value={form.name}
                        onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                        placeholder="আপনার নাম"
                        maxLength={40}
                        required
                    />
                    <textarea
                        value={form.comment}
                        onChange={(e) => setForm((f) => ({ ...f, comment: e.target.value }))}
                        placeholder="প্রোডাক্টটি কেমন লাগল?"
                        maxLength={600}
                        rows={4}
                        required
                    />
                    {error && <p className="status-msg error" style={{ padding: 6 }}>{error}</p>}
                    <button className="btn-primary" type="submit" disabled={sending}>{sending ? 'জমা হচ্ছে...' : 'রিভিউ জমা দিন'}</button>
                </form>
            )}
        </section>
    );
}
