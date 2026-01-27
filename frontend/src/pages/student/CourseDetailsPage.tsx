import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { PlayCircle, FileText, ArrowLeft, Clock } from 'lucide-react';

interface Module {
    id: number;
    name: string;
    content: string;
}

interface Quiz {
    id: number;
    title: string;
    time_limit_in_minutes: number;
    course: number;
}

export const CourseDetailsPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [modules, setModules] = useState<Module[]>([]);
    const [quizzes, setQuizzes] = useState<Quiz[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [modulesRes, quizzesRes] = await Promise.all([
                    api.get(`/api/courses/${id}/modules/`),
                    api.get('/api/quizzes/')
                ]);
                setModules(modulesRes.data);
                // Filter quizzes for this course
                setQuizzes(quizzesRes.data.filter((q: Quiz) => q.course === parseInt(id || '0')));
            } catch (error) {
                console.error("Failed to load course details", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [id]);

    if (loading) return <div className="text-white text-center mt-10">Wczytywanie kursu...</div>;

    return (
        <div className="space-y-6 animate-fade-in">
            <Button
                variant="ghost"
                size="sm"
                leftIcon={<ArrowLeft className="w-4 h-4" />}
                onClick={() => navigate('/dashboard')}
            >
                Powrót do panelu
            </Button>

            <h1 className="text-3xl font-bold text-white">Zawartość kursu</h1>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-[calc(100vh-140px)]">
                <div className="space-y-6 flex flex-col h-full">
                    <h2 className="text-xl font-semibold text-white">Moduły</h2>
                    <div className="space-y-4 overflow-y-auto flex-1 pr-2">
                        {modules.length === 0 ? (
                            <p className="text-[#94a3b8]">Brak modułów.</p>
                        ) : (
                            modules.map(module => (
                                <Card key={module.id} className="cursor-pointer hover:border-indigo-500/50 transition-all">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 rounded-lg bg-indigo-500/20 text-indigo-400">
                                            <FileText className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-medium">{module.name}</h3>
                                            <p className="text-sm text-[#94a3b8]">Zawartość modułu</p>
                                        </div>
                                    </div>
                                </Card>
                            ))
                        )}
                    </div>
                </div>

                <div className="space-y-6 flex flex-col h-full">
                    <h2 className="text-xl font-semibold text-white">Quizy</h2>
                    <div className="space-y-4 overflow-y-auto flex-1 pr-2">
                        {quizzes.length === 0 ? (
                            <p className="text-[#94a3b8]">Brak quizów.</p>
                        ) : (
                            quizzes.map(quiz => (
                                <Card key={quiz.id} className="cursor-pointer hover:border-indigo-500/50 transition-all">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="p-3 rounded-lg bg-amber-500/20 text-amber-400">
                                                <Clock className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-medium">{quiz.title}</h3>
                                                <p className="text-sm text-[#94a3b8]">{quiz.time_limit_in_minutes} min.</p>
                                            </div>
                                        </div>
                                        <Button onClick={() => navigate(`/quiz/${quiz.id}`)} rightIcon={<PlayCircle className="w-4 h-4" />}>
                                            Start
                                        </Button>
                                    </div>
                                </Card>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
