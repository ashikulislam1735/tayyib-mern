import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { api } from '../api';
import ProductGrid from '../components/ProductGrid';
import HomeBanners from '../components/HomeBanners';

export default function Shop() {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [params, setParams] = useSearchParams();
    const { pathname } = useLocation();

    const q = (params.get('q') || '').trim();
    const category = params.get('category') || '';
    const sub = params.get('sub') || '';
    const isHome = pathname === '/' && !q && !category && !sub;
    const [topProducts, setTopProducts] = useState([]);

    useEffect(() => {
        api.getProducts()
            .then(setProducts)
            .catch((e) => setError(e.message))
            .finally(() => setLoading(false));
    }, []);

    // সেরা বিক্রিত (গত ৩০ দিনের বিক্রি থেকে) — বিক্রি না থাকলে সেকশন লুকানো থাকে
    useEffect(() => {
        if (pathname !== '/') return;
        api.getTopProducts(6).then(setTopProducts).catch(() => {});
    }, [pathname]);

    const featured = useMemo(() => products.filter((p) => p.featured).slice(0, 10), [products]);

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

    if (loading) return <p className="status-msg">Loading...</p>;
    if (error) return <p className="status-msg error">{error || 'Something went wrong.'} Please try again in a moment.</p>;
    if (products.length === 0) return <p className="status-msg">No products available yet. Please check back soon.</p>;

    if (isHome) {
        return (
            <>
                <HomeBanners />

                {topProducts.length > 0 && (
                    <section className="home-section">
                        <div className="section-head section-center">
                            <span className="section-eyebrow">Best Sellers</span>
                            <h2 className="section-title">Customers' favourites</h2>
                        </div>
                        <ProductGrid products={topProducts} layout="row" />
                    </section>
                )}

                {featured.length > 0 && (
                    <section className="home-section">
                        <div className="section-head">
                            <span className="section-eyebrow">Featured Products</span>
                            <h2 className="section-title">Handpicked for health-conscious families</h2>
                        </div>
                        <ProductGrid products={featured} layout="compact" />
                    </section>
                )}

                <section className="home-section">
                    <div className="section-head">
                        <span className="section-eyebrow">Our Collection</span>
                        <h2 className="section-title">All Products</h2>
                    </div>
                    <ProductGrid products={products.slice(0, 8)} />
                    {products.length > 8 && (
                        <div className="show-all"><Link to="/products">View All Products →</Link></div>
                    )}
                </section>
            </>
        );
    }

    return (
        <>
            {category && subs.length > 0 && (
                <div className="chip-row" id="categories">
                    <button className={`cat-chip ${!sub ? 'active' : ''}`} onClick={() => setSub('')}>All {category}</button>
                    {subs.map((s) => (
                        <button key={s} className={`cat-chip ${sub === s ? 'active' : ''}`} onClick={() => setSub(s)}>{s}</button>
                    ))}
                </div>
            )}

            {(q || category || sub) && (
                <p className="result-note">
                    {q ? `Results for “${q}”: ` : ''}{filtered.length} {filtered.length === 1 ? 'product' : 'products'}{' '}
                    <button className="link-btn" onClick={() => setParams({})}>View All</button>
                </p>
            )}

            {filtered.length === 0
                ? <p className="status-msg">No products found. Try searching for something else.</p>
                : <ProductGrid products={filtered} />}
        </>
    );
}
