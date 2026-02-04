import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { PlusCircle, Clock, Loader2, FileText } from 'lucide-react';

interface Quiz {
    id: number;
    title: string;
    description: string;
    time_limit_in_minutes: number;
    course: number; // Course ID
}

export const QuizzesPage = () => {
    const [quizzes, setQuizzes] = useState<Quiz[]>([]);
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchQuizzes = async () => {
            try {
                const response = await api.get('/api/quizzes/');
                setQuizzes(response.data);
            } catch (error) {
                console.error("Failed to fetch quizzes", error);
            } finally {
                setLoading(false);
            }
        };
        fetchQuizzes();
    }, []);

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64 text-slate-500">
                <Loader2 className="w-8 h-8 animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-fade-in max-w-[1400px] mx-auto py-8 px-4">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 mb-2">Quizy</h1>
                    <p className="text-slate-500">Zarządzaj quizami dla uczniów.</p>
                </div>
                <Link to="/tests/create">
                    <Button leftIcon={<PlusCircle className="w-4 h-4" />}>
                        Stwórz nowy quiz
                    </Button>
                </Link>
            </div>

            {quizzes.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-lg border border-slate-200">
                    <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-slate-900 mb-2">Nie masz żadnych quizów</h3>
                    <p className="text-slate-500 mb-6">Stwórz swój pierwszy quiz, aby ocenić uczniów.</p>
                    <Link to="/tests/create">
                        <Button variant="outline">Stwórz nowy quiz</Button>
                    </Link>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {quizzes.map((quiz) => (
                        <Card
                            key={quiz.id}
                            onClick={() => navigate(`/quizzes/${quiz.id}`)}
                            className="group hover:border-indigo-300 transition-all duration-300 cursor-pointer"
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex gap-4">
                                    <div className="p-3 rounded-lg bg-indigo-50 text-indigo-600 group-hover:bg-indigo-100 transition-colors">
                                        <FileText className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">
                                            {quiz.title}
                                        </h3>
                                        <p className="text-sm text-slate-500 mt-1 line-clamp-2">
                                            {quiz.description || "Brak opisu."}
                                        </p>
                                        <div className="flex items-center gap-2 mt-3 text-xs text-slate-400">
                                            <span className="flex items-center gap-1">
                                                <Clock className="w-3 h-3" /> {quiz.time_limit_in_minutes} min
                                            </span>
                                            <span>•</span>
                                            <span>Id kursu: {quiz.course}</span>
                                        </div>
                                        <div className="mt-4 flex gap-2">
                                            <Button
                                                size="sm"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    navigate(`/quizzes/${quiz.id}/submissions`);
                                                }}
                                                variant="outline"
                                            >
                                                Oceny / Prace
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
};
