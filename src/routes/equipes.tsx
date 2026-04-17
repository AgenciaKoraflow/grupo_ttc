import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useData } from "@/contexts/DataContext";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Users, Trash2, Building2, Activity, Clock, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

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
  const { equipes, ocorrencias, profiles, addEquipe, updateEquipe } = useData();
  const [nome, setNome] = useState('');
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editNome, setEditNome] = useState('');

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
    setEditId(null);
  };

  const getEqStats = (eqId: string) => equipeStats.find(e => e.id === eqId);

  return (
    <AppLayout>
      <div className="p-6 space-y-6 max-w-5xl mx-auto">
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

        <div className="border border-border/60 rounded-xl overflow-hidden bg-card" style={{ boxShadow: '0 1px 3px oklch(0.115 0.028 252 / 0.06), 0 4px 12px oklch(0.115 0.028 252 / 0.04)' }}>
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead>Nome</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-center">Operadores</TableHead>
                <TableHead className="text-center">Total</TableHead>
                <TableHead className="text-center">Pendentes</TableHead>
                <TableHead className="text-center">Em Andamento</TableHead>
                <TableHead className="text-center">Finalizadas</TableHead>
                <TableHead className="w-[80px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {equipes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    Nenhuma equipe cadastrada
                  </TableCell>
                </TableRow>
              ) : equipes.map(eq => {
                const s = getEqStats(eq.id);
                return (
                  <TableRow key={eq.id}>
                    <TableCell className="font-medium">{eq.nome}</TableCell>
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
                    <TableCell className="text-center font-semibold">{s?.total ?? 0}</TableCell>
                    <TableCell className="text-center">
                      <span className={cn(s?.pendentes ? 'text-amber-600 font-medium' : 'text-muted-foreground')}>
                        {s?.pendentes ?? 0}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={cn(s?.emAndamento ? 'text-blue-600 font-medium' : 'text-muted-foreground')}>
                        {s?.emAndamento ?? 0}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={cn(s?.finalizadas ? 'text-green-600 font-medium' : 'text-muted-foreground')}>
                        {s?.finalizadas ?? 0}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Dialog open={editId === eq.id} onOpenChange={(o) => { if (!o) setEditId(null); }}>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditId(eq.id); setEditNome(eq.nome); }}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader><DialogTitle>Editar Equipe</DialogTitle></DialogHeader>
                          <div className="space-y-3">
                            <Label>Nome</Label>
                            <Input value={editNome} onChange={(e) => setEditNome(e.target.value)} />
                          </div>
                          <DialogFooter>
                            <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
                            <Button onClick={handleEdit}>Salvar</Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
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
