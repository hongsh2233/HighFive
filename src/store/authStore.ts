'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { UserRole } from '@/types';

interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  setUser: (user: AuthUser | null) => void;
  hasRole: (roles: UserRole[]) => boolean;
  isAdmin: () => boolean;
  isLeader: () => boolean;
  isSuperAdmin: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,

      setUser: (user) => set({ user, isAuthenticated: !!user }),

      hasRole: (roles) => {
        const { user } = get();
        return !!user && roles.includes(user.role);
      },

      isAdmin: () => get().user?.role === 'ADMIN',

      isLeader: () => {
        const role = get().user?.role;
        return role === 'ADMIN' || role === 'LEADER';
      },

      isSuperAdmin: () => get().user?.role === 'SUPERADMIN',
    }),
    {
      name: 'tms-auth',
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
    }
  )
);
