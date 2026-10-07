import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useCatalog } from '../context/CatalogContext';

export default function CategoriesMenu() {
    const { categories } = useCatalog();
    const [open, setOpen] = useState(false);

    return (
        <div
            className="nav-dropdown"
            onMouseEnter={() => setOpen(true)}
            onMouseLeave={() => setOpen(false)}
        >
            <button className="nav-dd-btn" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
                ক্যাটাগরি ▾
            </button>
            {open && (
                <div className="dd-panel">
                    {categories.length === 0 && <span className="dd-empty">কোনো ক্যাটাগরি নেই</span>}
                    {categories.map((c) => (
                        <div className="dd-group" key={c.name}>
                            <Link className="dd-cat" to={`/products?category=${encodeURIComponent(c.name)}`} onClick={() => setOpen(false)}>
                                {c.icon} {c.name}
                            </Link>
                            {c.subs.map((s) => (
                                <Link
                                    key={s}
                                    className="dd-sub"
                                    to={`/products?category=${encodeURIComponent(c.name)}&sub=${encodeURIComponent(s)}`}
                                    onClick={() => setOpen(false)}
                                >
                                    {s}
                                </Link>
                            ))}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
