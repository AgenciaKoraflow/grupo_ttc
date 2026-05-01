import { useMemo } from 'react';
import { useData } from '@/contexts/DataContext';
import type { OcorrenciaFilters } from '@/types';

export function useOcorrencias(filters?: OcorrenciaFilters) {
  const {
    ocorrencias,
    equipes,
    tiposServico,
    servicos,
    addOcorrencias,
    importOcorrencias,
    updateOcorrencia,
    finalizarOcorrencia,
    reabrirOcorrencia,
    deleteOcorrencia,
    vincularEquipe,
    designarOperador,
  } = useData();

  const filtered = useMemo(() => {
    if (!filters) return ocorrencias;
    const { status, equipe_id, municipio, contratada, search } = filters;

    return ocorrencias.filter(oc => {
      if (status && oc.status !== status) return false;
      if (equipe_id && oc.equipe_id !== equipe_id) return false;
      if (municipio && !oc.municipio.toLowerCase().includes(municipio.toLowerCase())) return false;
      if (contratada && oc.contratada !== contratada) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          oc.id_ocorrencia.toLowerCase().includes(q) ||
          oc.municipio.toLowerCase().includes(q) ||
          (oc.contratada?.toLowerCase().includes(q) ?? false) ||
          (oc.equipe?.nome.toLowerCase().includes(q) ?? false)
        );
      }
      return true;
    });
  }, [ocorrencias, filters]);

  return {
    ocorrencias,
    filtered,
    equipes,
    tiposServico,
    servicos,
    addOcorrencias,
    importOcorrencias,
    updateOcorrencia,
    finalizarOcorrencia,
    reabrirOcorrencia,
    deleteOcorrencia,
    vincularEquipe,
    designarOperador,
  };
}
