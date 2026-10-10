import { useState } from 'react';
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
import ProtectedRoute from './components/ProtectedRoute';
import Shop from './pages/Shop';
import Offers from './pages/Offers';
import About from './pages/About';
import PrivacyPolicy from './pages/PrivacyPolicy';
import Checkout from './pages/Checkout';
import OrderConfirmed from './pages/OrderConfirmed';
import Track from './pages/Track';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import AdminLayout from './pages/AdminLayout';
import AdminOrders from './pages/AdminOrders';
import AdminProducts from './pages/AdminProducts';
import AdminPassword from './pages/AdminPassword';
import AdminBanners from './pages/AdminBanners';
import AdminSettings from './pages/AdminSettings';
import AdminCategories from './pages/AdminCategories';
import AdminImport from './pages/AdminImport';
import AdminExpenses from './pages/AdminExpenses';
import AdminCosts from './pages/AdminCosts';
import AdminUsers from './pages/AdminUsers';
import OwnerOnly from './components/OwnerOnly';
import AdminAbandoned from './pages/AdminAbandoned';
import AdminCoupons from './pages/AdminCoupons';
import AdminCustomers from './pages/AdminCustomers';

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
                        placeholder="মধু, ঘি, খেজুর খুঁজুন..."
                        aria-label="প্রোডাক্ট খুঁজুন"
                    />
                    <button type="submit" className="search-btn">খুঁজুন</button>
                </form>

                <div className="header-actions">
                    {siteConfig.phone && (
                        <a className="hdr-btn" href={`tel:${siteConfig.phone}`}>📞 <span>কল</span></a>
                    )}
                    <Link className="hdr-btn" to="/track">📦 <span>ট্র্যাক</span></Link>
                    <button className="cart-btn" onClick={onCartClick}>
                        🧺 কার্ট <span className="cart-badge">{count}</span>
                    </button>
                </div>
            </div>

            <nav className="main-nav">
                <div className="main-nav-inner">
                    <NavLink to="/" end>হোম</NavLink>
                    <NavLink to="/products">প্রোডাক্ট</NavLink>
                    <CategoriesMenu />
                    <NavLink to="/offers">অফার</NavLink>
                    <NavLink to="/about">আমাদের সম্পর্কে</NavLink>
                </div>
            </nav>
            <CategoryStrip />
        </header>
    );
}

// অ্যাডমিনের নিজস্ব লেআউট — দোকানের হেডার/ফুটার এখানে দেখানো হয় না
function AdminApp() {
    return (
        <Routes>
            <Route element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/admin/orders" element={<AdminOrders />} />
                <Route path="/admin/products" element={<AdminProducts />} />
                <Route path="/admin/expenses" element={<OwnerOnly><AdminExpenses /></OwnerOnly>} />
                <Route path="/admin/costs" element={<OwnerOnly><AdminCosts /></OwnerOnly>} />
                <Route path="/admin/admins" element={<OwnerOnly><AdminUsers /></OwnerOnly>} />
                <Route path="/admin/abandoned" element={<AdminAbandoned />} />
                <Route path="/admin/coupons" element={<AdminCoupons />} />
                <Route path="/admin/customers" element={<AdminCustomers />} />
                <Route path="/admin/categories" element={<AdminCategories />} />
                <Route path="/admin/import" element={<AdminImport />} />
                <Route path="/admin/banners" element={<AdminBanners />} />
                <Route path="/admin/settings" element={<OwnerOnly><AdminSettings /></OwnerOnly>} />
                <Route path="/admin/password" element={<AdminPassword />} />
            </Route>
        </Routes>
    );
}

function AppShell() {
    const [cartOpen, setCartOpen] = useState(false);
    const { pathname } = useLocation();

    if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
        return <AdminApp />;
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
                        <AppShell />
                    </CartProvider>
                </CatalogProvider>
            </SiteProvider>
        </AuthProvider>
    );
}
