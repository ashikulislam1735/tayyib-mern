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

    useEffect(() => {
        api.getProducts()
            .then(setProducts)
            .catch((e) => setError(e.message))
            .finally(() => setLoading(false));
    }, []);

    const categories = useMemo(() => [...new Set(products.map((p) => p.category))], [products]);

    const filtered = useMemo(() => {
        const term = q.toLowerCase();
        return products.filter((p) => {
            if (category && p.category !== category) return false;
            if (!term) return true;
            return [p.title, p.category, p.description].join(' ').toLowerCase().includes(term);
        });
    }, [products, q, category]);

    function setCategory(value) {
        const next = new URLSearchParams(params);
        if (value) next.set('category', value);
        else next.delete('category');
        setParams(next);
    }

    if (loading) return <p className="status-msg">লোড হচ্ছে...</p>;
    if (error) return <p className="status-msg error">{error} — ব্যাকএন্ড সার্ভার চালু আছে কিনা এবং MongoDB কানেক্টেড কিনা চেক করুন।</p>;
    if (products.length === 0) return <p className="status-msg">কোনো প্রোডাক্ট নেই। প্রথমে ব্যাকএন্ডে <code>npm run seed</code> চালান।</p>;

    return (
        <>
            <div className="chip-row" id="categories">
                <button className={`cat-chip ${!category ? 'active' : ''}`} onClick={() => setCategory('')}>সব</button>
                {categories.map((c) => (
                    <button key={c} className={`cat-chip ${category === c ? 'active' : ''}`} onClick={() => setCategory(c)}>{c}</button>
                ))}
            </div>

            {(q || category) && (
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
