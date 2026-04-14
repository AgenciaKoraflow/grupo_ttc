import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuth } from "@/contexts/AuthContext";
import { useData } from "@/contexts/DataContext";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getDashboardStats, filterOcorrencias } from "@/mock/data";
import { FileText, Clock, PlayCircle, CheckCircle, Upload, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/dashboard")({
  component: DashboardPage,
});

function DashboardPage() {
  const { user, isAdmin } = useAuth();
  const { ocorrencias, equipes } = useData();

  const visibleOcorrencias = isAdmin
    ? ocorrencias
    : ocorrencias.filter(o => o.equipe_id === user?.equipe_id);

  const stats = getDashboardStats(visibleOcorrencias);
  const pendentes = visibleOcorrencias.filter(o => o.status === 'PENDENTE').slice(0, 5);
  const emAndamento = visibleOcorrencias.filter(o => o.status === 'EM_ANDAMENTO').slice(0, 5);

  const statCards = [
    { label: 'Total', value: stats.total, icon: FileText, color: 'text-foreground' },
    { label: 'Pendentes', value: stats.pendentes, icon: Clock, color: 'text-warning-foreground', bg: 'bg-warning/10' },
    { label: 'Em Andamento', value: stats.em_andamento, icon: PlayCircle, color: 'text-info-foreground', bg: 'bg-info/10' },
    { label: 'Finalizadas', value: stats.finalizadas, icon: CheckCircle, color: 'text-success-foreground', bg: 'bg-success/10' },
  ];

  return (
    <AppLayout>
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {isAdmin ? 'Dashboard' : 'Minhas Ocorrências'}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {isAdmin ? 'Visão geral do sistema' : `Equipe: ${equipes.find(e => e.id === user?.equipe_id)?.nome || 'Sem equipe'}`}
            </p>
          </div>
          {isAdmin && (
            <Link to="/importar-csv">
              <Button size="sm" className="gap-2">
                <Upload className="h-4 w-4" /> Importar CSV
              </Button>
            </Link>
          )}
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((card) => (
            <Card key={card.label}>
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">{card.label}</p>
                    <p className="text-2xl font-bold mt-1">{card.value}</p>
                  </div>
                  <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center", card.bg || 'bg-muted')}>
                    <card.icon className={cn("h-5 w-5", card.color)} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Pendentes</CardTitle>
                <Link to="/ocorrencias" search={{ status: 'PENDENTE' }}>
                  <Button variant="ghost" size="sm" className="gap-1 text-xs">
                    Ver todas <ArrowRight className="h-3 w-3" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {pendentes.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">Nenhuma ocorrência pendente</p>
              ) : (
                <div className="space-y-2">
                  {pendentes.map(oc => (
                    <Link key={oc.id} to="/ocorrencias/$id" params={{ id: oc.id }}
                      className="flex items-center justify-between rounded-lg border p-3 hover:bg-accent/50 transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{oc.id_ocorrencia}</p>
                        <p className="text-xs text-muted-foreground">{oc.municipio}</p>
                      </div>
                      <Badge variant="outline" className="status-pendente border-0 text-xs shrink-0">
                        Pendente
                      </Badge>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Em Andamento</CardTitle>
                <Link to="/ocorrencias" search={{ status: 'EM_ANDAMENTO' }}>
                  <Button variant="ghost" size="sm" className="gap-1 text-xs">
                    Ver todas <ArrowRight className="h-3 w-3" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {emAndamento.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">Nenhuma em andamento</p>
              ) : (
                <div className="space-y-2">
                  {emAndamento.map(oc => (
                    <Link key={oc.id} to="/ocorrencias/$id" params={{ id: oc.id }}
                      className="flex items-center justify-between rounded-lg border p-3 hover:bg-accent/50 transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{oc.id_ocorrencia}</p>
                        <p className="text-xs text-muted-foreground">{oc.municipio}</p>
                      </div>
                      <Badge variant="outline" className="status-em-andamento border-0 text-xs shrink-0">
                        Em Andamento
                      </Badge>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
