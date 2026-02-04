import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/Button';
import { ArrowLeft } from 'lucide-react';
import api from '../../services/api';

export const CreateCoursePage = () => {
    const navigate = useNavigate();
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSave = async (e: FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api.post('/api/courses/', {
                title,
                description
            });
            navigate('/dashboard');
        } catch (error) {
            console.error("Failed to create course", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-[800px] mx-auto py-12 animate-fade-in">
            <Button
                variant="ghost"
                className="mb-8 text-slate-600 hover:text-slate-900"
                leftIcon={<ArrowLeft className="w-4 h-4" />}
                onClick={() => navigate('/dashboard')}
            >
                Powrót do panelu
            </Button>

            <h1 className="text-3xl font-bold text-center text-slate-900 mb-12">Kreator kursu</h1>

            <div className="bg-white rounded-lg border border-slate-200 p-8 shadow-sm">
                <form onSubmit={handleSave} className="space-y-8">
                    <div className="space-y-2">
                        <label htmlFor="title" className="block text-sm font-medium text-slate-900">
                            Tytuł
                        </label>
                        <input
                            id="title"
                            type="text"
                            className="w-full px-4 py-2 border border-slate-200 rounded-md outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors placeholder-slate-400"
                            placeholder="Wprowadź tytuł kursu"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <label htmlFor="description" className="block text-sm font-medium text-slate-900">
                            Opis
                        </label>
                        <textarea
                            id="description"
                            className="w-full px-4 py-2 border border-slate-200 rounded-md outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors h-40 resize-none placeholder-slate-400"
                            placeholder="Wprowadź opis kursu"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            required
                        />
                        <div className="text-right text-xs text-slate-400">
                            {description.length}/50
                        </div>
                    </div>

                    <div className="flex justify-end pt-4">
                        <Button
                            type="submit"
                            isLoading={loading}
                            className="bg-indigo-600 hover:bg-indigo-700 px-8"
                        >
                            Utwórz kurs
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
};

