import { useData } from '@/contexts/DataContext';

export function useUsuarios() {
  const { profiles, addProfile, updateProfile, deleteProfile } = useData();
  return {
    usuarios: profiles,
    addUsuario: addProfile,
    updateUsuario: updateProfile,
    deleteUsuario: deleteProfile,
  };
}
