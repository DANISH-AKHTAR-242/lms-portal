import { Suspense, lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import NavBar from './components/NavBar';
import ProtectedRoute from './components/ProtectedRoute';
import RoleRoute from './components/RoleRoute';
import LoadingSpinner from './components/LoadingSpinner';

const LandingPage = lazy(() => import('./pages/LandingPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const SignupPage = lazy(() => import('./pages/SignupPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const CatalogPage = lazy(() => import('./pages/CatalogPage'));
const CourseDetailPage = lazy(() => import('./pages/CourseDetailPage'));
const VideoPlayerPage = lazy(() => import('./pages/VideoPlayerPage'));
const InstructorDashboardPage = lazy(() => import('./pages/InstructorDashboardPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

export default function App() {
  return (
    <div className="min-h-screen bg-slate-50">
      <NavBar />
      <Suspense
        fallback={
          <div className="mx-auto max-w-6xl px-4 py-8">
            <LoadingSpinner label="Loading page..." />
          </div>
        }
      >
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/catalog" element={<CatalogPage />} />
          <Route path="/courses/:courseId" element={<CourseDetailPage />} />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/courses/:courseId/learn"
            element={
              <ProtectedRoute>
                <VideoPlayerPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/instructor"
            element={
              <ProtectedRoute>
                <RoleRoute allowedRoles={['instructor', 'admin']}>
                  <InstructorDashboardPage />
                </RoleRoute>
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<NotFoundPage />} />
          <Route path="/home" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </div>
  );
}
