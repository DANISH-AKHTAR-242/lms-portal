import { Link } from 'react-router-dom';
import { formatCurrencyInr } from '../utils/formatters';

export default function CourseCard({ course }) {
  return (
    <article className="overflow-hidden rounded-lg border bg-white shadow-sm">
      <img
        src={course.thumbnail}
        alt={course.title}
        className="h-44 w-full object-cover"
        loading="lazy"
      />
      <div className="space-y-2 p-4">
        <h3 className="text-lg font-semibold text-slate-900">{course.title}</h3>
        <p className="line-clamp-2 text-sm text-slate-600">{course.subtitle || course.description}</p>
        <div className="flex items-center justify-between text-sm">
          <span className="rounded bg-slate-100 px-2 py-1 capitalize">{course.level}</span>
          <span className="font-semibold text-brand-700">{formatCurrencyInr(course.price)}</span>
        </div>
        <Link
          to={`/courses/${course._id}`}
          className="inline-flex rounded bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700"
        >
          View details
        </Link>
      </div>
    </article>
  );
}
