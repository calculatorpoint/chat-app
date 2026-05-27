import { create } from 'zustand';
import { User } from 'firebase/auth';
import { auth } from '../services/firebase';

interface AuthState {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  adminRole: "super_admin" | "moderator" | null;
  systemSettings: any;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  setIsAdmin: (isAdmin: boolean) => void;
  setAdminRole: (role: "super_admin" | "moderator" | null) => void;
  setSystemSettings: (settings: any) => void;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,
  isAdmin: false,
  adminRole: null,
  systemSettings: null,
  setUser: (user) => set({ user }),
  setLoading: (loading) => set({ loading }),
  setIsAdmin: (isAdmin) => set({ isAdmin }),
  setAdminRole: (role) => set({ adminRole: role }),
  setSystemSettings: (settings) => set({ systemSettings: settings }),
  logout: async () => {
    await auth.signOut();
    set({ user: null, isAdmin: false, adminRole: null });
  },
}));
