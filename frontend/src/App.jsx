import { useState } from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import { CartProvider, useCart } from './context/CartContext';
import { AuthProvider } from './context/AuthContext';
import CartDrawer from './components/CartDrawer';
import ProtectedRoute from './components/ProtectedRoute';
import Shop from './pages/Shop';
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
                <Link to="/" className="brand">Tayyib <span>MERN Demo</span></Link>
                <nav>
                    <Link to="/">শপ</Link>
                    <Link to="/track">অর্ডার ট্র্যাক</Link>
                    <Link to="/admin" style={{ fontSize: '0.8rem', opacity: 0.6 }}>অ্যাডমিন</Link>
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
        <>
            <Header onCartClick={() => setCartOpen(true)} />
            <main>
                <Routes>
                    <Route path="/" element={<Shop />} />
                    <Route path="/checkout" element={<Checkout />} />
                    <Route path="/order-confirmed/:id" element={<OrderConfirmed />} />
                    <Route path="/track" element={<Track />} />
                    <Route path="/admin/login" element={<AdminLogin />} />
                    <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
                </Routes>
            </main>
            <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
        </>
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
