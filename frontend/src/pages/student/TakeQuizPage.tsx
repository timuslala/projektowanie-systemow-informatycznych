import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Clock, CheckCircle } from 'lucide-react';
import api from '../../services/api';

interface QuestionOption {
    id: number;
    text: string;
}

interface Question {
    id: number;
    text: string;
    is_open_ended: boolean;
    type: 'single_choice' | 'multiple_choice' | 'open';
    options?: QuestionOption[];
}

export const TakeQuizPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [questions, setQuestions] = useState<Question[]>([]);
    // Update answers state to allow storing arrays for multiple choice
    const [answers, setAnswers] = useState<Record<number, string | number | number[]>>({});
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    // Add time_limit_in_minutes to interface
    const [quizDetails, setQuizDetails] = useState<{
        show_correct_answers_on_completion: boolean;
        time_limit_in_minutes: number;
    } | null>(null);

    // Timer state
    const [timeLeft, setTimeLeft] = useState<number | null>(null);
    const [timeExpired, setTimeExpired] = useState(false);

    useEffect(() => {
        const fetchQuiz = async () => {
            try {
                const [questionsRes, quizRes] = await Promise.all([
                    api.get(`/api/quizzes/${id}/questions/`),
                    api.get(`/api/quizzes/${id}/`)
                ]);
                setQuestions(questionsRes.data);
                setQuizDetails(quizRes.data);

                // Initialize timer
                if (quizRes.data.time_limit_in_minutes) {
                    setTimeLeft(quizRes.data.time_limit_in_minutes * 60);
                }
            } catch (error) {
                console.error("Failed to load quiz", error);
            } finally {
                setLoading(false);
            }
        };
        fetchQuiz();
    }, [id]);

    useEffect(() => {
        if (timeLeft === null || submitted) return;

        if (timeLeft <= 0) {
            setTimeExpired(true);
            handleSubmit(true); // Auto submit
            return;
        }

        const timerId = setInterval(() => {
            setTimeLeft(prev => (prev !== null && prev > 0 ? prev - 1 : 0));
        }, 1000);

        return () => clearInterval(timerId);
    }, [timeLeft, submitted]);

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const handleAnswer = (value: string | number) => {
        if (timeExpired || submitted) return;

        const currentQ = questions[currentQuestionIndex];

        if (currentQ.type === 'multiple_choice') {
            setAnswers(prev => {
                const currentAns = (prev[currentQ.id] as number[]) || [];
                const val = value as number;
                if (currentAns.includes(val)) {
                    return { ...prev, [currentQ.id]: currentAns.filter(v => v !== val) };
                } else {
                    return { ...prev, [currentQ.id]: [...currentAns, val] };
                }
            });
        } else {
            setAnswers(prev => ({
                ...prev,
                [currentQ.id]: value
            }));
        }
    };

    const handleNext = () => {
        if (currentQuestionIndex < questions.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
        }
    };

    const handlePrev = () => {
        if (currentQuestionIndex > 0) {
            setCurrentQuestionIndex(prev => prev - 1);
        }
    };

    const handleSubmit = async (auto = false) => {
        if (submitting || (submitted && !auto)) return;

        setSubmitting(true);
        try {
            const formattedResponses = Object.entries(answers).map(([qId, val]) => ({
                question_id: parseInt(qId),
                answer: val
            }));

            await api.post(`/api/quizzes/${id}/submit/`, {
                responses: formattedResponses
            });
            setSubmitted(true);
        } catch (error) {
            console.error("Failed to submit quiz", error);
            if (!auto) alert("Failed to submit quiz. Please try again.");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div className="text-white text-center mt-10">Ładowanie quizu...</div>;
    if (questions.length === 0) return <div className="text-white text-center mt-10">Brak pytań w tym quizie.</div>;

    if (submitted) {
        return (
            <div className="max-w-2xl mx-auto text-center space-y-6 animate-fade-in my-12">
                <Card>
                    <div className="flex flex-col items-center gap-4 py-8">
                        <div className={`w-16 h-16 rounded-full flex items-center justify-center ${timeExpired ? 'bg-amber-50 text-amber-500' : 'bg-green-50 text-green-500'}`}>
                            {timeExpired ? <Clock className="w-8 h-8" /> : <CheckCircle className="w-8 h-8" />}
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900">
                            {timeExpired ? "Czas minął!" : "Quiz zatwierdzony!"}
                        </h2>
                        <p className="text-slate-500">
                            {timeExpired ? "Twój czas na rozwiązanie quizu dobiegł końca. Odpowiedzi zostały zapisane." : "Twoje odpowiedzi zostały zapisane."}
                        </p>
                        <div className="flex gap-4">
                            <Button onClick={() => navigate('/dashboard')} variant="secondary">
                                Powrót do panelu
                            </Button>
                            {quizDetails?.show_correct_answers_on_completion && (
                                <Button onClick={() => navigate(`/quiz/${id}/review`)}>
                                    Przejrzyj odpowiedzi
                                </Button>
                            )}
                        </div>
                    </div>
                </Card>
            </div>
        );
    }

    const currentQuestion = questions[currentQuestionIndex];
    const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

    return (
        <div className="max-w-3xl mx-auto space-y-8 animate-fade-in my-8">
            <div className="flex items-center justify-between text-slate-900">
                <div>
                    <h1 className="text-2xl font-bold">Sesja quizowa</h1>
                    <p className="text-slate-500 text-sm">Pytanie {currentQuestionIndex + 1} z {questions.length}</p>
                </div>
                {timeLeft !== null && (
                    <div className={`flex items-center gap-2 ${timeLeft < 60 ? 'text-red-500 animate-pulse' : 'text-amber-500'}`}>
                        <Clock className="w-5 h-5" />
                        <span className="font-mono">Pozostały czas: {formatTime(timeLeft)}</span>
                    </div>
                )}
            </div>

            {/* Progress Bar */}
            <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                <div
                    className="h-full bg-indigo-600 transition-all duration-300"
                    style={{ width: `${progress}%` }}
                />
            </div>

            <Card className="min-h-[400px] flex flex-col">
                <div className="flex-1 space-y-6">
                    <h2 className="text-xl font-medium text-slate-900">
                        {currentQuestion.text}
                        {currentQuestion.type === 'multiple_choice' && <span className="ml-2 text-sm text-slate-400 font-normal">(Wybierz wszystkie poprawne)</span>}
                    </h2>

                    <div className="space-y-3">
                        {(currentQuestion.type === 'single_choice' || currentQuestion.type === 'multiple_choice') && currentQuestion.options?.map((option) => {
                            const isSelected = currentQuestion.type === 'multiple_choice'
                                ? (answers[currentQuestion.id] as number[])?.includes(option.id)
                                : answers[currentQuestion.id] === option.id;

                            return (
                                <div
                                    key={option.id}
                                    onClick={() => handleAnswer(option.id)}
                                    className={`
                                        p-4 rounded-lg border cursor-pointer transition-all flex items-center
                                        ${isSelected
                                            ? 'bg-indigo-50 border-indigo-500 text-indigo-700'
                                            : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-300 hover:bg-slate-50'}
                                    `}
                                >
                                    <div className={`
                                        w-5 h-5 border mr-3 flex items-center justify-center
                                        ${currentQuestion.type === 'multiple_choice' ? 'rounded-md' : 'rounded-full'}
                                        ${isSelected ? 'border-indigo-600 bg-indigo-600' : 'border-slate-300'}
                                    `}>
                                        {isSelected && (
                                            currentQuestion.type === 'multiple_choice'
                                                ? <CheckCircle className="w-3 h-3 text-white" />
                                                : <div className="w-2 h-2 rounded-full bg-white" />
                                        )}
                                    </div>
                                    {option.text}
                                </div>
                            );
                        })}

                        {currentQuestion.type === 'open' && (
                            <textarea
                                className="w-full h-32 bg-white border border-slate-200 rounded-lg p-4 text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none resize-none placeholder-slate-400"
                                placeholder="Wpisz swoją odpowiedź..."
                                value={answers[currentQuestion.id] as string || ''}
                                onChange={(e) => handleAnswer(e.target.value)}
                                disabled={timeExpired || submitted}
                            />
                        )}
                    </div>
                </div>

                <div className="flex justify-between mt-8 pt-6 border-t border-slate-100">
                    <Button
                        variant="secondary"
                        onClick={handlePrev}
                        disabled={currentQuestionIndex === 0}
                    >
                        Poprzednie pytanie
                    </Button>

                    {currentQuestionIndex === questions.length - 1 ? (
                        <Button onClick={() => handleSubmit(false)} isLoading={submitting} disabled={timeExpired} className="bg-green-600 hover:bg-green-700">
                            Zatwierdź quiz
                        </Button>
                    ) : (
                        <Button onClick={handleNext}>
                            Następne pytanie
                        </Button>
                    )}
                </div>
            </Card>
        </div>
    );
};
