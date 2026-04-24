import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Lock, AlertCircle } from 'lucide-react';

export function ChangePasswordModal() {
  const { user, needsPasswordChange, changePassword } = useAuth();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');

  const handleChangePassword = () => {
    setError('');

    if (!newPassword || !confirmPassword) {
      setError('Preencha todos os campos');
      return;
    }

    if (newPassword.length < 6) {
      setError('A senha deve ter no mínimo 6 caracteres');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('As senhas não coincidem');
      return;
    }

    changePassword(newPassword);
    setNewPassword('');
    setConfirmPassword('');
  };

  if (!needsPasswordChange || !user) return null;

  return (
    <Dialog open={needsPasswordChange} onOpenChange={() => {}}>
      <DialogContent className="fixed" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-lg flex items-center justify-center" style={{ background: 'oklch(0.50 0.225 255 / 0.12)' }}>
              <Lock className="h-5 w-5" style={{ color: 'oklch(0.50 0.225 255)' }} />
            </div>
            <div>
              <DialogTitle>Trocar Senha</DialogTitle>
              <DialogDescription className="text-xs mt-0.5">Primeiro acesso: defina uma nova senha</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200">
            <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
            <p className="text-xs text-amber-800">
              Você está acessando o sistema pela primeira vez. É necessário trocar sua senha temporária por uma permanente.
            </p>
          </div>

          <div>
            <Label htmlFor="new-password" className="text-sm font-medium">Nova Senha</Label>
            <Input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Digite sua nova senha"
              className="mt-1.5"
            />
          </div>

          <div>
            <Label htmlFor="confirm-password" className="text-sm font-medium">Confirmar Senha</Label>
            <Input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirme sua nova senha"
              className="mt-1.5"
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200">
              <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
              <p className="text-xs text-red-800">{error}</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            onClick={handleChangePassword}
            style={{ background: 'linear-gradient(135deg, oklch(0.50 0.225 255), oklch(0.44 0.245 272))' }}
            className="w-full"
          >
            Trocar Senha e Acessar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
