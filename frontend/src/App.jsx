import { lazy, Suspense, useState } from 'react';
import { Routes, Route, Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { CartProvider, useCart } from './context/CartContext';
import { AuthProvider } from './context/AuthContext';
import { CatalogProvider } from './context/CatalogContext';
import { SiteProvider } from './context/SiteContext';
import CategoriesMenu from './components/CategoriesMenu';
import CategoryStrip from './components/CategoryStrip';
import Categories from './pages/Categories';
import CategoryPage from './pages/CategoryPage';
import ProductDetail from './pages/ProductDetail';
import { useSite } from './context/SiteContext';
import CartDrawer from './components/CartDrawer';
import Footer from './components/Footer';
import FloatingWhatsApp from './components/FloatingWhatsApp';
import ScrollToTop from './components/ScrollToTop';
import RouteSeo from './components/RouteSeo';
import Shop from './pages/Shop';
import Offers from './pages/Offers';
import About from './pages/About';
import PrivacyPolicy from './pages/PrivacyPolicy';
import Checkout from './pages/Checkout';
import OrderConfirmed from './pages/OrderConfirmed';
import Track from './pages/Track';
import AdminLogin from './pages/AdminLogin';

// অ্যাডমিন প্যানেল আলাদা ফাইল থেকে দরকারের সময় লোড হয় — ক্রেতার ফোনে অ্যাডমিনের কোড নামে না
const AdminApp = lazy(() => import('./AdminApp'));

function Header({ onCartClick }) {
    const { items } = useCart();
    const count = items.reduce((s, i) => s + i.quantity, 0);
    const [search, setSearch] = useState('');
    const navigate = useNavigate();
    const { site: siteConfig } = useSite();

    function handleSearch(e) {
        e.preventDefault();
        const term = search.trim();
        navigate(term ? `/?q=${encodeURIComponent(term)}` : '/');
    }

    return (
        <header className="site-header">
            <div className="bar">
                <Link to="/" className="brand">
                    {siteConfig.logo && <img src={siteConfig.logo} alt={siteConfig.name} className="brand-logo" />}
                    {siteConfig.name} <span>{siteConfig.tagline}</span>
                </Link>

                <form className="search-form" onSubmit={handleSearch} role="search">
                    <input
                        type="search"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search honey, ghee, dates..."
                        aria-label="Search products"
                    />
                    <button type="submit" className="search-btn">Search</button>
                </form>

                <div className="header-actions">
                    {siteConfig.phone && (
                        <a className="hdr-btn" href={`tel:${siteConfig.phone}`}>📞 <span>Call</span></a>
                    )}
                    <Link className="hdr-btn" to="/track">📦 <span>Track</span></Link>
                    <button className="cart-btn" onClick={onCartClick}>
                        🧺 Cart <span className="cart-badge">{count}</span>
                    </button>
                </div>
            </div>

            <nav className="main-nav">
                <div className="main-nav-inner">
                    <NavLink to="/" end>Home</NavLink>
                    <NavLink to="/products">Products</NavLink>
                    <CategoriesMenu />
                    <NavLink to="/offers">Offers</NavLink>
                </div>
            </nav>
            <CategoryStrip />
        </header>
    );
}

function AppShell() {
    const [cartOpen, setCartOpen] = useState(false);
    const { pathname } = useLocation();

    if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
        return (
            <Suspense fallback={<p className="status-msg">লোড হচ্ছে...</p>}>
                <AdminApp />
            </Suspense>
        );
    }

    return (
        <div className="app-layout">
            <Header onCartClick={() => setCartOpen(true)} />
            <main>
                <Routes>
                    <Route path="/" element={<Shop />} />
                    <Route path="/products" element={<Shop />} />
                    <Route path="/product/:id" element={<ProductDetail />} />
                    <Route path="/categories" element={<Categories />} />
                    <Route path="/category/:name" element={<CategoryPage />} />
                    <Route path="/offers" element={<Offers />} />
                    <Route path="/about" element={<About />} />
                    <Route path="/privacy" element={<PrivacyPolicy />} />
                    <Route path="/checkout" element={<Checkout />} />
                    <Route path="/order-confirmed/:id" element={<OrderConfirmed />} />
                    <Route path="/track" element={<Track />} />
                    <Route path="/admin/login" element={<AdminLogin />} />
                </Routes>
            </main>
            <Footer />
            <FloatingWhatsApp />
            <ScrollToTop />
            <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
        </div>
    );
}

export default function App() {
    return (
        <AuthProvider>
            <SiteProvider>
                <CatalogProvider>
                    <CartProvider>
                        <RouteSeo />
                        <AppShell />
                    </CartProvider>
                </CatalogProvider>
            </SiteProvider>
        </AuthProvider>
    );
}
