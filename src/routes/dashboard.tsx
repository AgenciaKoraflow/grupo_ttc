import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useData } from "@/contexts/DataContext";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import {
  FileText, Clock, PlayCircle, CheckCircle, ArrowRight,
  TrendingUp, TrendingDown, Timer, Target, Users, Zap,
  BarChart3, CalendarDays, Award,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Ocorrencia } from "@/types";

export const Route = createFileRoute("/dashboard")({
  component: DashboardPage,
});

// ─── Constantes de cor ────────────────────────────────────────────────────────

const C = {
  primary:  'oklch(0.50 0.225 255)',
  pending:  'oklch(0.40 0.12 70)',
  progress: 'oklch(0.38 0.14 235)',
  done:     'oklch(0.36 0.14 150)',
  red:      'oklch(0.50 0.235 27)',
  muted:    'oklch(0.46 0.028 252)',
  // hex aproximados para recharts (não suporta oklch)
  hPrimary:  '#3b6fd4',
  hPending:  '#c08020',
  hProgress: '#2060b8',
  hDone:     '#1a8f4a',
  hRed:      '#c0280a',
};

const MONTHS_PT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

// ─── Utilitários ─────────────────────────────────────────────────────────────

function diffDays(a: string, b: string) {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86_400_000);
}

function avgResolutionDays(ocs: Ocorrencia[]): number {
  const finalizadas = ocs.filter(o => o.status === 'FINALIZADA' && o.finalized_at);
  if (!finalizadas.length) return 0;
  const total = finalizadas.reduce((acc, o) => acc + diffDays(o.created_at, o.finalized_at!), 0);
  return Math.round((total / finalizadas.length) * 10) / 10;
}

function conclusionRate(ocs: Ocorrencia[]): number {
  if (!ocs.length) return 0;
  return Math.round((ocs.filter(o => o.status === 'FINALIZADA').length / ocs.length) * 100);
}

function slaRate(ocs: Ocorrencia[], slaDays = 7): number {
  const finalizadas = ocs.filter(o => o.status === 'FINALIZADA' && o.finalized_at);
  if (!finalizadas.length) return 0;
  const dentro = finalizadas.filter(o => diffDays(o.created_at, o.finalized_at!) <= slaDays);
  return Math.round((dentro.length / finalizadas.length) * 100);
}

