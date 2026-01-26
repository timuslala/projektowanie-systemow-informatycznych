import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './Button';
import {
    LogOut,
    Menu,
    X,
    LayoutDashboard,
    BookOpen,
    PlusCircle
} from 'lucide-react';

export const Navbar = () => {
    const { user, logout } = useAuth();
    const location = useLocation();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const isActive = (path: string) => location.pathname === path;

    const getLinks = () => {
        if (user?.role === 'teacher') {
            return [
                { path: '/dashboard', label: 'Panel', icon: <LayoutDashboard className="w-4 h-4" /> },
                { path: '/courses/create', label: 'Nowy kurs', icon: <PlusCircle className="w-4 h-4" /> },
            ];
        }
        return [
            { path: '/dashboard', label: 'Moje kursy', icon: <BookOpen className="w-4 h-4" /> },
        ];
    };

    const links = getLinks();

    return (
        <nav className="sticky top-0 z-50 w-full border-b border-white/5 backdrop-blur-xl">
            <div className="container mx-auto px-4">
                <div className="flex h-16 items-center justify-between">
                    <div className="flex items-center gap-8">
                        <Link to="/dashboard" className="flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#6366f1] to-[#a855f7]">
                                <BookOpen className="h-5 w-5 text-white" />
                            </div>
                            <span className="text-xl font-bold">
                                E-Learning
                            </span>
                        </Link>

                        {/* Desktop Navigation */}
                        <div className="hidden md:flex items-center gap-1">
                            {links.map((link) => (
                                <Link
                                    key={link.path}
                                    to={link.path}
                                    className={`
                    flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all
                    ${isActive(link.path)
                                            ? 'bg-white/10 shadow-sm ring-1 ring-white/5'
                                            : 'text-[#94a3b8] hover:bg-white/5'
                                        }
                  `}
                                >
                                    {link.icon}
                                    {link.label}
                                </Link>
                            ))}
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        {/* User Profile Dropdown Placeholder */}
                        {user && (
                            <div className="hidden md:flex items-center gap-3 pl-4 border-l border-white/10">
                                <div className="flex flex-col items-end">
                                    <span className="text-sm font-medium">{user.name}</span>
                                    <span className="text-xs text-[#94a3b8] capitalize">{user.role}</span>
                                </div>
                                <img
                                    src={user.avatarUrl}
                                    alt={user.name}
                                    className="h-9 w-9 rounded-full border border-white/10 bg-white/5"
                                />

                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={logout}
                                    className="text-[#94a3b8] hover:text-red-400"
                                >
                                    <LogOut className="h-5 w-5" />
                                </Button>
                            </div>
                        )}

                        {/* Mobile Menu Button */}
                        <button
                            className="md:hidden p-2 text-[#94a3b8] hover:text-white"
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        >
                            {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Menu */}
            {isMobileMenuOpen && (
                <div className="md:hidden border-t border-white/5 bg-[#0f172a] p-4 space-y-2 animate-fade-in">
                    {links.map((link) => (
                        <Link
                            key={link.path}
                            to={link.path}
                            onClick={() => setIsMobileMenuOpen(false)}
                            className={`
                flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium transition-colors
                ${isActive(link.path)
                                    ? 'bg-[#6366f1]/10 text-[#6366f1]'
                                    : 'text-[#94a3b8] hover:bg-white/5 hover:text-white'
                                }
              `}
                        >
                            {link.icon}
                            {link.label}
                        </Link>
                    ))}
                    <div className="pt-4 mt-4 border-t border-white/5">
                        <button
                            onClick={() => {
                                logout();
                                setIsMobileMenuOpen(false);
                            }}
                            className="flex w-full items-center gap-3 px-4 py-3 text-[#ef4444] hover:bg-red-500/10 rounded-lg transition-colors"
                        >
                            <LogOut className="h-5 w-5" />
                            Wyloguj się
                        </button>
                    </div>
                </div>
            )}
        </nav>
    );
};
