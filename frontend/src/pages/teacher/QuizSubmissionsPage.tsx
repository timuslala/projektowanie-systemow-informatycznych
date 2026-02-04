import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { ArrowLeft, Mail, Search, FileSignature } from 'lucide-react';
import api from '../../services/api';

interface Submission {
    user_id: number;
    name: string;
    email: string;
}

export const QuizSubmissionsPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [submissions, setSubmissions] = useState<Submission[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        const fetchSubmissions = async () => {
            try {
                const response = await api.get(`/api/quizzes/${id}/submissions/`);
                setSubmissions(response.data);
            } catch (error) {
                console.error("Failed to fetch submissions", error);
            } finally {
                setLoading(false);
            }
        };
        fetchSubmissions();
    }, [id]);

    const filteredSubmissions = submissions.filter(sub =>
        sub.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sub.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) return <div className="text-center mt-10 text-slate-500">Wczytywanie przesłanych prac...</div>;

    return (
        <div className="max-w-4xl mx-auto space-y-6 animate-fade-in my-8 px-4">
            <Button
                variant="ghost"
                size="sm"
                leftIcon={<ArrowLeft className="w-4 h-4" />}
                onClick={() => navigate('/dashboard')}
                className="mb-4"
            >
                Powrót do panelu
            </Button>

            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 mb-2">Przesłane odpowiedzi</h1>
                    <p className="text-slate-500">Wybierz studenta, aby ocenić jego pracę.</p>
                </div>
                <div className="relative">
                    <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Szukaj studenta..."
                        className="pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 w-64"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {submissions.length === 0 ? (
                <Card className="text-center py-12">
                    <FileSignature className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-slate-900 mb-2">Brak przesłanych prac</h3>
                    <p className="text-slate-500">Nikt jeszcze nie rozwiązał tego quizu.</p>
                </Card>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {filteredSubmissions.map((sub) => (
                        <Card
                            key={sub.user_id}
                            className="flex items-center justify-between hover:border-indigo-300 transition-colors cursor-pointer group"
                            onClick={() => navigate(`/quizzes/${id}/submissions/${sub.user_id}`)}
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold">
                                    {sub.name.charAt(0)}
                                </div>
                                <div>
                                    <h3 className="font-semibold text-slate-900 group-hover:text-indigo-700 transition-colors">{sub.name}</h3>
                                    <div className="flex items-center gap-4 text-sm text-slate-500 mt-1">
                                        <span className="flex items-center gap-1">
                                            <Mail className="w-3 h-3" /> {sub.email}
                                        </span>
                                        {/* <span className="flex items-center gap-1">
                                            <Hash className="w-3 h-3" /> ID: {sub.user_id}
                                        </span> */}
                                    </div>
                                </div>
                            </div>
                            <Button variant="outline" size="sm">
                                Oceń
                            </Button>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
};
