import { createContext, useContext, useState } from 'react';
import { api } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [username, setUsername] = useState(() => localStorage.getItem('adminUsername'));

    async function login(user, pass) {
        const data = await api.login(user, pass);
        localStorage.setItem('adminToken', data.token);
        localStorage.setItem('adminUsername', data.username);
        setUsername(data.username);
    }

    function logout() {
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminUsername');
        setUsername(null);
    }

    return (
        <AuthContext.Provider value={{ username, isLoggedIn: !!username, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}
