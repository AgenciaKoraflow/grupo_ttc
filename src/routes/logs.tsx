import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useData } from "@/contexts/DataContext";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  History, Search, Download, Filter, User, Clock, FileText, 
  CheckCircle, PlayCircle, AlertCircle, Edit3, Eye, Trash2, Plus, Link
} from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/logs")({
  component: LogsPage,
});

const C = {
  primary: 'oklch(0.50 0.225 255)',
  success: 'oklch(0.36 0.14 150)',
  warning: 'oklch(0.40 0.12 70)',
  danger: 'oklch(0.50 0.235 27)',
  muted: 'oklch(0.46 0.028 252)',
};

type LogTipo = 'CRIACAO' | 'ATUALIZACAO' | 'VISUALIZACAO' | 'FINALIZACAO' | 'REABERTURA' | 'VINCULACAO' | 'EXCLUSAO';
type LogCategoria = 'OCORRENCIA' | 'SERVICO' | 'EQUIPE' | 'USUARIO' | 'TIPO_SERVICO';

interface LogEntry {
  id: string;
  userId: string;
  userNome: string;
  userRole: 'admin' | 'operador' | 'sistema';
  tipo: LogTipo;
  categoria: LogCategoria;
  entidadeId: string;
  entidadeNome: string;
  detalhes: string;
  created_at: string;
}

