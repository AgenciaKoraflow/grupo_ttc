import type {
  Profile, Equipe, Ocorrencia, TipoServico,
  ServicoOcorrencia, FotoServico, FotoOcorrenciaFinal,
  DashboardStats,
} from '@/types';

export const mockEquipes: Equipe[] = [
  { id: 'eq-1', nome: 'Equipe Alpha', ativa: true, created_at: '2025-01-01T00:00:00Z' },
  { id: 'eq-2', nome: 'Equipe Bravo', ativa: true, created_at: '2025-01-01T00:00:00Z' },
  { id: 'eq-3', nome: 'Equipe Charlie', ativa: false, created_at: '2025-01-01T00:00:00Z' },
];

export const mockProfiles: Profile[] = [
  { id: 'u-1', nome: 'Admin Silva', email: 'admin@prev.com', role: 'admin', equipe_id: null, created_at: '2025-01-01T00:00:00Z' },
  { id: 'u-2', nome: 'Carlos Operador', email: 'carlos@prev.com', role: 'operador', equipe_id: 'eq-1', created_at: '2025-01-02T00:00:00Z' },
  { id: 'u-3', nome: 'Ana Operadora', email: 'ana@prev.com', role: 'operador', equipe_id: 'eq-2', created_at: '2025-01-03T00:00:00Z' },
];

export const mockTiposServico: TipoServico[] = [
  { id: 'ts-1', nome: 'Instalação de tubo na subida do lateral e alteamento/agrupamento de fios', ativo: true, created_at: '2025-01-01T00:00:00Z' },
  { id: 'ts-2', nome: 'Alteamento/agrupamento de fios', ativo: true, created_at: '2025-01-01T00:00:00Z' },
  { id: 'ts-3', nome: 'Retirada de pontas de fios soltos pendurados', ativo: true, created_at: '2025-01-01T00:00:00Z' },
];

export const mockOcorrencias: Ocorrencia[] = [
  {
    id: 'oc-1', id_ocorrencia: 'OC-2025-001', municipio: 'São Paulo', cabo_primaria: 'CAB-101',
    at: 'AT-01', contratada: 'TeleCom Ltda', equipe_id: 'eq-1',
    equipe: mockEquipes[0], status: 'PENDENTE',
    created_at: '2025-03-01T10:00:00Z', updated_at: '2025-03-01T10:00:00Z',
    finalized_at: null, finalized_by: null,
  },
  {
    id: 'oc-2', id_ocorrencia: 'OC-2025-002', municipio: 'Campinas', cabo_primaria: 'CAB-202',
    at: 'AT-02', contratada: 'NetFibra SA', equipe_id: 'eq-1',
    equipe: mockEquipes[0], status: 'EM_ANDAMENTO',
    created_at: '2025-03-02T11:00:00Z', updated_at: '2025-03-05T14:00:00Z',
    finalized_at: null, finalized_by: null,
  },
  {
    id: 'oc-3', id_ocorrencia: 'OC-2025-003', municipio: 'Guarulhos', cabo_primaria: 'CAB-303',
    at: 'AT-03', contratada: 'TeleCom Ltda', equipe_id: 'eq-2',
    equipe: mockEquipes[1], status: 'FINALIZADA',
    created_at: '2025-03-03T09:00:00Z', updated_at: '2025-03-10T16:00:00Z',
    finalized_at: '2025-03-10T16:00:00Z', finalized_by: 'u-3',
  },
  {
    id: 'oc-4', id_ocorrencia: 'OC-2025-004', municipio: 'Osasco', cabo_primaria: null,
    at: 'AT-04', contratada: 'ConnectBR', equipe_id: null,
    status: 'PENDENTE',
    created_at: '2025-03-04T08:00:00Z', updated_at: '2025-03-04T08:00:00Z',
    finalized_at: null, finalized_by: null,
  },
  {
    id: 'oc-5', id_ocorrencia: 'OC-2025-005', municipio: 'São Paulo', cabo_primaria: 'CAB-505',
    at: 'AT-01', contratada: 'TeleCom Ltda', equipe_id: 'eq-2',
    equipe: mockEquipes[1], status: 'PENDENTE',
    created_at: '2025-03-05T07:00:00Z', updated_at: '2025-03-05T07:00:00Z',
    finalized_at: null, finalized_by: null,
  },
];

