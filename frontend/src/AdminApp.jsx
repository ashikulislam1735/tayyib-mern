import { Routes, Route } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
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
import AdminReviews from './pages/AdminReviews';
import AdminPathao from './pages/AdminPathao';
import AdminStock from './pages/AdminStock';

// অ্যাডমিনের নিজস্ব লেআউট — দোকানের হেডার/ফুটার এখানে দেখানো হয় না
export default function AdminApp() {
    return (
        <Routes>
            <Route element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/admin/orders" element={<AdminOrders />} />
                <Route path="/admin/products" element={<AdminProducts />} />
                <Route path="/admin/stock" element={<AdminStock />} />
                <Route path="/admin/expenses" element={<OwnerOnly><AdminExpenses /></OwnerOnly>} />
                <Route path="/admin/costs" element={<OwnerOnly><AdminCosts /></OwnerOnly>} />
                <Route path="/admin/admins" element={<OwnerOnly><AdminUsers /></OwnerOnly>} />
                <Route path="/admin/abandoned" element={<AdminAbandoned />} />
                <Route path="/admin/coupons" element={<AdminCoupons />} />
                <Route path="/admin/customers" element={<AdminCustomers />} />
                <Route path="/admin/reviews" element={<AdminReviews />} />
                <Route path="/admin/pathao" element={<OwnerOnly><AdminPathao /></OwnerOnly>} />
                <Route path="/admin/categories" element={<AdminCategories />} />
                <Route path="/admin/import" element={<AdminImport />} />
                <Route path="/admin/banners" element={<AdminBanners />} />
                <Route path="/admin/settings" element={<OwnerOnly><AdminSettings /></OwnerOnly>} />
                <Route path="/admin/password" element={<AdminPassword />} />
            </Route>
        </Routes>
    );
}
