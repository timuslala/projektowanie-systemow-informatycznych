import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Card } from '../components/Card';
import { Mail, Lock, LogIn } from 'lucide-react';
// import type { UserRole } from '../types/auth'; // Unused now

export const LoginPage = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const { login, isLoading, error } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await login(email, password);
            navigate('/dashboard');
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-white relative overflow-hidden">
            <Card className="w-full max-w-md animate-fade-in shadow-none border-none" title="Witaj" description="Zaloguj się aby kontynuować">

                {/* Role Toggles removed - Role is determined by backend on login */}
                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-lg text-sm mb-4">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <Input
                        id="email"
                        type="email"
                        label="Adres email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        leftIcon={<Mail className="w-5 h-5" />}
                        required
                    />

                    <Input
                        id="password"
                        type="password"
                        label="Hasło"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        leftIcon={<Lock className="w-5 h-5" />}
                        required
                    />
                    <Button type="submit" className="w-full" isLoading={isLoading} rightIcon={<LogIn className="w-5 h-5" />}>
                        Zaloguj się
                    </Button>
                </form>

                <div className="mt-6 text-center text-sm text-slate-500">
                    Nie masz konta?{' '}
                    <Link to="/register" className="text-indigo-600 hover:text-indigo-700 font-medium transition-colors">
                        Zarejestruj się
                    </Link>
                </div>
            </Card>
        </div>
    );
};
