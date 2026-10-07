import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api';
import ProductGrid from '../components/ProductGrid';

export default function Shop() {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [params, setParams] = useSearchParams();

    const q = (params.get('q') || '').trim();
    const category = params.get('category') || '';
    const sub = params.get('sub') || '';

    useEffect(() => {
        api.getProducts()
            .then(setProducts)
            .catch((e) => setError(e.message))
            .finally(() => setLoading(false));
    }, []);

    const subs = useMemo(
        () => [...new Set(products.filter((p) => p.category === category && p.subCategory).map((p) => p.subCategory))],
        [products, category]
    );

    const filtered = useMemo(() => {
        const term = q.toLowerCase();
        return products.filter((p) => {
            if (category && p.category !== category) return false;
            if (sub && p.subCategory !== sub) return false;
            if (!term) return true;
            return [p.title, p.category, p.description].join(' ').toLowerCase().includes(term);
        });
    }, [products, q, category, sub]);

    function setSub(value) {
        const next = new URLSearchParams(params);
        if (value) next.set('sub', value);
        else next.delete('sub');
        setParams(next);
    }

    if (loading) return <p className="status-msg">লোড হচ্ছে...</p>;
    if (error) return <p className="status-msg error">{error} — ব্যাকএন্ড সার্ভার চালু আছে কিনা এবং MongoDB কানেক্টেড কিনা চেক করুন।</p>;
    if (products.length === 0) return <p className="status-msg">কোনো প্রোডাক্ট নেই। প্রথমে ব্যাকএন্ডে <code>npm run seed</code> চালান।</p>;

    return (
        <>
            {category && subs.length > 0 && (
                <div className="chip-row" id="categories">
                    <button className={`cat-chip ${!sub ? 'active' : ''}`} onClick={() => setSub('')}>সব {category}</button>
                    {subs.map((s) => (
                        <button key={s} className={`cat-chip ${sub === s ? 'active' : ''}`} onClick={() => setSub(s)}>{s}</button>
                    ))}
                </div>
            )}

            {(q || category || sub) && (
                <p className="result-note">
                    {q ? `“${q}” এর ফলাফল: ` : ''}{filtered.length}টি প্রোডাক্ট{' '}
                    <button className="link-btn" onClick={() => setParams({})}>সব দেখুন</button>
                </p>
            )}

            {filtered.length === 0
                ? <p className="status-msg">কোনো প্রোডাক্ট পাওয়া যায়নি। অন্য কিছু লিখে খুঁজে দেখুন।</p>
                : <ProductGrid products={filtered} />}
        </>
    );
}
