import { useEffect, type ReactNode } from 'react';

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrador',
  supervisor: 'Supervisor',
  operador: 'Operador',
};
import { useNavigate } from '@tanstack/react-router';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { AppSidebar } from '@/components/AppSidebar';
import { useAuth } from '@/contexts/AuthContext';

export function AppLayout({ children }: { children: ReactNode }) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate({ to: '/login', replace: true });
    }
  }, [isLoading, isAuthenticated]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <span className="h-6 w-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const initials = user!.nome
    .split(' ')
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">

          {/* Header glassmorphism */}
          <header
            className="h-14 flex items-center justify-between px-4 shrink-0 sticky top-0 z-40"
            style={{
              background: 'oklch(1 0 0 / 0.85)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              borderBottom: '1px solid oklch(0.868 0.014 245 / 0.8)',
              boxShadow: '0 1px 0 oklch(0.868 0.014 245 / 0.5)',
            }}
          >
            <div className="flex items-center gap-3">
              <SidebarTrigger className="text-muted-foreground hover:text-foreground transition-colors" />
              <div className="h-4 w-px bg-border hidden sm:block" />
              <span className="text-sm font-medium text-muted-foreground hidden sm:inline tracking-tight">
                Sistema de Preventivas
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* Avatar + nome */}
              <div className="flex items-center gap-2.5 pl-1">
                <Avatar
                  className="h-8 w-8 text-xs font-bold text-white shrink-0"
                  style={{
                    background: 'linear-gradient(135deg, oklch(0.50 0.225 255), oklch(0.44 0.245 272))',
                    boxShadow: '0 2px 8px oklch(0.50 0.225 255 / 0.35)',
                  }}
                >
                  <AvatarFallback
                    className="bg-transparent text-white text-xs font-bold"
                    aria-hidden="true"
                  >
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden sm:block leading-none">
                  <p className="text-sm font-semibold text-foreground leading-tight">{user!.nome.split(' ')[0]}</p>
                  <p className="text-[10px] text-muted-foreground" aria-label={`Perfil: ${user!.role}`}>{ROLE_LABELS[user!.role] ?? user!.role}</p>
                </div>
              </div>
            </div>
          </header>

          <main id="main-content" className="flex-1 overflow-auto" role="main">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
