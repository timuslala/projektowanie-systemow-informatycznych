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
    type: 'multiple_choice' | 'open_ended';
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
                // Mocking the endpoint structure for now as it might not depend on exact backend implementation yet
                // Ideally: GET /api/quizzes/{id}/review/
                const response = await api.get(`/api/quizzes/${id}/review/`);
                setResult(response.data);
            } catch (error) {
                console.error("Failed to load quiz review", error);
            } finally {
                setLoading(false);
            }
        };
        fetchReview();
    }, [id]);

    if (loading) return <div className="text-center mt-10 text-slate-500">Loading review...</div>;
    if (!result) return <div className="text-center mt-10 text-slate-500">Failed to load review.</div>;

    return (
        <div className="max-w-3xl mx-auto space-y-6 animate-fade-in my-8">
            <Button
                variant="ghost"
                size="sm"
                leftIcon={<ArrowLeft className="w-4 h-4" />}
                onClick={() => navigate('/dashboard')}
                className="mb-4"
            >
                Back to Dashboard
            </Button>

            <Card className="text-center py-8">
                <h1 className="text-3xl font-bold text-slate-900 mb-2">Przegląd odpowiedzi - {result.quiz_title}</h1>
            </Card>

            <div className="space-y-6">
                {result.questions.map((question, index) => {
                    const response = result.responses.find(r => r.question_id === question.id);
                    const isCorrect = response?.is_correct;

                    return (
                        <Card key={question.id} className="flex flex-col gap-4">
                            <h3 className="text-lg font-medium text-slate-900">
                                {index + 1}. {question.text}
                            </h3>

                            <div className="space-y-2">
                                {/* User Answer Display */}
                                <div className="flex items-center gap-2">
                                    {isCorrect ? (
                                        <CheckCircle className="w-5 h-5 text-green-500" />
                                    ) : (
                                        <XCircle className="w-5 h-5 text-red-500" />
                                    )}
                                    <span className={isCorrect ? "text-green-600 font-medium" : "text-red-500"}>
                                        {question.type === 'multiple_choice'
                                            ? question.options?.find(o => o.id === response?.selected_option_id)?.text || "No answer"
                                            : response?.text_response || "No answer"}
                                    </span>
                                    {!isCorrect && <span className="text-xs text-red-400 ml-2">(Twoja odpowiedź)</span>}
                                </div>

                                {/* Correct Answer Display (if wrong) */}
                                {!isCorrect && (
                                    <div className="flex items-center gap-2 mt-2">
                                        <CheckCircle className="w-5 h-5 text-indigo-500" />
                                        <span className="text-indigo-600 font-medium">
                                            {question.type === 'multiple_choice'
                                                ? question.options?.find(o => o.is_correct)?.text
                                                : question.correct_panswer}
                                        </span>
                                        <span className="text-xs text-indigo-400 ml-2">(Prawidłowa odpowiedź)</span>
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
