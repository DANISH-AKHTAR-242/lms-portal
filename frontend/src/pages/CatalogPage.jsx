import CourseCard from '../components/CourseCard';
import ErrorState from '../components/ErrorState';
import LoadingSpinner from '../components/LoadingSpinner';
import { useCatalogQuery } from '../features/courses/course.queries';

export default function CatalogPage() {
  const catalogQuery = useCatalogQuery();

  if (catalogQuery.isLoading) {
    return (
      <section className="mx-auto max-w-6xl px-4 py-8">
        <LoadingSpinner label="Loading course catalog..." />
      </section>
    );
  }

  if (catalogQuery.error) {
    return (
      <section className="mx-auto max-w-6xl px-4 py-8">
        <ErrorState message={catalogQuery.error.message} onRetry={catalogQuery.refetch} />
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-2xl font-bold">Course catalog</h1>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {catalogQuery.data?.map((course) => (
          <CourseCard key={course._id} course={course} />
        ))}
      </div>
    </section>
  );
}
