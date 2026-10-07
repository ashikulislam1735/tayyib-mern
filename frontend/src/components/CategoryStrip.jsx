import { Link, useSearchParams } from 'react-router-dom';
import { useCatalog } from '../context/CatalogContext';

export default function CategoryStrip() {
    const { categories } = useCatalog();
    const [params] = useSearchParams();
    const active = params.get('category') || '';

    if (categories.length === 0) return null;

    return (
        <div className="cat-strip">
            <div className="cat-strip-inner">
                <Link to="/products" className={`cat-item ${!active ? 'active' : ''}`}>
                    <span className="cat-circle">🛒</span>
                    <span className="cat-label">সব</span>
                </Link>
                {categories.map((c) => (
                    <Link
                        key={c.name}
                        to={`/products?category=${encodeURIComponent(c.name)}`}
                        className={`cat-item ${active === c.name ? 'active' : ''}`}
                    >
                        <span className="cat-circle">{c.icon}</span>
                        <span className="cat-label">{c.name}</span>
                    </Link>
                ))}
            </div>
        </div>
    );
}
