import { create } from 'zustand';

export const useAuthStore = create((set) => ({
  user: null,
  loading: false,
  hasSession: false,
  setLoading: (loading) => set({ loading }),
  setUser: (user) => set({ user, hasSession: Boolean(user), loading: false }),
  clearSession: () => set({ user: null, hasSession: false, loading: false }),
}));
