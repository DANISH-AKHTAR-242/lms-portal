import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import ErrorState from '../components/ErrorState';
import { useSignupMutation } from '../features/auth/auth.queries';

export default function SignupPage() {
  const navigate = useNavigate();
  const signupMutation = useSignupMutation();
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'student',
  });

  const submit = async (event) => {
    event.preventDefault();
    await signupMutation.mutateAsync(form);
    navigate('/dashboard', { replace: true });
  };

  return (
    <section className="mx-auto mt-10 max-w-md rounded-lg border bg-white p-6 shadow-sm">
      <h1 className="text-2xl font-bold">Create account</h1>
      <form onSubmit={submit} className="mt-5 space-y-3">
        <input
          className="w-full rounded border px-3 py-2"
          required
          placeholder="Full name"
          value={form.name}
          onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
        />
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
          minLength={8}
          required
          placeholder="Password"
          value={form.password}
          onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
        />
        <select
          className="w-full rounded border px-3 py-2"
          value={form.role}
          onChange={(event) => setForm((prev) => ({ ...prev, role: event.target.value }))}
        >
          <option value="student">Student</option>
          <option value="instructor">Instructor</option>
        </select>
        <button
          disabled={signupMutation.isPending}
          className="w-full rounded bg-brand-600 px-3 py-2 font-medium text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {signupMutation.isPending ? 'Creating account...' : 'Signup'}
        </button>
      </form>
      {signupMutation.error ? <ErrorState message={signupMutation.error.message} /> : null}
      <p className="mt-4 text-sm text-slate-600">
        Already have an account?{' '}
        <Link className="text-brand-700 hover:underline" to="/login">
          Login
        </Link>
      </p>
    </section>
  );
}
