import api from './http';

export const getCatalog = async () => {
  const { data } = await api.get('/api/v1/courses/catalog');
  return data?.data || [];
};

export const getEnrolledCourses = async (params) => {
  const { data } = await api.get('/api/v1/courses/enrolled', { params });
  return data;
};

export const getCourseProgress = async (courseId, params) => {
  const { data } = await api.get(`/api/v1/courses/${courseId}/progress`, { params });
  return data?.data;
};

export const watchLecture = async (courseId, lectureId, payload) => {
  const { data } = await api.post(`/api/v1/courses/${courseId}/lectures/${lectureId}/watch`, payload);
  return data;
};

export const createCourse = async (payload) => {
  const { data } = await api.post('/api/v1/courses', payload);
  return data?.data;
};

export const uploadLecture = async (courseId, payload) => {
  const formData = new FormData();
  formData.append('title', payload.title);
  formData.append('description', payload.description || '');
  formData.append('duration', String(payload.duration || 0));
  formData.append('isPreview', String(Boolean(payload.isPreview)));
  formData.append('video', payload.video);

  const { data } = await api.post(`/api/v1/courses/${courseId}/lectures`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data?.data;
};

export const getEnrolledStudents = async (courseId, params) => {
  const { data } = await api.get(`/api/v1/courses/${courseId}/students`, { params });
  return data;
};
