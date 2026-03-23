import { useMemo, useState } from 'react';
import ErrorState from '../components/ErrorState';
import {
  useCatalogQuery,
  useCreateCourseMutation,
  useEnrolledStudentsQuery,
  useUploadLectureMutation,
} from '../features/courses/course.queries';
import { useAuthStore } from '../store/authStore';

const initialCourseForm = {
  title: '',
  subtitle: '',
  description: '',
  category: 'development',
  level: 'beginner',
  price: 0,
  thumbnail: 'https://placehold.co/600x400?text=LMS+Course',
};

export default function InstructorDashboardPage() {
  const user = useAuthStore((state) => state.user);
  const [courseForm, setCourseForm] = useState(initialCourseForm);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [lectureForm, setLectureForm] = useState({
    title: '',
    description: '',
    duration: 0,
    isPreview: false,
    video: null,
  });

  const createCourseMutation = useCreateCourseMutation();
  const uploadLectureMutation = useUploadLectureMutation();
  const catalogQuery = useCatalogQuery();

  const instructorCourses = useMemo(
    () => (catalogQuery.data || []).filter((course) => course.instructor?._id === user?._id),
    [catalogQuery.data, user?._id],
  );

  const studentsQuery = useEnrolledStudentsQuery(selectedCourseId, Boolean(selectedCourseId));

  const submitCourse = async (event) => {
    event.preventDefault();
    const created = await createCourseMutation.mutateAsync({ ...courseForm, price: Number(courseForm.price) });
    setSelectedCourseId(created?._id || '');
    setCourseForm(initialCourseForm);
  };

  const submitLecture = async (event) => {
    event.preventDefault();
    if (!selectedCourseId || !lectureForm.video) return;

    await uploadLectureMutation.mutateAsync({
      courseId: selectedCourseId,
      payload: lectureForm,
    });

    setLectureForm({
      title: '',
      description: '',
      duration: 0,
      isPreview: false,
      video: null,
    });
  };

  return (
    <section className="mx-auto grid max-w-6xl gap-6 px-4 py-8 lg:grid-cols-2">
      <div className="rounded-lg border bg-white p-4">
        <h1 className="text-xl font-bold">Create course</h1>
        <form className="mt-4 space-y-3" onSubmit={submitCourse}>
          <input
            className="w-full rounded border px-3 py-2"
            required
            placeholder="Title"
            value={courseForm.title}
            onChange={(event) => setCourseForm((prev) => ({ ...prev, title: event.target.value }))}
          />
          <input
            className="w-full rounded border px-3 py-2"
            placeholder="Subtitle"
            value={courseForm.subtitle}
            onChange={(event) => setCourseForm((prev) => ({ ...prev, subtitle: event.target.value }))}
          />
          <textarea
            className="w-full rounded border px-3 py-2"
            placeholder="Description"
            value={courseForm.description}
            onChange={(event) => setCourseForm((prev) => ({ ...prev, description: event.target.value }))}
          />
          <div className="grid grid-cols-2 gap-3">
            <input
              className="w-full rounded border px-3 py-2"
              placeholder="Category"
              value={courseForm.category}
              onChange={(event) => setCourseForm((prev) => ({ ...prev, category: event.target.value }))}
            />
            <select
              className="w-full rounded border px-3 py-2"
              value={courseForm.level}
              onChange={(event) => setCourseForm((prev) => ({ ...prev, level: event.target.value }))}
            >
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>
          <input
            className="w-full rounded border px-3 py-2"
            type="number"
            min="0"
            placeholder="Price"
            value={courseForm.price}
            onChange={(event) => setCourseForm((prev) => ({ ...prev, price: event.target.value }))}
          />
          <input
            className="w-full rounded border px-3 py-2"
            required
            placeholder="Thumbnail URL"
            value={courseForm.thumbnail}
            onChange={(event) => setCourseForm((prev) => ({ ...prev, thumbnail: event.target.value }))}
          />
          <button className="rounded bg-brand-600 px-4 py-2 text-white hover:bg-brand-700" type="submit">
            Create course
          </button>
        </form>
        {createCourseMutation.error ? <ErrorState message={createCourseMutation.error.message} /> : null}
      </div>

      <div className="rounded-lg border bg-white p-4">
        <h2 className="text-xl font-bold">Upload lecture</h2>
        <select
          className="mt-3 w-full rounded border px-3 py-2"
          value={selectedCourseId}
          onChange={(event) => setSelectedCourseId(event.target.value)}
        >
          <option value="">Select course</option>
          {instructorCourses.map((course) => (
            <option key={course._id} value={course._id}>
              {course.title}
            </option>
          ))}
        </select>
        <form className="mt-3 space-y-3" onSubmit={submitLecture}>
          <input
            className="w-full rounded border px-3 py-2"
            required
            placeholder="Lecture title"
            value={lectureForm.title}
            onChange={(event) => setLectureForm((prev) => ({ ...prev, title: event.target.value }))}
          />
          <textarea
            className="w-full rounded border px-3 py-2"
            placeholder="Lecture description"
            value={lectureForm.description}
            onChange={(event) => setLectureForm((prev) => ({ ...prev, description: event.target.value }))}
          />
          <input
            className="w-full rounded border px-3 py-2"
            type="number"
            min="0"
            placeholder="Duration"
            value={lectureForm.duration}
            onChange={(event) => setLectureForm((prev) => ({ ...prev, duration: event.target.value }))}
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={lectureForm.isPreview}
              onChange={(event) =>
                setLectureForm((prev) => ({ ...prev, isPreview: event.target.checked }))
              }
            />
            Preview lecture
          </label>
          <input
            className="w-full rounded border px-3 py-2"
            type="file"
            accept="video/*"
            onChange={(event) =>
              setLectureForm((prev) => ({ ...prev, video: event.target.files?.[0] || null }))
            }
          />
          <button className="rounded bg-brand-600 px-4 py-2 text-white hover:bg-brand-700" type="submit">
            Upload lecture
          </button>
        </form>

        {uploadLectureMutation.error ? <ErrorState message={uploadLectureMutation.error.message} /> : null}

        {selectedCourseId ? (
          <div className="mt-6 rounded border border-slate-200 p-3">
            <h3 className="font-semibold">Enrolled students</h3>
            <ul className="mt-2 space-y-1 text-sm">
              {(studentsQuery.data?.data || []).map((student) => (
                <li key={student._id}>
                  {student.name} ({student.email})
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </section>
  );
}
