import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { useData } from "@/contexts/DataContext";
import { AppLayout } from "@/components/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, UserCog, Shield, Clock, CheckCircle, Activity, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/usuarios")({
  component: UsuariosPage,
});

const C = {
  primary: 'oklch(0.50 0.225 255)',
  success: 'oklch(0.36 0.14 150)',
  admin: 'oklch(0.50 0.235 27)',
  muted: 'oklch(0.46 0.028 252)',
};

function StatCard({ label, value, icon: Icon, color }: { label: string; value: number; icon: React.ElementType; color: string }) {
  return (
    <div className="bg-card border border-border/60 rounded-xl p-4" style={{ boxShadow: '0 1px 3px oklch(0.115 0.028 252 / 0.06)' }}>
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg flex items-center justify-center" style={{ background: `${color}15` }}>
          <Icon className="h-5 w-5" style={{ color }} />
        </div>
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </div>
    </div>
  );
}

function UsuariosPage() {
  const { profiles, equipes, ocorrencias } = useData();

  const stats = useMemo(() => {
    const admins = profiles.filter(p => p.role === 'admin').length;
    const operadores = profiles.filter(p => p.role === 'operador').length;
    const comEquipe = profiles.filter(p => p.equipe_id).length;
    const semEquipe = profiles.filter(p => !p.equipe_id).length;
    return { admins, operadores, comEquipe, semEquipe };
  }, [profiles]);

  const userStats = useMemo(() => {
    return profiles.map(p => {
      const userOcs = ocorrencias.filter(o => o.equipe_id === p.equipe_id);
      const finalizadas = userOcs.filter(o => o.status === 'FINALIZADA' && o.finalized_by === p.id).length;
      const pendentes = userOcs.filter(o => o.status === 'PENDENTE').length;
      const emAndamento = userOcs.filter(o => o.status === 'EM_ANDAMENTO').length;
      return {
        id: p.id,
        total: userOcs.length,
        finalizadas,
        pendentes,
        emAndamento,
      };
    });
  }, [profiles, ocorrencias]);

  const getUserStats = (userId: string) => userStats.find(s => s.id === userId);
  const getInitials = (nome: string) => nome.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();

  return (
    <AppLayout>
      <div className="p-6 space-y-6 max-w-5xl mx-auto">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <UserCog className="h-6 w-6" />
              Usuários
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Gerencie operadores e administradores do sistema
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <StatCard label="Total de Usuários" value={profiles.length} icon={Users} color={C.primary} />
          <StatCard label="Administradores" value={stats.admins} icon={Shield} color={C.admin} />
          <StatCard label="Operadores" value={stats.operadores} icon={Users} color={C.success} />
          <StatCard label="Sem Equipe" value={stats.semEquipe} icon={Building2} color={C.muted} />
        </div>

        <div className="border border-border/60 rounded-xl overflow-hidden bg-card" style={{ boxShadow: '0 1px 3px oklch(0.115 0.028 252 / 0.06), 0 4px 12px oklch(0.115 0.028 252 / 0.04)' }}>
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead>Usuário</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Perfil</TableHead>
                <TableHead>Equipe</TableHead>
                <TableHead className="w-[80px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {profiles.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Nenhum usuário encontrado
                  </TableCell>
                </TableRow>
              ) : profiles.map(p => {
                const s = getUserStats(p.id);
                const initials = getInitials(p.nome);
                return (
                  <TableRow key={p.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                          style={{ background: 'linear-gradient(135deg, oklch(0.50 0.225 255), oklch(0.44 0.245 272))' }}>
                          {initials}
                        </div>
                        <span className="font-medium">{p.nome}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">{p.email}</TableCell>
                    <TableCell>
                      <Badge 
                        variant={p.role === 'admin' ? 'default' : 'secondary'}
                        className={cn('text-xs capitalize', p.role === 'admin' && 'bg-purple-100 text-purple-700')}
                      >
                        <Shield className="h-3 w-3 mr-1" />
                        {p.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {p.equipe_id ? (
                        <span className="text-sm">{equipes.find(e => e.id === p.equipe_id)?.nome}</span>
                      ) : (
                        <span className="text-muted-foreground text-sm">Sem equipe</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-muted-foreground">—</span>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>
    </AppLayout>
  );
}
