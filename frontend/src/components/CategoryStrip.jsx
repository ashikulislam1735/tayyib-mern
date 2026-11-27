import { Link, useMatch } from 'react-router-dom';
import { useCatalog } from '../context/CatalogContext';
import { thumb } from '../utils/cloudinary';

export default function CategoryStrip() {
    const { categories } = useCatalog();
    const match = useMatch('/category/:name');
    const active = match ? match.params.name : '';

    if (categories.length === 0) return null;

    return (
        <div className="cat-strip">
            <div className="cat-strip-inner">
                <Link to="/products" className="cat-item">
                    <span className="cat-circle">
                        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <rect x="3" y="3" width="7" height="7" rx="1.5" />
                            <rect x="14" y="3" width="7" height="7" rx="1.5" />
                            <rect x="3" y="14" width="7" height="7" rx="1.5" />
                            <rect x="14" y="14" width="7" height="7" rx="1.5" />
                        </svg>
                    </span>
                    <span className="cat-label">All</span>
                </Link>
                {categories.map((c) => (
                    <Link
                        key={c.name}
                        to={`/category/${encodeURIComponent(c.name)}`}
                        className={`cat-item ${active === c.name ? 'active' : ''}`}
                    >
                        <span className="cat-circle">{c.image ? <img src={thumb(c.image)} alt="" loading="lazy" /> : c.icon}</span>
                        <span className="cat-label">{c.name}</span>
                    </Link>
                ))}
            </div>
        </div>
    );
}
