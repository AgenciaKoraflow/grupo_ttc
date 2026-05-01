import { useData } from '@/contexts/DataContext';

export function useEquipes() {
  const { equipes, addEquipe, updateEquipe, deleteEquipe } = useData();
  return { equipes, addEquipe, updateEquipe, deleteEquipe };
}
