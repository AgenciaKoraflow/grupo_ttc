import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useData } from "@/contexts/DataContext";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import type { OcorrenciaStatus } from "@/types";

export const Route = createFileRoute("/ocorrencias/")({
  component: OcorrenciasPage,
});

function StatusBadge({ status }: { status: OcorrenciaStatus }) {
  const map = {
    PENDENTE: { label: 'Pendente', cls: 'status-pendente' },
    EM_ANDAMENTO: { label: 'Em Andamento', cls: 'status-em-andamento' },
    FINALIZADA: { label: 'Finalizada', cls: 'status-finalizada' },
  };
  const s = map[status];
  return <Badge variant="outline" className={cn(s.cls, 'border-0 text-xs')}>{s.label}</Badge>;
}

function OcorrenciasPage() {
  const { user, isAdmin } = useAuth();
  const { ocorrencias, equipes } = useData();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [equipeFilter, setEquipeFilter] = useState<string>("");
  const [municipioFilter, setMunicipioFilter] = useState<string>("");

  let filtered = isAdmin
    ? ocorrencias
    : ocorrencias.filter(o => o.equipe_id === user?.equipe_id);

  if (statusFilter) filtered = filtered.filter(o => o.status === statusFilter);
  if (equipeFilter) filtered = filtered.filter(o => o.equipe_id === equipeFilter);
  if (municipioFilter) filtered = filtered.filter(o => o.municipio === municipioFilter);
  if (search) {
    const s = search.toLowerCase();
    filtered = filtered.filter(o =>
      o.id_ocorrencia.toLowerCase().includes(s) ||
      o.municipio.toLowerCase().includes(s) ||
      (o.contratada || '').toLowerCase().includes(s)
    );
  }

  const municipios = [...new Set(ocorrencias.map(o => o.municipio))].sort();

  return (
    <AppLayout>
      <div className="p-6 space-y-4 max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold tracking-tight">Ocorrências</h1>

        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por ID, município..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v === 'all' ? '' : v)}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="PENDENTE">Pendente</SelectItem>
              <SelectItem value="EM_ANDAMENTO">Em Andamento</SelectItem>
              <SelectItem value="FINALIZADA">Finalizada</SelectItem>
            </SelectContent>
          </Select>
          {isAdmin && (
            <Select value={equipeFilter} onValueChange={(v) => setEquipeFilter(v === 'all' ? '' : v)}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Equipe" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {equipes.filter(e => e.ativa).map(e => (
                  <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Select value={municipioFilter} onValueChange={(v) => setMunicipioFilter(v === 'all' ? '' : v)}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Município" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {municipios.map(m => (
                <SelectItem key={m} value={m}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="border rounded-lg overflow-hidden bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID Ocorrência</TableHead>
                <TableHead>Município</TableHead>
                <TableHead className="hidden md:table-cell">Cabo/Primária</TableHead>
                <TableHead className="hidden md:table-cell">Contratada</TableHead>
                <TableHead className="hidden lg:table-cell">Equipe</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[60px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Nenhuma ocorrência encontrada
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map(oc => (
                  <TableRow key={oc.id} className="cursor-pointer hover:bg-accent/30"
                    onClick={() => navigate({ to: '/ocorrencias/$id', params: { id: oc.id } })}
                  >
                    <TableCell className="font-medium">{oc.id_ocorrencia}</TableCell>
                    <TableCell>{oc.municipio}</TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">{oc.cabo_primaria || '—'}</TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">{oc.contratada || '—'}</TableCell>
                    <TableCell className="hidden lg:table-cell">{oc.equipe?.nome || <span className="text-muted-foreground">Sem equipe</span>}</TableCell>
                    <TableCell><StatusBadge status={oc.status} /></TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                        <Link to="/ocorrencias/$id" params={{ id: oc.id }}><Eye className="h-4 w-4" /></Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </AppLayout>
  );
}
