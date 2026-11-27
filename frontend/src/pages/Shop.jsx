import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { api } from '../api';
import ProductGrid from '../components/ProductGrid';
import HomeBanners from '../components/HomeBanners';
import { useCatalog } from '../context/CatalogContext';

const PAGE_SIZE = 20;

export default function Shop() {
    const [products, setProducts] = useState([]); // হোমে: প্রথম ১০টা; তালিকায়: এ পর্যন্ত আনা সব
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [pages, setPages] = useState(1);
    const [featured, setFeatured] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState('');
    const [params, setParams] = useSearchParams();
    const { pathname } = useLocation();
    const { categories } = useCatalog();

    const q = (params.get('q') || '').trim();
    const category = params.get('category') || '';
    const sub = params.get('sub') || '';
    const isHome = pathname === '/' && !q && !category && !sub;
    const [topProducts, setTopProducts] = useState([]);

    // ফিল্টার/পেজ বদলালে প্রথম পাতা নতুন করে আনে (পুরোনো রেসপন্স এলে বাদ)
    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setError('');
        api.getProductsPage({ page: 1, limit: isHome ? 10 : PAGE_SIZE, category, sub, q })
            .then((r) => {
                if (cancelled) return;
                setProducts(r.items);
                setTotal(r.total);
                setPage(1);
                setPages(r.pages);
            })
            .catch((e) => !cancelled && setError(e.message))
            .finally(() => !cancelled && setLoading(false));
        return () => { cancelled = true; };
    }, [isHome, category, sub, q]);

    // হোমের "Featured" সেকশন
    useEffect(() => {
        if (!isHome) return;
        api.getProductsPage({ page: 1, limit: 10, featured: true }).then((r) => setFeatured(r.items)).catch(() => {});
    }, [isHome]);

    // সেরা বিক্রিত (গত ৩০ দিনের বিক্রি থেকে) — বিক্রি না থাকলে সেকশন লুকানো থাকে
    useEffect(() => {
        if (pathname !== '/') return;
        api.getTopProducts(6).then(setTopProducts).catch(() => {});
    }, [pathname]);

    async function loadMore() {
        setLoadingMore(true);
        try {
            const r = await api.getProductsPage({ page: page + 1, limit: PAGE_SIZE, category, sub, q });
            setProducts((prev) => {
                const seen = new Set(prev.map((p) => p._id));
                return [...prev, ...r.items.filter((p) => !seen.has(p._id))];
            });
            setPage(page + 1);
            setPages(r.pages);
            setTotal(r.total);
        } catch (e) {
            setError(e.message);
        } finally {
            setLoadingMore(false);
        }
    }

    const subs = useMemo(() => categories.find((c) => c.name === category)?.subs || [], [categories, category]);

    function setSub(value) {
        const next = new URLSearchParams(params);
        if (value) next.set('sub', value);
        else next.delete('sub');
        setParams(next);
    }

    // লোডিং চললেও পেজের কাঠামো (ব্যানার, শিরোনাম) দেখা যায় — প্রথম পণ্যের
    // ডেটা না আসা পর্যন্ত পুরো পেজ আর আটকে থাকে না
    if (error && products.length === 0 && !loading) return <p className="status-msg error">{error || 'Something went wrong.'} Please try again in a moment.</p>;
    if (isHome && total === 0 && !loading) return <p className="status-msg">No products available yet. Please check back soon.</p>;

    if (isHome) {
        return (
            <>
                <HomeBanners />

                {loading && <p className="status-msg">Loading...</p>}
                {error && products.length === 0 && <p className="status-msg error">{error}</p>}

                {!loading && topProducts.length > 0 && (
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

                {!loading && (
                <section className="home-section">
                    <div className="section-head">
                        <span className="section-eyebrow">Our Collection</span>
                        <h2 className="section-title">All Products</h2>
                    </div>
                    <ProductGrid products={products} />
                    {total > 10 && (
                        <div className="show-all"><Link to="/products">View All Products →</Link></div>
                    )}
                </section>
                )}
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
                    {q ? `Results for “${q}”: ` : ''}{total} {total === 1 ? 'product' : 'products'}{' '}
                    <button className="link-btn" onClick={() => setParams({})}>View All</button>
                </p>
            )}

            {loading
                ? <p className="status-msg">Loading...</p>
                : products.length === 0
                    ? <p className="status-msg">No products found. Try searching for something else.</p>
                    : <ProductGrid products={products} />}

            {page < pages && (
                <div className="show-all">
                    <button className="btn-primary" onClick={loadMore} disabled={loadingMore}>
                        {loadingMore ? 'Loading...' : `আরও দেখুন (${products.length}/${total})`}
                    </button>
                </div>
            )}
            {error && products.length > 0 && <p className="status-msg error">{error}</p>}
        </>
    );
}
