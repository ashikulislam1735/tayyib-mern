import { Link } from 'react-router-dom';
import { useCatalog } from '../context/CatalogContext';
import { thumb } from '../utils/cloudinary';

export default function Categories() {
    const { categories } = useCatalog();

    return (
        <div>
            <p className="crumbs"><Link to="/">হোম</Link> / <strong>ক্যাটাগরি</strong></p>
            <h1 className="page-title">ক্যাটাগরি অনুযায়ী কিনুন</h1>
            <p className="page-sub">যেকোনো ক্যাটাগরিতে ক্লিক করলে সেই ক্যাটাগরির সব প্রোডাক্ট দেখতে পাবেন।</p>

            {categories.length === 0 && <p className="status-msg">লোড হচ্ছে...</p>}

            <div className="cat-grid">
                {categories.map((c) => (
                    <Link key={c.name} className="cat-tile" to={`/category/${encodeURIComponent(c.name)}`}>
                        <span className="cat-tile-icon">{c.image ? <img src={thumb(c.image, 200)} alt="" loading="lazy" /> : c.icon}</span>
                        <span className="cat-tile-name">{c.name}</span>
                        <span className="cat-tile-count">{c.count}টি প্রোডাক্ট</span>
                        {c.subs.length > 0 && <span className="cat-tile-subs">{c.subs.join(' · ')}</span>}
                        <span className="cat-tile-link">প্রোডাক্ট দেখুন →</span>
                    </Link>
                ))}
            </div>
        </div>
    );
}
