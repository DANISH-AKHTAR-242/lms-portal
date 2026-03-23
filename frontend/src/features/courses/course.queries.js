import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createCourse,
  getCatalog,
  getCourseProgress,
  getEnrolledCourses,
  getEnrolledStudents,
  uploadLecture,
  watchLecture,
} from '../../api/courseApi';

export const COURSE_CATALOG_QUERY_KEY = ['courses', 'catalog'];

export const useCatalogQuery = () =>
  useQuery({
    queryKey: COURSE_CATALOG_QUERY_KEY,
    queryFn: getCatalog,
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: true,
  });

export const useEnrolledCoursesQuery = (enabled = true) =>
  useQuery({
    queryKey: ['courses', 'enrolled'],
    queryFn: () => getEnrolledCourses({ page: 1, limit: 50 }),
    enabled,
    staleTime: 60_000,
  });

export const useCourseProgressQuery = (courseId, enabled = true) =>
  useQuery({
    queryKey: ['courses', 'progress', courseId],
    queryFn: () => getCourseProgress(courseId, { page: 1, limit: 100 }),
    enabled: enabled && Boolean(courseId),
    staleTime: 15_000,
  });

export const useWatchLectureMutation = (courseId) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ lectureId, watchTime, isCompleted }) =>
      watchLecture(courseId, lectureId, { watchTime, isCompleted }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['courses', 'progress', courseId] });
    },
  });
};

export const useCreateCourseMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createCourse,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: COURSE_CATALOG_QUERY_KEY });
    },
  });
};

export const useUploadLectureMutation = () =>
  useMutation({
    mutationFn: ({ courseId, payload }) => uploadLecture(courseId, payload),
  });

export const useEnrolledStudentsQuery = (courseId, enabled = true) =>
  useQuery({
    queryKey: ['courses', 'students', courseId],
    queryFn: () => getEnrolledStudents(courseId, { page: 1, limit: 100 }),
    enabled: enabled && Boolean(courseId),
  });
