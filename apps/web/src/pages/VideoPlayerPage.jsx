import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import ErrorState from '../components/ErrorState';
import LoadingSpinner from '../components/LoadingSpinner';
import VideoPlayer from '../components/VideoPlayer';
import { useCourseProgressQuery, useWatchLectureMutation } from '../features/courses/course.queries';

export default function VideoPlayerPage() {
  const { courseId } = useParams();
  const progressQuery = useCourseProgressQuery(courseId, true);
  const [activeLectureId, setActiveLectureId] = useState('');
  const watchMutation = useWatchLectureMutation(courseId);

  const lectures = useMemo(() => progressQuery.data?.lectureProgress || [], [progressQuery.data]);
  const activeLecture = useMemo(() => {
    if (!lectures.length) return null;
    if (!activeLectureId) return lectures[0];
    return lectures.find((item) => String(item.lecture?._id) === String(activeLectureId)) || lectures[0];
  }, [lectures, activeLectureId]);

  const markCompleted = async () => {
    if (!activeLecture?.lecture?._id) return;
    await watchMutation.mutateAsync({
      lectureId: activeLecture.lecture._id,
      watchTime: activeLecture.watchTime || activeLecture.lecture.duration || 0,
      isCompleted: true,
    });
  };

  if (progressQuery.isLoading) {
    return (
      <section className="mx-auto max-w-6xl px-4 py-8">
        <LoadingSpinner label="Loading lectures..." />
      </section>
    );
  }

  if (progressQuery.error) {
    return (
      <section className="mx-auto max-w-6xl px-4 py-8">
        <ErrorState message={progressQuery.error.message} onRetry={progressQuery.refetch} />
      </section>
    );
  }

  if (!activeLecture?.lecture) {
    return (
      <section className="mx-auto max-w-6xl px-4 py-8">
        <ErrorState message="No lecture progress found yet for this course." />
      </section>
    );
  }

  return (
    <section className="mx-auto grid max-w-6xl gap-6 px-4 py-8 lg:grid-cols-[2fr,1fr]">
      <div>
        <VideoPlayer src={activeLecture.lecture.videoUrl || ''} title={activeLecture.lecture.title} />
        <h1 className="mt-4 text-2xl font-bold">{activeLecture.lecture.title}</h1>
        <p className="mt-1 text-slate-600">Track and save your progress securely.</p>
        <button
          onClick={markCompleted}
          disabled={watchMutation.isPending}
          className="mt-4 rounded bg-brand-600 px-4 py-2 font-medium text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {watchMutation.isPending ? 'Saving...' : 'Mark completed'}
        </button>
      </div>
      <aside className="rounded-lg border bg-white p-4">
        <h2 className="text-lg font-semibold">Lectures</h2>
        <ul className="mt-3 space-y-2">
          {lectures.map((item) => (
            <li key={item._id}>
              <button
                onClick={() => setActiveLectureId(item.lecture?._id)}
                className="w-full rounded border px-3 py-2 text-left hover:bg-slate-50"
              >
                {item.lecture?.title || 'Untitled lecture'}
              </button>
            </li>
          ))}
        </ul>
      </aside>
    </section>
  );
}
