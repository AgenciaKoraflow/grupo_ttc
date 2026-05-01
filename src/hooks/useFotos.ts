import { useData } from '@/contexts/DataContext';

export function useFotos(options?: { ocorrenciaId?: string; servicoId?: string }) {
  const {
    fotosServico,
    fotosFinais,
    addFotoServico,
    deleteFotoServico,
    addFotoFinal,
    deleteFotoFinal,
  } = useData();

  const fotosPorServico = options?.servicoId
    ? fotosServico.filter(f => f.servico_id === options.servicoId)
    : fotosServico;

  const fotosFinaisPorOcorrencia = options?.ocorrenciaId
    ? fotosFinais.filter(f => f.ocorrencia_id === options.ocorrenciaId)
    : fotosFinais;

  const getFotosServico = (servicoId: string) =>
    fotosServico.filter(f => f.servico_id === servicoId);

  const getFotosFinais = (ocorrenciaId: string) =>
    fotosFinais.filter(f => f.ocorrencia_id === ocorrenciaId);

  return {
    fotosServico: fotosPorServico,
    fotosFinais: fotosFinaisPorOcorrencia,
    getFotosServico,
    getFotosFinais,
    addFotoServico,
    deleteFotoServico,
    addFotoFinal,
    deleteFotoFinal,
  };
}
