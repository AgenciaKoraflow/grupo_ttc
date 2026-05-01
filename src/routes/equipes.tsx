import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useData } from "@/contexts/DataContext";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Users, Trash2, Building2, Activity, Clock, CheckCircle } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { usePageTitle } from "@/hooks/usePageTitle";
import { TablePagination } from "@/components/TablePagination";

export const Route = createFileRoute("/equipes")({
  component: EquipesPage,
});

const C = {
  primary: 'oklch(0.50 0.225 255)',
  success: 'oklch(0.36 0.14 150)',
  warning: 'oklch(0.40 0.12 70)',
  danger: 'oklch(0.50 0.235 27)',
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

function EquipesPage() {
  usePageTitle("Equipes");
  const { isAdmin, isSupervisor, canDelete, canCreate } = useAuth();
  const isAdminOrSupervisor = isAdmin || isSupervisor;
  const { equipes, ocorrencias, profiles, addEquipe, updateEquipe, updateProfile, deleteEquipe } = useData();

  if (!isAdminOrSupervisor) {
    return (
      <AppLayout>
        <div className="p-6 flex flex-col items-center justify-center min-h-[60vh] gap-3">
          <Building2 className="h-12 w-12 text-muted-foreground/30" />
          <p className="text-lg font-semibold text-muted-foreground">Acesso restrito</p>
          <p className="text-sm text-muted-foreground/70">Apenas administradores e supervisores podem gerenciar equipes.</p>
        </div>
      </AppLayout>
    );
  }
  const [nome, setNome] = useState('');
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editNome, setEditNome] = useState('');
  const [selectedOperadores, setSelectedOperadores] = useState<Set<string>>(new Set());
  const [openDelete, setOpenDelete] = useState(false);
  const [equipeParaDeletar, setEquipeParaDeletar] = useState<string | null>(null);

  const stats = useMemo(() => {
    const ativas = equipes.filter(e => e.ativa).length;
    const inativas = equipes.filter(e => !e.ativa).length;
    const totalOcorrencias = equipes.length > 0 ? ocorrencias.length : 0;
    return { ativas, inativas, totalOcorrencias };
  }, [equipes, ocorrencias]);

  const equipeStats = useMemo(() => {
    return equipes.map(eq => {
      const eqOcs = ocorrencias.filter(o => o.equipe_id === eq.id);
      const operadores = profiles.filter(p => p.equipe_id === eq.id && p.role === 'operador').length;
      return {
        id: eq.id,
        total: eqOcs.length,
        pendentes: eqOcs.filter(o => o.status === 'PENDENTE').length,
        emAndamento: eqOcs.filter(o => o.status === 'EM_ANDAMENTO').length,
        finalizadas: eqOcs.filter(o => o.status === 'FINALIZADA').length,
        operadores,
      };
    });
  }, [equipes, ocorrencias, profiles]);

  const handleAdd = () => {
    if (!nome.trim()) return;
    addEquipe(nome.trim());
    setNome('');
    setOpen(false);
  };

  const handleEdit = () => {
    if (!editId || !editNome.trim()) return;
    updateEquipe(editId, { nome: editNome.trim() });

    // Atualizar operadores da equipe
    const currentOperadores = profiles.filter(p => p.equipe_id === editId && p.role === 'operador').map(p => p.id);
    const addedOperadores = Array.from(selectedOperadores).filter(id => !currentOperadores.includes(id));
    const removedOperadores = currentOperadores.filter(id => !selectedOperadores.has(id));

    addedOperadores.forEach(opId => updateProfile(opId, { equipe_id: editId }));
    removedOperadores.forEach(opId => updateProfile(opId, { equipe_id: null }));

    setEditId(null);
    setSelectedOperadores(new Set());
  };

  const handleDelete = () => {
    if (equipeParaDeletar) {
      deleteEquipe(equipeParaDeletar);
      setOpenDelete(false);
      setEquipeParaDeletar(null);
    }
  };

  const getEqStats = (eqId: string) => equipeStats.find(e => e.id === eqId);

  const PAGE_SIZE = 25;
  const [page, setPage] = useState(0);
  const paginatedEquipes = useMemo(
    () => equipes.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE),
    [equipes, page],
  );
  const totalPages = Math.ceil(equipes.length / PAGE_SIZE);
  const getEquipeName = (eqId: string) => equipes.find(e => e.id === eqId)?.nome;

  return (
    <AppLayout>
      <div className="p-4 sm:p-6 space-y-5 max-w-6xl mx-auto">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Building2 className="h-6 w-6" />
              Equipes
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Gerencie as equipes de campo e acompanhe suas performances
            </p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1"
                style={{ background: 'linear-gradient(135deg, oklch(0.50 0.225 255), oklch(0.44 0.245 272))' }}>
                <Plus className="h-4 w-4" /> Nova Equipe
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Nova Equipe</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <Label>Nome</Label>
                <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Equipe Alpha" />
              </div>
              <DialogFooter>
                <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
                <Button onClick={handleAdd} disabled={!nome.trim()}>Criar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <StatCard label="Total de Equipes" value={equipes.length} icon={Users} color={C.primary} />
          <StatCard label="Equipes Ativas" value={stats.ativas} icon={CheckCircle} color={C.success} />
          <StatCard label="Ocorrências Totais" value={stats.totalOcorrencias} icon={Activity} color={C.muted} />
        </div>

        <div className="border border-border/60 rounded-xl bg-card" style={{ boxShadow: '0 1px 3px oklch(0.115 0.028 252 / 0.06), 0 4px 12px oklch(0.115 0.028 252 / 0.04)' }}>
          <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="pl-4">Nome</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-center">Operadores</TableHead>
                <TableHead className="w-[100px] pr-4">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {equipes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    Nenhuma equipe cadastrada
                  </TableCell>
                </TableRow>
              ) : paginatedEquipes.map(eq => {
                const s = getEqStats(eq.id);
                return (
                  <TableRow key={eq.id}>
                    <TableCell className="font-medium pl-4 max-w-[220px]"><span className="truncate block" title={eq.nome}>{eq.nome}</span></TableCell>
                    <TableCell>
                      <Badge 
                        variant={eq.ativa ? 'secondary' : 'outline'} 
                        className={cn('text-xs cursor-pointer transition-colors', eq.ativa ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'text-muted-foreground')}
                        onClick={() => updateEquipe(eq.id, { ativa: !eq.ativa })}
                      >
                        {eq.ativa ? 'Ativa' : 'Inativa'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="inline-flex items-center gap-1 text-sm">
                        <Users className="h-3 w-3 text-muted-foreground" />
                        {s?.operadores ?? 0}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Dialog open={editId === eq.id} onOpenChange={(o) => { if (!o) setEditId(null); }}>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {
                              setEditId(eq.id);
                              setEditNome(eq.nome);
                              const operadores = new Set(profiles.filter(p => p.equipe_id === eq.id && p.role === 'operador').map(p => p.id));
                              setSelectedOperadores(operadores);
                            }}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-h-[80vh] overflow-y-auto">
                            <DialogHeader><DialogTitle>Editar Equipe</DialogTitle></DialogHeader>
                            <div className="space-y-4">
                              <div className="space-y-2">
                                <Label>Nome</Label>
                                <Input value={editNome} onChange={(e) => setEditNome(e.target.value)} />
                              </div>
                              <div className="space-y-2">
                                <Label>Operadores</Label>
                                <div className="space-y-2 border rounded-lg p-3 max-h-[300px] overflow-y-auto">
                                  {profiles.filter(p => p.role === 'operador').length === 0 ? (
                                    <p className="text-sm text-muted-foreground">Nenhum operador cadastrado</p>
                                  ) : (
                                    profiles.filter(p => p.role === 'operador').map(op => (
                                      <div key={op.id} className="flex items-center gap-2">
                                        <Checkbox
                                          id={`op-${op.id}`}
                                          checked={selectedOperadores.has(op.id)}
                                          onCheckedChange={(checked) => {
                                            const newSet = new Set(selectedOperadores);
                                            if (checked) newSet.add(op.id);
                                            else newSet.delete(op.id);
                                            setSelectedOperadores(newSet);
                                          }}
                                        />
                                        <Label htmlFor={`op-${op.id}`} className="font-normal cursor-pointer flex-1">
                                          {op.nome} <span className="text-xs text-muted-foreground">({op.email})</span>
                                        </Label>
                                      </div>
                                    ))
                                  )}
                                </div>
                              </div>
                            </div>
                            <DialogFooter>
                              <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
                              <Button onClick={handleEdit}>Salvar</Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-600 hover:text-red-700"
                          onClick={() => {
                            setEquipeParaDeletar(eq.id);
                            setOpenDelete(true);
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          </div>
          <TablePagination
            page={page} totalPages={totalPages} total={equipes.length}
            pageSize={PAGE_SIZE} onPageChange={setPage}
            className="border-t border-border/60"
          />
        </div>

        {/* Modal Deletar Equipe */}
        <AlertDialog open={openDelete} onOpenChange={setOpenDelete}>
          <AlertDialogContent>
            <AlertDialogTitle>Deletar Equipe</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja deletar a equipe "{getEquipeName(equipeParaDeletar || '')}"? Os operadores desta equipe ficarão sem equipe. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
            <div className="flex justify-end gap-2 mt-6">
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete}>
                Deletar
              </AlertDialogAction>
            </div>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AppLayout>
  );
}
