import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useSignoutMutation } from '../features/auth/auth.queries';
import { useAuthStore } from '../store/authStore';

export default function NavBar() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const signoutMutation = useSignoutMutation();

  const logout = async () => {
    await signoutMutation.mutateAsync();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-20 border-b bg-white/90 backdrop-blur">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link to="/" className="text-lg font-semibold text-brand-700">
          LMS Portal
        </Link>
        <div className="flex items-center gap-4 text-sm">
          <NavLink to="/catalog" className="hover:text-brand-700">
            Catalog
          </NavLink>
          {user ? (
            <>
              <NavLink to="/dashboard" className="hover:text-brand-700">
                Dashboard
              </NavLink>
              {(user.role === 'instructor' || user.role === 'admin') && (
                <NavLink to="/instructor" className="hover:text-brand-700">
                  Instructor
                </NavLink>
              )}
              <button
                onClick={logout}
                className="rounded bg-slate-900 px-3 py-1.5 text-white hover:bg-slate-700"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <NavLink to="/login" className="hover:text-brand-700">
                Login
              </NavLink>
              <NavLink to="/signup" className="hover:text-brand-700">
                Signup
              </NavLink>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