export const mockServicos: ServicoOcorrencia[] = [
  {
    id: 'sv-1', ocorrencia_id: 'oc-2', tipo_servico_id: 'ts-1',
    tipo_servico: mockTiposServico[0], observacao: 'Poste na esquina da Rua A com Av. B',
    status_item: 'Regularizado', ordem: 1, created_by: 'u-2',
    created_at: '2025-03-05T14:00:00Z', updated_at: '2025-03-05T14:00:00Z',
  },
  {
    id: 'sv-2', ocorrencia_id: 'oc-2', tipo_servico_id: 'ts-2',
    tipo_servico: mockTiposServico[1], observacao: null,
    status_item: 'Regularizado', ordem: 2, created_by: 'u-2',
    created_at: '2025-03-05T15:00:00Z', updated_at: '2025-03-05T15:00:00Z',
  },
  {
    id: 'sv-3', ocorrencia_id: 'oc-3', tipo_servico_id: 'ts-3',
    tipo_servico: mockTiposServico[2], observacao: 'Fios pendentes no poste 42',
    status_item: 'Regularizado', ordem: 1, created_by: 'u-3',
    created_at: '2025-03-08T10:00:00Z', updated_at: '2025-03-08T10:00:00Z',
  },
];

const placeholderImg = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE1MCIgZmlsbD0iI2UyZThmMCIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBkb21pbmFudC1iYXNlbGluZT0ibWlkZGxlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk0YTNiOCI+Rm90bzwvdGV4dD48L3N2Zz4=';

export const mockFotosServico: FotoServico[] = [
  { id: 'fs-1', servico_id: 'sv-1', tipo_foto: 'antes', storage_path: '/antes/1.jpg', file_name: 'antes_1.jpg', mime_type: 'image/jpeg', ordem: 1, created_at: '2025-03-05T14:00:00Z', url: placeholderImg },
  { id: 'fs-2', servico_id: 'sv-1', tipo_foto: 'depois', storage_path: '/depois/1.jpg', file_name: 'depois_1.jpg', mime_type: 'image/jpeg', ordem: 1, created_at: '2025-03-05T14:30:00Z', url: placeholderImg },
  { id: 'fs-3', servico_id: 'sv-3', tipo_foto: 'antes', storage_path: '/antes/2.jpg', file_name: 'antes_2.jpg', mime_type: 'image/jpeg', ordem: 1, created_at: '2025-03-08T10:00:00Z', url: placeholderImg },
  { id: 'fs-4', servico_id: 'sv-3', tipo_foto: 'depois', storage_path: '/depois/2.jpg', file_name: 'depois_2.jpg', mime_type: 'image/jpeg', ordem: 1, created_at: '2025-03-08T11:00:00Z', url: placeholderImg },
];

export const mockFotosFinais: FotoOcorrenciaFinal[] = [
  { id: 'ff-1', ocorrencia_id: 'oc-3', categoria: 'retirada_fios', storage_path: '/ret/1.jpg', file_name: 'ret_1.jpg', mime_type: 'image/jpeg', ordem: 1, created_at: '2025-03-10T15:00:00Z', url: placeholderImg },
  { id: 'ff-2', ocorrencia_id: 'oc-3', categoria: 'ctop', storage_path: '/ctop/1.jpg', file_name: 'ctop_1.jpg', mime_type: 'image/jpeg', ordem: 1, created_at: '2025-03-10T15:30:00Z', url: placeholderImg },
];

export function getDashboardStats(ocorrencias: Ocorrencia[]): DashboardStats {
  return {
    total: ocorrencias.length,
    pendentes: ocorrencias.filter(o => o.status === 'PENDENTE').length,
    em_andamento: ocorrencias.filter(o => o.status === 'EM_ANDAMENTO').length,
    finalizadas: ocorrencias.filter(o => o.status === 'FINALIZADA').length,
  };
}

export function filterOcorrencias(
  ocorrencias: Ocorrencia[],
  filters: { status?: string; equipe_id?: string; municipio?: string; contratada?: string; search?: string },
  userEquipeId?: string | null,
): Ocorrencia[] {
  let result = [...ocorrencias];
  if (userEquipeId) result = result.filter(o => o.equipe_id === userEquipeId);
  if (filters.status) result = result.filter(o => o.status === filters.status);
  if (filters.equipe_id) result = result.filter(o => o.equipe_id === filters.equipe_id);
  if (filters.municipio) result = result.filter(o => o.municipio === filters.municipio);
  if (filters.contratada) result = result.filter(o => o.contratada === filters.contratada);
  if (filters.search) {
    const s = filters.search.toLowerCase();
    result = result.filter(o =>
      o.id_ocorrencia.toLowerCase().includes(s) ||
      o.municipio.toLowerCase().includes(s)
    );
  }
  return result;
}
