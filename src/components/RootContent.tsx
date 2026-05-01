import { useEffect } from 'react';
import { Outlet } from '@tanstack/react-router';
import { useAuth } from '@/contexts/AuthContext';
import { useLog } from '@/contexts/LogContext';
import { ChangePasswordModal } from '@/components/ChangePasswordModal';
import { Toaster } from '@/components/ui/sonner';

export function RootContent() {
  const { user } = useAuth();
  const { addLog } = useLog();

  useEffect(() => {
    if (user) {
      addLog({
        userId: user.id,
        userNome: user.nome,
        userRole: user.role,
        tipo: 'LOGIN',
        categoria: 'AUTENTICACAO',
        entidadeId: user.id,
        entidadeNome: user.email,
        detalhes: `${user.nome} fez login no sistema`,
      });
    }
  }, [user?.id]);

  return (
    <>
      <Toaster richColors position="top-right" />
      <ChangePasswordModal />
      <Outlet />
    </>
  );
}
