
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Plus, ArrowLeft, BookOpen, Clock, Trash2, Users, UserPlus, UserMinus, Search } from 'lucide-react';
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

interface Student {
    id: number;
    name: string;
    surname: string;
    email: string;
}

interface CourseProgress {
    student: Student;
    percent_complete: number;
    completed: boolean;
}

export const CourseManagePage = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [course, setCourse] = useState<Course | null>(null);
    const [modules, setModules] = useState<Module[]>([]);
    const [quizzes, setQuizzes] = useState<Quiz[]>([]);
    const [questionBanks, setQuestionBanks] = useState<QuestionBank[]>([]);
    const [loading, setLoading] = useState(true);

    // Students State
    const [enrolledStudents, setEnrolledStudents] = useState<CourseProgress[]>([]);
    const [eligibleStudents, setEligibleStudents] = useState<Student[]>([]);
    const [studentSearch, setStudentSearch] = useState('');

    // Module Form State
    const [isModuleModalOpen, setIsModuleModalOpen] = useState(false);
    const [newModuleName, setNewModuleName] = useState('');
    const [newModuleContent, setNewModuleContent] = useState('');

    // Quiz Form State
    const [isQuizModalOpen, setIsQuizModalOpen] = useState(false);
    const [newQuizTitle, setNewQuizTitle] = useState('');
    const [newQuizDescription, setNewQuizDescription] = useState('');
    const [newQuizTimeLimit, setNewQuizTimeLimit] = useState(30);
    const [selectedBankIds, setSelectedBankIds] = useState<string[]>([]);
    const [randomizeOrder, setRandomizeOrder] = useState(true);
    const [showCorrectAnswers, setShowCorrectAnswers] = useState(true);

    // Student Modal (for adding students)
    const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            if (!id) return;
            try {
                const [courseRes, modulesRes, quizzesRes, banksRes, enrolledRes, eligibleRes] = await Promise.all([
                    api.get(`/api/courses/${id}`),
                    api.get(`/api/courses/${id}/modules/`),
                    api.get(`/api/quizzes/?course_id=${id}`),
                    api.get('/api/question_banks/'),
                    api.get(`/api/courses/${id}/enrolled-students/`),
                    api.get(`/api/courses/${id}/eligible-students/`)
                ]);

                setCourse(courseRes.data);
                setModules(modulesRes.data);
                setQuizzes(quizzesRes.data);
                setQuestionBanks(banksRes.data);
                setEnrolledStudents(enrolledRes.data);
                setEligibleStudents(eligibleRes.data);
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
        if (!id || selectedBankIds.length === 0) return;
        try {
            const response = await api.post('/api/quizzes/', {
                title: newQuizTitle,
                description: newQuizDescription,
                time_limit_in_minutes: newQuizTimeLimit,
                course: parseInt(id),
                question_banks: selectedBankIds.map(bankId => parseInt(bankId)),
                randomize_question_order: randomizeOrder,
                show_correct_answers_on_completion: showCorrectAnswers
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

    const handleEnrollStudent = async (student: Student) => {
        if (!id) return;
        try {
            await api.post(`/api/courses/${id}/enroll/${student.id}/`);
            setEligibleStudents(eligibleStudents.filter(s => s.id !== student.id));
            setEnrolledStudents([...enrolledStudents, { student, percent_complete: 0, completed: false }]);
        } catch (error) {
            console.error("Failed to enroll student", error);
        }
    };

    const handleUnenrollStudent = async (studentId: number) => {
        if (!id) return;
        if (!confirm('Are you sure you want to unenroll this student?')) return;
        try {
            await api.delete(`/api/courses/${id}/unenroll/${studentId}/`);
            const unenrolled = enrolledStudents.find(s => s.student.id === studentId);
            setEnrolledStudents(enrolledStudents.filter(s => s.student.id !== studentId));
            if (unenrolled) {
                setEligibleStudents([...eligibleStudents, unenrolled.student]);
            }
        } catch (error) {
            console.error("Failed to unenroll student", error);
        }
    };

    const toggleBankSelection = (bankId: number) => {
        const idStr = bankId.toString();
        setSelectedBankIds(prev =>
            prev.includes(idStr)
                ? prev.filter(id => id !== idStr)
                : [...prev, idStr]
        );
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
        setSelectedBankIds([]);
        setRandomizeOrder(true);
        setShowCorrectAnswers(true);
    };

    const filteredEligibleStudents = eligibleStudents.filter(student =>
    (student.name?.toLowerCase().includes(studentSearch.toLowerCase()) ||
        student.surname?.toLowerCase().includes(studentSearch.toLowerCase()) ||
        student.email?.toLowerCase().includes(studentSearch.toLowerCase()))
    );

    if (loading) return <div className="text-center text-slate-500 mt-10">Ładowanie zarządzania kursu...</div>;
    if (!course) return <div className="text-center text-slate-500 mt-10">Kurs nie został znaleziony</div>;

    return (
        <>
            {/* Add Module Modal */}
            {isModuleModalOpen && (
                <div className="fixed inset-0 z-50 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4 text-center">
                        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity" onClick={closeModuleModal} />
                        <div className="relative w-full max-w-lg transform overflow-hidden rounded-2xl bg-white border border-slate-200 p-6 text-left align-middle shadow-xl transition-all">
                            <h2 className="text-xl font-bold text-slate-900 mb-6">Dodaj nowy moduł</h2>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Nazwa</label>
                                    <input
                                        className="w-full px-4 py-2 bg-white border border-slate-300 rounded-md text-slate-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                                        value={newModuleName}
                                        onChange={(e) => setNewModuleName(e.target.value)}
                                        placeholder="Nazwa"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Treść</label>
                                    <textarea
                                        className="w-full px-4 py-2 bg-white border border-slate-300 rounded-md text-slate-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none h-32"
                                        value={newModuleContent}
                                        onChange={(e) => setNewModuleContent(e.target.value)}
                                        placeholder="Treść"
                                    />
                                </div>
                                <div className="flex justify-end gap-3 pt-4">
                                    <Button variant="ghost" onClick={closeModuleModal} className="text-slate-600 hover:text-slate-900">Anuluj</Button>
                                    <Button variant="primary" onClick={handleCreateModule}>Utwórz moduł</Button>
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
                        <div className="relative w-full max-w-lg transform overflow-hidden rounded-2xl bg-white border border-slate-200 p-6 text-left align-middle shadow-xl transition-all">
                            <h2 className="text-xl font-bold text-slate-900 mb-6">Dodaj nowy quiz</h2>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Tytuł</label>
                                    <input
                                        className="w-full px-4 py-2 bg-white border border-slate-300 rounded-md text-slate-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                                        value={newQuizTitle}
                                        onChange={(e) => setNewQuizTitle(e.target.value)}
                                        placeholder="Tytuł"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Opis</label>
                                    <input
                                        className="w-full px-4 py-2 bg-white border border-slate-300 rounded-md text-slate-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                                        value={newQuizDescription}
                                        onChange={(e) => setNewQuizDescription(e.target.value)}
                                        placeholder="Opis"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Limit czasu (minuty)</label>
                                    <input
                                        type="number"
                                        className="w-full px-4 py-2 bg-white border border-slate-300 rounded-md text-slate-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                                        value={newQuizTimeLimit}
                                        onChange={(e) => setNewQuizTimeLimit(parseInt(e.target.value))}
                                    />
                                </div>

                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        id="randomizeOrder"
                                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                        checked={randomizeOrder}
                                        onChange={(e) => setRandomizeOrder(e.target.checked)}
                                    />
                                    <label htmlFor="randomizeOrder" className="text-sm text-slate-700">Losuj kolejność pytań</label>
                                </div>

                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        id="showCorrectAnswers"
                                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                        checked={showCorrectAnswers}
                                        onChange={(e) => setShowCorrectAnswers(e.target.checked)}
                                    />
                                    <label htmlFor="showCorrectAnswers" className="text-sm text-slate-700">Pokaż poprawne odpowiedzi po zakończeniu</label>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Banki pytań</label>
                                    <div className="max-h-40 overflow-y-auto border border-slate-300 rounded-md p-2 space-y-1">
                                        {questionBanks.length === 0 ? (
                                            <p className="text-sm text-slate-500">Brak banków pytań.</p>
                                        ) : (
                                            questionBanks.map(bank => (
                                                <div
                                                    key={bank.id}
                                                    className={`
                                                        flex items-center justify-between p-2 rounded cursor-pointer border transition-colors
                                                        ${selectedBankIds.includes(bank.id.toString())
                                                            ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                                                            : 'bg-white border-transparent hover:bg-slate-50'
                                                        }
                                                    `}
                                                    onClick={() => toggleBankSelection(bank.id)}
                                                >
                                                    <span className="text-sm">{bank.title}</span>
                                                    {selectedBankIds.includes(bank.id.toString()) && (
                                                        <div className="w-2 h-2 rounded-full bg-indigo-600" />
                                                    )}
                                                </div>
                                            ))
                                        )}
                                    </div>
                                    <p className="text-xs text-slate-500 mt-1">{selectedBankIds.length} wybranych banków pytań</p>
                                </div>

                                <div className="flex justify-end gap-3 pt-4">
                                    <Button variant="ghost" onClick={closeQuizModal} className="text-slate-600 hover:text-slat  e-900">Anuluj</Button>
                                    <Button onClick={handleCreateQuiz} disabled={selectedBankIds.length === 0}>Utwórz quiz</Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Content */}
            <div className="max-w-[1400px] min-h-screen mx-auto py-8 animate-fade-in px-4">
                <div className="flex items-center gap-4 mb-8">
                    <Button variant="ghost" onClick={() => navigate('/dashboard')} leftIcon={<ArrowLeft className="w-4 h-4" />} className="text-slate-500 hover:text-indigo-600">
                        Back
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 mb-2">Zarządzaj: {course.title}</h1>
                        <p className="text-slate-500">{course.description}</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                    {/* Modules Section */}
                    <div className="space-y-6 flex flex-col h-[50vh]">
                        <div className="flex justify-between items-center">
                            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                                <BookOpen className="w-5 h-5 text-indigo-600" />
                                Modules
                            </h2>
                            <Button onClick={() => setIsModuleModalOpen(true)} size="sm" leftIcon={<Plus className="w-4 h-4" />}>
                                Dodaj moduł
                            </Button>
                        </div>

                        <div className="space-y-4 overflow-y-auto flex-1 pr-2">
                            {modules.length === 0 ? (
                                <div className="p-8 border border-dashed border-slate-200 rounded-lg text-center text-slate-500 bg-white">
                                    Brak modułów. Dodaj jeden, aby rozpocząć.
                                </div>
                            ) : (
                                modules.map(module => (
                                    <Card key={module.id} className="group hover:border-indigo-300 transition-all">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h3 className="text-lg font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">{module.name}</h3>
                                                <p className="text-slate-500 mt-1 line-clamp-2">{module.content}</p>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="text-red-400 hover:text-red-600 hover:bg-red-50"
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
                    <div className="space-y-6 flex flex-col h-[50vh]">
                        <div className="flex justify-between items-center">
                            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                                <Clock className="w-5 h-5 text-emerald-600" />
                                Quizy
                            </h2>
                            <Button onClick={() => setIsQuizModalOpen(true)} size="sm" leftIcon={<Plus className="w-4 h-4" />}>
                                Dodaj quiz
                            </Button>
                        </div>

                        <div className="space-y-4 overflow-y-auto flex-1 pr-2">
                            {quizzes.length === 0 ? (
                                <div className="p-8 border border-dashed border-slate-200 rounded-lg text-center text-slate-500 bg-white">
                                    Brak quizów. Dodaj jeden, aby rozpocząć.
                                </div>
                            ) : (
                                quizzes.map(quiz => (
                                    <Card
                                        key={quiz.id}
                                        onClick={() => navigate(`/quizzes/${quiz.id}`)}
                                        className="group hover:border-emerald-300 transition-all cursor-pointer"
                                    >
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h3 className="text-lg font-semibold text-slate-900 group-hover:text-emerald-600 transition-colors">{quiz.title}</h3>
                                                <p className="text-slate-500 mt-1">{quiz.description}</p>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="text-red-400 hover:text-red-600 hover:bg-red-50"
                                                onClick={(e) => { e.stopPropagation(); handleDeleteQuiz(quiz.id); }}
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

                {/* Enrolled Students Section */}
                <div className="space-y-6 flex flex-col h-[50vh]">
                    <div className="flex justify-between items-center">
                        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                            <Users className="w-5 h-5 text-blue-600" />
                            Zapisani uczniowie
                        </h2>
                        <Button onClick={() => setIsStudentModalOpen(true)} size="sm" leftIcon={<UserPlus className="w-4 h-4" />}>
                            Zapisz uczniów
                        </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto flex-1 pr-2 pb-2 content-start">
                        {enrolledStudents.length === 0 ? (
                            <div className="col-span-full p-8 border border-dashed border-slate-200 rounded-lg text-center text-slate-500 bg-white">
                                Brak zapisanych uczniów.
                            </div>
                        ) : (
                            enrolledStudents.map((progress) => (
                                <Card key={progress.student.id} className="group hover:border-blue-300 transition-all">
                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                                                {progress.student.name?.[0]}{progress.student.surname?.[0]}
                                            </div>
                                            <div>
                                                <h3 className="font-medium text-slate-900">{progress.student.name} {progress.student.surname}</h3>
                                                <p className="text-xs text-slate-500">{progress.student.email}</p>
                                            </div>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-red-400 hover:text-red-600 hover:bg-red-50"
                                            onClick={() => handleUnenrollStudent(progress.student.id)}
                                            title="Unenroll"
                                        >
                                            <UserMinus className="w-4 h-4" />
                                        </Button>
                                    </div>
                                    <div className="mt-4">
                                        <div className="flex justify-between text-xs text-slate-500 mb-1">
                                            <span>Progress</span>
                                            <span>{Math.round(progress.percent_complete)}%</span>
                                        </div>
                                        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                            <div
                                                className="bg-blue-500 h-full rounded-full"
                                                style={{ width: `${progress.percent_complete}%` }}
                                            />
                                        </div>
                                    </div>
                                </Card>
                            ))
                        )}
                    </div>
                </div>

                {/* Enroll Students Modal */}
                {isStudentModalOpen && (
                    <div className="fixed inset-0 z-50 overflow-y-auto">
                        <div className="flex min-h-full items-center justify-center p-4">
                            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity" onClick={() => setIsStudentModalOpen(false)} />
                            <div className="relative w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white border border-slate-200 p-6 shadow-xl transition-all">
                                <div className="flex justify-between items-center mb-6">
                                    <h2 className="text-xl font-bold text-slate-900">Enroll Students</h2>
                                    <Button variant="ghost" size="sm" onClick={() => setIsStudentModalOpen(false)}>X</Button>
                                </div>

                                <div className="relative mb-6">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                                    <input
                                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-md text-slate-900 focus:border-indigo-500 outline-none"
                                        placeholder="Search students by name or email..."
                                        value={studentSearch}
                                        onChange={(e) => setStudentSearch(e.target.value)}
                                    />
                                </div>

                                <div className="max-h-[60vh] overflow-y-auto space-y-2">
                                    {filteredEligibleStudents.length === 0 ? (
                                        <div className="text-center py-8 text-slate-500">
                                            {studentSearch ? 'No matching students found.' : 'No eligible students available to enroll.'}
                                        </div>
                                    ) : (
                                        filteredEligibleStudents.map(student => (
                                            <div key={student.id} className="flex justify-between items-center p-3 hover:bg-slate-50 rounded-lg border border-transparent hover:border-slate-100 transition-colors">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 text-sm font-bold">
                                                        {student.name?.[0]}{student.surname?.[0]}
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-slate-900">{student.name} {student.surname}</p>
                                                        <p className="text-xs text-slate-500">{student.email}</p>
                                                    </div>
                                                </div>
                                                <Button size="sm" onClick={() => handleEnrollStudent(student)} variant="outline" className="hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200">
                                                    Zapisz
                                                </Button>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
};
