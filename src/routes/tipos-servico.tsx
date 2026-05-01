import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useData } from "@/contexts/DataContext";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Plus,
  Pencil,
  Wrench,
  Activity,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { TablePagination } from "@/components/TablePagination";
import { cn } from "@/lib/utils";
import { usePageTitle } from "@/hooks/usePageTitle";

export const Route = createFileRoute("/tipos-servico")({
  component: TiposServicoPage,
});

const C = {
  primary: "oklch(0.50 0.225 255)",
  success: "oklch(0.36 0.14 150)",
  warning: "oklch(0.40 0.12 70)",
  danger: "oklch(0.50 0.235 27)",
  muted: "oklch(0.46 0.028 252)",
};

function StatCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <div
      className="bg-card border border-border/60 rounded-xl p-4"
      style={{ boxShadow: "0 1px 3px oklch(0.115 0.028 252 / 0.06)" }}
    >
      <div className="flex items-center gap-3">
        <div
          className="h-10 w-10 rounded-lg flex items-center justify-center"
          style={{ background: `${color}15` }}
        >
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

function TiposServicoPage() {
  usePageTitle("Tipos de Serviço");
  const { isAdmin, isSupervisor } = useAuth();
  const isAdminOrSupervisor = isAdmin || isSupervisor;
  const {
    tiposServico,
    servicos,
    ocorrencias,
    addTipoServico,
    updateTipoServico,
  } = useData();

  if (!isAdminOrSupervisor) {
    return (
      <AppLayout>
        <div className="p-6 flex flex-col items-center justify-center min-h-[60vh] gap-3">
          <Wrench className="h-12 w-12 text-muted-foreground/30" />
          <p className="text-lg font-semibold text-muted-foreground">
            Acesso restrito
          </p>
          <p className="text-sm text-muted-foreground/70">
            Apenas administradores e supervisores podem gerenciar tipos de
            serviço.
          </p>
        </div>
      </AppLayout>
    );
  }
  const [nome, setNome] = useState("");
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editNome, setEditNome] = useState("");

  const stats = useMemo(() => {
    const ativos = tiposServico.filter((t) => t.ativo).length;
    const inativos = tiposServico.filter((t) => !t.ativo).length;
    const comServicos = tiposServico.filter((ts) =>
      servicos.some((s) => s.tipo_servico_id === ts.id),
    ).length;
    return { ativos, inativos, comServicos, total: tiposServico.length };
  }, [tiposServico, servicos]);

  const tipoStats = useMemo(() => {
    return tiposServico.map((ts) => {
      const tsServicos = servicos.filter((s) => s.tipo_servico_id === ts.id);
      const servicoIds = tsServicos.map((s) => s.id);
      const ocs = ocorrencias.filter((o) =>
        tsServicos.some((s) => s.ocorrencia_id === o.id),
      );
      return {
        id: ts.id,
        totalServicos: tsServicos.length,
        totalOcorrencias: ocs.length,
        pendentes: ocs.filter((o) => o.status === "PENDENTE").length,
        emAndamento: ocs.filter((o) => o.status === "EM_ANDAMENTO").length,
        finalizadas: ocs.filter((o) => o.status === "FINALIZADA").length,
      };
    });
  }, [tiposServico, servicos, ocorrencias]);

  const getTipoStats = (tipoId: string) =>
    tipoStats.find((t) => t.id === tipoId);

  const PAGE_SIZE = 25;
  const [page, setPage] = useState(0);
  const paginatedTiposServico = useMemo(
    () => tiposServico.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE),
    [tiposServico, page],
  );
  const totalPages = Math.ceil(tiposServico.length / PAGE_SIZE);

  const handleAdd = () => {
    if (!nome.trim()) return;
    addTipoServico(nome.trim());
    setNome("");
    setOpen(false);
  };

  const handleEdit = () => {
    if (!editId || !editNome.trim()) return;
    updateTipoServico(editId, { nome: editNome.trim() });
    setEditId(null);
  };

  return (
    <AppLayout>
      <div className="p-4 sm:p-6 space-y-5 max-w-6xl mx-auto">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Wrench className="h-6 w-6" />
              Tipos de Serviço
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Cadastre e gerencie os tipos de serviços realizados nas
              ocorrências
            </p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button
                size="sm"
                className="gap-1"
                style={{
                  background:
                    "linear-gradient(135deg, oklch(0.50 0.225 255), oklch(0.44 0.245 272))",
                }}
              >
                <Plus className="h-4 w-4" /> Novo Tipo
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Novo Tipo de Serviço</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <Label>Nome</Label>
                <Input
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Ex: Troca de Lâmpada"
                />
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">Cancelar</Button>
                </DialogClose>
                <Button onClick={handleAdd} disabled={!nome.trim()}>
                  Criar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <StatCard
            label="Total de Tipos"
            value={stats.total}
            icon={Wrench}
            color={C.primary}
          />
          <StatCard
            label="Tipos Ativos"
            value={stats.ativos}
            icon={CheckCircle}
            color={C.success}
          />
          <StatCard
            label="Tipos Inativos"
            value={stats.inativos}
            icon={AlertCircle}
            color={C.warning}
          />
          <StatCard
            label="Com Ocorrências"
            value={stats.comServicos}
            icon={Activity}
            color={C.muted}
          />
        </div>

        <div
          className="border border-border/60 rounded-xl bg-card"
          style={{
            boxShadow:
              "0 1px 3px oklch(0.115 0.028 252 / 0.06), 0 4px 12px oklch(0.115 0.028 252 / 0.04)",
          }}
        >
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="pl-4">Nome</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">Serviços</TableHead>
                  <TableHead className="text-center">Ocorrências</TableHead>
                  <TableHead className="text-center">Pendentes</TableHead>
                  <TableHead className="text-center">Em Andamento</TableHead>
                  <TableHead className="text-center">Finalizadas</TableHead>
                  <TableHead className="w-[80px] pr-4">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tiposServico.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="text-center py-8 text-muted-foreground"
                    >
                      Nenhum tipo de serviço cadastrado
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedTiposServico.map((ts) => {
                    const s = getTipoStats(ts.id);
                    return (
                      <TableRow key={ts.id}>
                        <TableCell className="font-medium pl-4 max-w-[200px]">
                          <span className="truncate block" title={ts.nome}>
                            {ts.nome}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={ts.ativo ? "secondary" : "outline"}
                            className={cn(
                              "text-xs cursor-pointer transition-colors",
                              ts.ativo
                                ? "bg-green-100 text-green-700 hover:bg-green-200"
                                : "text-muted-foreground",
                            )}
                            onClick={() =>
                              updateTipoServico(ts.id, { ativo: !ts.ativo })
                            }
                          >
                            {ts.ativo ? "Ativo" : "Inativo"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="text-sm font-medium">
                            {s?.totalServicos ?? 0}
                          </span>
                        </TableCell>
                        <TableCell className="text-center font-semibold">
                          {s?.totalOcorrencias ?? 0}
                        </TableCell>
                        <TableCell className="text-center">
                          <span
                            className={cn(
                              s?.pendentes
                                ? "text-amber-600 font-medium"
                                : "text-muted-foreground",
                            )}
                          >
                            {s?.pendentes ?? 0}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <span
                            className={cn(
                              s?.emAndamento
                                ? "text-blue-600 font-medium"
                                : "text-muted-foreground",
                            )}
                          >
                            {s?.emAndamento ?? 0}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <span
                            className={cn(
                              s?.finalizadas
                                ? "text-green-600 font-medium"
                                : "text-muted-foreground",
                            )}
                          >
                            {s?.finalizadas ?? 0}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Dialog
                            open={editId === ts.id}
                            onOpenChange={(o) => {
                              if (!o) setEditId(null);
                            }}
                          >
                            <DialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => {
                                  setEditId(ts.id);
                                  setEditNome(ts.nome);
                                }}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>
                                  Editar Tipo de Serviço
                                </DialogTitle>
                              </DialogHeader>
                              <div className="space-y-3">
                                <Label>Nome</Label>
                                <Input
                                  value={editNome}
                                  onChange={(e) => setEditNome(e.target.value)}
                                />
                              </div>
                              <DialogFooter>
                                <DialogClose asChild>
                                  <Button variant="outline">Cancelar</Button>
                                </DialogClose>
                                <Button onClick={handleEdit}>Salvar</Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
          <TablePagination
            page={page}
            totalPages={totalPages}
            total={tiposServico.length}
            pageSize={PAGE_SIZE}
            onPageChange={setPage}
            className="border-t border-border/60"
          />
        </div>
      </div>
    </AppLayout>
  );
}
