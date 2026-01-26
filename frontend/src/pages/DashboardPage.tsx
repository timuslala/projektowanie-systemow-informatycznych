
import { useAuth } from '../contexts/AuthContext';
import { TeacherDashboard } from './teacher/TeacherDashboard';
import { StudentDashboard } from './student/StudentDashboard';

export const DashboardPage = () => {
    const { user } = useAuth();

    if (user?.role === 'teacher' || user?.role === 'superuser' || user?.role === 'staff') {
        return <TeacherDashboard />;
    }

    return <StudentDashboard />;
};
