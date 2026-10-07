import { useState } from 'react';
import { Routes, Route, Link, NavLink } from 'react-router-dom';
import { CartProvider, useCart } from './context/CartContext';
import { AuthProvider } from './context/AuthContext';
import { siteConfig } from './siteConfig';
import CartDrawer from './components/CartDrawer';
import Footer from './components/Footer';
import ProtectedRoute from './components/ProtectedRoute';
import Shop from './pages/Shop';
import About from './pages/About';
import Checkout from './pages/Checkout';
import OrderConfirmed from './pages/OrderConfirmed';
import Track from './pages/Track';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';

function Header({ onCartClick }) {
    const { items } = useCart();
    const count = items.reduce((s, i) => s + i.quantity, 0);

    return (
        <header className="site-header">
            <div className="bar">
                <Link to="/" className="brand">{siteConfig.name} <span>{siteConfig.tagline}</span></Link>
                <nav>
                    <NavLink to="/" end>শপ</NavLink>
                    <NavLink to="/about">আমাদের সম্পর্কে</NavLink>
                    <NavLink to="/track">অর্ডার ট্র্যাক</NavLink>
                </nav>
                <button className="cart-btn" onClick={onCartClick}>
                    🧺 কার্ট <span className="cart-badge">{count}</span>
                </button>
            </div>
        </header>
    );
}

function AppShell() {
    const [cartOpen, setCartOpen] = useState(false);

    return (
        <div className="app-layout">
            <Header onCartClick={() => setCartOpen(true)} />
            <main>
                <Routes>
                    <Route path="/" element={<Shop />} />
                    <Route path="/about" element={<About />} />
                    <Route path="/checkout" element={<Checkout />} />
                    <Route path="/order-confirmed/:id" element={<OrderConfirmed />} />
                    <Route path="/track" element={<Track />} />
                    <Route path="/admin/login" element={<AdminLogin />} />
                    <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
                </Routes>
            </main>
            <Footer />
            <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
        </div>
    );
}

export default function App() {
    return (
        <AuthProvider>
            <CartProvider>
                <AppShell />
            </CartProvider>
        </AuthProvider>
    );
}
