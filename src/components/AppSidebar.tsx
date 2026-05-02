import { Link, useLocation, useNavigate } from '@tanstack/react-router';
import {
  LayoutDashboard, FileText, Users, Wrench, Building2, LogOut, History, Package,
} from 'lucide-react';
import {
  Sidebar, SidebarContent, SidebarGroup,
  SidebarGroupContent, SidebarMenu, SidebarMenuItem, SidebarMenuButton,
  SidebarFooter, useSidebar,
} from '@/components/ui/sidebar';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { useLog } from '@/contexts/LogContext';
import { cn } from '@/lib/utils';

const adminItems = [
  { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard },
  { title: 'Ocorrências', url: '/ocorrencias', icon: FileText },
  { title: 'Equipes', url: '/equipes', icon: Building2 },
  { title: 'Usuários', url: '/usuarios', icon: Users },
  { title: 'Tipos de Serviço', url: '/tipos-servico', icon: Wrench },
  { title: 'Materiais', url: '/materiais', icon: Package },
  { title: 'Logs', url: '/logs', icon: History },
];

const supervisorItems = [
  { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard },
  { title: 'Ocorrências', url: '/ocorrencias', icon: FileText },
  { title: 'Equipes', url: '/equipes', icon: Building2 },
  { title: 'Tipos de Serviço', url: '/tipos-servico', icon: Wrench },
  { title: 'Materiais', url: '/materiais', icon: Package },
  { title: 'Logs', url: '/logs', icon: History },
];

const operadorItems = [
  { title: 'Minhas Ocorrências', url: '/dashboard', icon: LayoutDashboard },
  { title: 'Ocorrências', url: '/ocorrencias', icon: FileText },
];

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrador',
  supervisor: 'Supervisor',
  operador: 'Operador',
};


export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const { user, isAdmin, isSupervisor, isOperador, logout } = useAuth();
  const { addLog } = useLog();
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname;

  const items = isAdmin
    ? adminItems
    : isSupervisor
      ? supervisorItems
      : operadorItems;

  const handleLogout = async () => {
    if (user) {
      addLog({
        userId: user.id,
        userNome: user.nome,
        userRole: user.role,
        tipo: 'LOGOUT',
        categoria: 'AUTENTICACAO',
        entidadeId: user.id,
        entidadeNome: user.email,
        detalhes: `${user.nome} fez logout`,
      });
    }
    await logout();
    navigate({ to: '/login' });
  };

  const initials = user?.nome
    ? user.nome.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
    : '?';

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      {/* Inner wrapper com gradiente navy */}
      <div
        className="flex flex-col h-full"
        style={{
          background: 'linear-gradient(180deg, oklch(0.165 0.032 250) 0%, oklch(0.130 0.028 250) 100%)',
        }}
      >
        {/* Logo */}
        <div className="flex flex-col items-center justify-center gap-2 px-4 py-3 shrink-0"
          style={{ borderBottom: '1px solid oklch(0.24 0.030 250)' }}
        >
          <div className="flex justify-center">
            <img src="/logo-ttc.png" alt="Logo TTC" className="h-8 w-auto rounded-lg max-w-[80%]" style={{ imageRendering: 'auto' }} />
          </div>
          {!collapsed && (
            <div className="text-center">
              <p className="text-xs font-bold text-white tracking-tight leading-tight">GRUPO TTC</p>
              <p className="text-[9px] text-sidebar-foreground/50 tracking-widest uppercase">Preventivas</p>
            </div>
          )}
        </div>

        {/* Conteúdo — usando div direto para controle total do visual */}
        <div className="flex-1 overflow-y-auto py-3 px-2">
          {!collapsed && (
            <p className="text-[10px] font-semibold tracking-widest text-sidebar-foreground/30 uppercase px-3 mb-2">
              Navegação
            </p>
          )}
          <nav className="space-y-0.5" aria-label="Navegação principal">
            {items.map((item) => {
              const active = currentPath === item.url || currentPath.startsWith(item.url + '/');
              return (
                <Link
                  key={item.title}
                  to={item.url}
                  title={collapsed ? item.title : undefined}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150 relative group',
                    active
                      ? 'text-white'
                      : 'text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/60',
                    collapsed && 'justify-center px-2'
                  )}
                  style={active ? {
                    background: 'linear-gradient(135deg, oklch(0.50 0.225 255 / 0.25), oklch(0.44 0.245 272 / 0.15))',
                    boxShadow: 'inset 0 0 0 1px oklch(0.58 0.225 255 / 0.25)',
                  } : undefined}
                >
                  {/* Barra lateral ativa */}
                  {active && (
                    <span
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-full"
                      style={{ background: 'linear-gradient(180deg, oklch(0.72 0.18 255), oklch(0.55 0.22 272))' }}
                    />
                  )}
                  <item.icon className={cn('h-4 w-4 shrink-0', active ? 'text-sidebar-primary' : '')} />
                  {!collapsed && <span>{item.title}</span>}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Footer */}
        <div
          className="shrink-0 p-3"
          style={{ borderTop: '1px solid oklch(0.24 0.030 250)' }}
        >
          {!collapsed && user && (
            <div className="flex items-center gap-2.5 mb-2.5 px-1">
              <Avatar
                className="h-7 w-7 shrink-0"
                style={{
                  background: 'linear-gradient(135deg, oklch(0.50 0.225 255), oklch(0.44 0.245 272))',
                }}
              >
                <AvatarFallback className="bg-transparent text-white text-[10px] font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-sidebar-foreground truncate leading-tight">{user.nome}</p>
                <p className="text-[10px] text-sidebar-foreground/40">{ROLE_LABELS[user.role] ?? user.role}</p>
              </div>
            </div>
          )}

          <button
            onClick={handleLogout}
            aria-label="Sair do sistema"
            className={cn(
              'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/50 hover:text-red-400 hover:bg-red-500/10 transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring',
              collapsed && 'justify-center px-2'
            )}
          >
            <LogOut className="h-4 w-4 shrink-0" aria-hidden="true" />
            {!collapsed && <span>Sair</span>}
          </button>
        </div>
      </div>

      {/* Renderiza os componentes do Sidebar para manter compatibilidade */}
      <SidebarContent className="hidden" />
      <SidebarGroup className="hidden">
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton />
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
      <SidebarFooter className="hidden" />
    </Sidebar>
  );
}
