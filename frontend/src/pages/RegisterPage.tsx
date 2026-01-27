import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Card } from '../components/Card';
import { Mail, Lock, User, GraduationCap, School, ArrowRight, CheckCircle } from 'lucide-react';
import type { UserRole } from '../types/auth';

export const RegisterPage = () => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState<UserRole>('student');
    const { register, isLoading, error } = useAuth();
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await register(name, email, password, role);
            setSuccess(true);
        } catch (err) {
            console.error(err);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4 bg-white relative overflow-hidden">
                <Card className="w-full max-w-md text-center animate-fade-in shadow-none border-none" title="Account Created!">
                    <div className="flex flex-col items-center gap-4 py-6">
                        <div className="w-16 h-16 rounded-full bg-green-50 text-green-500 flex items-center justify-center">
                            <CheckCircle className="w-8 h-8" />
                        </div>
                        <p className="text-slate-500">
                            Wysłaliśmy link weryfikacyjny na adres <span className="text-slate-900 font-medium">{email}</span>.
                            Sprawdź swoją skrzynkę odbiorczą, aby aktywować swoje konto.
                        </p>
                        <Link to="/login" className="w-full">
                            <Button variant="outline" className="w-full">
                                Przejdź do logowania
                            </Button>
                        </Link>
                    </div>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-white relative overflow-hidden">
            <Card className="w-full max-w-md animate-fade-in shadow-none border-none" title="Rejestracja" description="Dołącz do naszej społeczności">

                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-lg text-sm mb-4">
                        {error}
                    </div>
                )}

                {/* Role Toggles */}
                <div className="grid grid-cols-2 gap-2 mb-6 p-1 bg-slate-100 rounded-lg">
                    <button
                        onClick={() => setRole('student')}
                        className={`flex items-center justify-center space-x-2 py-2 rounded-md text-sm font-medium transition-all ${role === 'student' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-900'
                            }`}
                    >
                        <GraduationCap className="w-4 h-4" />
                        <span>Uczeń</span>
                    </button>
                    <button
                        onClick={() => setRole('teacher')}
                        className={`flex items-center justify-center space-x-2 py-2 rounded-md text-sm font-medium transition-all ${role === 'teacher' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-900'
                            }`}
                    >
                        <School className="w-4 h-4" />
                        <span>Nauczyciel</span>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <Input
                        id="name"
                        type="text"
                        label="Imię i nazwisko"
                        placeholder="John Doe"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        leftIcon={<User className="w-5 h-5" />}
                        required
                    />

                    <Input
                        id="email"
                        type="email"
                        label="Adres e-mail"
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

                    <Button type="submit" className="w-full" isLoading={isLoading} rightIcon={<ArrowRight className="w-5 h-5" />}>
                        Zarejestruj się
                    </Button>
                </form>

                <div className="mt-6 text-center text-sm text-slate-500">
                    Jesteś już zarejestrowany?{' '}
                    <Link to="/login" className="text-indigo-600 hover:text-indigo-700 font-medium transition-colors">
                        Zaloguj się
                    </Link>
                </div>
            </Card>
        </div>
    );
};

