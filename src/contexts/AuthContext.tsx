import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useMemo,
  type ReactNode,
} from "react";
import type { AuthSession } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import type { Profile } from "@/types";

const SESSION_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 horas

function isSessionExpired(session: AuthSession): boolean {
  const lastSignIn = session.user.last_sign_in_at;
  if (!lastSignIn) return false;
  return Date.now() - new Date(lastSignIn).getTime() > SESSION_MAX_AGE_MS;
}

interface LoginResult {
  success: boolean;
  error?: string;
}

interface AuthContextType {
  user: Profile | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isSupervisor: boolean;
  isOperador: boolean;
  // Permissões derivadas
  canDelete: boolean; // admin + supervisor
  canCreate: boolean; // admin + supervisor + operador
  canEdit: boolean; // admin + supervisor + operador
  canReopen: boolean; // admin + supervisor + operador
  canManageUsers: boolean; // admin only
  canViewLogs: boolean; // admin + supervisor
  needsPasswordChange: boolean;
  login: (email: string, password: string) => Promise<LoginResult>;
  logout: () => Promise<void>;
  changePassword: (newPassword: string) => Promise<LoginResult>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();
  if (error) {
    console.error("[Auth] fetchProfile error:", error.code, error.message);
    return null;
  }
  return data as Profile;
}

function translateAuthError(message: string): string {
  if (message.includes("Invalid login credentials"))
    return "Email ou senha incorretos";
  if (message.includes("Email not confirmed"))
    return "Email não confirmado. Verifique sua caixa de entrada";
  if (message.includes("Too many requests"))
    return "Muitas tentativas. Aguarde alguns minutos e tente novamente";
  if (message.includes("User not found")) return "Usuário não encontrado";
  return "Erro ao fazer login. Tente novamente";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      // INITIAL_SESSION: fired immediately on subscribe — handles session restore after refresh
      if (event === "INITIAL_SESSION") {
        if (session?.user) {
          if (isSessionExpired(session)) {
            await supabase.auth.signOut();
          } else {
            const profile = await fetchProfile(session.user.id);
            setUser(profile);
          }
        }
        setIsLoading(false);
      }

      // TOKEN_REFRESHED: Supabase rotated the access token — check 24h limit and re-sync profile
      if (event === "TOKEN_REFRESHED" && session?.user) {
        if (isSessionExpired(session)) {
          await supabase.auth.signOut();
          return;
        }
        const profile = await fetchProfile(session.user.id);
        setUser(profile);
      }

      // SIGNED_OUT: fired on signOut() or session expiry
      if (event === "SIGNED_OUT") {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = useCallback(
    async (email: string, password: string): Promise<LoginResult> => {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { success: false, error: translateAuthError(error.message) };
      }

      if (!data.user) {
        return { success: false, error: "Erro inesperado. Tente novamente" };
      }

      const profile = await fetchProfile(data.user.id);
      if (!profile) {
        // Auth succeeded but no profile row — sign out to keep state clean
        await supabase.auth.signOut();
        return {
          success: false,
          error:
            "Perfil de usuário não encontrado. Contate o administrador do sistema.",
        };
      }

      // Set user before returning so navigation finds isAuthenticated = true
      setUser(profile);
      return { success: true };
    },
    [],
  );

  const logout = useCallback(async (): Promise<void> => {
    await supabase.auth.signOut();
    setUser(null);
  }, []);

  const changePassword = useCallback(
    async (newPassword: string): Promise<LoginResult> => {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      // Clear must_change_password flag — ignore error if column doesn't exist
      if (user) {
        await supabase
          .from("profiles")
          .update({ must_change_password: false })
          .eq("id", user.id);
        setUser({ ...user, must_change_password: false });
      }

      return { success: true };
    },
    [user],
  );

  const value = useMemo(() => {
    const isAdmin = user?.role === "admin";
    const isSupervisor = user?.role === "supervisor";
    const isOperador = user?.role === "operador";
    return {
      user,
      isAuthenticated: !!user,
      isAdmin,
      isSupervisor,
      isOperador,
      canDelete: isAdmin || isSupervisor,
      canCreate: isAdmin || isSupervisor || isOperador,
      canEdit: isAdmin || isSupervisor || isOperador,
      canReopen: isAdmin || isSupervisor || isOperador,
      canManageUsers: isAdmin,
      canViewLogs: isAdmin || isSupervisor,
      needsPasswordChange: !!user?.must_change_password,
      login,
      logout,
      changePassword,
      isLoading,
    };
  }, [user, isLoading, login, logout, changePassword]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
