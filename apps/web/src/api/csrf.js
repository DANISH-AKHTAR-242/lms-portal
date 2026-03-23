import { CSRF_TOKEN_ENDPOINT } from '@lms/shared/constants/index';

let csrfToken = null;
let csrfPromise = null;

export const getCachedCsrfToken = () => csrfToken;

export const clearCsrfToken = () => {
  csrfToken = null;
  csrfPromise = null;
};

export const fetchCsrfToken = async (axiosClient) => {
  if (csrfToken) return csrfToken;
  if (csrfPromise) return csrfPromise;

  csrfPromise = axiosClient
    .get(CSRF_TOKEN_ENDPOINT)
    .then((response) => {
      csrfToken = response?.data?.csrfToken || null;
      return csrfToken;
    })
    .finally(() => {
      csrfPromise = null;
    });

  return csrfPromise;
};