function volumeByMonth(ocs: Ocorrencia[]) {
  const map: Record<string, { criadas: number; finalizadas: number }> = {};
  ocs.forEach(o => {
    const d = new Date(o.created_at);
    const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, '0')}`;
    if (!map[key]) map[key] = { criadas: 0, finalizadas: 0 };
    map[key].criadas++;
    if (o.status === 'FINALIZADA') map[key].finalizadas++;
  });
  return Object.entries(map)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, v]) => ({
      mes: MONTHS_PT[parseInt(key.split('-')[1], 10)],
      ...v,
    }));
}

function volumeByWeekDay(ocs: Ocorrencia[]) {
  const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const count = Array(7).fill(0);
  ocs.forEach(o => { count[new Date(o.created_at).getDay()]++; });
  return days.map((d, i) => ({ dia: d, ocorrencias: count[i] }));
}

function statusPieData(ocs: Ocorrencia[]) {
  return [
    { name: 'Pendentes', value: ocs.filter(o => o.status === 'PENDENTE').length, color: C.hPending },
    { name: 'Em Andamento', value: ocs.filter(o => o.status === 'EM_ANDAMENTO').length, color: C.hProgress },
    { name: 'Finalizadas', value: ocs.filter(o => o.status === 'FINALIZADA').length, color: C.hDone },
  ].filter(d => d.value > 0);
}

function byEquipe(ocs: Ocorrencia[], equipes: { id: string; nome: string }[]) {
  return equipes.map(eq => {
    const eqOcs = ocs.filter(o => o.equipe_id === eq.id);
    return {
      equipe: eq.nome.replace('Equipe ', ''),
      total: eqOcs.length,
      finalizadas: eqOcs.filter(o => o.status === 'FINALIZADA').length,
      pendentes: eqOcs.filter(o => o.status === 'PENDENTE').length,
      em_andamento: eqOcs.filter(o => o.status === 'EM_ANDAMENTO').length,
      tmr: avgResolutionDays(eqOcs),
      taxa: conclusionRate(eqOcs),
    };
  }).filter(e => e.total > 0);
}

function byOperador(ocs: Ocorrencia[], profiles: { id: string; nome: string; role: string; equipe_id: string | null }[]) {
  return profiles
    .filter(p => p.role === 'operador')
    .map(p => {
      const pOcs = ocs.filter(o => o.equipe_id === p.equipe_id);
      const finalizadas = pOcs.filter(o => o.status === 'FINALIZADA' && o.finalized_by === p.id);
      return {
        nome: p.nome.split(' ')[0],
        nomeCompleto: p.nome,
        total: pOcs.length,
        finalizadas: finalizadas.length,
        tmr: avgResolutionDays(finalizadas.length ? ocs.filter(o => o.finalized_by === p.id) : []),
        taxa: pOcs.length ? Math.round((finalizadas.length / pOcs.length) * 100) : 0,
      };
    })
    .filter(p => p.total > 0)
    .sort((a, b) => b.finalizadas - a.finalizadas);
}

// ─── Componentes de UI ────────────────────────────────────────────────────────

function KpiCard({
  label, value, sub, icon: Icon, color, bg, trend, trendLabel, delay = '',
}: {
  label: string; value: string | number; sub?: string;
  icon: React.ElementType; color: string; bg: string;
  trend?: 'up' | 'down' | 'neutral'; trendLabel?: string; delay?: string;
}) {
  return (
    <div
      className={cn('rounded-xl border border-border/60 bg-card animate-fade-in-up overflow-hidden flex flex-col', delay)}
      style={{ boxShadow: '0 1px 3px oklch(0.115 0.028 252 / 0.06), 0 4px 12px oklch(0.115 0.028 252 / 0.04)', minHeight: '9.5rem' }}
    >
      <div className="p-3 sm:p-4 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-[9px] sm:text-[10px] font-semibold text-muted-foreground uppercase tracking-wider line-clamp-2">{label}</p>
            <p className="text-lg sm:text-xl font-bold text-foreground mt-1 tracking-tight leading-none truncate">{value}</p>
          </div>
          <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: bg }}>
            <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" style={{ color }} />
          </div>
        </div>
      </div>
      {trendLabel && (
        <div className="px-3 sm:px-4 pb-3 sm:pb-4 flex items-center gap-1">
          {trend === 'up' && <TrendingUp className="h-3 w-3" style={{ color: C.done }} />}
          {trend === 'down' && <TrendingDown className="h-3 w-3" style={{ color: C.red }} />}
          <span className="text-[9px] sm:text-[10px] text-muted-foreground line-clamp-1">{trendLabel}</span>
        </div>
      )}
    </div>
  );
}

function SectionCard({ title, icon: Icon, children, className }: {
  title: string; icon?: React.ElementType; children: React.ReactNode; className?: string;
}) {
  return (
    <div
      className={cn('rounded-2xl border border-border/60 bg-card overflow-hidden', className)}
      style={{ boxShadow: '0 1px 3px oklch(0.115 0.028 252 / 0.06), 0 4px 12px oklch(0.115 0.028 252 / 0.04)' }}
    >
      <div className="flex items-center gap-2 px-5 py-4 border-b border-border/60">
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
        <h2 className="text-sm font-bold text-foreground">{title}</h2>
      </div>
      {children}
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-border/60 bg-card px-3 py-2.5 shadow-lg text-xs">
      <p className="font-semibold text-foreground mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color }} className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full inline-block" style={{ background: p.color }} />
          {p.name}: <strong>{p.value}</strong>
        </p>
      ))}
    </div>
  );
};

// ─── Página ───────────────────────────────────────────────────────────────────

type Period = '30d' | '90d' | '12m' | 'all';

const PERIOD_LABELS: Record<Period, string> = {
  '30d': '30 dias', '90d': '90 dias', '12m': '12 meses', 'all': 'Tudo',
};

function filterByPeriod(ocs: Ocorrencia[], period: Period): Ocorrencia[] {
  if (period === 'all') return ocs;
  const now = Date.now();
  const days = period === '30d' ? 30 : period === '90d' ? 90 : 365;
  const cutoff = now - days * 86_400_000;
  return ocs.filter(o => new Date(o.created_at).getTime() >= cutoff);
}

function OcorrenciaRow({ id, id_ocorrencia, municipio, status }: {
  id: string; id_ocorrencia: string; municipio: string; status: string;
}) {
  const cfg = {
    PENDENTE:    { label: 'Pendente',    cls: 'status-pendente' },
    EM_ANDAMENTO:{ label: 'Em Andamento',cls: 'status-em-andamento' },
    FINALIZADA:  { label: 'Finalizada',  cls: 'status-finalizada' },
  }[status] ?? { label: status, cls: '' };
  return (
    <Link to="/ocorrencias/$id" params={{ id }}
      className="flex items-center justify-between px-4 py-2.5 rounded-xl hover:bg-accent/60 transition-all duration-150 group"
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <FileText className="h-3 w-3 text-primary" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{id_ocorrencia}</p>
          <p className="text-xs text-muted-foreground">{municipio}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Badge variant="outline" className={cn(cfg.cls, 'text-[10px] font-semibold')}>{cfg.label}</Badge>
        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
      </div>
    </Link>
  );
}

function DashboardPage() {
  const { user, isAdmin } = useAuth();
  const { ocorrencias, equipes, profiles } = useData();
  const [period, setPeriod] = useState<Period>('all');

  const allVisible = useMemo(
    () => isAdmin
      ? ocorrencias
      : ocorrencias.filter(o => o.equipe_id === user?.equipe_id || o.assigned_to === user?.id),
    [isAdmin, ocorrencias, user?.equipe_id, user?.id]
  );

  const filtered = useMemo(() => filterByPeriod(allVisible, period), [allVisible, period]);

  // KPIs
  const total = filtered.length;
  const pendentes = filtered.filter(o => o.status === 'PENDENTE').length;
  const emAndamento = filtered.filter(o => o.status === 'EM_ANDAMENTO').length;
  const finalizadas = filtered.filter(o => o.status === 'FINALIZADA').length;
  const tmr = avgResolutionDays(filtered);
  const sla = slaRate(filtered, 7);
  const taxa = conclusionRate(filtered);
  const backlog = pendentes + emAndamento;

  // Gráficos
  const monthData = useMemo(() => volumeByMonth(filtered), [filtered]);
  const weekData = useMemo(() => volumeByWeekDay(filtered), [filtered]);
  const pieData = useMemo(() => statusPieData(filtered), [filtered]);
  const equipeData = useMemo(() => byEquipe(filtered, equipes), [filtered, equipes]);
  const operadorData = useMemo(() => byOperador(filtered, profiles), [filtered, profiles]);

  // Listas rápidas
  const pendList = allVisible.filter(o => o.status === 'PENDENTE').slice(0, 5);
  const andList  = allVisible.filter(o => o.status === 'EM_ANDAMENTO').slice(0, 5);

  // top AT
  const atCount: Record<string, number> = {};
  filtered.forEach(o => { if (o.at) atCount[o.at] = (atCount[o.at] || 0) + 1; });
  const topATs = Object.entries(atCount).sort((a,b) => b[1]-a[1]).slice(0, 5);

  return (
    <AppLayout>
      <div className="p-4 md:p-6 space-y-5 md:space-y-6 max-w-[1400px] mx-auto">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-start justify-between gap-3 animate-fade-in">
          <div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">
              {isAdmin ? 'Dashboard Operacional' : 'Minhas Ocorrências'}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {isAdmin ? 'Visão consolidada · Field Service Management' : `Equipe: ${equipes.find(e => e.id === user?.equipe_id)?.nome ?? 'Sem equipe'}`}
            </p>
          </div>

          {/* Period selector */}
          <div
            className="flex items-center gap-1 p-1 rounded-xl border border-border/60 bg-card"
            role="group"
            aria-label="Filtro por período"
          >
            {(Object.keys(PERIOD_LABELS) as Period[]).map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                aria-pressed={period === p}
                aria-label={`Período: ${PERIOD_LABELS[p]}`}
                className={cn(
                  'px-2.5 md:px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  period === p
                    ? 'text-white'
                    : 'text-muted-foreground hover:text-foreground'
                )}
                style={period === p ? {
                  background: 'linear-gradient(135deg, oklch(0.50 0.225 255), oklch(0.44 0.245 272))',
                  boxShadow: '0 2px 8px oklch(0.50 0.225 255 / 0.35)',
                } : undefined}
              >
                {PERIOD_LABELS[p]}
              </button>
            ))}
          </div>
        </div>

        {/* ── KPI Row ─────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3" role="region" aria-label="Indicadores principais">
          <KpiCard label="Total" value={total} icon={FileText}
            color={C.primary} bg="oklch(0.50 0.225 255 / 0.12)"
            trendLabel={`${period === 'all' ? 'Geral' : PERIOD_LABELS[period]}`} trend="neutral" />
          <KpiCard label="Pendentes" value={pendentes} icon={Clock}
            color={C.pending} bg="oklch(0.80 0.165 70 / 0.15)" delay="delay-75"
            trendLabel="Aguardando início" />
          <KpiCard label="Em Andamento" value={emAndamento} icon={PlayCircle}
            color={C.progress} bg="oklch(0.55 0.18 235 / 0.14)" delay="delay-150"
            trendLabel="Em execução" />
          <KpiCard label="Finalizadas" value={finalizadas} icon={CheckCircle}
            color={C.done} bg="oklch(0.56 0.185 150 / 0.14)" delay="delay-225"
            trendLabel="Concluídas" trend="up" />
          <KpiCard label="Backlog" value={backlog} icon={BarChart3}
            color={backlog > 10 ? C.red : C.pending} bg={backlog > 10 ? 'oklch(0.50 0.235 27 / 0.12)' : 'oklch(0.80 0.165 70 / 0.12)'}
            delay="delay-75" trendLabel="Pendente + Andamento" />
          <KpiCard label="Taxa Conclusão" value={`${taxa}%`} icon={Target}
            color={taxa >= 70 ? C.done : taxa >= 40 ? C.pending : C.red}
            bg={taxa >= 70 ? 'oklch(0.56 0.185 150 / 0.12)' : 'oklch(0.80 0.165 70 / 0.12)'}
            delay="delay-150" trendLabel={taxa >= 70 ? 'Meta atingida' : 'Abaixo da meta'} trend={taxa >= 70 ? 'up' : 'down'} />
          <KpiCard label="TMR" value={tmr ? `${tmr}d` : '—'} icon={Timer}
            color={tmr <= 5 ? C.done : tmr <= 10 ? C.pending : C.red}
            bg={tmr <= 5 ? 'oklch(0.56 0.185 150 / 0.12)' : 'oklch(0.80 0.165 70 / 0.12)'}
            delay="delay-225" sub="Tempo médio de resolução"
            trendLabel={tmr <= 7 ? 'Dentro do SLA' : 'Acima do SLA'} trend={tmr <= 7 ? 'up' : 'down'} />
          <KpiCard label="SLA 7 dias" value={`${sla}%`} icon={Zap}
            color={sla >= 80 ? C.done : sla >= 50 ? C.pending : C.red}
            bg={sla >= 80 ? 'oklch(0.56 0.185 150 / 0.12)' : 'oklch(0.80 0.165 70 / 0.12)'}
            delay="delay-300" trendLabel="Finalizadas em ≤7 dias" trend={sla >= 80 ? 'up' : 'down'} />
        </div>

        {/* ── Gráfico de Volume Mensal + Status Pie ───────────────────────── */}
        <div className="grid lg:grid-cols-3 gap-5">
          <SectionCard title="Volume Mensal" icon={CalendarDays} className="lg:col-span-2">
            <div className="p-5 h-[260px]">
              {monthData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-sm text-muted-foreground">Sem dados no período</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gCriadas" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={C.hPrimary} stopOpacity={0.25} />
                        <stop offset="95%" stopColor={C.hPrimary} stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gFinalizadas" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={C.hDone} stopOpacity={0.25} />
                        <stop offset="95%" stopColor={C.hDone} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.868 0.014 245 / 0.5)" vertical={false} />
                    <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                    <Area type="monotone" dataKey="criadas" name="Criadas" stroke={C.hPrimary} strokeWidth={2} fill="url(#gCriadas)" dot={{ r: 3, fill: C.hPrimary }} isAnimationActive={false} />
                    <Area type="monotone" dataKey="finalizadas" name="Finalizadas" stroke={C.hDone} strokeWidth={2} fill="url(#gFinalizadas)" dot={{ r: 3, fill: C.hDone }} isAnimationActive={false} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </SectionCard>

          <SectionCard title="Distribuição por Status" icon={BarChart3}>
            <div className="p-5 h-[260px] flex flex-col justify-between">
              {pieData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-sm text-muted-foreground">Sem dados</div>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={170}>
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80}
                        paddingAngle={3} dataKey="value" strokeWidth={0} isAnimationActive={false}>
                        {pieData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-1.5">
                    {pieData.map(d => (
                      <div key={d.name} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full shrink-0" style={{ background: d.color }} />
                          <span className="text-muted-foreground">{d.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-foreground">{d.value}</span>
                          <span className="text-muted-foreground/60">({total ? Math.round(d.value/total*100) : 0}%)</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </SectionCard>
        </div>

        {/* ── Por Equipe + Dia da Semana ───────────────────────────────────── */}
        <div className="grid lg:grid-cols-2 gap-5">
          <SectionCard title="Performance por Equipe" icon={Users}>
            <div className="p-5 h-[260px]">
              {equipeData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-sm text-muted-foreground">Sem dados</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={equipeData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }} barGap={4}>
                    <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.868 0.014 245 / 0.5)" vertical={false} />
                    <XAxis dataKey="equipe" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                    <Bar dataKey="finalizadas" name="Finalizadas" fill={C.hDone} radius={[4,4,0,0]} maxBarSize={40} isAnimationActive={false} />
                    <Bar dataKey="em_andamento" name="Em Andamento" fill={C.hProgress} radius={[4,4,0,0]} maxBarSize={40} isAnimationActive={false} />
                    <Bar dataKey="pendentes" name="Pendentes" fill={C.hPending} radius={[4,4,0,0]} maxBarSize={40} isAnimationActive={false} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </SectionCard>

          <SectionCard title="Volume por Dia da Semana" icon={CalendarDays}>
            <div className="p-5 h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weekData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.868 0.014 245 / 0.5)" vertical={false} />
                  <XAxis dataKey="dia" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="ocorrencias" name="Ocorrências" radius={[5,5,0,0]} maxBarSize={48} isAnimationActive={false}>
                    {weekData.map((_, i) => (
                      <Cell key={i} fill={i === 0 || i === 6 ? '#94a3b8' : C.hPrimary} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </SectionCard>
        </div>

        {/* ── Tabela Equipes + Top Municípios ──────────────────────────────── */}
        {isAdmin && (
          <div className="grid lg:grid-cols-2 gap-5">

            {/* Tabela por equipe */}
            <SectionCard title="Ranking de Equipes" icon={Award} className="lg:col-span-1">
              <div className="divide-y divide-border/40">
                {equipeData.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">Sem dados</p>
                ) : equipeData.sort((a,b) => b.finalizadas - a.finalizadas).map((eq, i) => (
                  <div key={eq.equipe} className="flex items-center gap-3 px-5 py-3">
                    <div
                      className="h-7 w-7 rounded-lg flex items-center justify-center text-[11px] font-bold text-white shrink-0"
                      style={{
                        background: i === 0
                          ? 'linear-gradient(135deg, #c08000, #e0a020)'
                          : i === 1
                            ? 'linear-gradient(135deg, #606070, #9098a8)'
                            : i === 2
                              ? 'linear-gradient(135deg, #9b4010, #c86030)'
                              : 'oklch(0.935 0.014 245)',
                        color: i < 3 ? 'white' : 'oklch(0.46 0.028 252)',
                      }}
                    >
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground">{eq.equipe}</p>
                      <p className="text-xs text-muted-foreground">{eq.total} total · TMR {eq.tmr}d</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold" style={{ color: C.done }}>{eq.finalizadas}</p>
                      <p className="text-[10px] text-muted-foreground">{eq.taxa}%</p>
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>

            {/* Top ATs */}
            <SectionCard title="Top ATs" icon={BarChart3} className="lg:col-span-1">
              <div className="px-5 py-4 space-y-3">
                {topATs.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">Sem dados</p>
                ) : topATs.map(([at, count], i) => {
                  const pct = total ? Math.round(count / total * 100) : 0;
                  return (
                    <div key={at} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground font-medium">#{i+1}</span>
                          <span className="font-semibold text-foreground">{at || '—'}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-foreground">{count}</span>
                          <span className="text-muted-foreground/60">({pct}%)</span>
                        </div>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${pct}%`,
                            background: i === 0
                              ? 'linear-gradient(90deg, oklch(0.50 0.225 255), oklch(0.44 0.245 272))'
                              : `oklch(0.50 0.225 255 / ${0.7 - i * 0.12})`,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </SectionCard>
          </div>
        )}

        {/* ── TMR por equipe (bar chart horizontal) ───────────────────────── */}
        {isAdmin && equipeData.length > 0 && (
          <SectionCard title="Tempo Médio de Resolução por Equipe (dias)" icon={Timer}>
            <div className="p-5 h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={equipeData}
                  layout="vertical"
                  margin={{ top: 0, right: 40, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.868 0.014 245 / 0.5)" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} unit="d" />
                  <YAxis type="category" dataKey="equipe" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={60} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="tmr" name="TMR (dias)" radius={[0,4,4,0]} maxBarSize={24} isAnimationActive={false}>
                    {equipeData.map((eq, i) => (
                      <Cell key={i} fill={eq.tmr <= 5 ? C.hDone : eq.tmr <= 10 ? C.hPending : C.hRed} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </SectionCard>
        )}

        {/* ── Listas pendentes / em andamento ─────────────────────────────── */}
        <div className="grid md:grid-cols-2 gap-5">
          <SectionCard title="Pendentes">
            <div className="p-2" role="list" aria-label="Ocorrências pendentes">
              {pendList.length === 0 ? (
                <div className="py-8 text-center" role="status">
                  <CheckCircle className="h-7 w-7 text-muted-foreground/25 mx-auto mb-2" aria-hidden="true" />
                  <p className="text-sm text-muted-foreground">Sem pendências</p>
                </div>
              ) : (
                <>
                  <div className="space-y-0.5">
                    {pendList.map(oc => (
                      <OcorrenciaRow key={oc.id} id={oc.id} id_ocorrencia={oc.id_ocorrencia} municipio={oc.municipio} status={oc.status} />
                    ))}
                  </div>
                  <div className="px-4 pt-2 pb-1">
                    <Link to="/ocorrencias">
                      <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs w-full justify-center text-muted-foreground hover:text-foreground">
                        Ver todas <ArrowRight className="h-3 w-3" />
                      </Button>
                    </Link>
                  </div>
                </>
              )}
            </div>
          </SectionCard>

          <SectionCard title="Em Andamento">
            <div className="p-2" role="list" aria-label="Ocorrências em andamento">
              {andList.length === 0 ? (
                <div className="py-8 text-center" role="status">
                  <PlayCircle className="h-7 w-7 text-muted-foreground/25 mx-auto mb-2" aria-hidden="true" />
                  <p className="text-sm text-muted-foreground">Nenhuma em andamento</p>
                </div>
              ) : (
                <>
                  <div className="space-y-0.5">
                    {andList.map(oc => (
                      <OcorrenciaRow key={oc.id} id={oc.id} id_ocorrencia={oc.id_ocorrencia} municipio={oc.municipio} status={oc.status} />
                    ))}
                  </div>
                  <div className="px-4 pt-2 pb-1">
                    <Link to="/ocorrencias">
                      <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs w-full justify-center text-muted-foreground hover:text-foreground">
                        Ver todas <ArrowRight className="h-3 w-3" />
                      </Button>
                    </Link>
                  </div>
                </>
              )}
            </div>
          </SectionCard>
        </div>

      </div>
    </AppLayout>
  );
}
