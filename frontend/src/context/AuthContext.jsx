import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        console.log('[AuthContext] Backend APIs: GET /api/auth/me');
        // Try to load user from saved token
        const token = localStorage.getItem('hireflow_token');
        if (token) {
            api.getMe()
                .then((userData) => {
                    setUser(userData);
                })
                .catch(() => {
                    localStorage.removeItem('hireflow_token');
                })
                .finally(() => setLoading(false));
        } else {
            setLoading(false);
        }
    }, []);

    const login = async (email, password) => {
        const data = await api.login({ email, password });
        localStorage.setItem('hireflow_token', data.access_token);
        setUser(data.user);
        return data.user;
    };

    const signup = async (name, email, password, role) => {
        const data = await api.signup({ name, email, password, role });
        localStorage.setItem('hireflow_token', data.access_token);
        setUser(data.user);
        return data.user;
    };

    const logout = () => {
        localStorage.removeItem('hireflow_token');
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, signup, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}

export default AuthContext;
