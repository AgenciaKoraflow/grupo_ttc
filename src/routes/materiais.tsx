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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Trash2,
  Package,
  Activity,
  CheckCircle,
  AlertCircle,
  Search,
} from "lucide-react";
import { TablePagination } from "@/components/TablePagination";
import { cn } from "@/lib/utils";
import { usePageTitle } from "@/hooks/usePageTitle";
import { toast } from "sonner";

export const Route = createFileRoute("/materiais")({
  component: MateriaisPage,
});

const UNIT_OPTIONS = [
  { value: 'metro', label: 'Metro' },
  { value: 'kg', label: 'Quilograma (kg)' },
  { value: 'unidade', label: 'Unidade' },
  { value: 'bobina', label: 'Bobina' },
] as const;

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

const PAGE_SIZE = 25;

function MateriaisPage() {
  usePageTitle("Materiais");
  const { isAdmin, isSupervisor } = useAuth();
  const isAdminOrSupervisor = isAdmin || isSupervisor;
  const {
    materials,
    ocorrenciaMateriais,
    addMaterial,
    updateMaterial,
    deleteMaterial,
  } = useData();

  if (!isAdminOrSupervisor) {
    return (
      <AppLayout>
        <div className="p-6 flex flex-col items-center justify-center min-h-[60vh] gap-3">
          <Package className="h-12 w-12 text-muted-foreground/30" />
          <p className="text-lg font-semibold text-muted-foreground">
            Acesso restrito
          </p>
          <p className="text-sm text-muted-foreground/70">
            Apenas administradores e supervisores podem gerenciar materiais.
          </p>
        </div>
      </AppLayout>
    );
  }

  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [nome, setNome] = useState("");
  const [unit, setUnit] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editNome, setEditNome] = useState("");
  const [editUnit, setEditUnit] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [page, setPage] = useState(0);

  const stats = useMemo(() => {
    const ativos = materials.filter((m) => m.ativo).length;
    const inativos = materials.filter((m) => !m.ativo).length;
    const emUso = new Set(ocorrenciaMateriais.map((om) => om.material_id)).size;
    return { total: materials.length, ativos, inativos, emUso };
  }, [materials, ocorrenciaMateriais]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return materials
      .filter((m) => m.name.toLowerCase().includes(q))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [materials, search]);

  const paginated = useMemo(
    () => filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE),
    [filtered, page],
  );
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  const handleAdd = () => {
    if (!nome.trim() || !unit.trim()) return;
    addMaterial({ name: nome.trim(), unit: unit.trim() });
    setNome("");
    setUnit("");
    setOpen(false);
    toast.success("Material adicionado");
  };

  const handleEdit = () => {
    if (!editId || !editNome.trim() || !editUnit.trim()) return;
    updateMaterial(editId, { name: editNome.trim(), unit: editUnit.trim() });
    setEditId(null);
    toast.success("Material atualizado");
  };

  const handleDelete = () => {
    if (!deleteId) return;
    const inUse = ocorrenciaMateriais.some((om) => om.material_id === deleteId);
    if (inUse) {
      toast.error("Material em uso", {
        description:
          "Remova o material de todas as ocorrências antes de excluir.",
      });
      setDeleteId(null);
      return;
    }
    deleteMaterial(deleteId);
    setDeleteId(null);
    toast.success("Material excluído");
  };

  const deleteTarget = deleteId
    ? materials.find((m) => m.id === deleteId)
    : null;

  return (
    <AppLayout>
      <div className="p-4 sm:p-6 space-y-5 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Package className="h-6 w-6" />
              Materiais
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Cadastre e gerencie os materiais utilizados nas ocorrências
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
                <Plus className="h-4 w-4" /> Novo Material
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Novo Material</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Nome</Label>
                  <Input
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Ex: Fita de aço"
                    onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Unidade de medida</Label>
                  <Select value={unit} onValueChange={setUnit}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a unidade" />
                    </SelectTrigger>
                    <SelectContent>
                      {UNIT_OPTIONS.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">Cancelar</Button>
                </DialogClose>
                <Button
                  onClick={handleAdd}
                  disabled={!nome.trim() || !unit.trim()}
                >
                  Criar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard
            label="Total de Materiais"
            value={stats.total}
            icon={Package}
            color={C.primary}
          />
          <StatCard
            label="Ativos"
            value={stats.ativos}
            icon={CheckCircle}
            color={C.success}
          />
          <StatCard
            label="Inativos"
            value={stats.inativos}
            icon={AlertCircle}
            color={C.warning}
          />
          <StatCard
            label="Em Uso"
            value={stats.emUso}
            icon={Activity}
            color={C.muted}
          />
        </div>

        {/* Search + Table */}
        <div
          className="border border-border/60 rounded-xl bg-card"
          style={{
            boxShadow:
              "0 1px 3px oklch(0.115 0.028 252 / 0.06), 0 4px 12px oklch(0.115 0.028 252 / 0.04)",
          }}
        >
          <div className="p-3 border-b border-border/60">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
              <Input
                placeholder="Buscar por nome..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(0);
                }}
                className="pl-9 h-9"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="pl-4">Nome</TableHead>
                  <TableHead>Unidade</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Cadastrado em</TableHead>
                  <TableHead className="w-[100px] pr-4 text-right">
                    Ações
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-center py-8 text-muted-foreground"
                    >
                      {search
                        ? "Nenhum material encontrado para essa busca"
                        : "Nenhum material cadastrado"}
                    </TableCell>
                  </TableRow>
                ) : (
                  paginated.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="font-medium pl-4 max-w-[240px]">
                        <span className="truncate block" title={m.name}>
                          {m.name}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {m.unit}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={m.ativo ? "secondary" : "outline"}
                          className={cn(
                            "text-xs cursor-pointer transition-colors",
                            m.ativo
                              ? "bg-green-100 text-green-700 hover:bg-green-200"
                              : "text-muted-foreground",
                          )}
                          onClick={() =>
                            updateMaterial(m.id, { ativo: !m.ativo })
                          }
                        >
                          {m.ativo ? "Ativo" : "Inativo"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(m.created_at).toLocaleDateString("pt-BR")}
                      </TableCell>
                      <TableCell className="pr-4">
                        <div className="flex items-center justify-end gap-1">
                          {/* Edit */}
                          <Dialog
                            open={editId === m.id}
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
                                  setEditId(m.id);
                                  setEditNome(m.name);
                                  setEditUnit(m.unit);
                                }}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Editar Material</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div className="space-y-2">
                                  <Label>Nome</Label>
                                  <Input
                                    value={editNome}
                                    onChange={(e) =>
                                      setEditNome(e.target.value)
                                    }
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label>Unidade de medida</Label>
                                  <Select value={editUnit} onValueChange={setEditUnit}>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Selecione a unidade" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {UNIT_OPTIONS.map(opt => (
                                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                              <DialogFooter>
                                <DialogClose asChild>
                                  <Button variant="outline">Cancelar</Button>
                                </DialogClose>
                                <Button
                                  onClick={handleEdit}
                                  disabled={
                                    !editNome.trim() || !editUnit.trim()
                                  }
                                >
                                  Salvar
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>

                          {/* Delete — only admin */}
                          {isAdmin && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                              onClick={() => setDeleteId(m.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <TablePagination
            page={page}
            totalPages={totalPages}
            total={filtered.length}
            pageSize={PAGE_SIZE}
            onPageChange={setPage}
            className="border-t border-border/60"
          />
        </div>

        {/* Delete confirmation dialog */}
        <Dialog
          open={!!deleteId}
          onOpenChange={(o) => {
            if (!o) setDeleteId(null);
          }}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Trash2 className="h-5 w-5 text-destructive" />
                Excluir Material
              </DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground py-2">
              Tem certeza que deseja excluir{" "}
              <strong>{deleteTarget?.name}</strong>? Esta ação não pode ser
              desfeita.
            </p>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancelar</Button>
              </DialogClose>
              <Button variant="destructive" onClick={handleDelete}>
                Excluir
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
