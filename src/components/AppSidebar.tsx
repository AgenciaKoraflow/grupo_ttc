import { Link, useLocation } from '@tanstack/react-router';
import {
  LayoutDashboard, FileText, Upload, Users, Wrench, Building2, LogOut, Shield,
} from 'lucide-react';
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupLabel,
  SidebarGroupContent, SidebarMenu, SidebarMenuItem, SidebarMenuButton,
  SidebarFooter, useSidebar,
} from '@/components/ui/sidebar';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

const adminItems = [
  { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard },
  { title: 'Ocorrências', url: '/ocorrencias', icon: FileText },
  { title: 'Importar CSV', url: '/importar-csv', icon: Upload },
  { title: 'Equipes', url: '/equipes', icon: Building2 },
  { title: 'Usuários', url: '/usuarios', icon: Users },
  { title: 'Tipos de Serviço', url: '/tipos-servico', icon: Wrench },
];

const operadorItems = [
  { title: 'Minhas Ocorrências', url: '/dashboard', icon: LayoutDashboard },
  { title: 'Ocorrências', url: '/ocorrencias', icon: FileText },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const { user, isAdmin, logout } = useAuth();
  const location = useLocation();
  const currentPath = location.pathname;
  const items = isAdmin ? adminItems : operadorItems;

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <div className="flex h-14 items-center gap-2 px-4 border-b border-sidebar-border">
        <Shield className="h-6 w-6 text-sidebar-primary shrink-0" />
        {!collapsed && (
          <span className="font-bold text-sm text-sidebar-foreground tracking-tight">
            PREVENTIVAS
          </span>
        )}
      </div>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const active = currentPath === item.url || currentPath.startsWith(item.url + '/');
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <Link
                        to={item.url}
                        className={cn(
                          'flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors',
                          active
                            ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                            : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                        )}
                      >
                        <item.icon className="h-4 w-4 shrink-0" />
                        {!collapsed && <span>{item.title}</span>}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border p-3">
        {!collapsed && user && (
          <div className="mb-2 px-1">
            <p className="text-xs font-medium text-sidebar-foreground truncate">{user.nome}</p>
            <p className="text-xs text-sidebar-foreground/50 capitalize">{user.role}</p>
          </div>
        )}
        <SidebarMenuButton asChild>
          <button
            onClick={logout}
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground transition-colors"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {!collapsed && <span>Sair</span>}
          </button>
        </SidebarMenuButton>
      </SidebarFooter>
    </Sidebar>
  );
}
