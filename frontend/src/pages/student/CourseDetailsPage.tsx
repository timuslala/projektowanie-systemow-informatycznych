import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { PlayCircle, FileText, ArrowLeft, Clock, Eye, CheckCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

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
    module: number | null;
    is_finished: boolean;
    show_correct_answers_on_completion: boolean;
}

export const CourseDetailsPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [modules, setModules] = useState<Module[]>([]);
    const [quizzes, setQuizzes] = useState<Quiz[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [modulesRes, quizzesRes] = await Promise.all([
                    api.get(`/api/courses/${id}/modules/`),
                    api.get('/api/quizzes/', { params: { course_id: id } })
                ]);
                setModules(modulesRes.data);
                // API filter might already filter by course_id but explicit filter is safe
                setQuizzes(quizzesRes.data);
            } catch (error) {
                console.error("Failed to load course details", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [id]);

    if (loading) return <div className="text-white text-center mt-10">Wczytywanie kursu...</div>;

    const isStudent = user?.role === 'student';

    return (
        <div className="space-y-6 animate-fade-in max-w-4xl mx-auto pb-10">
            <Button
                variant="ghost"
                size="sm"
                leftIcon={<ArrowLeft className="w-4 h-4" />}
                onClick={() => navigate('/dashboard')}
            >
                Powrót do panelu
            </Button>

            <h1 className="text-3xl font-bold text-white mb-8">Zawartość kursu</h1>

            <div className="space-y-8">
                {modules.length === 0 && quizzes.length === 0 ? (
                    <p className="text-[#94a3b8] text-center">Brak zawartości.</p>
                ) : (
                    <>
                        {/* Modules and their Quizzes */}
                        {modules.map(module => {
                            const moduleQuizzes = quizzes.filter(q => q.module === module.id);

                            return (
                                <div key={module.id} className="space-y-4">
                                    <Card className="border-l-4 border-l-indigo-500">
                                        <div className="flex items-center gap-4">
                                            <div className="p-3 rounded-lg bg-indigo-500/20 text-indigo-400">
                                                <FileText className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <h3 className="text-xl font-medium text-slate-900">{module.name}</h3>
                                                <p className="text-sm text-slate-500">Moduł</p>
                                            </div>
                                        </div>
                                        <div className="mt-4 text-slate-600 prose prose-sm max-w-none">
                                            {module.content}
                                        </div>
                                    </Card>

                                    {/* Quizzes for this module */}
                                    {moduleQuizzes.length > 0 && (
                                        <div className="ml-8 space-y-3">
                                            {moduleQuizzes.map(quiz => (
                                                <QuizCard
                                                    key={quiz.id}
                                                    quiz={quiz}
                                                    isStudent={isStudent}
                                                    onStart={() => navigate(`/quiz/${quiz.id}`)}
                                                    onReview={() => navigate(`/quiz/${quiz.id}/review`)}
                                                />
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}

                        {/* Unassigned Quizzes */}
                        {quizzes.filter(q => !q.module).length > 0 && (
                            <div className="space-y-4 mt-8">
                                <h2 className="text-xl font-semibold text-white border-b border-slate-700 pb-2">Pozostałe Quizy</h2>
                                {quizzes.filter(q => !q.module).map(quiz => (
                                    <QuizCard
                                        key={quiz.id}
                                        quiz={quiz}
                                        isStudent={isStudent}
                                        onStart={() => navigate(`/quiz/${quiz.id}`)}
                                        onReview={() => navigate(`/quiz/${quiz.id}/review`)}
                                    />
                                ))}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

const QuizCard = ({ quiz, isStudent, onStart, onReview }: { quiz: Quiz, isStudent: boolean, onStart: () => void, onReview: () => void }) => {
    const isFinished = quiz.is_finished;
    // Teacher/Staff can always start (for testing). Student can only start if not finished.
    const canStart = !isStudent || !isFinished;

    return (
        <Card className="cursor-pointer hover:border-amber-500/50 transition-all bg-slate-800/50 border-slate-700">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400">
                        <Clock className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-lg font-medium flex items-center gap-2">
                            {quiz.title}
                            {isFinished && <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full border border-green-500/30 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Zakończony</span>}
                        </h3>
                        <p className="text-sm text-slate-400">{quiz.time_limit_in_minutes} min.</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {isFinished && quiz.show_correct_answers_on_completion && (
                        <Button onClick={onReview} size="sm" variant="secondary" leftIcon={<Eye className="w-4 h-4" />}>
                            Wyniki
                        </Button>
                    )}

                    <Button
                        onClick={onStart}
                        size="sm"
                        disabled={!canStart}
                        className={!canStart ? "opacity-50 cursor-not-allowed" : ""}
                        rightIcon={<PlayCircle className="w-4 h-4" />}
                    >
                        Start
                    </Button>
                </div>
            </div>
        </Card>
    );
};
