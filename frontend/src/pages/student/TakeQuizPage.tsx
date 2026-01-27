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
    type: 'multiple_choice' | 'open_ended';
    options?: QuestionOption[];
}

export const TakeQuizPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [questions, setQuestions] = useState<Question[]>([]);
    const [answers, setAnswers] = useState<Record<number, string | number>>({});
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const [quizDetails, setQuizDetails] = useState<{ show_correct_answers_on_completion: boolean } | null>(null);

    useEffect(() => {
        const fetchQuiz = async () => {
            try {
                const [questionsRes, quizRes] = await Promise.all([
                    api.get(`/api/quizzes/${id}/questions/`),
                    api.get(`/api/quizzes/${id}/`)
                ]);
                setQuestions(questionsRes.data);
                setQuizDetails(quizRes.data);
            } catch (error) {
                console.error("Failed to load quiz", error);
            } finally {
                setLoading(false);
            }
        };
        fetchQuiz();
    }, [id]);

    const handleAnswer = (value: string | number) => {
        const currentQ = questions[currentQuestionIndex];
        setAnswers(prev => ({
            ...prev,
            [currentQ.id]: value
        }));
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

    const handleSubmit = async () => {
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
            alert("Failed to submit quiz. Please try again.");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div className="text-white text-center mt-10">Loading quiz...</div>;
    if (questions.length === 0) return <div className="text-white text-center mt-10">No questions in this quiz.</div>;

    if (submitted) {
        return (
            <div className="max-w-2xl mx-auto text-center space-y-6 animate-fade-in my-12">
                <Card>
                    <div className="flex flex-col items-center gap-4 py-8">
                        <div className="w-16 h-16 rounded-full bg-green-50 text-green-500 flex items-center justify-center">
                            <CheckCircle className="w-8 h-8" />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900">Quiz Submitted!</h2>
                        <p className="text-slate-500">Your answers have been recorded.</p>
                        <div className="flex gap-4">
                            <Button onClick={() => navigate('/dashboard')} variant="secondary">
                                Return to Dashboard
                            </Button>
                            {quizDetails?.show_correct_answers_on_completion && (
                                <Button onClick={() => navigate(`/quiz/${id}/review`)}>
                                    Review Answers
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
                    <h1 className="text-2xl font-bold">Quiz Session</h1>
                    <p className="text-slate-500 text-sm">Question {currentQuestionIndex + 1} of {questions.length}</p>
                </div>
                <div className="flex items-center gap-2 text-amber-500">
                    <Clock className="w-5 h-5" />
                    <span className="font-mono">Time Remaining: --:--</span>
                </div>
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
                    <h2 className="text-xl font-medium text-slate-900">{currentQuestion.text}</h2>

                    <div className="space-y-3">
                        {currentQuestion.type === 'multiple_choice' && currentQuestion.options?.map((option) => (
                            <div
                                key={option.id}
                                onClick={() => handleAnswer(option.id)}
                                className={`
                                    p-4 rounded-lg border cursor-pointer transition-all flex items-center
                                    ${answers[currentQuestion.id] === option.id
                                        ? 'bg-indigo-50 border-indigo-500 text-indigo-700'
                                        : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-300 hover:bg-slate-50'}
                                `}
                            >
                                <div className={`
                                    w-5 h-5 rounded-full border mr-3 flex items-center justify-center
                                    ${answers[currentQuestion.id] === option.id ? 'border-indigo-600 bg-indigo-600' : 'border-slate-300'}
                                `}>
                                    {answers[currentQuestion.id] === option.id && <div className="w-2 h-2 rounded-full bg-white" />}
                                </div>
                                {option.text}
                            </div>
                        ))}

                        {currentQuestion.type === 'open_ended' && (
                            <textarea
                                className="w-full h-32 bg-white border border-slate-200 rounded-lg p-4 text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none resize-none placeholder-slate-400"
                                placeholder="Type your answer here..."
                                value={answers[currentQuestion.id] as string || ''}
                                onChange={(e) => handleAnswer(e.target.value)}
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
                        Previous
                    </Button>

                    {currentQuestionIndex === questions.length - 1 ? (
                        <Button onClick={handleSubmit} isLoading={submitting} className="bg-green-600 hover:bg-green-700">
                            Submit Quiz
                        </Button>
                    ) : (
                        <Button onClick={handleNext}>
                            Next Question
                        </Button>
                    )}
                </div>
            </Card>
        </div>
    );
};
