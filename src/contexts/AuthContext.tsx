import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
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
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Carregar user do localStorage ao montar
  useEffect(() => {
    try {
      const saved = localStorage.getItem('auth_user_id');
      if (saved) {
        const found = mockProfiles.find(p => p.id === saved);
        if (found) {
          console.log('✅ User restaurado do localStorage:', found.nome);
          setUser(found);
        }
      }
    } catch (error) {
      console.error('Erro ao restaurar user do localStorage:', error);
    }
    setIsLoading(false);
  }, []);

  const login = useCallback(async (email: string, _password: string): Promise<boolean> => {
    const found = mockProfiles.find(p => p.email === email);
    if (found) {
      console.log('✅ Login bem-sucedido:', found.nome);
      setUser(found);
      localStorage.setItem('auth_user_id', found.id);
      return true;
    }
    console.warn('❌ Login falhou: email não encontrado');
    return false;
  }, []);

  const logout = useCallback(() => {
    console.log('📤 Logout');
    setUser(null);
    localStorage.removeItem('auth_user_id');
  }, []);

  const switchUser = useCallback((userId: string) => {
    const found = mockProfiles.find(p => p.id === userId);
    if (found) {
      console.log('🔄 Trocar user:', found.nome);
      setUser(found);
      localStorage.setItem('auth_user_id', found.id);
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
