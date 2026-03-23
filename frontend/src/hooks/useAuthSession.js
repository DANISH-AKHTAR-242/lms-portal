import { useEffect } from 'react';
import { useProfileQuery } from '../features/auth/auth.queries';
import { useAuthStore } from '../store/authStore';

export const useAuthSession = () => {
  const setLoading = useAuthStore((state) => state.setLoading);
  const hasSession = useAuthStore((state) => state.hasSession);
  const query = useProfileQuery();

  useEffect(() => {
    setLoading(query.isLoading);
  }, [query.isLoading, setLoading]);

  return {
    ...query,
    hasSession,
  };
};
