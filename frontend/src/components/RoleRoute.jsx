import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export default function RoleRoute({ allowedRoles, children }) {
  const user = useAuthStore((state) => state.user);

  if (!user || !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
