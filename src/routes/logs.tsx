import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLog } from "@/contexts/LogContext";
import { AppLayout } from "@/components/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  History, Search, Download, Filter, User, Clock, FileText,
  CheckCircle, PlayCircle, AlertCircle, Edit3, Eye, Trash2, Plus, Link, Key, LogOut
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

import type { LogTipo, LogCategoria, Log } from "@/types";
import { usePageTitle } from "@/hooks/usePageTitle";
import { TablePagination } from "@/components/TablePagination";

const TIPOS_LOG: Record<LogTipo, { label: string; color: string; icon: React.ElementType }> = {
  LOGIN: { label: 'Login', color: 'bg-green-100 text-green-700', icon: Plus },
  LOGOUT: { label: 'Logout', color: 'bg-amber-100 text-amber-700', icon: LogOut },
  CRIACAO: { label: 'Criação', color: 'bg-green-100 text-green-700', icon: Plus },
  ATUALIZACAO: { label: 'Atualização', color: 'bg-blue-100 text-blue-700', icon: Edit3 },
  EXCLUSAO: { label: 'Exclusão', color: 'bg-red-100 text-red-700', icon: Trash2 },
  FINALIZACAO: { label: 'Finalização', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  REABERTURA: { label: 'Reabertura', color: 'bg-amber-100 text-amber-700', icon: PlayCircle },
  RESET_SENHA: { label: 'Reset de Senha', color: 'bg-orange-100 text-orange-700', icon: Key },
  VINCULACAO: { label: 'Vinculação', color: 'bg-purple-100 text-purple-700', icon: Link },
};

const CATEGORIAS: Record<LogCategoria, string> = {
  AUTENTICACAO: 'Autenticação',
  OCORRENCIA: 'Ocorrência',
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
  usePageTitle("Logs");
  const { logs, loadLogs } = useLog();
  const [search, setSearch] = useState('');

  useEffect(() => { void loadLogs(); }, [loadLogs]);
  const [filtroTipo, setFiltroTipo] = useState<LogTipo | 'TODOS'>('TODOS');
  const [filtroCategoria, setFiltroCategoria] = useState<LogCategoria | 'TODOS'>('TODOS');
  const [filtroPerfil, setFiltroPerfil] = useState<'admin' | 'operador' | 'sistema' | 'TODOS'>('TODOS');

  const [page, setPage] = useState(0);

  const sortedLogs = useMemo(() => {
    return [...logs].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [logs]);

  const filteredLogs = useMemo(() => {
    return sortedLogs.filter(log => {
      const matchSearch = search === '' ||
        log.entidadeNome.toLowerCase().includes(search.toLowerCase()) ||
        log.userNome.toLowerCase().includes(search.toLowerCase()) ||
        log.detalhes.toLowerCase().includes(search.toLowerCase());
      const matchTipo = filtroTipo === 'TODOS' || log.tipo === filtroTipo;
      const matchCategoria = filtroCategoria === 'TODOS' || log.categoria === filtroCategoria;
      const matchPerfil = filtroPerfil === 'TODOS' || log.userRole === filtroPerfil;
      return matchSearch && matchTipo && matchCategoria && matchPerfil;
    });
  }, [sortedLogs, search, filtroTipo, filtroCategoria, filtroPerfil]);

  const PAGE_SIZE = 25;

  useEffect(() => { setPage(0); }, [search, filtroTipo, filtroCategoria, filtroPerfil]);

  const paginatedLogs = useMemo(
    () => filteredLogs.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE),
    [filteredLogs, page],
  );
  const totalPages = Math.ceil(filteredLogs.length / PAGE_SIZE);

  const stats = useMemo(() => ({
    total: sortedLogs.length,
    criacoes: sortedLogs.filter(l => l.tipo === 'CRIACAO').length,
    atualizacoes: sortedLogs.filter(l => l.tipo === 'ATUALIZACAO').length,
    finalizacoes: sortedLogs.filter(l => l.tipo === 'FINALIZACAO').length,
    porAdmin: sortedLogs.filter(l => l.userRole === 'admin').length,
    porOperador: sortedLogs.filter(l => l.userRole === 'operador').length,
    porSistema: sortedLogs.filter(l => l.userRole === 'sistema').length,
  }), [sortedLogs]);

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
      <div className="p-4 sm:p-6 space-y-5 max-w-7xl mx-auto">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight flex items-center gap-2">
              <History className="h-5 w-5 md:h-6 md:w-6" aria-hidden="true" />
              Logs de Atividade
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Histórico completo de todas as ações realizadas no sistema
            </p>
          </div>
          <Button variant="outline" size="sm" className="gap-1.5 shrink-0" onClick={exportLogs} aria-label="Exportar logs como CSV">
            <Download className="h-4 w-4" aria-hidden="true" /> Exportar CSV
          </Button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3" role="region" aria-label="Estatísticas de logs">
          <StatCard label="Total de Logs" value={stats.total} icon={History} color={C.primary} />
          <StatCard label="Por Admin" value={stats.porAdmin} icon={History} color="oklch(0.50 0.225 255)" />
          <StatCard label="Por Operador" value={stats.porOperador} icon={History} color="oklch(0.36 0.14 150)" />
          <StatCard label="Criações" value={stats.criacoes} icon={Plus} color={C.success} />
          <StatCard label="Atualizações" value={stats.atualizacoes} icon={Edit3} color={C.warning} />
          <StatCard label="Finalizações" value={stats.finalizacoes} icon={CheckCircle} color={C.muted} />
        </div>

        <div
          className="rounded-2xl border border-border/60 bg-card p-4 space-y-3"
          style={{ boxShadow: '0 1px 3px oklch(0.115 0.028 252 / 0.05)' }}
          role="search"
          aria-label="Filtrar logs"
        >
          <div className="flex items-center gap-2 mb-1">
            <Filter className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Filtros</span>
          </div>
          <div className="flex flex-col sm:flex-row flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <Input
                placeholder="Buscar por usuário, entidade ou detalhes..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 bg-background border-border/70"
                aria-label="Buscar logs"
              />
            </div>
            <select
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value as LogTipo | 'TODOS')}
              className="h-9 px-3 rounded-lg border border-input bg-background text-sm flex-1 sm:flex-none sm:w-[160px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Filtrar por tipo"
            >
              <option value="TODOS">Todos os tipos</option>
              {Object.entries(TIPOS_LOG).map(([tipo, config]) => (
                <option key={tipo} value={tipo}>{config.label}</option>
              ))}
            </select>
            <select
              value={filtroCategoria}
              onChange={(e) => setFiltroCategoria(e.target.value as LogCategoria | 'TODOS')}
              className="h-9 px-3 rounded-lg border border-input bg-background text-sm flex-1 sm:flex-none sm:w-[175px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Filtrar por categoria"
            >
              <option value="TODOS">Todas as categorias</option>
              {Object.entries(CATEGORIAS).map(([cat, label]) => (
                <option key={cat} value={cat}>{label}</option>
              ))}
            </select>
            <select
              value={filtroPerfil}
              onChange={(e) => setFiltroPerfil(e.target.value as 'admin' | 'operador' | 'sistema' | 'TODOS')}
              className="h-9 px-3 rounded-lg border border-input bg-background text-sm flex-1 sm:flex-none sm:w-[155px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Filtrar por perfil"
            >
              <option value="TODOS">Todos os perfis</option>
              <option value="admin">Administrador</option>
              <option value="operador">Operador</option>
              <option value="sistema">Sistema</option>
            </select>
          </div>
          {filteredLogs.length !== sortedLogs.length && (
            <p className="text-xs text-muted-foreground" role="status" aria-live="polite">
              {filteredLogs.length} de {sortedLogs.length} logs exibidos
            </p>
          )}
        </div>

        <div
          className="border border-border/60 rounded-xl bg-card"
          style={{ boxShadow: '0 1px 3px oklch(0.115 0.028 252 / 0.06), 0 4px 12px oklch(0.115 0.028 252 / 0.04)' }}
          role="region"
          aria-label="Tabela de logs"
        >
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="w-[140px] whitespace-nowrap">Data/Hora</TableHead>
                  <TableHead className="w-[160px] whitespace-nowrap">Usuário</TableHead>
                  <TableHead className="w-[100px] whitespace-nowrap">Perfil</TableHead>
                  <TableHead className="w-[120px] whitespace-nowrap">Tipo</TableHead>
                  <TableHead className="w-[130px] whitespace-nowrap">Categoria</TableHead>
                  <TableHead className="whitespace-nowrap">Entidade</TableHead>
                  <TableHead>Detalhes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12">
                      <div role="status">
                        <Eye className="h-8 w-8 text-muted-foreground/25 mx-auto mb-2" aria-hidden="true" />
                        <p className="text-sm text-muted-foreground font-medium">Nenhum log encontrado</p>
                        <p className="text-xs text-muted-foreground/60 mt-1">Tente ajustar os filtros</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : paginatedLogs.map(log => {
                  const tipoConfig = TIPOS_LOG[log.tipo];
                  const roleColors: Record<string, string> = {
                    admin: 'bg-purple-100 text-purple-700',
                    supervisor: 'bg-blue-100 text-blue-700',
                    operador: 'bg-green-100 text-green-700',
                    sistema: 'bg-gray-100 text-gray-700',
                  };
                  return (
                    <TableRow key={log.id}>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3 w-3 shrink-0" aria-hidden="true" />
                          {formatDate(log.created_at)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div
                            className="h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white bg-linear-to-br from-blue-500 to-blue-600 shrink-0"
                            aria-hidden="true"
                          >
                            {log.userNome.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}
                          </div>
                          <span className="text-sm whitespace-nowrap">{log.userNome}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={cn('text-xs capitalize whitespace-nowrap', roleColors[log.userRole])}>
                          {log.userRole === 'sistema' ? 'Sistema' : log.userRole}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={cn('text-xs whitespace-nowrap', tipoConfig.color)}>
                          <tipoConfig.icon className="h-3 w-3 mr-1" aria-hidden="true" />
                          {tipoConfig.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm whitespace-nowrap">{CATEGORIAS[log.categoria]}</span>
                      </TableCell>
                      <TableCell className="font-medium text-sm">{log.entidadeNome}</TableCell>
                      <TableCell className="text-muted-foreground text-sm max-w-xs">
                        <p className="truncate" title={log.detalhes}>{log.detalhes}</p>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          <TablePagination
            page={page} totalPages={totalPages} total={filteredLogs.length}
            pageSize={PAGE_SIZE} onPageChange={setPage}
            className="border-t border-border/60"
          />
        </div>
      </div>
    </AppLayout>
  );
}
