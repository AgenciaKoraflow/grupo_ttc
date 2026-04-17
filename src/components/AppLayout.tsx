import type { ReactNode } from 'react';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { useAuth } from '@/contexts/AuthContext';
import { Bell } from 'lucide-react';

export function AppLayout({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const initials = user?.nome
    ? user.nome.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
    : '?';

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">

          {/* Header glassmorphism */}
          <header className="h-14 flex items-center justify-between px-4 shrink-0 sticky top-0 z-40"
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

            {user && (
              <div className="flex items-center gap-2">
                {/* Sino de notificações decorativo */}
                <button className="relative h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-all duration-150">
                  <Bell className="h-4 w-4" />
                </button>

                <div className="h-4 w-px bg-border" />

                {/* Avatar + nome */}
                <div className="flex items-center gap-2.5 pl-1">
                  <div
                    className="h-8 w-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold text-white"
                    style={{
                      background: 'linear-gradient(135deg, oklch(0.50 0.225 255), oklch(0.44 0.245 272))',
                      boxShadow: '0 2px 8px oklch(0.50 0.225 255 / 0.35)',
                    }}
                  >
                    {initials}
                  </div>
                  <div className="hidden sm:block leading-none">
                    <p className="text-sm font-semibold text-foreground leading-tight">{user.nome.split(' ')[0]}</p>
                    <p className="text-[10px] text-muted-foreground capitalize">{user.role}</p>
                  </div>
                </div>
              </div>
            )}
          </header>

          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
