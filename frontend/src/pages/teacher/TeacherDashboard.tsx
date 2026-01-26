import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { PlusCircle, HelpCircle, Clock } from 'lucide-react';
import api from '../../services/api';

interface Course {
    id: number;
    title: string;
    description: string;
    students_count: number;
    modules_count: number;
    progress?: number;
}

export const TeacherDashboard = () => {
    const [courses, setCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchCourses = async () => {
            try {
                const response = await api.get('/api/courses/');
                setCourses(response.data);
            } catch (error) {
                console.error("Failed to fetch courses", error);
            } finally {
                setLoading(false);
            }
        };
        fetchCourses();
    }, []);

    if (loading) {
        return <div className="text-slate-500 text-center mt-10">Loading dashboard...</div>;
    }

    return (
        <div className="space-y-12 animate-fade-in py-8 max-w-[1400px] mx-auto px-4">
            <div className="flex justify-between items-center px-4">
                <h1 className="text-3xl font-bold text-slate-900">Zapisane kursy</h1>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        onClick={() => navigate('/question-banks')}
                        leftIcon={<HelpCircle className="w-4 h-4" />}
                        className="border-slate-300 text-slate-700 hover:bg-slate-50"
                    >
                        Question Banks
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() => navigate('/quizzes')}
                        leftIcon={<Clock className="w-4 h-4" />}
                        className="border-slate-300 text-slate-700 hover:bg-slate-50"
                    >
                        Quizzes
                    </Button>
                    <Button
                        onClick={() => navigate('/courses/create')}
                        leftIcon={<PlusCircle className="w-4 h-4" />}
                    >
                        Create New Course
                    </Button>
                </div>
            </div>

            {courses.length === 0 ? (
                <div className="text-slate-500 text-center italic">You haven't created any courses yet.</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {courses.map((course) => (
                        <Card key={course.id} className="border border-slate-200 shadow-sm p-8 min-h-[400px] flex flex-col justify-between bg-white">
                            <div>
                                <h2 className="text-xl font-bold text-slate-900 mb-8">{course.title}</h2>

                                <div className="space-y-6">
                                    {/* Progress Section - Hidden for teachers or visualized differently? 
                                        Request implies matching view. Teachers usually don't have personal progress.
                                        Showing 0% or hiding. Hiding for now to avoid confusion, or showing Stats?
                                        User said "look something like second image". Image has progress.
                                        I'll show it but it will likely be 0.
                                    */}
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm font-bold text-slate-900">Postęp kursu</span>
                                            <span className="text-sm font-bold text-slate-900">{Math.round(course.progress || 0)}%</span>
                                        </div>
                                        <div className="h-2.5 w-full bg-slate-200 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-blue-600 rounded-full transition-all duration-500"
                                                style={{ width: `${course.progress || 0}%` }}
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        {/* Mock modules to match student view style */}
                                        {Array.from({ length: Math.min(course.modules_count || 4, 4) }).map((_, idx) => (
                                            <div key={idx} className="flex justify-between text-sm">
                                                <span className="text-slate-900 font-medium">Moduł {idx + 1}</span>
                                                <span className="text-slate-900 font-medium">0%</span>
                                            </div>
                                        ))}
                                        {course.modules_count > 4 && (
                                            <div className="text-xs text-slate-500">...and {course.modules_count - 4} more</div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-between items-center mt-8 gap-4">
                                <Button
                                    variant="outline"
                                    onClick={() => navigate(`/courses/${course.id}`)}
                                    className="flex-1 border-slate-200 text-slate-700 hover:bg-slate-50"
                                >
                                    Szczegóły kursu
                                </Button>
                                <Button
                                    variant="secondary"
                                    onClick={() => navigate(`/courses/${course.id}/manage`)}
                                    className="flex-1 bg-slate-100 text-slate-900 hover:bg-slate-200 border border-slate-200"
                                >
                                    Zarządzaj
                                </Button>
                            </div>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
};
