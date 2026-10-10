import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const MENU = [
    { to: '/admin', label: 'ড্যাশবোর্ড', icon: '🏠', end: true },
    { to: '/admin/orders', label: 'অর্ডার', icon: '📦' },
    { to: '/admin/abandoned', label: 'অসম্পূর্ণ অর্ডার', icon: '🛒' },
    { to: '/admin/products', label: 'প্রোডাক্ট', icon: '🛍️' },
    { to: '/admin/expenses', label: 'খরচ', icon: '💸' },
    { to: '/admin/categories', label: 'ক্যাটাগরির ছবি', icon: '🗂️' },
    { to: '/admin/import', label: 'প্রোডাক্ট ইমপোর্ট', icon: '📥' },
    { to: '/admin/banners', label: 'ব্যানার', icon: '🖼️' },
    { to: '/admin/settings', label: 'সাইট সেটিংস', icon: '⚙️' },
    { to: '/admin/password', label: 'পাসওয়ার্ড', icon: '🔑' },
];

export default function AdminLayout() {
    const [open, setOpen] = useState(false);
    const { username, logout } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();

    const current = MENU.find((m) => (m.end ? location.pathname === m.to : location.pathname.startsWith(m.to)));
    const isHome = location.pathname === '/admin';

    // পেজ বদলালে মেনু বন্ধ
    useEffect(() => setOpen(false), [location.pathname]);

    // Esc চাপলে মেনু বন্ধ
    useEffect(() => {
        const onKey = (e) => e.key === 'Escape' && setOpen(false);
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);

    function goBack() {
        // আগের পেজ যদি এই সাইটেরই হয় তাহলে সেখানে, নইলে ড্যাশবোর্ডে
        if (location.key !== 'default') navigate(-1);
        else navigate('/admin');
    }

    return (
        <div className="admin-shell">
            <header className="admin-topbar">
                <button className="admin-icon-btn" onClick={() => setOpen(true)} aria-label="মেনু খুলুন">☰</button>
                {!isHome && (
                    <button className="admin-icon-btn" onClick={goBack} aria-label="পেছনে যান">←</button>
                )}
                <h1 className="admin-title">{current ? current.label : 'অ্যাডমিন'}</h1>
                <Link to="/" className="admin-site-link">সাইট দেখুন ↗</Link>
            </header>

            {open && <div className="admin-overlay" onClick={() => setOpen(false)} />}
            <aside className={`admin-drawer ${open ? 'open' : ''}`} aria-hidden={!open}>
                <div className="admin-drawer-head">
                    <div>
                        <strong>Tayyib অ্যাডমিন</strong>
                        <div className="admin-user">{username}</div>
                    </div>
                    <button className="admin-icon-btn" onClick={() => setOpen(false)} aria-label="মেনু বন্ধ করুন">✕</button>
                </div>
                <nav className="admin-menu">
                    {MENU.map((m) => (
                        <NavLink key={m.to} to={m.to} end={m.end}>
                            <span>{m.icon}</span> {m.label}
                        </NavLink>
                    ))}
                    <Link to="/"><span>🌐</span> সাইট দেখুন</Link>
                    <button className="admin-logout" onClick={logout}><span>🚪</span> লগআউট</button>
                </nav>
            </aside>

            <div className="admin-main">
                <Outlet />
            </div>
        </div>
    );
}
