import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <section className="mx-auto max-w-3xl px-4 py-16 text-center">
      <h1 className="text-3xl font-bold">Page not found</h1>
      <p className="mt-3 text-slate-600">The page you requested does not exist.</p>
      <Link to="/" className="mt-6 inline-flex rounded bg-brand-600 px-4 py-2 text-white hover:bg-brand-700">
        Go home
      </Link>
    </section>
  );
}