const TIPOS_LOG: Record<LogTipo, { label: string; color: string; icon: React.ElementType }> = {
  CRIACAO: { label: 'Criação', color: 'bg-green-100 text-green-700', icon: Plus },
  ATUALIZACAO: { label: 'Atualização', color: 'bg-blue-100 text-blue-700', icon: Edit3 },
  VISUALIZACAO: { label: 'Visualização', color: 'bg-gray-100 text-gray-700', icon: Eye },
  FINALIZACAO: { label: 'Finalização', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  REABERTURA: { label: 'Reabertura', color: 'bg-amber-100 text-amber-700', icon: PlayCircle },
  VINCULACAO: { label: 'Vinculação', color: 'bg-purple-100 text-purple-700', icon: Link },
  EXCLUSAO: { label: 'Exclusão', color: 'bg-red-100 text-red-700', icon: Trash2 },
};

const CATEGORIAS: Record<LogCategoria, string> = {
  OCORRENCIA: 'Ocorrência',
  SERVICO: 'Serviço',
  EQUIPE: 'Equipe',
  USUARIO: 'Usuário',
  TIPO_SERVICO: 'Tipo de Serviço',
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

function LogsPage() {
  const { user } = useAuth();
  const { ocorrencias, equipes, profiles, tiposServico } = useData();
  const [search, setSearch] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<LogTipo | 'TODOS'>('TODOS');
  const [filtroCategoria, setFiltroCategoria] = useState<LogCategoria | 'TODOS'>('TODOS');
  const [filtroPerfil, setFiltroPerfil] = useState<'admin' | 'operador' | 'sistema' | 'TODOS'>('TODOS');

  const logs = useMemo(() => {
    const entries: LogEntry[] = [];
    let logId = 1;

    const getUserProfile = (userId: string | null) => {
      if (!userId || userId === 'sistema') {
        return { nome: 'Sistema', role: 'sistema' as const };
      }
      const profile = profiles.find(p => p.id === userId);
      return profile ? { nome: profile.nome, role: profile.role } : { nome: 'Desconhecido', role: 'operador' as const };
    };

    ocorrencias.forEach(oc => {
      const creatorProfile = getUserProfile(oc.finalized_by);
      entries.push({
        id: `log-${logId++}`,
        userId: oc.finalized_by || 'sistema',
        userNome: creatorProfile.nome,
        userRole: creatorProfile.role,
        tipo: 'CRIACAO',
        categoria: 'OCORRENCIA',
        entidadeId: oc.id,
        entidadeNome: oc.id_ocorrencia,
        detalhes: `Ocorrência criada em ${oc.municipio}`,
        created_at: oc.created_at,
      });

      if (oc.status === 'FINALIZADA' && oc.finalized_at) {
        const finalProfile = getUserProfile(oc.finalized_by);
        entries.push({
          id: `log-${logId++}`,
          userId: oc.finalized_by || 'sistema',
          userNome: finalProfile.nome,
          userRole: finalProfile.role,
          tipo: 'FINALIZACAO',
          categoria: 'OCORRENCIA',
          entidadeId: oc.id,
          entidadeNome: oc.id_ocorrencia,
          detalhes: `Ocorrência finalizada`,
          created_at: oc.finalized_at,
        });
      }

      if (oc.equipe_id) {
        const eq = equipes.find(e => e.id === oc.equipe_id);
        if (eq) {
          entries.push({
            id: `log-${logId++}`,
            userId: 'sistema',
            userNome: 'Sistema',
            userRole: 'sistema',
            tipo: 'VINCULACAO',
            categoria: 'OCORRENCIA',
            entidadeId: oc.id,
            entidadeNome: oc.id_ocorrencia,
            detalhes: `Vinculada à equipe ${eq.nome}`,
            created_at: oc.updated_at,
          });
        }
      }
    });

    equipes.forEach(eq => {
      const currentUser = user || { id: 'admin', nome: 'Admin', role: 'admin' };
      entries.push({
        id: `log-${logId++}`,
        userId: currentUser.id,
        userNome: currentUser.nome,
        userRole: currentUser.role,
        tipo: 'CRIACAO',
        categoria: 'EQUIPE',
        entidadeId: eq.id,
        entidadeNome: eq.nome,
        detalhes: `Equipe ${eq.ativa ? 'ativada' : 'criada'}`,
        created_at: eq.created_at,
      });
    });

    tiposServico.forEach(ts => {
      const currentUser = user || { id: 'admin', nome: 'Admin', role: 'admin' };
      entries.push({
        id: `log-${logId++}`,
        userId: currentUser.id,
        userNome: currentUser.nome,
        userRole: currentUser.role,
        tipo: 'CRIACAO',
        categoria: 'TIPO_SERVICO',
        entidadeId: ts.id,
        entidadeNome: ts.nome,
        detalhes: `Tipo de serviço criado`,
        created_at: ts.created_at,
      });
    });

    return entries.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [ocorrencias, equipes, profiles, tiposServico, user]);

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const matchSearch = search === '' || 
        log.entidadeNome.toLowerCase().includes(search.toLowerCase()) ||
        log.userNome.toLowerCase().includes(search.toLowerCase()) ||
        log.detalhes.toLowerCase().includes(search.toLowerCase());
      const matchTipo = filtroTipo === 'TODOS' || log.tipo === filtroTipo;
      const matchCategoria = filtroCategoria === 'TODOS' || log.categoria === filtroCategoria;
      const matchPerfil = filtroPerfil === 'TODOS' || log.userRole === filtroPerfil;
      return matchSearch && matchTipo && matchCategoria && matchPerfil;
    });
  }, [logs, search, filtroTipo, filtroCategoria, filtroPerfil]);

  const stats = useMemo(() => ({
    total: logs.length,
    criacoes: logs.filter(l => l.tipo === 'CRIACAO').length,
    atualizacoes: logs.filter(l => l.tipo === 'ATUALIZACAO').length,
    finalizacoes: logs.filter(l => l.tipo === 'FINALIZACAO').length,
    porAdmin: logs.filter(l => l.userRole === 'admin').length,
    porOperador: logs.filter(l => l.userRole === 'operador').length,
    porSistema: logs.filter(l => l.userRole === 'sistema').length,
  }), [logs]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const exportLogs = () => {
    const csv = [
      ['Data', 'Usuário', 'Perfil', 'Tipo', 'Categoria', 'Entidade', 'Detalhes'].join(','),
      ...filteredLogs.map(log => [
        formatDate(log.created_at),
        log.userNome,
        log.userRole,
        log.tipo,
        log.categoria,
        log.entidadeNome,
        `"${log.detalhes}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `logs-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <AppLayout>
      <div className="p-6 space-y-6 max-w-6xl mx-auto">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <History className="h-6 w-6" />
              Logs de Atividade
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Histórico completo de todas as ações realizadas no sistema
            </p>
          </div>
          <Button variant="outline" size="sm" className="gap-1" onClick={exportLogs}>
            <Download className="h-4 w-4" /> Exportar
          </Button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          <StatCard label="Total de Logs" value={stats.total} icon={History} color={C.primary} />
          <StatCard label="Por Admin" value={stats.porAdmin} icon={History} color="oklch(0.50 0.225 255)" />
          <StatCard label="Por Operador" value={stats.porOperador} icon={History} color="oklch(0.36 0.14 150)" />
          <StatCard label="Criações" value={stats.criacoes} icon={Plus} color={C.success} />
          <StatCard label="Atualizações" value={stats.atualizacoes} icon={Edit3} color={C.warning} />
          <StatCard label="Finalizações" value={stats.finalizacoes} icon={CheckCircle} color={C.muted} />
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar logs..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <select 
            value={filtroTipo}
            onChange={(e) => setFiltroTipo(e.target.value as LogTipo | 'TODOS')}
            className="h-10 px-3 rounded-md border border-input bg-background text-sm"
          >
            <option value="TODOS">Todos os tipos</option>
            {Object.entries(TIPOS_LOG).map(([tipo, config]) => (
              <option key={tipo} value={tipo}>{config.label}</option>
            ))}
          </select>
          <select 
            value={filtroCategoria}
            onChange={(e) => setFiltroCategoria(e.target.value as LogCategoria | 'TODOS')}
            className="h-10 px-3 rounded-md border border-input bg-background text-sm"
          >
            <option value="TODOS">Todas as categorias</option>
            {Object.entries(CATEGORIAS).map(([cat, label]) => (
              <option key={cat} value={cat}>{label}</option>
            ))}
          </select>
          <select 
            value={filtroPerfil}
            onChange={(e) => setFiltroPerfil(e.target.value as 'admin' | 'operador' | 'sistema' | 'TODOS')}
            className="h-10 px-3 rounded-md border border-input bg-background text-sm"
          >
            <option value="TODOS">Todos os perfis</option>
            <option value="admin">Administrador</option>
            <option value="operador">Operador</option>
            <option value="sistema">Sistema</option>
          </select>
        </div>

        <div className="border border-border/60 rounded-xl overflow-hidden bg-card" style={{ boxShadow: '0 1px 3px oklch(0.115 0.028 252 / 0.06), 0 4px 12px oklch(0.115 0.028 252 / 0.04)' }}>
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="w-[140px]">Data/Hora</TableHead>
                <TableHead className="w-[180px]">Usuário</TableHead>
                <TableHead className="w-[100px]">Perfil</TableHead>
                <TableHead className="w-[120px]">Tipo</TableHead>
                <TableHead className="w-[130px]">Categoria</TableHead>
                <TableHead>Entidade</TableHead>
                <TableHead>Detalhes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Nenhum log encontrado
                  </TableCell>
                </TableRow>
              ) : filteredLogs.slice(0, 100).map(log => {
                const tipoConfig = TIPOS_LOG[log.tipo];
                const roleColors = {
                  admin: 'bg-purple-100 text-purple-700',
                  operador: 'bg-blue-100 text-blue-700',
                  sistema: 'bg-gray-100 text-gray-700',
                };
                return (
                  <TableRow key={log.id}>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3 w-3" />
                        {formatDate(log.created_at)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white bg-gradient-to-br from-blue-500 to-blue-600">
                          {log.userNome.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}
                        </div>
                        <span className="text-sm">{log.userNome}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={cn('text-xs capitalize', roleColors[log.userRole])}>
                        {log.userRole === 'sistema' ? 'Sistema' : log.userRole}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={cn('text-xs', tipoConfig.color)}>
                        <tipoConfig.icon className="h-3 w-3 mr-1" />
                        {tipoConfig.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{CATEGORIAS[log.categoria]}</span>
                    </TableCell>
                    <TableCell className="font-medium">{log.entidadeNome}</TableCell>
                    <TableCell className="text-muted-foreground text-sm max-w-xs truncate">
                      {log.detalhes}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          {filteredLogs.length > 100 && (
            <div className="p-3 text-center text-sm text-muted-foreground border-t">
              Mostrando 100 de {filteredLogs.length} logs
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
