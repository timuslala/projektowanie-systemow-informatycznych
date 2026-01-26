import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Plus, ArrowLeft, BookOpen, Clock, Trash2 } from 'lucide-react';
import api from '../../services/api';

interface Course {
    id: number;
    title: string;
    description: string;
}

interface Module {
    id: number;
    name: string;
    content: string;
}

interface Quiz {
    id: number;
    title: string;
    description: string;
}

interface QuestionBank {
    id: number;
    title: string;
}

export const CourseManagePage = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [course, setCourse] = useState<Course | null>(null);
    const [modules, setModules] = useState<Module[]>([]);
    const [quizzes, setQuizzes] = useState<Quiz[]>([]);
    const [questionBanks, setQuestionBanks] = useState<QuestionBank[]>([]);
    const [loading, setLoading] = useState(true);

    // Module Form State
    const [isModuleModalOpen, setIsModuleModalOpen] = useState(false);
    const [newModuleName, setNewModuleName] = useState('');
    const [newModuleContent, setNewModuleContent] = useState('');

    // Quiz Form State
    const [isQuizModalOpen, setIsQuizModalOpen] = useState(false);
    const [newQuizTitle, setNewQuizTitle] = useState('');
    const [newQuizDescription, setNewQuizDescription] = useState('');
    const [newQuizTimeLimit, setNewQuizTimeLimit] = useState(30);
    const [selectedBankId, setSelectedBankId] = useState<string>('');

    useEffect(() => {
        const fetchData = async () => {
            if (!id) return;
            try {
                const [courseRes, modulesRes, quizzesRes, banksRes] = await Promise.all([
                    api.get(`/api/courses/${id}`),
                    api.get(`/api/courses/${id}/modules/`),
                    api.get(`/api/quizzes/?course_id=${id}`),
                    api.get('/api/question_banks/')
                ]);

                setCourse(courseRes.data);
                setModules(modulesRes.data);
                setQuizzes(quizzesRes.data);
                setQuestionBanks(banksRes.data);
            } catch (error) {
                console.error("Failed to fetch course data", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [id]);

    const handleCreateModule = async () => {
        if (!id) return;
        try {
            const response = await api.post(`/api/courses/${id}/modules/`, {
                name: newModuleName,
                content: newModuleContent
            });
            setModules([...modules, response.data]);
            closeModuleModal();
        } catch (error) {
            console.error("Failed to create module", error);
        }
    };

    const handleCreateQuiz = async () => {
        if (!id || !selectedBankId) return;
        try {
            const response = await api.post('/api/quizzes/', {
                title: newQuizTitle,
                description: newQuizDescription,
                time_limit_in_minutes: newQuizTimeLimit,
                course: parseInt(id),
                question_banks: [parseInt(selectedBankId)],
                randomize_question_order: true,
                show_correct_answers_on_completion: true
            });
            setQuizzes([...quizzes, response.data]);
            closeQuizModal();
        } catch (error) {
            console.error("Failed to create quiz", error);
        }
    };

    const handleDeleteModule = async (moduleId: number) => {
        if (!id) return;
        if (!confirm('Are you sure you want to delete this module?')) return;
        try {
            await api.delete(`/api/courses/${id}/modules/${moduleId}/`);
            setModules(modules.filter(m => m.id !== moduleId));
        } catch (error) {
            console.error("Failed to delete module", error);
        }
    };

    const handleDeleteQuiz = async (quizId: number) => {
        if (!confirm('Are you sure you want to delete this quiz?')) return;
        try {
            await api.delete(`/api/quizzes/${quizId}/`);
            setQuizzes(quizzes.filter(q => q.id !== quizId));
        } catch (error) {
            console.error("Failed to delete quiz", error);
        }
    };

    const closeModuleModal = () => {
        setIsModuleModalOpen(false);
        setNewModuleName('');
        setNewModuleContent('');
    };

    const closeQuizModal = () => {
        setIsQuizModalOpen(false);
        setNewQuizTitle('');
        setNewQuizDescription('');
        setNewQuizTimeLimit(30);
        setSelectedBankId('');
    };

    if (loading) return <div className="text-center text-white mt-10">Loading manage page...</div>;
    if (!course) return <div className="text-center text-white mt-10">Course not found</div>;

    return (
        <>
            {/* Add Module Modal */}
            {isModuleModalOpen && (
                <div className="fixed inset-0 z-50 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4 text-center">
                        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity" onClick={closeModuleModal} />

                        <div className="relative w-full max-w-lg transform overflow-hidden rounded-2xl bg-slate-900 border border-slate-700 p-6 text-left align-middle shadow-xl transition-all">
                            <h2 className="text-xl font-bold text-white mb-6">Add New Module</h2>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">Name</label>
                                    <input
                                        className="w-full px-4 py-2 bg-slate-800 border border-slate-600 rounded-md text-white focus:border-indigo-500 outline-none"
                                        value={newModuleName}
                                        onChange={(e) => setNewModuleName(e.target.value)}
                                        placeholder="Module Name"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">Content</label>
                                    <textarea
                                        className="w-full px-4 py-2 bg-slate-800 border border-slate-600 rounded-md text-white focus:border-indigo-500 outline-none h-32"
                                        value={newModuleContent}
                                        onChange={(e) => setNewModuleContent(e.target.value)}
                                        placeholder="Module Content"
                                    />
                                </div>
                                <div className="flex justify-end gap-3 pt-4">
                                    <Button variant="ghost" onClick={closeModuleModal}>Cancel</Button>
                                    <Button variant="outline" onClick={handleCreateModule}>Create Module</Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Quiz Modal */}
            {isQuizModalOpen && (
                <div className="fixed inset-0 z-50 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4 text-center">
                        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity" onClick={closeQuizModal} />

                        <div className="relative w-full max-w-lg transform overflow-hidden rounded-2xl bg-slate-900 border border-slate-700 p-6 text-left align-middle shadow-xl transition-all">
                            <h2 className="text-xl font-bold text-white mb-6">Add New Quiz</h2>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">Title</label>
                                    <input
                                        className="w-full px-4 py-2 bg-slate-800 border border-slate-600 rounded-md text-white focus:border-indigo-500 outline-none"
                                        value={newQuizTitle}
                                        onChange={(e) => setNewQuizTitle(e.target.value)}
                                        placeholder="Quiz Title"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">Description</label>
                                    <input
                                        className="w-full px-4 py-2 bg-slate-800 border border-slate-600 rounded-md text-white focus:border-indigo-500 outline-none"
                                        value={newQuizDescription}
                                        onChange={(e) => setNewQuizDescription(e.target.value)}
                                        placeholder="Quiz Description"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">Time Limit (minutes)</label>
                                    <input
                                        type="number"
                                        className="w-full px-4 py-2 bg-slate-800 border border-slate-600 rounded-md text-white focus:border-indigo-500 outline-none"
                                        value={newQuizTimeLimit}
                                        onChange={(e) => setNewQuizTimeLimit(parseInt(e.target.value))}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">Question Bank</label>
                                    <select
                                        className="w-full px-4 py-2 bg-slate-800 border border-slate-600 rounded-md text-white focus:border-indigo-500 outline-none"
                                        value={selectedBankId}
                                        onChange={(e) => setSelectedBankId(e.target.value)}
                                    >
                                        <option value="">Select a Question Bank</option>
                                        {questionBanks.map(bank => (
                                            <option key={bank.id} value={bank.id}>{bank.title}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="flex justify-end gap-3 pt-4">
                                    <Button variant="ghost" onClick={closeQuizModal}>Cancel</Button>
                                    <Button onClick={handleCreateQuiz} disabled={!selectedBankId}>Create Quiz</Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            <div className="max-w-[1400px] h-[100vh] mx-auto py-8 animate-fade-in px-4">
                <div className="flex items-center gap-4 mb-8">
                    <Button variant="ghost" onClick={() => navigate('/dashboard')} leftIcon={<ArrowLeft className="w-4 h-4" />}>
                        Back
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold text-white mb-2">Manage: {course.title}</h1>
                        <p className="text-[#cbd5e1]">{course.description}</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Modules Section */}
                    <div className="space-y-6">
                        <div className="flex justify-between items-center">
                            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                <BookOpen className="w-5 h-5 text-indigo-400" />
                                Modules
                            </h2>
                            <Button onClick={() => setIsModuleModalOpen(true)} size="sm" leftIcon={<Plus className="w-4 h-4" />}>
                                Add Module
                            </Button>
                        </div>

                        <div className="space-y-4">
                            {modules.length === 0 ? (
                                <div className="p-8 border border-dashed border-slate-700 rounded-lg text-center text-slate-400">
                                    No modules yet. Add one to get started.
                                </div>
                            ) : (
                                modules.map(module => (
                                    <Card key={module.id} className="group hover:border-indigo-500/50 transition-all">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h3 className="text-lg font-semibold text-white group-hover:text-indigo-400">{module.name}</h3>
                                                <p className="text-slate-400 mt-1 line-clamp-2">{module.content}</p>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                                                onClick={() => handleDeleteModule(module.id)}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </Card>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Quizzes Section */}
                    <div className="space-y-6">
                        <div className="flex justify-between items-center">
                            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                <Clock className="w-5 h-5 text-emerald-400" />
                                Quizzes
                            </h2>
                            <Button onClick={() => setIsQuizModalOpen(true)} size="sm" leftIcon={<Plus className="w-4 h-4" />}>
                                Add Quiz
                            </Button>
                        </div>

                        <div className="space-y-4">
                            {quizzes.length === 0 ? (
                                <div className="p-8 border border-dashed border-slate-700 rounded-lg text-center text-slate-400">
                                    No quizzes yet. Add one to test your students.
                                </div>
                            ) : (
                                quizzes.map(quiz => (
                                    <Card key={quiz.id} className="group hover:border-emerald-500/50 transition-all">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h3 className="text-lg font-semibold text-white group-hover:text-emerald-400">{quiz.title}</h3>
                                                <p className="text-slate-400 mt-1">{quiz.description}</p>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                                                onClick={() => handleDeleteQuiz(quiz.id)}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </Card>
                                ))
                            )}
                        </div>
                    </div>
                </div>




            </div>
        </>
    );
};
