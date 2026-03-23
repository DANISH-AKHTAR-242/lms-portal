import { API_PREFIX } from '@lms/shared/constants/index';
import api from './http';

export const signup = async (payload) => {
  const { data } = await api.post(`${API_PREFIX}/user/signup`, payload);
  return data;
};

export const signin = async (payload) => {
  const { data } = await api.post(`${API_PREFIX}/user/signin`, payload);
  return data;
};

export const signout = async () => {
  const { data } = await api.post(`${API_PREFIX}/user/signout`);
  return data;
};

export const getProfile = async () => {
  const { data } = await api.get(`${API_PREFIX}/user/profile`);
  return data?.data;
};
