import { create } from 'zustand';

interface AuthState {
  accessToken: string | null;
  user: any | null;
  setAccessToken: (t: string) => void;
  setUser: (u: any) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null, user: null,
  setAccessToken: (t) => set({ accessToken: t }),
  setUser: (u) => set({ user: u }),
  logout: () => set({ accessToken: null, user: null }),
}));
