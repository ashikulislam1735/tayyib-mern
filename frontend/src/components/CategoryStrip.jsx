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
                    <span className="cat-circle">🛒</span>
                    <span className="cat-label">সব</span>
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
