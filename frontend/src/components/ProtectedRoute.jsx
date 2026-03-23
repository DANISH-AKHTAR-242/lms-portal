import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import LoadingSpinner from './LoadingSpinner';

export default function ProtectedRoute({ children }) {
  const { hasSession, loading } = useAuthStore();
  const location = useLocation();

  if (loading) {
    return (
      <div className="mx-auto mt-10 max-w-6xl px-4">
        <LoadingSpinner label="Checking session..." />
      </div>
    );
  }

  if (!hasSession) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children;
}
