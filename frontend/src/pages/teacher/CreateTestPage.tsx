import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { Card } from '../../components/Card';
import { ArrowLeft, Save, Clock, HelpCircle } from 'lucide-react';

interface Course {
    id: number;
    title: string;
}

interface QuestionBank {
    id: number;
    name: string;
}

export const CreateTestPage = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [courses, setCourses] = useState<Course[]>([]);
    const [questionBanks, setQuestionBanks] = useState<QuestionBank[]>([]);

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        time_limit_in_minutes: 60,
        randomize_question_order: false,
        show_correct_answers_on_completion: false,
        course: '',
        question_banks: [] as string[] // Selected IDs
    });

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [coursesRes, banksRes] = await Promise.all([
                    api.get('/api/courses/'),
                    api.get('/api/question_banks/')
                ]);
                setCourses(coursesRes.data);
                setQuestionBanks(banksRes.data);
            } catch (err) {
                console.error("Failed to load data", err);
            }
        };
        fetchData();
    }, []);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api.post('/api/quizzes/', {
                ...formData,
                course: parseInt(formData.course),
                question_banks: formData.question_banks.map(id => parseInt(id))
            });
            navigate('/dashboard');
        } catch (err) {
            console.error("Failed to create quiz", err);
            alert("Failed to create quiz");
        } finally {
            setLoading(false);
        }
    };

    const toggleQuestionBank = (id: string) => {
        setFormData(prev => {
            const current = prev.question_banks;
            if (current.includes(id)) {
                return { ...prev, question_banks: current.filter(x => x !== id) };
            } else {
                return { ...prev, question_banks: [...current, id] };
            }
        });
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <Button
                variant="ghost"
                size="sm"
                leftIcon={<ArrowLeft className="w-4 h-4" />}
                onClick={() => navigate(-1)}
            >
                Back to Dashboard
            </Button>

            <h1 className="text-3xl font-bold text-slate-900 mb-2">Create New Test</h1>

            <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-6">
                        <Card title="Test Details">
                            <div className="space-y-4">
                                <Input
                                    label="Test Title"
                                    value={formData.title}
                                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                                    required
                                />

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Description</label>
                                    <textarea
                                        className="w-full bg-white text-slate-900 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none p-3 h-32 resize-none placeholder-slate-400"
                                        value={formData.description}
                                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <Input
                                        label="Time Limit (minutes)"
                                        type="number"
                                        leftIcon={<Clock className="w-4 h-4" />}
                                        value={formData.time_limit_in_minutes}
                                        onChange={e => setFormData({ ...formData, time_limit_in_minutes: parseInt(e.target.value) })}
                                    />

                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Course</label>
                                        <select
                                            className="w-full bg-white text-slate-900 border border-slate-200 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 outline-none"
                                            value={formData.course}
                                            onChange={e => setFormData({ ...formData, course: e.target.value })}
                                            required
                                        >
                                            <option value="">Select a Course...</option>
                                            {courses.map(c => (
                                                <option key={c.id} value={c.id}>{c.title}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-2 pt-2">
                                    <label className="flex items-center text-slate-700 cursor-pointer select-none">
                                        <input
                                            type="checkbox"
                                            className="mr-2 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600"
                                            checked={formData.randomize_question_order}
                                            onChange={e => setFormData({ ...formData, randomize_question_order: e.target.checked })}
                                        />
                                        Randomize question order
                                    </label>
                                    <label className="flex items-center text-slate-700 cursor-pointer select-none">
                                        <input
                                            type="checkbox"
                                            className="mr-2 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600"
                                            checked={formData.show_correct_answers_on_completion}
                                            onChange={e => setFormData({ ...formData, show_correct_answers_on_completion: e.target.checked })}
                                        />
                                        Show correct answers after completion
                                    </label>
                                </div>
                            </div>
                        </Card>

                        <Card title="Select Question Banks">
                            <div className="space-y-2 max-h-60 overflow-y-auto">
                                {questionBanks.length === 0 && <p className="text-slate-500 italic">No question banks available.</p>}
                                {questionBanks.map(bank => (
                                    <div
                                        key={bank.id}
                                        className={`
                            p-3 rounded-lg border cursor-pointer flex items-center justify-between transition-colors
                            ${formData.question_banks.includes(bank.id.toString())
                                                ? 'bg-indigo-50 border-indigo-500'
                                                : 'bg-white border-slate-200 hover:border-indigo-300'}
                        `}
                                        onClick={() => toggleQuestionBank(bank.id.toString())}
                                    >
                                        <div className="flex items-center gap-3">
                                            <HelpCircle className="w-5 h-5 text-slate-400" />
                                            <span className="text-slate-900">{bank.name}</span>
                                        </div>
                                        {formData.question_banks.includes(bank.id.toString()) && (
                                            <span className="text-indigo-600 text-xs font-bold">SELECTED</span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </Card>
                    </div>

                    <div className="space-y-6">
                        <Card>
                            <Button type="submit" className="w-full" isLoading={loading} leftIcon={<Save className="w-4 h-4" />}>
                                Create Test
                            </Button>
                        </Card>
                    </div>
                </div>
            </form>
        </div>
    );
};
