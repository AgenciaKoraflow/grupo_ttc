import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import type { Profile } from '@/types';

interface AuthContextType {
  user: Profile | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isOperador: boolean;
  needsPasswordChange: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  changePassword: (newPassword: string) => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Limpar qualquer sessão fake persistida
    localStorage.removeItem('auth_user_id');
    setIsLoading(false);
  }, []);

  const login = useCallback(async (_email: string, _password: string): Promise<boolean> => {
    // Autenticação real via Supabase ainda não implementada.
    // Login bloqueado até integração completa.
    return false;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('auth_user_id');
  }, []);

  const changePassword = useCallback((_newPassword: string) => {
    // Sem efeito até autenticação real estar ativa.
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user: null,
        isAuthenticated: false,
        isAdmin: false,
        isOperador: false,
        needsPasswordChange: false,
        login,
        logout,
        changePassword,
        isLoading,
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
