import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useData } from "@/contexts/DataContext";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil } from "lucide-react";

export const Route = createFileRoute("/equipes")({
  component: EquipesPage,
});

function EquipesPage() {
  const { equipes, addEquipe, updateEquipe } = useData();
  const [nome, setNome] = useState('');
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editNome, setEditNome] = useState('');

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

  return (
    <AppLayout>
      <div className="p-6 space-y-4 max-w-3xl mx-auto">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">Equipes</h1>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1"><Plus className="h-4 w-4" /> Nova Equipe</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Nova Equipe</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <Label>Nome</Label>
                <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome da equipe" />
              </div>
              <DialogFooter>
                <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
                <Button onClick={handleAdd} disabled={!nome.trim()}>Criar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="border rounded-lg overflow-hidden bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[100px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {equipes.map(eq => (
                <TableRow key={eq.id}>
                  <TableCell className="font-medium">{eq.nome}</TableCell>
                  <TableCell>
                    <Badge variant={eq.ativa ? 'secondary' : 'outline'} className="text-xs cursor-pointer"
                      onClick={() => updateEquipe(eq.id, { ativa: !eq.ativa })}>
                      {eq.ativa ? 'Ativa' : 'Inativa'}
                    </Badge>
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
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </AppLayout>
  );
}
