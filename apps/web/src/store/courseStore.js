import { create } from 'zustand';

export const useCourseStore = create((set) => ({
  selectedCourse: null,
  enrolledCourseIds: [],
  progressByCourse: {},
  setSelectedCourse: (selectedCourse) => set({ selectedCourse }),
  setEnrolledCourseIds: (enrolledCourseIds) => set({ enrolledCourseIds }),
  setCourseProgress: (courseId, progress) =>
    set((state) => ({
      progressByCourse: { ...state.progressByCourse, [courseId]: progress },
    })),
}));
