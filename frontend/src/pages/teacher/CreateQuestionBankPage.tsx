import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Plus } from 'lucide-react';
import api from '../../services/api';

interface Question {
    id: string | number;
    text: string;
    type: 'closed' | 'open';
    options?: string[];
    correctOption?: number;
    tags?: string; // Comma separated
}

export const CreateQuestionBankPage = () => {
    const navigate = useNavigate();
    const [bankName, setBankName] = useState('');
    const [availableQuestions, setAvailableQuestions] = useState<Question[]>([]);
    const [bankQuestions, setBankQuestions] = useState<Question[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [tagsFilter, setTagsFilter] = useState('');

    useEffect(() => {
        fetchAvailableQuestions();
    }, [tagsFilter]);

    const fetchAvailableQuestions = async () => {
        try {
            // Fetch questions with tag filtering
            const params: any = {};
            if (tagsFilter) params.tags = tagsFilter;

            const response = await api.get('/api/questions/', { params });
            const APIData = response.data.results || response.data; // Handle pagination or list

            // Map Backend to Frontend Model
            const mappedQuestions: Question[] = APIData.map((q: any) => ({
                id: q.id,
                text: q.text,
                type: q.type === 'multiple_choice' ? 'closed' : 'open',
                options: q.options ? q.options.map((o: any) => o.text) : [],
                correctOption: q.correct_option ? q.correct_option - 1 : undefined, // Backend is 1-based
                tags: q.tags
            }));

            // Filter out questions already in the bank
            const bankIds = new Set(bankQuestions.map(bq => String(bq.id)));
            setAvailableQuestions(mappedQuestions.filter(q => !bankIds.has(String(q.id))));

        } catch (error) {
            console.error("Failed to fetch questions", error);
        }
    };

    // New Question Form State
    const [newQuestionText, setNewQuestionText] = useState('');
    const [newQuestionTags, setNewQuestionTags] = useState('');
    const [isOpenEnded, setIsOpenEnded] = useState(false);
    const [options, setOptions] = useState(['', '', '', '']);
    const [correctOptionIndex, setCorrectOptionIndex] = useState(0);

    const handleCreateBank = async () => {
        setLoading(true);
        try {
            // 1. Create Bank
            // Note: The backend expects nested question objects to CREATE them.
            // If we want to link existing questions, we might need to adjust the backend or 
            // accept that we are creating COPIES of the selected questions in the new bank.
            // For now, we send the question data as is, which will create copies linked to this bank.
            // This preserves the "Template" behavior.

            const payloadQuestions = bankQuestions.map(q => ({
                text: q.text,
                type: q.type === 'closed' ? 'closed' : 'open',
                options: q.options, // string[]
                correctOption: q.correctOption !== undefined ? q.correctOption : 0,
                tags: q.tags
            }));

            const response = await api.post('/api/question_banks/', { title: bankName, questions: payloadQuestions });
            const bankId = response.data.id;

            console.log("Bank created:", bankId);
            navigate('/dashboard');
        } catch (error) {
            console.error("Failed to create bank", error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddQuestionToBank = (question: Question) => {
        setBankQuestions([...bankQuestions, question]);
        setAvailableQuestions(availableQuestions.filter(q => q.id !== question.id));
    };

    const handleRemoveQuestionFromBank = (question: Question) => {
        setAvailableQuestions([...availableQuestions, question]);
        setBankQuestions(bankQuestions.filter(q => q.id !== question.id));
    };

    const handleCreateNewQuestion = async () => {
        try {
            const payload = {
                text: newQuestionText,
                type: isOpenEnded ? 'open' : 'closed', // 'open' maps to is_open_ended=True in backend view
                options: isOpenEnded ? [] : options,
                correctOption: isOpenEnded ? 0 : correctOptionIndex,
                tags: newQuestionTags
            };

            // Create question via API immediately
            const response = await api.post('/api/questions/', payload);
            const qData = response.data;

            const newQuestion: Question = {
                id: qData.id,
                text: qData.text,
                type: qData.type === 'multiple_choice' ? 'closed' : 'open',
                options: qData.options ? qData.options.map((o: any) => o.text) : [],
                correctOption: qData.correct_option ? qData.correct_option - 1 : undefined,
                tags: qData.tags
            };

            // Add to bank list (which means it will be copied into the bank upon save, 
            // or we could consider it "claimed" if we updated the logic, but copy is fine)
            setBankQuestions([...bankQuestions, newQuestion]);
            closeModal();
        } catch (error) {
            console.error("Failed to create question", error);
            // Optionally show error to user
        }
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setNewQuestionText('');
        setNewQuestionTags('');
        setIsOpenEnded(false);
        setOptions(['', '', '', '']);
        setCorrectOptionIndex(0);
    };

    return (
        <div className="max-w-[1400px] mx-auto py-8 animate-fade-in">
            <h1 className="text-3xl font-bold text-center text-slate-900 mb-8">Kreator banku pytań</h1>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* LEFT: Available Questions */}
                <Card className="h-full border border-slate-200">
                    <h2 className="text-lg font-bold text-slate-900 mb-6">Dostępne pytania</h2>

                    {/* Tag Filter */}
                    <input
                        className="w-full px-4 py-2 border border-slate-200 rounded-md outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 mb-4"
                        placeholder="Filtruj po tagach (np. word, english)..."
                        value={tagsFilter}
                        onChange={(e) => setTagsFilter(e.target.value)}
                    />

                    <div className="space-y-4 max-h-[500px] overflow-y-auto">
                        {availableQuestions.map(q => (
                            <div key={q.id} className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-lg hover:border-blue-300 transition-colors">
                                <span className="text-slate-700">{q.text}</span>
                                <div className="flex gap-2">
                                    <Button
                                        size="sm"
                                        className="bg-red-600 hover:bg-red-700 w-8 h-8 p-0 flex items-center justify-center rounded-md"
                                    >
                                        -
                                    </Button>
                                    <Button
                                        size="sm"
                                        onClick={() => handleAddQuestionToBank(q)}
                                        className="bg-blue-100 hover:bg-blue-200 text-blue-700 w-full px-3"
                                    >
                                        Dodaj
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>

                {/* RIGHT: Bank Details & Questions */}
                <div className="space-y-6">
                    <Card className="border border-slate-200">
                        <h2 className="text-lg font-bold text-slate-900 mb-6">Bank pytań</h2>

                        <div className="mb-6">
                            <label className="block text-sm font-medium text-slate-700 mb-2">Nazwa</label>
                            <input
                                className="w-full px-4 py-2 border border-slate-200 rounded-md outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                placeholder="Wprowadź nazwę banku pytań"
                                value={bankName}
                                onChange={(e) => setBankName(e.target.value)}
                            />
                        </div>

                        <div className="space-y-4">
                            {bankQuestions.map((q, idx) => (
                                <div key={q.id} className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-lg">
                                    <div className="flex gap-3">
                                        <span className="text-slate-500 font-medium">{idx + 1}.</span>
                                        <span className="text-slate-700">{q.text}</span>
                                    </div>
                                    <Button
                                        size="sm"
                                        onClick={() => handleRemoveQuestionFromBank(q)}
                                        className="bg-red-600 hover:bg-red-700 px-4"
                                    >
                                        Usuń
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </Card>

                    <div className="flex justify-between items-center">
                        <Button
                            onClick={() => setIsModalOpen(true)}
                            className="bg-blue-600 hover:bg-blue-700"
                            leftIcon={<Plus className="w-4 h-4" />}
                        >
                            Utwórz nowe pytanie
                        </Button>

                        <Button
                            onClick={handleCreateBank}
                            isLoading={loading}
                            className="bg-blue-600 hover:bg-blue-700 px-8"
                        >
                            Zapisz
                        </Button>
                    </div>
                </div>
            </div>

            {/* Create Question Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl animate-fade-in overflow-hidden">
                        <div className="p-6">
                            <h2 className="text-xl font-bold text-slate-900 mb-6">Pytanie</h2>

                            <div className="space-y-6">
                                <input
                                    className="w-full px-4 py-3 border border-slate-200 rounded-md outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                    placeholder="Wprowadź treść pytania"
                                    value={newQuestionText}
                                    onChange={(e) => setNewQuestionText(e.target.value)}
                                />

                                <input
                                    className="w-full px-4 py-3 border border-slate-200 rounded-md outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                    placeholder="Tagi (oddzielone przecinkiem)"
                                    value={newQuestionTags}
                                    onChange={(e) => setNewQuestionTags(e.target.value)}
                                />

                                <label className="flex items-center gap-2 cursor-pointer w-fit">
                                    <input
                                        type="checkbox"
                                        checked={isOpenEnded}
                                        onChange={(e) => setIsOpenEnded(e.target.checked)}
                                        className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-600"
                                    />
                                    <span className="text-slate-900 font-medium">Pytanie otwarte</span>
                                </label>

                                {!isOpenEnded && (
                                    <div className="space-y-3">
                                        {options.map((opt, idx) => (
                                            <div key={idx} className="flex items-center gap-4">
                                                <input
                                                    className="flex-1 px-4 py-2 border border-slate-200 rounded-md outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm"
                                                    placeholder={`Odpowiedź ${idx + 1}`}
                                                    value={opt}
                                                    onChange={(e) => {
                                                        const newOpts = [...options];
                                                        newOpts[idx] = e.target.value;
                                                        setOptions(newOpts);
                                                    }}
                                                />
                                                <label className="flex items-center gap-2 cursor-pointer min-w-[100px]">
                                                    <input
                                                        type="radio"
                                                        name="correctOption"
                                                        checked={correctOptionIndex === idx}
                                                        onChange={() => setCorrectOptionIndex(idx)}
                                                        className="w-4 h-4 border-slate-300 text-blue-600 focus:ring-blue-600"
                                                    />
                                                    <span className="text-slate-700 text-sm">Poprawna</span>
                                                </label>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <div className="flex justify-end pt-4">
                                    <Button
                                        onClick={handleCreateNewQuestion}
                                        className="bg-blue-600 hover:bg-blue-700 px-6"
                                    >
                                        Utwórz pytanie
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                    {/* Backdrop click to close */}
                    <div className="absolute inset-0 -z-10" onClick={closeModal} />
                </div>
            )}
        </div>
    );
};

