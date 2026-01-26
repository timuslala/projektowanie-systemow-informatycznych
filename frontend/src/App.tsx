import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { MainLayout } from './layouts/MainLayout';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { VerifyEmailPage } from './pages/VerifyEmailPage';
import { DashboardPage } from './pages/DashboardPage';
import { TakeQuizPage } from './pages/student/TakeQuizPage';
import { CreateCoursePage } from './pages/teacher/CreateCoursePage';
import { CreateTestPage } from './pages/teacher/CreateTestPage';
import { CreateQuestionBankPage } from './pages/teacher/CreateQuestionBankPage';
import { CourseDetailsPage } from './pages/student/CourseDetailsPage';
import { QuizReviewPage } from './pages/student/QuizReviewPage';
import { QuestionBanksPage } from './pages/teacher/QuestionBanksPage';
import { QuizzesPage } from './pages/teacher/QuizzesPage';
import { CourseManagePage } from './pages/teacher/CourseManagePage';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return <div className="min-h-screen bg-[#0f172a] flex items-center justify-center text-white">Loading...</div>;

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <MainLayout>{children}</MainLayout>;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/courses/create"
            element={
              <ProtectedRoute>
                <CreateCoursePage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/courses/create"
            element={
              <ProtectedRoute>
                <CreateCoursePage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/courses/:id/manage"
            element={
              <ProtectedRoute>
                <CourseManagePage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/tests/create"
            element={
              <ProtectedRoute>
                <CreateTestPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/question-banks/create"
            element={
              <ProtectedRoute>
                <CreateQuestionBankPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/question-banks"
            element={
              <ProtectedRoute>
                <QuestionBanksPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/quizzes"
            element={
              <ProtectedRoute>
                <QuizzesPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/courses/:id"
            element={
              <ProtectedRoute>
                <CourseDetailsPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/quiz/:id"
            element={
              <ProtectedRoute>
                <TakeQuizPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/quiz/:id/review"
            element={
              <ProtectedRoute>
                <QuizReviewPage />
              </ProtectedRoute>
            }
          />

          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
