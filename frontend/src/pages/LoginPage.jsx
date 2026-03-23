import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import ErrorState from '../components/ErrorState';
import { useSigninMutation } from '../features/auth/auth.queries';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const signinMutation = useSigninMutation();
  const [form, setForm] = useState({ email: '', password: '' });

  const submit = async (event) => {
    event.preventDefault();
    await signinMutation.mutateAsync(form);
    navigate(location.state?.from?.pathname || '/dashboard', { replace: true });
  };

  return (
    <section className="mx-auto mt-10 max-w-md rounded-lg border bg-white p-6 shadow-sm">
      <h1 className="text-2xl font-bold">Login</h1>
      <form onSubmit={submit} className="mt-5 space-y-3">
        <input
          className="w-full rounded border px-3 py-2"
          type="email"
          required
          placeholder="Email"
          value={form.email}
          onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
        />
        <input
          className="w-full rounded border px-3 py-2"
          type="password"
          required
          placeholder="Password"
          value={form.password}
          onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
        />
        <button
          disabled={signinMutation.isPending}
          className="w-full rounded bg-brand-600 px-3 py-2 font-medium text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {signinMutation.isPending ? 'Signing in...' : 'Login'}
        </button>
      </form>
      {signinMutation.error ? <ErrorState message={signinMutation.error.message} /> : null}
      <p className="mt-4 text-sm text-slate-600">
        No account?{' '}
        <Link className="text-brand-700 hover:underline" to="/signup">
          Create one
        </Link>
      </p>
    </section>
  );
}
