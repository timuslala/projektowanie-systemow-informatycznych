
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { ArrowLeft, Clock, FileText, Trash, Edit, Check } from 'lucide-react';

interface QuestionOption {
    id: number;
    text: string;
}

interface Question {
    id: number;
    text: string;
    type: 'multiple_choice' | 'open_ended';
    is_open_ended: boolean;
    options?: QuestionOption[];
    correct_option?: number; // 1-based index from backend
}

interface Quiz {
    id: number;
    title: string;
    description: string;
    time_limit_in_minutes: number;
    course: number;
    question_banks: number[];
    randomize_question_order: boolean;
    show_correct_answers_on_completion: boolean;
}

interface QuestionBank {
    id: number;
    title: string;
}

interface BankWithQuestions {
    bank: QuestionBank;
    questions: Question[];
}

export const QuizDetailsPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [quiz, setQuiz] = useState<Quiz | null>(null);
    const [loading, setLoading] = useState(true);

    // Grouped Questions State
    const [groupedQuestions, setGroupedQuestions] = useState<BankWithQuestions[]>([]);

    // Edit Modal State
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [allBanks, setAllBanks] = useState<QuestionBank[]>([]);
    const [editForm, setEditForm] = useState({
        title: '',
        description: '',
        timeLimit: 30,
        selectedBanks: [] as number[]
    });

    useEffect(() => {
        const fetchQuizData = async () => {
            try {
                // 1. Fetch Quiz and All Banks (for edit selection)
                const [quizRes, banksRes] = await Promise.all([
                    api.get(`/api/quizzes/${id}/`),
                    api.get('/api/question_banks/') // Fetch all for the edit modal
                ]);

                const quizData = quizRes.data;
                const allBanksData = banksRes.data;

                setQuiz(quizData);
                setAllBanks(allBanksData);
                setEditForm({
                    title: quizData.title,
                    description: quizData.description,
                    timeLimit: quizData.time_limit_in_minutes,
                    selectedBanks: quizData.question_banks || []
                });

                // 2. Fetch questions for each bank used in the quiz
                const questionBankIds = quizData.question_banks || [];
                const groups: BankWithQuestions[] = [];

                await Promise.all(questionBankIds.map(async (bankId: number) => {
                    try {
                        // Find bank details from the already fetched allBanks logic, or fetch if needed.
                        // We have allBanksData, so we can just find it.
                        const bank = allBanksData.find((b: QuestionBank) => b.id === bankId);

                        // Fetch questions for this bank
                        const questionsRes = await api.get(`/api/question_banks/${bankId}/questions/`);

                        if (bank) {
                            groups.push({
                                bank: bank,
                                questions: questionsRes.data
                            });
                        }
                    } catch (err) {
                        console.error(`Failed to fetch questions for bank ${bankId}`, err);
                    }
                }));

                setGroupedQuestions(groups);

            } catch (error) {
                console.error("Failed to load quiz details", error);
            } finally {
                setLoading(false);
            }
        };
        fetchQuizData();
    }, [id]);

    const handleUpdateQuiz = async () => {
        if (!quiz) return;
        try {
            const response = await api.put(`/api/quizzes/${id}/`, {
                ...quiz,
                title: editForm.title,
                description: editForm.description,
                time_limit_in_minutes: editForm.timeLimit,
                question_banks: editForm.selectedBanks
            });

            setQuiz(response.data);
            setIsEditOpen(false);
            // Reload to refresh grouped questions
            window.location.reload();
        } catch (error) {
            console.error("Failed to update quiz", error);
        }
    };

    const handleDelete = async () => {
        if (!window.confirm("Are you sure you want to delete this quiz?")) return;
        try {
            await api.delete(`/api/quizzes/${id}/`);
            navigate('/quizzes');
        } catch (error) {
            console.error("Failed to delete quiz", error);
        }
    };

    const toggleBankSelection = (bankId: number) => {
        setEditForm(prev => {
            const current = prev.selectedBanks;
            if (current.includes(bankId)) {
                return { ...prev, selectedBanks: current.filter(id => id !== bankId) };
            } else {
                return { ...prev, selectedBanks: [...current, bankId] };
            }
        });
    };

    if (loading) {
        return <div className="text-slate-500 text-center mt-10">Wczytuję szczegóły quizu...</div>;
    }

    if (!quiz) {
        return <div className="text-slate-500 text-center mt-10">Quiz nie został znaleziony.</div>;
    }

    return (
        <div className="space-y-8 animate-fade-in max-w-[1000px] mx-auto py-8 px-4 relative">
            {/* Edit Modal */}
            {isEditOpen && (
                <div className="fixed inset-0 z-50 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4 text-center">
                        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity" onClick={() => setIsEditOpen(false)} />

                        <div className="relative w-full max-w-lg transform overflow-hidden rounded-2xl bg-white border border-slate-200 p-6 text-left align-middle shadow-xl transition-all">
                            <h2 className="text-xl font-bold text-slate-900 mb-6">Edytuj quiz</h2>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Tytuł</label>
                                    <input
                                        className="w-full px-4 py-2 bg-white border border-slate-300 rounded-md text-slate-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                                        value={editForm.title}
                                        onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Opis</label>
                                    <input
                                        className="w-full px-4 py-2 bg-white border border-slate-300 rounded-md text-slate-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                                        value={editForm.description}
                                        onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Limit czasu (minuty)</label>
                                    <input
                                        type="number"
                                        className="w-full px-4 py-2 bg-white border border-slate-300 rounded-md text-slate-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                                        value={editForm.timeLimit}
                                        onChange={(e) => setEditForm({ ...editForm, timeLimit: parseInt(e.target.value) })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Banki pytań</label>
                                    <div className="max-h-40 overflow-y-auto border border-slate-300 rounded-md p-2 space-y-2">
                                        {allBanks.map(bank => (
                                            <div
                                                key={bank.id}
                                                className={`flex items-center justify-between p-2 rounded cursor-pointer transition-colors ${editForm.selectedBanks.includes(bank.id) ? 'bg-indigo-50 border border-indigo-200' : 'hover:bg-slate-50'}`}
                                                onClick={() => toggleBankSelection(bank.id)}
                                            >
                                                <span className="text-sm text-slate-700">{bank.title}</span>
                                                {editForm.selectedBanks.includes(bank.id) && <Check className="w-4 h-4 text-indigo-600" />}
                                            </div>
                                        ))}
                                    </div>
                                    <p className="text-xs text-slate-500 mt-1">{editForm.selectedBanks.length} banków pytań wybranych</p>
                                </div>
                                <div className="flex justify-end gap-3 pt-4">
                                    <Button variant="ghost" onClick={() => setIsEditOpen(false)} className="text-slate-600 hover:text-slate-900">Anuluj</Button>
                                    <Button onClick={handleUpdateQuiz}>Zapisz zmiany</Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <Button
                variant="ghost"
                size="sm"
                leftIcon={<ArrowLeft className="w-4 h-4" />}
                onClick={() => navigate('/dashboard')}
                className="text-slate-500 hover:text-indigo-600"
            >
                Powrót do panelu
            </Button>

            <div className="flex flex-col md:flex-row justify-between md:items-start gap-6">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 mb-2">{quiz.title}</h1>
                    <p className="text-slate-500 max-w-2xl">{quiz.description || "Brak opisu."}</p>

                    <div className="flex flex-wrap gap-4 mt-4">
                        <div className="flex items-center gap-2 text-sm text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full">
                            <Clock className="w-4 h-4" />
                            <span>{quiz.time_limit_in_minutes} minut</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full">
                            <span>Id kursu: {quiz.course}</span>
                        </div>
                    </div>
                </div>

                <div className="flex gap-3">
                    <Button
                        variant="outline"
                        leftIcon={<Edit className="w-4 h-4" />}
                        onClick={() => setIsEditOpen(true)}
                    >
                        Edytuj quiz
                    </Button>
                    <Button
                        variant="danger"
                        leftIcon={<Trash className="w-4 h-4" />}
                        onClick={handleDelete}
                    >
                        Usuń quiz
                    </Button>
                </div>
            </div>

            <div className="space-y-8">
                <h2 className="text-xl font-semibold text-slate-900 border-b border-slate-200 pb-2">
                    Podgląd pytań
                </h2>

                {groupedQuestions.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-lg border border-slate-200 border-dashed">
                        <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                        <p className="text-slate-500">Brak pytań w tym quizie.</p>
                    </div>
                ) : (
                    groupedQuestions.map((group, groupIdx) => (
                        <div key={groupIdx} className="space-y-4">
                            <h3 className="text-lg font-medium text-indigo-600 flex items-center gap-2 bg-indigo-50 px-4 py-2 rounded-lg w-fit">
                                <FileText className="w-4 h-4" />
                                {group.bank.title}
                            </h3>

                            <div className="grid gap-4">
                                {group.questions.map((q, idx) => (
                                    <Card key={q.id} className="p-6">
                                        <div className="flex gap-4">
                                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center font-bold text-sm">
                                                {idx + 1}
                                            </div>
                                            <div className="flex-1 space-y-3">
                                                <div className="flex justify-between items-start">
                                                    <p className="font-medium text-slate-900 text-lg">{q.text}</p>
                                                    <span className="text-xs font-medium px-2 py-1 rounded bg-slate-100 text-slate-500 uppercase tracking-wider">
                                                        {q.type === 'multiple_choice' ? 'Wielokrotnego wyboru' : 'Jednokrotnego wyboru'}
                                                    </span>
                                                </div>

                                                {q.type === 'multiple_choice' && q.options && (
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                                                        {q.options.map((opt, optIdx) => {
                                                            const isCorrect = q.correct_option === optIdx + 1;
                                                            return (
                                                                <div
                                                                    key={optIdx}
                                                                    className={`flex items-center gap-3 p-3 rounded border transition-colors ${isCorrect
                                                                        ? 'border-emerald-300 bg-emerald-50'
                                                                        : 'border-slate-200 bg-slate-50/50'
                                                                        }`}
                                                                >
                                                                    <div className={`w-6 h-6 rounded-full border flex items-center justify-center text-xs ${isCorrect
                                                                        ? 'border-emerald-500 text-emerald-600 font-bold bg-white'
                                                                        : 'border-slate-300 text-slate-400'
                                                                        }`}>
                                                                        {String.fromCharCode(65 + optIdx)}
                                                                    </div>
                                                                    <span className={isCorrect ? 'text-emerald-900 font-medium' : 'text-slate-700'}>
                                                                        {opt.text}
                                                                        {isCorrect && <span className="ml-2 text-xs text-emerald-600 font-normal">(Poprawna)</span>}
                                                                    </span>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}

                                                {q.type === 'open_ended' && (
                                                    <div className="w-full h-24 bg-slate-50 border border-slate-200 rounded p-4 text-slate-400 italic text-sm">
                                                        Uczeń wpisze swoją odpowiedź tutaj...
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </Card>
                                ))}
                                {group.questions.length === 0 && (
                                    <p className="text-slate-400 text-sm italic ml-4">Ten bank pytań jest pusty.</p>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};
