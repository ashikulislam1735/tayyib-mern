import { createContext, useContext, useState } from 'react';
import { api } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [username, setUsername] = useState(() => localStorage.getItem('adminUsername'));
    const [role, setRole] = useState(() => localStorage.getItem('adminRole') || 'owner');

    async function login(user, pass) {
        const data = await api.login(user, pass);
        localStorage.setItem('adminToken', data.token);
        localStorage.setItem('adminUsername', data.username);
        localStorage.setItem('adminRole', data.role || 'owner');
        setUsername(data.username);
        setRole(data.role || 'owner');
    }

    function logout() {
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminUsername');
        localStorage.removeItem('adminRole');
        setUsername(null);
        setRole('owner');
    }

    return (
        <AuthContext.Provider value={{ username, role, isOwner: role === 'owner', isLoggedIn: !!username, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}
