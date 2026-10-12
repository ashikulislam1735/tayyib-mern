import { Link } from 'react-router-dom';
import { useCatalog } from '../context/CatalogContext';
import { thumb } from '../utils/cloudinary';

export default function Categories() {
    const { categories } = useCatalog();

    return (
        <div>
            <p className="crumbs"><Link to="/">Home</Link> / <strong>Categories</strong></p>
            <h1 className="page-title">Shop by Category</h1>
            <p className="page-sub">Click any category to see all of its products.</p>

            {categories.length === 0 && <p className="status-msg">Loading...</p>}

            <div className="cat-grid">
                {categories.map((c) => (
                    <Link key={c.name} className="cat-tile" to={`/category/${encodeURIComponent(c.name)}`}>
                        <span className="cat-tile-icon">{c.image ? <img src={thumb(c.image, 200)} alt="" loading="lazy" /> : c.icon}</span>
                        <span className="cat-tile-name">{c.name}</span>
                        <span className="cat-tile-count">{c.count} {c.count === 1 ? 'product' : 'products'}</span>
                        {c.subs.length > 0 && <span className="cat-tile-subs">{c.subs.join(' · ')}</span>}
                        <span className="cat-tile-link">View products →</span>
                    </Link>
                ))}
            </div>
        </div>
    );
}
