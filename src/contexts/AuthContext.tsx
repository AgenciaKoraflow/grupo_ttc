import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { Profile, UserRole } from '@/types';
import { mockProfiles } from '@/mock/data';

interface AuthContextType {
  user: Profile | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isOperador: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  switchUser: (userId: string) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Profile | null>(() => {
    if (typeof window === 'undefined') return null;
    const saved = localStorage.getItem('prev_user_id');
    if (saved) return mockProfiles.find(p => p.id === saved) ?? null;
    return null;
  });

  const login = useCallback(async (email: string, _password: string): Promise<boolean> => {
    const found = mockProfiles.find(p => p.email === email);
    if (found) {
      setUser(found);
      localStorage.setItem('prev_user_id', found.id);
      return true;
    }
    return false;
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem('prev_user_id');
  }, []);

  const switchUser = useCallback((userId: string) => {
    const found = mockProfiles.find(p => p.id === userId);
    if (found) {
      setUser(found);
      localStorage.setItem('prev_user_id', found.id);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isAdmin: user?.role === 'admin',
        isOperador: user?.role === 'operador',
        login,
        logout,
        switchUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
