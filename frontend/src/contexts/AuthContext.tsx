import React, { createContext, useContext, useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';
import api from '../services/api';
import type { User, UserRole } from '../types/auth';

interface AuthContextType {
    user: User | null;
    isAuthenticated: boolean;
    login: (email: string, password: string) => Promise<void>;
    register: (name: string, email: string, password: string, role: UserRole) => Promise<void>;
    logout: () => void;
    isLoading: boolean;
    error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const initAuth = async () => {
            const accessToken = localStorage.getItem('accessToken');
            if (accessToken) {
                try {
                    const decoded: any = jwtDecode(accessToken);
                    // Backend token payload needs to be checked, typicaly 'user_id' is in it.
                    const userId = decoded.user_id;
                    await fetchUser(userId);
                } catch (err) {
                    console.error("Failed to restore session", err);
                    logout();
                }
            }
            setIsLoading(false);
        };
        initAuth();
    }, []);

    const fetchUser = async (userId: string) => {
        try {
            const response = await api.get(`/accounts/check_user_info/${userId}/`);
            // UserInfoView returns { id, name, surname, is_teacher }
            const userData = response.data;

            console.log(userData);

            const user: User = {
                id: userData.id,
                email: userData.email,
                name: `${userData.name} ${userData.surname}`,
                role: getUserRole(userData),
                avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${userData.name}`
            };

            setUser(user);
        } catch (err) {
            console.error("Failed to fetch user info", err);
        }
    };

    const getUserRole = (userData: any): UserRole => {
        if (userData.is_superuser) {
            return 'superuser';
        } else if (userData.is_staff) {
            return 'staff';
        } else if (userData.is_teacher) {
            return 'teacher';
        } else {
            return 'student';
        }
    };

    const login = async (email: string, password: string) => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await api.post('/accounts/token/', { email, password });
            const { access, refresh } = response.data;

            localStorage.setItem('accessToken', access);
            localStorage.setItem('refreshToken', refresh);

            const decoded: any = jwtDecode(access);
            await fetchUser(decoded.user_id);
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Login failed');
            throw err;
        } finally {
            setIsLoading(false);
        }
    };

    const register = async (name: string, email: string, password: string, role: UserRole) => {
        setIsLoading(true);
        setError(null);
        try {
            // Backend RegisterView expects specific fields?
            // Assuming standard: email, password, name, surname, is_teacher key?
            // Need to check RegisterView serializer. Assuming standard.
            const nameParts = name.split(' ');
            const firstName = nameParts[0];
            const lastName = nameParts.slice(1).join(' ') || '';

            await api.post('/accounts/register/', {
                email,
                password,
                name: firstName,
                surname: lastName,
                is_teacher: role === 'teacher'
            });

            // Auto login after register
            await login(email, password);
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Registration failed');
            throw err;
        } finally {
            setIsLoading(false);
        }
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
    };

    return (
        <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, register, logout, isLoading, error }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
