import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children }) {
    const { isLoggedIn } = useAuth();
    if (!isLoggedIn) return <Navigate to="/admin/login" replace />;
    return children;
}
