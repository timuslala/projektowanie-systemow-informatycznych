import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { ArrowLeft, CheckCircle, XCircle, Save, MessageSquare } from 'lucide-react';
import api from '../../services/api';

interface QuestionOption {
    id: number;
    text: string;
    is_correct: boolean;
}

interface UserResponse {
    response_id: number;
    question_id: number;
    selected_option_id?: number;
    text_response?: string;
    is_correct: boolean;
    points: number;
    instructor_comment?: string;
}

interface Question {
    id: number;
    text: string;
    type: 'single_choice' | 'multiple_choice' | 'open';
    options?: QuestionOption[];
    correct_answer?: string;
}

interface QuizSubmissionDetails {
    quiz_title: string;
    student_name: string;
    score: number;
    total_questions: number;
    responses: UserResponse[];
    questions: Question[];
}

export const GradeSubmissionPage = () => {
    const { id, userId } = useParams();
    const navigate = useNavigate();
    const [details, setDetails] = useState<QuizSubmissionDetails | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState<{ [key: number]: boolean }>({});

    // Local state for edits before save
    const [edits, setEdits] = useState<{ [responseId: number]: { points: number, comment: string } }>({});

    useEffect(() => {
        const fetchDetails = async () => {
            try {
                const response = await api.get(`/api/quizzes/${id}/submissions/${userId}/`);
                setDetails(response.data);

                // Initialize edits state with existing values
                const initialEdits: any = {};
                response.data.responses.forEach((r: UserResponse) => {
                    initialEdits[r.response_id] = {
                        points: r.points,
                        comment: r.instructor_comment || ''
                    };
                });
                setEdits(initialEdits);

            } catch (error) {
                console.error("Failed to fetch submission details", error);
            } finally {
                setLoading(false);
            }
        };
        fetchDetails();
    }, [id, userId]);

    const handlePointChange = (responseId: number, points: string) => {
        setEdits(prev => ({
            ...prev,
            [responseId]: {
                ...prev[responseId],
                points: parseFloat(points) || 0
            }
        }));
    };

    const handleCommentChange = (responseId: number, comment: string) => {
        setEdits(prev => ({
            ...prev,
            [responseId]: {
                ...prev[responseId],
                comment
            }
        }));
    };

    const handleSave = async (responseId: number) => {
        setSaving(prev => ({ ...prev, [responseId]: true }));
        try {
            const data = edits[responseId];
            await api.post(`/api/quizzes/grade_response/${responseId}/`, {
                points: data.points,
                comment: data.comment
            });
            // Show success indicator briefly? or just stop loading
        } catch (error) {
            console.error("Failed to save grade", error);
            alert("Błąd podczas zapisywania oceny.");
        } finally {
            setSaving(prev => ({ ...prev, [responseId]: false }));
        }
    };

    if (loading) return <div className="text-center mt-10 text-slate-500">Wczytywanie odpowiedzi...</div>;
    if (!details) return <div className="text-center mt-10 text-slate-500">Nie znaleziono szczegółów.</div>;

    return (
        <div className="max-w-4xl mx-auto space-y-6 animate-fade-in my-8 px-4 pb-20">
            <Button
                variant="ghost"
                size="sm"
                leftIcon={<ArrowLeft className="w-4 h-4" />}
                onClick={() => navigate(`/quizzes/${id}/submissions`)}
                className="mb-4"
            >
                Powrót do listy prac
            </Button>

            <Card className="mb-6">
                <h1 className="text-2xl font-bold text-slate-900 mb-2">Ocenianie pracy</h1>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-slate-600">
                    <div>
                        <span className="font-semibold text-slate-800">Quiz:</span> {details.quiz_title}
                    </div>
                    <div>
                        <span className="font-semibold text-slate-800">Student:</span> {details.student_name}
                    </div>
                    <div>
                        <span className="font-semibold text-slate-800">Aktualny wynik:</span> {Object.values(edits).reduce((sum, curr) => sum + curr.points, 0).toFixed(2)} pkt
                    </div>
                </div>
            </Card>

            <div className="space-y-8">
                {details.questions.map((question, index) => {
                    const response = details.responses.find(r => r.question_id === question.id);
                    const responseId = response?.response_id;
                    if (!responseId) return null; // Should not happen if filtered correctly

                    const editState = edits[responseId] || { points: 0, comment: '' };

                    return (
                        <Card key={question.id} className="border border-slate-200 shadow-sm relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>
                            <div className="pl-4">
                                <h3 className="text-lg font-medium text-slate-900 mb-4">
                                    <span className="text-slate-400 mr-2">{index + 1}.</span>
                                    {question.text}
                                </h3>

                                <div className="mb-6">
                                    {(question.type === 'single_choice' || question.type === 'multiple_choice') && (
                                        <div className="space-y-2 ml-4">
                                            {question.options?.map(opt => {
                                                const isSelected = response?.selected_option_id === opt.id;
                                                const isCorrectOption = opt.is_correct;

                                                let optionClass = "p-3 rounded-lg border flex justify-between items-center ";
                                                if (isSelected && isCorrectOption) optionClass += "bg-green-50 border-green-500 text-green-700";
                                                else if (isSelected && !isCorrectOption) optionClass += "bg-red-50 border-red-500 text-red-700";
                                                else if (isCorrectOption) optionClass += "bg-indigo-50 border-indigo-500 text-indigo-700";
                                                else optionClass += "bg-white border-slate-200 text-slate-600 opacity-60";

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
                                        <div className="ml-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                                            <p className="text-sm text-slate-500 mb-1 uppercase tracking-wider font-semibold">Odpowiedź studenta:</p>
                                            <p className="text-slate-900 whitespace-pre-wrap">{response?.text_response || "(Brak odpowiedzi)"}</p>
                                        </div>
                                    )}
                                </div>

                                <div className="ml-4 pt-4 border-t border-slate-100 grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Punkty</label>
                                        <input
                                            type="number"
                                            step="0.5"
                                            className="w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                                            value={editState.points}
                                            onChange={(e) => handlePointChange(responseId, e.target.value)}
                                        />
                                    </div>
                                    <div className="md:col-span-8">
                                        <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-1">
                                            <MessageSquare className="w-3 h-3" /> Komentarz nauczyciela
                                        </label>
                                        <textarea
                                            rows={2}
                                            className="w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                                            placeholder="Dodaj komentarz do odpowiedzi..."
                                            value={editState.comment}
                                            onChange={(e) => handleCommentChange(responseId, e.target.value)}
                                        />
                                    </div>
                                    <div className="md:col-span-2 flex items-end h-full pb-1">
                                        <Button
                                            size="sm"
                                            onClick={() => handleSave(responseId)}
                                            className="w-full"
                                            disabled={saving[responseId]}
                                        >
                                            {saving[responseId] ? 'Zapisywanie...' : (
                                                <>
                                                    <Save className="w-4 h-4 mr-1" /> Zapisz
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
};
