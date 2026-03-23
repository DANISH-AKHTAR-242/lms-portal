import { useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import ErrorState from '../components/ErrorState';
import LoadingSpinner from '../components/LoadingSpinner';
import { useEnrolledCoursesQuery } from '../features/courses/course.queries';
import { useCourseStore } from '../store/courseStore';

export default function DashboardPage() {
  const enrolledQuery = useEnrolledCoursesQuery(true);
  const setEnrolledCourseIds = useCourseStore((state) => state.setEnrolledCourseIds);

  const enrolledCourses = useMemo(() => enrolledQuery.data?.data || [], [enrolledQuery.data]);

  useEffect(() => {
    setEnrolledCourseIds(enrolledCourses.map((item) => item.course?._id).filter(Boolean));
  }, [enrolledCourses, setEnrolledCourseIds]);

  if (enrolledQuery.isLoading) {
    return (
      <section className="mx-auto max-w-6xl px-4 py-8">
        <LoadingSpinner label="Loading dashboard..." />
      </section>
    );
  }

  if (enrolledQuery.error) {
    return (
      <section className="mx-auto max-w-6xl px-4 py-8">
        <ErrorState message={enrolledQuery.error.message} onRetry={enrolledQuery.refetch} />
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-2xl font-bold">Student dashboard</h1>
      <p className="mt-1 text-slate-600">Your enrolled courses and progress tracking.</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {enrolledCourses.map((item) => (
          <article key={item.course?._id} className="rounded-lg border bg-white p-4">
            <h2 className="font-semibold">{item.course?.title}</h2>
            <p className="mt-1 text-sm text-slate-600">{item.course?.subtitle}</p>
            <Link
              className="mt-3 inline-flex rounded bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700"
              to={`/courses/${item.course?._id}/learn`}
            >
              Continue learning
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}
