import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getProfile, signin, signout, signup } from '../../api/authApi';
import { useAuthStore } from '../../store/authStore';

export const AUTH_PROFILE_QUERY_KEY = ['auth', 'profile'];

export const useProfileQuery = () => {
  const setUser = useAuthStore((state) => state.setUser);
  const clearSession = useAuthStore((state) => state.clearSession);

  return useQuery({
    queryKey: AUTH_PROFILE_QUERY_KEY,
    queryFn: getProfile,
    retry: false,
    staleTime: 60_000,
    onSuccess: (user) => setUser(user),
    onError: () => clearSession(),
  });
};

const useAuthMutation = (mutationFn) => {
  const setUser = useAuthStore((state) => state.setUser);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    onSuccess: async (data) => {
      const user = data?.user || data?.data || null;
      if (user) {
        setUser(user);
      }
      await queryClient.invalidateQueries({ queryKey: AUTH_PROFILE_QUERY_KEY });
    },
  });
};

export const useSigninMutation = () => useAuthMutation(signin);
export const useSignupMutation = () => useAuthMutation(signup);

export const useSignoutMutation = () => {
  const clearSession = useAuthStore((state) => state.clearSession);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: signout,
    onSettled: async () => {
      clearSession();
      await queryClient.removeQueries({ queryKey: AUTH_PROFILE_QUERY_KEY });
    },
  });
};
