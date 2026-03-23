import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import ErrorState from '../components/ErrorState';
import LoadingSpinner from '../components/LoadingSpinner';
import { useCatalogQuery } from '../features/courses/course.queries';
import { startCourseCheckout } from '../features/payments/payment.service';
import { useAuthStore } from '../store/authStore';
import { formatCurrencyInr } from '../utils/formatters';

export default function CourseDetailPage() {
  const { courseId } = useParams();
  const user = useAuthStore((state) => state.user);
  const { data, isLoading, error, refetch } = useCatalogQuery();
  const [purchaseError, setPurchaseError] = useState('');
  const [isPaying, setIsPaying] = useState(false);

  const course = useMemo(() => (data || []).find((item) => item._id === courseId), [data, courseId]);

  const enroll = async () => {
    if (!user) return;
    setPurchaseError('');
    setIsPaying(true);
    try {
      await startCourseCheckout({ courseId, user });
    } catch (err) {
      setPurchaseError(err?.message || 'Payment failed');
    } finally {
      setIsPaying(false);
    }
  };

  if (isLoading) {
    return (
      <section className="mx-auto max-w-6xl px-4 py-8">
        <LoadingSpinner label="Loading course details..." />
      </section>
    );
  }

  if (error) {
    return (
      <section className="mx-auto max-w-6xl px-4 py-8">
        <ErrorState message={error.message} onRetry={refetch} />
      </section>
    );
  }

  if (!course) {
    return (
      <section className="mx-auto max-w-6xl px-4 py-8">
        <ErrorState message="Course not found in catalog." />
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-4xl px-4 py-8">
      <img src={course.thumbnail} alt={course.title} className="h-72 w-full rounded-xl object-cover" />
      <h1 className="mt-6 text-3xl font-bold">{course.title}</h1>
      <p className="mt-2 text-slate-600">{course.subtitle}</p>
      <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-slate-600">
        <span className="rounded bg-slate-100 px-2 py-1 capitalize">{course.level}</span>
        <span>{course.category}</span>
      </div>
      <p className="mt-6 text-2xl font-semibold text-brand-700">{formatCurrencyInr(course.price)}</p>

      {!user ? (
        <Link to="/login" className="mt-4 inline-flex rounded bg-brand-600 px-4 py-2 font-medium text-white hover:bg-brand-700">
          Login to enroll
        </Link>
      ) : (
        <button
          onClick={enroll}
          disabled={isPaying}
          className="mt-4 rounded bg-brand-600 px-4 py-2 font-medium text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {isPaying ? 'Opening Razorpay...' : 'Enroll with Razorpay'}
        </button>
      )}

      {purchaseError ? <p className="mt-3 text-sm text-red-600">{purchaseError}</p> : null}
    </section>
  );
}
