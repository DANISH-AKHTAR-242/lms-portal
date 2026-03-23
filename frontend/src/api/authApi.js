import api from './http';

export const signup = async (payload) => {
  const { data } = await api.post('/api/v1/user/signup', payload);
  return data;
};

export const signin = async (payload) => {
  const { data } = await api.post('/api/v1/user/signin', payload);
  return data;
};

export const signout = async () => {
  const { data } = await api.post('/api/v1/user/signout');
  return data;
};

export const getProfile = async () => {
  const { data } = await api.get('/api/v1/user/profile');
  return data?.data;
};
