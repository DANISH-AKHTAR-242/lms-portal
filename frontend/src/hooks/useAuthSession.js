import { useEffect } from 'react';
import { useProfileQuery } from '../features/auth/auth.queries';
import { useAuthStore } from '../store/authStore';

export const useAuthSession = () => {
  const setLoading = useAuthStore((state) => state.setLoading);
  const setUser = useAuthStore((state) => state.setUser);
  const clearSession = useAuthStore((state) => state.clearSession);
  const hasSession = useAuthStore((state) => state.hasSession);
  const query = useProfileQuery();

  useEffect(() => {
    setLoading(query.isLoading);
  }, [query.isLoading, setLoading]);

  useEffect(() => {
    if (query.data) {
      setUser(query.data);
    }
  }, [query.data, setUser]);

  useEffect(() => {
    if (query.isError) {
      clearSession();
    }
  }, [query.isError, clearSession]);

  return {
    ...query,
    hasSession,
  };
};
