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
    photo_url?: string;
    completed: boolean;
}

interface Course {
    id: number;
    title: string;
    description: string;
    progress: number;
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
    const [course, setCourse] = useState<Course | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [modulesRes, quizzesRes, courseRes] = await Promise.all([
                    api.get(`/api/courses/${id}/modules/`),
                    api.get('/api/quizzes/', { params: { course_id: id } }),
                    api.get(`/api/courses/${id}`)
                ]);
                setModules(modulesRes.data);
                setQuizzes(quizzesRes.data);
                setCourse(courseRes.data);
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

            <h1 className="text-3xl font-bold text-white mb-2">{course?.title || 'Zawartość kursu'}</h1>

            {course && isStudent && (
                <Card className="border-l-4 border-l-indigo-500">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-slate-900">Twój postęp</span>
                        <span className="text-indigo-400 font-bold">{course.progress}%</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2.5">
                        <div
                            className="bg-indigo-600 h-2.5 rounded-full transition-all duration-500"
                            style={{ width: `${course.progress}%` }}
                        ></div>
                    </div>
                </Card>
            )}

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
                                        <div className="flex items-center gap-4 mb-4">
                                            <div className="flex-shrink-0">
                                                {module.photo_url ? (
                                                    <img
                                                        src={module.photo_url}
                                                        alt={module.name}
                                                        className="max-w-[80px] md:max-w-[120px] w-[48px] h-auto rounded-lg border border-slate-200"
                                                    />
                                                ) : (
                                                    <div className="p-3 rounded-lg bg-indigo-500/20 text-indigo-400">
                                                        <FileText className="w-6 h-6" />
                                                    </div>
                                                )}
                                            </div>
                                            <div>
                                                <h3 className="text-xl font-medium text-slate-900">{module.name}</h3>
                                                <p className="text-sm text-slate-500">Moduł</p>
                                            </div>
                                        </div>
                                        <div className="text-slate-600 prose prose-sm max-w-none">
                                            {module.content}
                                        </div>
                                        {isStudent && (
                                            <div className="mt-4 flex justify-end">
                                                <Button
                                                    size="sm"
                                                    variant={module.completed ? "secondary" : "primary"}
                                                    onClick={async () => {
                                                        if (module.completed) return; // Already done
                                                        try {
                                                            await api.post(`/api/courses/${id}/modules/${module.id}/mark_completed/`);
                                                            // Refresh data to update progress and module status
                                                            // For simplicity: reload page or refetch. 
                                                            // Better: local update
                                                            setModules(prev => prev.map(m => m.id === module.id ? { ...m, completed: true } : m));
                                                            // Also refetch course for progress
                                                            const cRes = await api.get(`/api/courses/${id}/`);
                                                            setCourse(cRes.data);
                                                        } catch (err) {
                                                            console.error("Failed to mark completed", err);
                                                        }
                                                    }}
                                                    disabled={module.completed}
                                                    leftIcon={module.completed ? <CheckCircle className="w-4 h-4" /> : undefined}
                                                >
                                                    {module.completed ? "Ukończono" : "Oznacz jako zakończone"}
                                                </Button>
                                            </div>
                                        )}
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
