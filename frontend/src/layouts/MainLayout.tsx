import type { FC, ReactNode } from 'react';
import { Navbar } from '../components/Navbar';

export const MainLayout: FC<{ children: ReactNode }> = ({ children }) => {
    return (
        <div className="min-h-screen flex flex-col">

            <Navbar />

            <main className="flex-1 container mx-auto px-4 py-8 animate-fade-in">
                {children}
            </main>

            <footer className="border-t border-white/5 py-8 text-center text-sm text-[#94a3b8]">
                <p>&copy; {new Date().getFullYear()} LMS Pro. All rights reserved.</p>
            </footer>
        </div>
    );
};
