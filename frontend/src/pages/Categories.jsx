import { Link } from 'react-router-dom';
import { useCatalog } from '../context/CatalogContext';

export default function Categories() {
    const { categories } = useCatalog();

    return (
        <div>
            <div className="crumbs">
                <Link to="/">হোম</Link> / <strong>ক্যাটাগরি</strong>
            </div>
            <div className="eyebrow">ক্যাটালগ</div>
            <h1 className="page-title">ক্যাটাগরি অনুযায়ী কিনুন</h1>
            <p className="page-sub">যেকোনো ক্যাটাগরিতে ক্লিক করে সেই ধরনের সব প্রোডাক্ট দেখুন।</p>

            {categories.length === 0 && <p className="status-msg">লোড হচ্ছে...</p>}

            <div className="cat-grid">
                {categories.map((c) => (
                    <div className="cat-tile" key={c.name}>
                        <div className="cat-tile-icon">{c.icon}</div>
                        <h3 className="cat-tile-name">{c.name}</h3>
                        <div className="cat-tile-count">{c.count}টি প্রোডাক্ট</div>
                        {c.subs.length > 0 && (
                            <div className="cat-tile-subs">
                                {c.subs.map((s) => (
                                    <Link
                                        key={s}
                                        className="cat-tile-sub"
                                        to={`/products?category=${encodeURIComponent(c.name)}&sub=${encodeURIComponent(s)}`}
                                    >
                                        {s}
                                    </Link>
                                ))}
                            </div>
                        )}
                        <Link className="cat-tile-link" to={`/products?category=${encodeURIComponent(c.name)}`}>
                            ক্যাটাগরি দেখুন →
                        </Link>
                    </div>
                ))}
            </div>
        </div>
    );
}
