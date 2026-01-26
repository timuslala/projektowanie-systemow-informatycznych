import { useEffect, useState } from 'react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

interface Course {
    id: number;
    title: string;
    description: string;
    progress: number;
    modules_count: number;
}

export const StudentDashboard = () => {
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
        return <div className="text-slate-500 text-center mt-10">Loading your courses...</div>;
    }

    return (
        <div className="space-y-12 animate-fade-in py-8">
            <h1 className="text-3xl font-bold text-center text-slate-900">Zapisane kursy</h1>

            {courses.length === 0 ? (
                <div className="text-slate-500 text-center italic">You are not enrolled in any courses yet.</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-7xl mx-auto">
                    {courses.map((course) => (
                        <Card key={course.id} className="border border-slate-200 shadow-sm p-8 min-h-[400px] flex flex-col justify-between">
                            <div>
                                <h2 className="text-xl font-bold text-slate-900 mb-8">{course.title}</h2>

                                <div className="space-y-6">
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
                                        {[1, 2, 3, 4].map((modNum) => (
                                            <div key={modNum} className="flex justify-between text-sm">
                                                <span className="text-slate-900 font-medium">Moduł {modNum}</span>
                                                <span className="text-slate-900 font-medium">
                                                    {/* Mocking module progress relative to course progress for display similarity */}
                                                    {modNum <= Math.floor(((course.progress || 0) / 100) * 4) ? '100%' :
                                                        modNum === Math.ceil(((course.progress || 0) / 100) * 4) ? `${(course.progress || 0) % 25 * 4}%` : '0%'}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-center mt-8">
                                <Button
                                    variant="outline"
                                    onClick={() => navigate(`/courses/${course.id}`)}
                                    className="border-slate-200 text-slate-700 hover:bg-slate-50 px-8"
                                >
                                    Szczegóły kursu
                                </Button>
                            </div>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
};

