import { Link } from 'react-router-dom';

export default function LandingPage() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16">
      <h1 className="text-4xl font-bold tracking-tight text-slate-900">Production-ready LMS frontend</h1>
      <p className="mt-4 max-w-2xl text-slate-600">
        Secure cookie-based authentication, course catalog caching, Razorpay checkout, and instructor workflows.
      </p>
      <div className="mt-8 flex gap-3">
        <Link to="/catalog" className="rounded bg-brand-600 px-4 py-2 font-medium text-white hover:bg-brand-700">
          Browse courses
        </Link>
        <Link to="/login" className="rounded border px-4 py-2 font-medium hover:bg-slate-100">
          Login
        </Link>
      </div>
    </section>
  );
}
