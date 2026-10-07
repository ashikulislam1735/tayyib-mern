import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { api } from '../api';
import ProductGrid from '../components/ProductGrid';

export default function CategoryPage() {
    const { name } = useParams();
    const [params, setParams] = useSearchParams();
    const sub = params.get('sub') || '';
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        setLoading(true);
        setError('');
        api.getProducts(name)
            .then(setProducts)
            .catch((e) => setError(e.message))
            .finally(() => setLoading(false));
    }, [name]);

    const subs = useMemo(() => [...new Set(products.map((p) => p.subCategory).filter(Boolean))], [products]);
    const shown = sub ? products.filter((p) => p.subCategory === sub) : products;

    function setSub(value) {
        setParams(value ? { sub: value } : {});
    }

    return (
        <div>
            <p className="crumbs">
                <Link to="/">হোম</Link> / <Link to="/categories">ক্যাটাগরি</Link> / <strong>{name}</strong>
            </p>
            <h1 className="page-title">{name}</h1>
            {!loading && !error && <p className="page-sub">{products.length}টি প্রোডাক্ট</p>}

            {subs.length > 0 && (
                <div className="chip-row">
                    <button className={`cat-chip ${!sub ? 'active' : ''}`} onClick={() => setSub('')}>সব {name}</button>
                    {subs.map((s) => (
                        <button key={s} className={`cat-chip ${sub === s ? 'active' : ''}`} onClick={() => setSub(s)}>{s}</button>
                    ))}
                </div>
            )}

            {loading && <p className="status-msg">লোড হচ্ছে...</p>}
            {error && <p className="status-msg error">{error}</p>}
            {!loading && !error && shown.length === 0 && <p className="status-msg">এই ক্যাটাগরিতে কোনো প্রোডাক্ট নেই।</p>}
            {!loading && !error && shown.length > 0 && <ProductGrid products={shown} />}
        </div>
    );
}
