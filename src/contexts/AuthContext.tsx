import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import type { Profile, UserRole } from '@/types';
import { mockProfiles } from '@/mock/data';

interface AuthContextType {
  user: Profile | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isOperador: boolean;
  needsPasswordChange: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  switchUser: (userId: string) => void;
  changePassword: (newPassword: string) => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Profile | null>(null);
  const [needsPasswordChange, setNeedsPasswordChange] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [passwordMap, setPasswordMap] = useState<Record<string, string>>({});

  // Inicializar mapa de senhas ao montar
  useEffect(() => {
    const map: Record<string, string> = {};
    mockProfiles.forEach(p => {
      map[p.id] = p.password || 'demo';
    });
    setPasswordMap(map);
  }, []);

  // Carregar user do localStorage ao montar
  useEffect(() => {
    try {
      const saved = localStorage.getItem('auth_user_id');
      if (saved) {
        const found = mockProfiles.find(p => p.id === saved);
        if (found) {
          console.log('✅ User restaurado do localStorage:', found.nome);
          setUser(found);
          setNeedsPasswordChange(found.must_change_password || false);
        }
      }
    } catch (error) {
      console.error('Erro ao restaurar user do localStorage:', error);
    }
    setIsLoading(false);
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    const found = mockProfiles.find(p => p.email === email);
    if (found && passwordMap[found.id] === password) {
      console.log('✅ Login bem-sucedido:', found.nome);
      setUser(found);
      setNeedsPasswordChange(found.must_change_password || false);
      localStorage.setItem('auth_user_id', found.id);
      return true;
    }
    console.warn('❌ Login falhou: email ou senha inválidos');
    return false;
  }, [passwordMap]);

  const logout = useCallback(() => {
    console.log('📤 Logout');
    setUser(null);
    setNeedsPasswordChange(false);
    localStorage.removeItem('auth_user_id');
  }, []);

  const switchUser = useCallback((userId: string) => {
    const found = mockProfiles.find(p => p.id === userId);
    if (found) {
      console.log('🔄 Trocar user:', found.nome);
      setUser(found);
      setNeedsPasswordChange(found.must_change_password || false);
      localStorage.setItem('auth_user_id', found.id);
    }
  }, []);

  const changePassword = useCallback((newPassword: string) => {
    if (user) {
      setPasswordMap(prev => ({ ...prev, [user.id]: newPassword }));
      setUser(prev => prev ? { ...prev, must_change_password: false } : null);
      setNeedsPasswordChange(false);
      console.log('✅ Senha alterada com sucesso');
    }
  }, [user]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isAdmin: user?.role === 'admin',
        isOperador: user?.role === 'operador',
        needsPasswordChange,
        login,
        logout,
        switchUser,
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
