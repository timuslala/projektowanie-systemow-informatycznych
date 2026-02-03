import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { CheckCircle, XCircle, ArrowLeft } from 'lucide-react';
import api from '../../services/api';

interface QuestionOption {
    id: number;
    text: string;
    is_correct: boolean;
}

interface Question {
    id: number;
    text: string;
    type: 'single_choice' | 'multiple_choice' | 'open';
    options?: QuestionOption[];
    correct_panswer?: string; // For open ended
}

interface UserResponse {
    question_id: number;
    selected_option_id?: number;
    text_response?: string;
    is_correct: boolean;
}

interface QuizResult {
    quiz_title: string;
    score: number;
    total_questions: number;
    responses: UserResponse[];
    questions: Question[];
}

export const QuizReviewPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [result, setResult] = useState<QuizResult | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchReview = async () => {
            try {
                const response = await api.get(`/api/quizzes/${id}/review/`);
                setResult(response.data);
            } catch (error: any) {
                console.error("Failed to load quiz review", error);
                // Redirect if 403 or error (e.g. not finished or not allowed)
                // navigate('/dashboard'); // Optional: auto redirect
            } finally {
                setLoading(false);
            }
        };
        fetchReview();
    }, [id]);

    if (loading) return <div className="text-center mt-10 text-white">Wczytywanie wyników...</div>;
    if (!result) return <div className="text-center mt-10 text-slate-400">Nie udało się wczytać wyników (brak dostępu lub błąd).</div>;

    return (
        <div className="max-w-3xl mx-auto space-y-6 animate-fade-in my-8 pb-10">
            <Button
                variant="ghost"
                size="sm"
                leftIcon={<ArrowLeft className="w-4 h-4" />}
                onClick={() => navigate(-1)}
                className="mb-4"
            >
                Powrót
            </Button>

            <Card className="text-center py-8">
                <h1 className="text-3xl font-bold text-slate-900 mb-2">Przegląd odpowiedzi</h1>
                <h2 className="text-xl text-slate-600">{result.quiz_title}</h2>
                <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 rounded-full text-indigo-700 font-semibold">
                    Wynik: {result.score} / {result.total_questions}
                </div>
            </Card>

            <div className="space-y-6">
                {result.questions.map((question, index) => {
                    // Match response by question_id
                    const response = result.responses.find(r => r.question_id === question.id);
                    const isCorrect = response?.is_correct;

                    return (
                        <Card key={question.id} className={`flex flex-col gap-4 border-l-4 ${isCorrect ? 'border-l-green-500' : 'border-l-red-500'}`}>
                            <h3 className="text-lg font-medium text-slate-900">
                                {index + 1}. {question.text}
                            </h3>

                            <div className="space-y-2">
                                {/* Only show choices if closed */}
                                {(question.type === 'single_choice' || question.type === 'multiple_choice') && (
                                    <div className="space-y-2 ml-4">
                                        {question.options?.map(opt => {
                                            const isSelected = response?.selected_option_id === opt.id;
                                            const isCorrectOption = opt.is_correct;

                                            let optionClass = "p-3 rounded-lg border flex justify-between items-center ";
                                            if (isSelected && isCorrectOption) optionClass += "bg-green-50 border-green-500 text-green-700";
                                            else if (isSelected && !isCorrectOption) optionClass += "bg-red-50 border-red-500 text-red-700";
                                            else if (isCorrectOption) optionClass += "bg-indigo-50 border-indigo-500 text-indigo-700"; // Show correct answer if missed
                                            else optionClass += "bg-white border-slate-200 text-slate-600 opacity-70";

                                            return (
                                                <div key={opt.id} className={optionClass}>
                                                    <span>{opt.text}</span>
                                                    {isSelected && isCorrectOption && <CheckCircle className="w-5 h-5 text-green-500 ms-2" />}
                                                    {isSelected && !isCorrectOption && <XCircle className="w-5 h-5 text-red-500 ms-2" />}
                                                    {!isSelected && isCorrectOption && <CheckCircle className="w-5 h-5 text-indigo-500 ms-2" />}
                                                </div>
                                            )
                                        })}
                                    </div>
                                )}

                                {question.type === 'open' && (
                                    <div className="ml-4 p-4 bg-slate-50 rounded-lg">
                                        <p className="text-sm text-slate-500 mb-1">Twoja odpowiedź:</p>
                                        <p className="text-slate-900 italic">{response?.text_response || "(Brak odpowiedzi)"}</p>
                                        {/* TODO: Show correct answer for open ended if available */}
                                    </div>
                                )}
                            </div>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
};
