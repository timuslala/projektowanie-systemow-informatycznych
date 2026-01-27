import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, X } from 'lucide-react';
import api from '../../services/api';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';

interface Question {
    id: number;
    text: string;
    type: 'open' | 'closed';
    options?: string[]; // simplified for display
    correctOption?: number;
    question_bank: number;
}

interface QuestionBank {
    id: number;
    title: string;
}

export const QuestionBankDetailsPage = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [bank, setBank] = useState<QuestionBank | null>(null);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [loading, setLoading] = useState(true);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newQuestionText, setNewQuestionText] = useState('');
    const [newQuestionType, setNewQuestionType] = useState<'open' | 'closed'>('open');
    const [isMultipleChoice, setIsMultipleChoice] = useState(false);
    // For closed questions
    const [option1, setOption1] = useState('');
    const [option2, setOption2] = useState('');
    const [option3, setOption3] = useState('');
    const [option4, setOption4] = useState('');
    const [correctOption, setCorrectOption] = useState(0); // 0-3 index
    const [correctOptionIndices, setCorrectOptionIndices] = useState<number[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            if (!id) return;
            try {
                const [bankRes, questionsRes] = await Promise.all([
                    api.get(`/api/question_banks/${id}/`),
                    api.get(`/api/question_banks/${id}/questions/`)
                ]);
                setBank(bankRes.data);
                setQuestions(questionsRes.data);
            } catch (error) {
                console.error("Failed to fetch data", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [id]);

    const handleAddQuestion = async () => {
        if (!id) return;
        try {
            const payload: any = {
                text: newQuestionText,
                type: newQuestionType,
                question_bank: parseInt(id),
                isMultipleChoice: newQuestionType === 'closed' ? isMultipleChoice : false
            };

            if (newQuestionType === 'closed') {
                payload.options = [option1, option2, option3, option4];
                if (isMultipleChoice) {
                    payload.correctOptions = correctOptionIndices;
                    payload.correctOption = 0; // Fallback
                } else {
                    payload.correctOption = correctOption; // Backend expects 0-based in some views, let's verify. 
                }
                // Previous analysis of views.py showed it takes correctOption (0-based) and adds 1 for model.
                // So sending 0-based index is correct.
            }

            // We use the QuestionViewSet which is mapped to /api/questions/ usually, 
            // but we need to check if we should post to keys
            // The plan said POST to /api/questions/ with question_bank ID.

            await api.post('/api/questions/', payload);

            // Refresh questions or append
            // The response might be the created question.
            // Let's refetch to be safe or append if structure matches
            const questionsRes = await api.get(`/api/question_banks/${id}/questions/`);
            setQuestions(questionsRes.data);

            closeModal();
        } catch (error) {
            console.error("Failed to create question", error);
            alert("Failed to create question");
        }
    };

    const handleDeleteQuestion = async (questionId: number) => {
        if (!confirm("Are you sure you want to delete this question?")) return;
        try {
            await api.delete(`/api/questions/${questionId}/`);
            setQuestions(questions.filter(q => q.id !== questionId));
        } catch (error) {
            console.error("Failed to delete question", error);
            alert("Failed to delete question");
        }
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setNewQuestionText('');
        setNewQuestionType('open');
        setIsMultipleChoice(false);
        setOption1('');
        setOption2('');
        setOption3('');
        setOption4('');
        setCorrectOption(0);
        setCorrectOptionIndices([]);
    };

    if (loading) return <div className="text-center mt-10 text-slate-500">Wczytuję bank pytań...</div>;
    if (!bank) return <div className="text-center mt-10 text-slate-500">Bank pytań nie został znaleziony</div>;

    return (
        <div className="max-w-[1400px] min-h-screen mx-auto py-8 px-4 animate-fade-in space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" onClick={() => navigate('/question-banks')} leftIcon={<ArrowLeft className="w-4 h-4" />}>
                    Powrót
                </Button>
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">{bank.title}</h1>
                    <p className="text-slate-500">Zarządzaj pytaniami w tym banku</p>
                </div>
            </div>

            <div className="flex justify-end">
                <Button onClick={() => setIsModalOpen(true)} leftIcon={<Plus className="w-4 h-4" />}>
                    Dodaj pytanie
                </Button>
            </div>

            <div className="space-y-4">
                {questions.length === 0 ? (
                    <div className="p-12 border border-dashed border-slate-200 rounded-lg text-center text-slate-500 bg-white">
                        Brak pytań w tym banku. Dodaj pierwsze pytanie.
                    </div>
                ) : (
                    questions.map((q, idx) => (
                        <Card key={q.id || idx} className="group hover:border-indigo-300 transition-all">
                            <div className="flex justify-between items-start gap-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className={`text-xs px-2 py-0.5 rounded-full ${q.type === 'open' ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                            {q.type === 'open' ? 'Otwarte' : 'Wielokrotnego wyboru'}
                                        </span>
                                    </div>
                                    <h3 className="text-lg font-medium text-slate-900">{q.text}</h3>
                                    {/* Show options if closed? The listing endpoint might not return full details depending on serializer. 
                                        Assuming it does or we just show text. */}
                                </div>
                                <Button
                                    variant="danger" // Using danger variant which should be Red
                                    size="sm"
                                    onClick={() => handleDeleteQuestion(q.id)}
                                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </div>
                        </Card>
                    ))
                )}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4">
                        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity" onClick={closeModal} />
                        <div className="relative w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white border border-slate-200 p-6 shadow-xl transition-all">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-xl font-bold text-slate-900">Dodaj nowe pytanie</h2>
                                <button onClick={closeModal} className="text-slate-400 hover:text-slate-600">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Treść pytania</label>
                                    <textarea
                                        className="w-full px-4 py-2 bg-white border border-slate-300 rounded-md text-slate-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none h-24"
                                        value={newQuestionText}
                                        onChange={(e) => setNewQuestionText(e.target.value)}
                                        placeholder="Wprowadź treść pytania..."
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Typ pytania</label>
                                    <div className="flex gap-4">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="radio"
                                                name="type"
                                                value="open"
                                                checked={newQuestionType === 'open'}
                                                onChange={() => { setNewQuestionType('open'); setIsMultipleChoice(false); }}
                                                className="text-indigo-600 focus:ring-indigo-500"
                                            />
                                            <span className="text-slate-700">Otwarte</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="radio"
                                                name="type"
                                                value="closed"
                                                checked={newQuestionType === 'closed' && !isMultipleChoice}
                                                onChange={() => { setNewQuestionType('closed'); setIsMultipleChoice(false); }}
                                                className="text-indigo-600 focus:ring-indigo-500"
                                            />
                                            <span className="text-slate-700">Zamknięte (jednokrotnego)</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="radio"
                                                name="type"
                                                value="closed-multi"
                                                checked={newQuestionType === 'closed' && isMultipleChoice}
                                                onChange={() => { setNewQuestionType('closed'); setIsMultipleChoice(true); }}
                                                className="text-indigo-600 focus:ring-indigo-500"
                                            />
                                            <span className="text-slate-700">Zamknięte (wielokrotnego)</span>
                                        </label>
                                    </div>
                                </div>

                                {newQuestionType === 'closed' && (
                                    <div className="space-y-3 bg-slate-50 p-4 rounded-lg">
                                        <p className="text-sm font-medium text-slate-700">Opcje</p>
                                        <div className="grid gap-3">
                                            {[option1, option2, option3, option4].map((_, idx) => (
                                                <div key={idx} className="flex items-center gap-3">
                                                    <input
                                                        type={isMultipleChoice ? "checkbox" : "radio"}
                                                        name={isMultipleChoice ? `correctOption-${idx}` : "correctOption"}
                                                        checked={isMultipleChoice ? correctOptionIndices.includes(idx) : correctOption === idx}
                                                        onChange={(e) => {
                                                            if (isMultipleChoice) {
                                                                if (e.target.checked) {
                                                                    setCorrectOptionIndices([...correctOptionIndices, idx]);
                                                                } else {
                                                                    setCorrectOptionIndices(correctOptionIndices.filter(i => i !== idx));
                                                                }
                                                            } else {
                                                                setCorrectOption(idx);
                                                            }
                                                        }}
                                                    />
                                                    <input
                                                        className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-md text-slate-900 focus:border-indigo-500 outline-none text-sm"
                                                        placeholder={`Opcja ${idx + 1}`}
                                                        value={idx === 0 ? option1 : idx === 1 ? option2 : idx === 2 ? option3 : option4}
                                                        onChange={(e) => {
                                                            if (idx === 0) setOption1(e.target.value);
                                                            if (idx === 1) setOption2(e.target.value);
                                                            if (idx === 2) setOption3(e.target.value);
                                                            if (idx === 3) setOption4(e.target.value);
                                                        }}
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                        <p className="text-xs text-slate-500">Wybierz {isMultipleChoice ? "checkboxe" : "przycisk radio"} obok poprawnej odpowiedzi.</p>
                                    </div>
                                )}

                                <div className="flex justify-end gap-3 pt-4">
                                    <Button variant="ghost" onClick={closeModal}>Anuluj</Button>
                                    <Button onClick={handleAddQuestion} disabled={!newQuestionText}>Zapisz pytanie</Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
