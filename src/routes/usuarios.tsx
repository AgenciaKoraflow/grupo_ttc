import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useData } from "@/contexts/DataContext";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Users, UserCog, Shield, Building2, Plus, Pencil, Key, Trash2, Copy, Check, AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { usePageTitle } from "@/hooks/usePageTitle";

export const Route = createFileRoute("/usuarios")({
  component: UsuariosPage,
});

const C = {
  primary: 'oklch(0.50 0.225 255)',
  success: 'oklch(0.36 0.14 150)',
  admin: 'oklch(0.50 0.235 27)',
  warning: 'oklch(0.80 0.165 70)',
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

function UsuariosPage() {
  usePageTitle("Usuários");
  const { canManageUsers } = useAuth();
  const { profiles, equipes, addProfile, updateProfile, deleteProfile } = useData();
  const [openCreate, setOpenCreate] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [openDelete, setOpenDelete] = useState(false);
  const [openResetPassword, setOpenResetPassword] = useState(false);

  const [formData, setFormData] = useState({ nome: '', email: '', role: 'operador' as 'admin' | 'supervisor' | 'operador', equipe_id: '' });
  const [selectedUserId, setSelectedUserId] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [createdUser, setCreatedUser] = useState<{ nome: string; email: string; tempPassword: string; mode: 'create' | 'reset' } | null>(null);
  const [copied, setCopied] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [resetError, setResetError] = useState('');

  const stats = useMemo(() => {
    const admins = profiles.filter(p => p.role === 'admin').length;
    const supervisores = profiles.filter(p => p.role === 'supervisor').length;
    const operadores = profiles.filter(p => p.role === 'operador').length;
    const comEquipe = profiles.filter(p => p.equipe_id).length;
    const semEquipe = profiles.filter(p => !p.equipe_id).length;
    return { admins, supervisores, operadores, comEquipe, semEquipe };
  }, [profiles]);

  const getInitials = (nome: string) => nome.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();

  const roleHasEquipe = (role: string) => role === 'operador' || role === 'supervisor';

  const handleCreateUser = async () => {
    if (!formData.nome || !formData.email) return;
    setIsCreating(true);
    setCreateError('');
    try {
      const { profile, tempPassword } = await addProfile({
        nome: formData.nome,
        email: formData.email,
        role: formData.role,
        equipe_id: roleHasEquipe(formData.role) ? formData.equipe_id || null : null,
      });
      setOpenCreate(false);
      setFormData({ nome: '', email: '', role: 'operador', equipe_id: '' });
      setCreatedUser({ nome: profile.nome, email: profile.email, tempPassword, mode: 'create' });
    } catch (err: any) {
      const msg = err?.message || 'Erro ao criar usuário. Verifique os dados e tente novamente.';
      setCreateError(msg.includes('already') || msg.includes('exists') ? 'Este email já está cadastrado no sistema.' : msg);
    } finally {
      setIsCreating(false);
    }
  };

  const handleCopyPassword = () => {
    if (!createdUser) return;
    navigator.clipboard.writeText(createdUser.tempPassword);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleEditUser = () => {
    const user = profiles.find(p => p.id === selectedUserId);
    if (!user) return;
    updateProfile(selectedUserId, {
      nome: formData.nome,
      email: formData.email,
      role: formData.role,
      equipe_id: roleHasEquipe(formData.role) ? formData.equipe_id || null : null,
    });
    setOpenEdit(false);
    setFormData({ nome: '', email: '', role: 'operador', equipe_id: '' });
    setSelectedUserId('');
  };

  const openEditModal = (userId: string) => {
    const user = profiles.find(p => p.id === userId);
    if (!user) return;
    setFormData({
      nome: user.nome,
      email: user.email,
      role: user.role,
      equipe_id: user.equipe_id || '',
    });
    setSelectedUserId(userId);
    setOpenEdit(true);
  };

  const openDeleteModal = (userId: string) => {
    setSelectedUserId(userId);
    setOpenDelete(true);
  };

  const openResetPasswordModal = (userId: string) => {
    setSelectedUserId(userId);
    setOpenResetPassword(true);
  };

  const handleDeleteUser = () => {
    if (selectedUserId) {
      deleteProfile(selectedUserId);
      setOpenDelete(false);
      setSelectedUserId('');
    }
  };

  const handleResetPassword = async () => {
    if (!selectedUserId) return;
    setIsResetting(true);
    setResetError('');
    try {
      const { data: result, error } = await supabase.functions.invoke('manage-user', {
        body: { action: 'reset-password', user_id: selectedUserId },
      });
      if (error) throw error;
      const user = profiles.find(p => p.id === selectedUserId);
      setOpenResetPassword(false);
      setCreatedUser({ nome: user!.nome, email: user!.email, tempPassword: result.tempPassword, mode: 'reset' });
      setSelectedUserId('');
    } catch (err: any) {
      setResetError(err?.message || 'Erro ao resetar senha. Tente novamente.');
    } finally {
      setIsResetting(false);
    }
  };

  const selectedUser = selectedUserId ? profiles.find(p => p.id === selectedUserId) : null;

  if (!canManageUsers) {
    return (
      <AppLayout>
        <div className="p-6 flex flex-col items-center justify-center min-h-[60vh] gap-3">
          <Shield className="h-12 w-12 text-muted-foreground/30" />
          <p className="text-lg font-semibold text-muted-foreground">Acesso restrito</p>
          <p className="text-sm text-muted-foreground/70">Apenas administradores podem gerenciar usuários.</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-6 space-y-6 max-w-6xl mx-auto">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <UserCog className="h-6 w-6" />
              Usuários
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Gerencie operadores e administradores do sistema
            </p>
          </div>
          <Button
            onClick={() => setOpenCreate(true)}
            className="gap-2"
            style={{ background: 'linear-gradient(135deg, oklch(0.50 0.225 255), oklch(0.44 0.245 272))' }}
          >
            <Plus className="h-4 w-4" />
            Novo Usuário
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <StatCard label="Total de Usuários" value={profiles.length} icon={Users} color={C.primary} />
          <StatCard label="Administradores" value={stats.admins} icon={Shield} color={C.admin} />
          <StatCard label="Supervisores" value={stats.supervisores} icon={UserCog} color={C.warning} />
          <StatCard label="Operadores" value={stats.operadores} icon={Users} color={C.success} />
        </div>

        <div className="border border-border/60 rounded-xl overflow-hidden bg-card" style={{ boxShadow: '0 1px 3px oklch(0.115 0.028 252 / 0.06), 0 4px 12px oklch(0.115 0.028 252 / 0.04)' }}>
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead>Usuário</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Perfil</TableHead>
                <TableHead>Equipe</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {profiles.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Nenhum usuário encontrado
                  </TableCell>
                </TableRow>
              ) : profiles.map(p => {
                const initials = getInitials(p.nome);
                return (
                  <TableRow key={p.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                          style={{ background: 'linear-gradient(135deg, oklch(0.50 0.225 255), oklch(0.44 0.245 272))' }}>
                          {initials}
                        </div>
                        <span className="font-medium">{p.nome}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">{p.email}</TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={cn(
                          'text-xs capitalize',
                          p.role === 'admin' && 'bg-purple-100 text-purple-700',
                          p.role === 'supervisor' && 'bg-blue-100 text-blue-700',
                          p.role === 'operador' && 'bg-green-100 text-green-700',

                        )}
                      >
                        <Shield className="h-3 w-3 mr-1" />
                        {p.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {p.equipe_id ? (
                        <span className="text-sm">{equipes.find(e => e.id === p.equipe_id)?.nome}</span>
                      ) : (
                        <span className="text-muted-foreground text-sm">Sem equipe</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {p.must_change_password && (
                        <Badge variant="outline" className="text-xs" style={{ borderColor: C.warning, color: C.warning }}>
                          Primeiro acesso
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openEditModal(p.id)}
                          className="h-8 w-8 p-0"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openResetPasswordModal(p.id)}
                          className="h-8 w-8 p-0"
                        >
                          <Key className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openDeleteModal(p.id)}
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Modal Criar Usuário */}
      <Dialog open={openCreate} onOpenChange={(open) => { if (!isCreating) { setOpenCreate(open); setCreateError(''); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar Novo Usuário</DialogTitle>
            <DialogDescription>Preencha os dados para criar um novo usuário no sistema.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="nome" className="text-sm font-medium">Nome</Label>
              <Input
                id="nome"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                placeholder="Ex: João Silva"
                className="mt-1.5"
                disabled={isCreating}
              />
            </div>
            <div>
              <Label htmlFor="email" className="text-sm font-medium">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="Ex: joao@prev.com"
                className="mt-1.5"
                disabled={isCreating}
              />
            </div>
            <div>
              <Label htmlFor="role" className="text-sm font-medium">Perfil</Label>
              <select
                id="role"
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value as any, equipe_id: roleHasEquipe(e.target.value) ? formData.equipe_id : '' })}
                className="w-full mt-1.5 px-3 py-2 rounded-lg border border-border/80 bg-background text-sm disabled:opacity-50"
                disabled={isCreating}
              >
                <option value="operador">Operador — criar, editar, reabrir</option>
                <option value="supervisor">Supervisor — criar, editar, excluir</option>
                <option value="admin">Administrador — acesso total</option>
              </select>
            </div>
            {roleHasEquipe(formData.role) && (
              <div>
                <Label htmlFor="equipe" className="text-sm font-medium">Equipe</Label>
                <select
                  id="equipe"
                  value={formData.equipe_id}
                  onChange={(e) => setFormData({ ...formData, equipe_id: e.target.value })}
                  className="w-full mt-1.5 px-3 py-2 rounded-lg border border-border/80 bg-background text-sm disabled:opacity-50"
                  disabled={isCreating}
                >
                  <option value="">Selecionar equipe...</option>
                  {equipes.map(eq => (
                    <option key={eq.id} value={eq.id}>{eq.nome}</option>
                  ))}
                </select>
              </div>
            )}
            {createError && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200">
                <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
                <p className="text-xs text-red-800">{createError}</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setOpenCreate(false); setCreateError(''); }} disabled={isCreating}>Cancelar</Button>
            <Button
              onClick={handleCreateUser}
              disabled={isCreating}
              style={{ background: 'linear-gradient(135deg, oklch(0.50 0.225 255), oklch(0.44 0.245 272))' }}
            >
              {isCreating ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Criando...
                </span>
              ) : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Senha Temporária (criar ou resetar) */}
      <Dialog open={!!createdUser} onOpenChange={(open) => { if (!open) { setCreatedUser(null); setCopied(false); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ background: 'oklch(0.36 0.14 150 / 0.12)' }}>
                <Check className="h-4 w-4" style={{ color: 'oklch(0.36 0.14 150)' }} />
              </div>
              {createdUser?.mode === 'reset' ? 'Senha resetada com sucesso' : 'Usuário criado com sucesso'}
            </DialogTitle>
            <DialogDescription>
              {createdUser?.mode === 'reset'
                ? <>Repasse as novas credenciais para <strong>{createdUser?.nome}</strong>. O usuário deverá trocar a senha no próximo acesso.</>
                : <>Repasse as credenciais abaixo para <strong>{createdUser?.nome}</strong>. A senha é temporária e deverá ser trocada no primeiro acesso.</>
              }
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div className="rounded-lg border border-border/60 bg-muted/30 p-4 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground mb-0.5">Email</p>
                  <p className="text-sm font-medium truncate">{createdUser?.email}</p>
                </div>
              </div>
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground mb-0.5">Senha temporária</p>
                  <p className="text-sm font-mono font-semibold tracking-wide">{createdUser?.tempPassword}</p>
                </div>
                <Button size="sm" variant="outline" onClick={handleCopyPassword} className="shrink-0 gap-1.5">
                  {copied ? <Check className="h-3.5 w-3.5" style={{ color: 'oklch(0.36 0.14 150)' }} /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? 'Copiado' : 'Copiar'}
                </Button>
              </div>
            </div>
            <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200">
              <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
              <p className="text-xs text-amber-800">
                Esta senha não será exibida novamente. Guarde-a antes de fechar.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => { setCreatedUser(null); setCopied(false); }}
              style={{ background: 'linear-gradient(135deg, oklch(0.50 0.225 255), oklch(0.44 0.245 272))' }}
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Editar Usuário */}
      <Dialog open={openEdit} onOpenChange={setOpenEdit}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Usuário</DialogTitle>
            <DialogDescription>Atualize os dados do usuário.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-nome" className="text-sm font-medium">Nome</Label>
              <Input
                id="edit-nome"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="edit-email" className="text-sm font-medium">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="edit-role" className="text-sm font-medium">Perfil</Label>
              <select
                id="edit-role"
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value as any, equipe_id: roleHasEquipe(e.target.value) ? formData.equipe_id : '' })}
                className="w-full mt-1.5 px-3 py-2 rounded-lg border border-border/80 bg-background text-sm"
              >

                <option value="operador">Operador — criar, editar, reabrir</option>
                <option value="supervisor">Supervisor — criar, editar, excluir</option>
                <option value="admin">Administrador — acesso total</option>
              </select>
            </div>
            {roleHasEquipe(formData.role) && (
              <div>
                <Label htmlFor="edit-equipe" className="text-sm font-medium">Equipe</Label>
                <select
                  id="edit-equipe"
                  value={formData.equipe_id}
                  onChange={(e) => setFormData({ ...formData, equipe_id: e.target.value })}
                  className="w-full mt-1.5 px-3 py-2 rounded-lg border border-border/80 bg-background text-sm"
                >
                  <option value="">Selecionar equipe...</option>
                  {equipes.map(eq => (
                    <option key={eq.id} value={eq.id}>{eq.nome}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenEdit(false)}>Cancelar</Button>
            <Button
              onClick={handleEditUser}
              style={{ background: 'linear-gradient(135deg, oklch(0.50 0.225 255), oklch(0.44 0.245 272))' }}
            >
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Resetar Senha */}
      <AlertDialog open={openResetPassword} onOpenChange={(open) => { if (!isResetting) { setOpenResetPassword(open); setResetError(''); } }}>
        <AlertDialogContent>
          <AlertDialogTitle>Resetar Senha</AlertDialogTitle>
          <AlertDialogDescription>
            Uma nova senha temporária será gerada para <strong>{selectedUser?.nome}</strong>. A senha atual deixará de funcionar imediatamente.
          </AlertDialogDescription>
          {resetError && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200 mt-2">
              <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
              <p className="text-xs text-red-800">{resetError}</p>
            </div>
          )}
          <div className="flex justify-end gap-2 mt-4">
            <AlertDialogCancel disabled={isResetting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleResetPassword} disabled={isResetting}>
              {isResetting ? (
                <span className="flex items-center gap-2">
                  <span className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Resetando...
                </span>
              ) : 'Resetar'}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal Deletar Usuário */}
      <AlertDialog open={openDelete} onOpenChange={setOpenDelete}>
        <AlertDialogContent>
          <AlertDialogTitle>Deletar Usuário</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja deletar {selectedUser?.nome}? Esta ação não pode ser desfeita.
          </AlertDialogDescription>
          <div className="flex justify-end gap-2 mt-6">
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteUser}>
              Deletar
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

    </AppLayout>
  );
}
