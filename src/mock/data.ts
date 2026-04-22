import type {
  Profile, Equipe, Ocorrencia, OcorrenciaStatus, TipoServico,
  ServicoOcorrencia, FotoServico, FotoOcorrenciaFinal,
  DashboardStats,
} from '@/types';

export const mockEquipes: Equipe[] = [
  { id: 'eq-1', nome: 'Equipe Alpha', ativa: true, created_at: '2025-01-01T00:00:00Z' },
  { id: 'eq-2', nome: 'Equipe Bravo', ativa: true, created_at: '2025-01-01T00:00:00Z' },
  { id: 'eq-3', nome: 'Equipe Charlie', ativa: true, created_at: '2025-01-01T00:00:00Z' },
  { id: 'eq-4', nome: 'Equipe Delta', ativa: false, created_at: '2025-01-01T00:00:00Z' },
];

export const mockProfiles: Profile[] = [
  { id: 'u-1', nome: 'Admin Silva', email: 'admin@prev.com', role: 'admin', equipe_id: null, created_at: '2025-01-01T00:00:00Z' },
  { id: 'u-2', nome: 'Carlos Operador', email: 'carlos@prev.com', role: 'operador', equipe_id: 'eq-1', created_at: '2025-01-02T00:00:00Z' },
  { id: 'u-3', nome: 'Ana Operadora', email: 'ana@prev.com', role: 'operador', equipe_id: 'eq-2', created_at: '2025-01-03T00:00:00Z' },
  { id: 'u-4', nome: 'Pedro Técnico', email: 'pedro@prev.com', role: 'operador', equipe_id: 'eq-3', created_at: '2025-01-04T00:00:00Z' },
];

export const mockTiposServico: TipoServico[] = [
  { id: 'ts-1', nome: 'Instalação de tubo na subida do lateral e alteamento/agrupamento de fios', ativo: true, created_at: '2025-01-01T00:00:00Z' },
  { id: 'ts-2', nome: 'Alteamento/agrupamento de fios', ativo: true, created_at: '2025-01-01T00:00:00Z' },
  { id: 'ts-3', nome: 'Retirada de pontas de fios soltos pendurados', ativo: true, created_at: '2025-01-01T00:00:00Z' },
];

// ─── Helper para construir ocorrências mock em volume ───────────────────────

function makeOc(
  id: string,
  idOc: string,
  municipio: string,
  equipeId: string | null,
  equipe: Equipe | undefined,
  status: OcorrenciaStatus,
  createdAt: string,
  finalizedAt: string | null = null,
  finalizedBy: string | null = null,
  contratada: string = 'NetFibra SA',
  cabo: string = 'CAB-' + idOc.slice(-3),
  at: string = 'AT-01',
): Ocorrencia {
  return {
    id,
    id_ocorrencia: idOc,
    municipio,
    cabo_primaria: cabo,
    at,
    contratada,
    nome_at: null,
    operador_id: null,
    equipe_id: equipeId,
    equipe,
    assigned_to: null,
    status,
    created_at: createdAt,
    updated_at: finalizedAt || createdAt,
    finalized_at: finalizedAt,
    finalized_by: finalizedBy,
    reopened_at: null,
    reopened_by: null,
  };
}

const eq1 = mockEquipes[0];
const eq2 = mockEquipes[1];
const eq3 = mockEquipes[2];

export const mockOcorrencias: Ocorrencia[] = [
  // ── Janeiro 2025 ─────────────────────────────────────────────────────────
  makeOc('oc-j01','OC-2025-J01','São Paulo',    'eq-1',eq1,'FINALIZADA','2025-01-03T08:00:00Z','2025-01-06T17:00:00Z','u-2','NetFibra SA'),
  makeOc('oc-j02','OC-2025-J02','Guarulhos',    'eq-2',eq2,'FINALIZADA','2025-01-05T09:00:00Z','2025-01-09T15:00:00Z','u-3'),
  makeOc('oc-j03','OC-2025-J03','Campinas',     'eq-1',eq1,'FINALIZADA','2025-01-07T10:00:00Z','2025-01-10T11:00:00Z','u-2','ConnectBR'),
  makeOc('oc-j04','OC-2025-J04','Osasco',       'eq-3',eq3,'FINALIZADA','2025-01-08T08:00:00Z','2025-01-12T16:00:00Z','u-4'),
  makeOc('oc-j05','OC-2025-J05','São Paulo',    'eq-2',eq2,'FINALIZADA','2025-01-10T11:00:00Z','2025-01-14T10:00:00Z','u-3','NetFibra SA'),
  makeOc('oc-j06','OC-2025-J06','Santo André',  'eq-1',eq1,'FINALIZADA','2025-01-12T09:00:00Z','2025-01-15T14:00:00Z','u-2'),
  makeOc('oc-j07','OC-2025-J07','Mauá',         'eq-3',eq3,'FINALIZADA','2025-01-14T10:00:00Z','2025-01-19T17:00:00Z','u-4','ConnectBR'),
  makeOc('oc-j08','OC-2025-J08','São Bernardo',  'eq-2',eq2,'FINALIZADA','2025-01-16T08:00:00Z','2025-01-20T11:00:00Z','u-3'),
  makeOc('oc-j09','OC-2025-J09','Diadema',       'eq-1',eq1,'FINALIZADA','2025-01-18T09:00:00Z','2025-01-22T15:00:00Z','u-2','NetFibra SA'),
  makeOc('oc-j10','OC-2025-J10','Carapicuíba',   'eq-3',eq3,'FINALIZADA','2025-01-20T10:00:00Z','2025-01-23T10:00:00Z','u-4'),
  makeOc('oc-j11','OC-2025-J11','Barueri',       'eq-2',eq2,'FINALIZADA','2025-01-22T08:00:00Z','2025-01-27T16:00:00Z','u-3'),
  makeOc('oc-j12','OC-2025-J12','Guarulhos',     'eq-1',eq1,'FINALIZADA','2025-01-24T09:00:00Z','2025-01-28T14:00:00Z','u-2','ConnectBR'),

  // ── Fevereiro 2025 ───────────────────────────────────────────────────────
  makeOc('oc-f01','OC-2025-F01','São Paulo',    'eq-1',eq1,'FINALIZADA','2025-02-03T08:00:00Z','2025-02-06T17:00:00Z','u-2'),
  makeOc('oc-f02','OC-2025-F02','Campinas',     'eq-2',eq2,'FINALIZADA','2025-02-04T09:00:00Z','2025-02-08T15:00:00Z','u-3','NetFibra SA'),
  makeOc('oc-f03','OC-2025-F03','Osasco',       'eq-3',eq3,'FINALIZADA','2025-02-06T10:00:00Z','2025-02-10T11:00:00Z','u-4'),
  makeOc('oc-f04','OC-2025-F04','Guarulhos',    'eq-1',eq1,'FINALIZADA','2025-02-07T08:00:00Z','2025-02-11T16:00:00Z','u-2','ConnectBR'),
  makeOc('oc-f05','OC-2025-F05','São Paulo',    'eq-2',eq2,'FINALIZADA','2025-02-10T11:00:00Z','2025-02-14T10:00:00Z','u-3'),
  makeOc('oc-f06','OC-2025-F06','Mauá',         'eq-3',eq3,'FINALIZADA','2025-02-12T09:00:00Z','2025-02-17T14:00:00Z','u-4','NetFibra SA'),
  makeOc('oc-f07','OC-2025-F07','Santo André',  'eq-1',eq1,'FINALIZADA','2025-02-14T10:00:00Z','2025-02-18T17:00:00Z','u-2'),
  makeOc('oc-f08','OC-2025-F08','Barueri',      'eq-2',eq2,'FINALIZADA','2025-02-17T08:00:00Z','2025-02-21T11:00:00Z','u-3'),
  makeOc('oc-f09','OC-2025-F09','Diadema',      'eq-3',eq3,'FINALIZADA','2025-02-19T09:00:00Z','2025-02-24T15:00:00Z','u-4','ConnectBR'),
  makeOc('oc-f10','OC-2025-F10','São Bernardo',  'eq-1',eq1,'FINALIZADA','2025-02-21T10:00:00Z','2025-02-25T10:00:00Z','u-2'),
  makeOc('oc-f11','OC-2025-F11','Carapicuíba',   'eq-2',eq2,'FINALIZADA','2025-02-24T08:00:00Z','2025-02-28T16:00:00Z','u-3','NetFibra SA'),

  // ── Março 2025 ───────────────────────────────────────────────────────────
  makeOc('oc-m01','OC-2025-M01','São Paulo',    'eq-1',eq1,'FINALIZADA','2025-03-03T08:00:00Z','2025-03-06T17:00:00Z','u-2'),
  makeOc('oc-m02','OC-2025-M02','Campinas',     'eq-2',eq2,'FINALIZADA','2025-03-04T09:00:00Z','2025-03-08T15:00:00Z','u-3','ConnectBR'),
  makeOc('oc-m03','OC-2025-M03','Guarulhos',    'eq-3',eq3,'FINALIZADA','2025-03-05T10:00:00Z','2025-03-09T11:00:00Z','u-4'),
  makeOc('oc-m04','OC-2025-M04','Osasco',       'eq-1',eq1,'FINALIZADA','2025-03-06T08:00:00Z','2025-03-11T16:00:00Z','u-2','NetFibra SA'),
  makeOc('oc-m05','OC-2025-M05','Mauá',         'eq-2',eq2,'FINALIZADA','2025-03-10T11:00:00Z','2025-03-14T10:00:00Z','u-3'),
  makeOc('oc-m06','OC-2025-M06','Barueri',      'eq-3',eq3,'FINALIZADA','2025-03-12T09:00:00Z','2025-03-18T14:00:00Z','u-4','ConnectBR'),
  makeOc('oc-m07','OC-2025-M07','Diadema',      'eq-1',eq1,'FINALIZADA','2025-03-14T10:00:00Z','2025-03-19T17:00:00Z','u-2'),
  makeOc('oc-m08','OC-2025-M08','São Bernardo', 'eq-2',eq2,'FINALIZADA','2025-03-17T08:00:00Z','2025-03-21T11:00:00Z','u-3'),
  makeOc('oc-m09','OC-2025-M09','Santo André',  'eq-3',eq3,'FINALIZADA','2025-03-19T09:00:00Z','2025-03-25T15:00:00Z','u-4','NetFibra SA'),
  makeOc('oc-m10','OC-2025-M10','Carapicuíba',  'eq-1',eq1,'FINALIZADA','2025-03-21T10:00:00Z','2025-03-25T10:00:00Z','u-2'),
  makeOc('oc-m11','OC-2025-M11','São Paulo',    'eq-2',eq2,'FINALIZADA','2025-03-24T08:00:00Z','2025-03-29T16:00:00Z','u-3','ConnectBR'),
  makeOc('oc-m12','OC-2025-M12','Guarulhos',    'eq-3',eq3,'FINALIZADA','2025-03-26T09:00:00Z','2025-03-31T14:00:00Z','u-4'),
  makeOc('oc-m13','OC-2025-M13','Campinas',     'eq-1',eq1,'FINALIZADA','2025-03-28T10:00:00Z','2025-04-02T11:00:00Z','u-2','NetFibra SA'),

  // ── Abril 2025 (mês atual, mistura de status) ─────────────────────────────
  makeOc('oc-a01','OC-2025-A01','São Paulo',    'eq-1',eq1,'FINALIZADA','2025-04-01T08:00:00Z','2025-04-04T17:00:00Z','u-2'),
  makeOc('oc-a02','OC-2025-A02','Guarulhos',    'eq-2',eq2,'FINALIZADA','2025-04-01T09:00:00Z','2025-04-05T15:00:00Z','u-3','ConnectBR'),
  makeOc('oc-a03','OC-2025-A03','Campinas',     'eq-3',eq3,'FINALIZADA','2025-04-02T10:00:00Z','2025-04-06T11:00:00Z','u-4'),
  makeOc('oc-a04','OC-2025-A04','Osasco',       'eq-1',eq1,'FINALIZADA','2025-04-03T08:00:00Z','2025-04-07T16:00:00Z','u-2','NetFibra SA'),
  makeOc('oc-a05','OC-2025-A05','Mauá',         'eq-2',eq2,'FINALIZADA','2025-04-04T11:00:00Z','2025-04-08T10:00:00Z','u-3'),
  makeOc('oc-a06','OC-2025-A06','Barueri',      'eq-3',eq3,'FINALIZADA','2025-04-05T09:00:00Z','2025-04-09T14:00:00Z','u-4','ConnectBR'),
  makeOc('oc-a07','OC-2025-A07','Santo André',  'eq-1',eq1,'EM_ANDAMENTO','2025-04-07T08:00:00Z'),
  makeOc('oc-a08','OC-2025-A08','São Bernardo', 'eq-2',eq2,'EM_ANDAMENTO','2025-04-08T09:00:00Z'),
  makeOc('oc-a09','OC-2025-A09','Diadema',      'eq-3',eq3,'EM_ANDAMENTO','2025-04-09T10:00:00Z'),
  makeOc('oc-a10','OC-2025-A10','São Paulo',    'eq-1',eq1,'EM_ANDAMENTO','2025-04-10T08:00:00Z'),
  makeOc('oc-a11','OC-2025-A11','Guarulhos',    'eq-2',eq2,'PENDENTE',   '2025-04-11T09:00:00Z'),
  makeOc('oc-a12','OC-2025-A12','Campinas',     'eq-3',eq3,'PENDENTE',   '2025-04-12T10:00:00Z'),
  makeOc('oc-a13','OC-2025-A13','Osasco',       null,  undefined,'PENDENTE','2025-04-13T08:00:00Z'),
  makeOc('oc-a14','OC-2025-A14','São Paulo',    'eq-1',eq1,'PENDENTE',   '2025-04-13T11:00:00Z'),
  makeOc('oc-a15','OC-2025-A15','Carapicuíba',  'eq-2',eq2,'PENDENTE',   '2025-04-14T08:00:00Z'),
];

export const mockServicos: ServicoOcorrencia[] = [
  {
    id: 'sv-1', ocorrencia_id: 'oc-a07', tipo_servico_id: 'ts-1',
    tipo_servico: mockTiposServico[0], observacao: 'Poste na esquina da Rua A com Av. B',
    status_item: 'Regularizado', ordem: 1, created_by: 'u-2',
    created_at: '2025-04-07T14:00:00Z', updated_at: '2025-04-07T14:00:00Z',
  },
  {
    id: 'sv-2', ocorrencia_id: 'oc-a07', tipo_servico_id: 'ts-2',
    tipo_servico: mockTiposServico[1], observacao: null,
    status_item: 'Regularizado', ordem: 2, created_by: 'u-2',
    created_at: '2025-04-07T15:00:00Z', updated_at: '2025-04-07T15:00:00Z',
  },
  {
    id: 'sv-3', ocorrencia_id: 'oc-a01', tipo_servico_id: 'ts-3',
    tipo_servico: mockTiposServico[2], observacao: 'Fios pendentes no poste 42',
    status_item: 'Regularizado', ordem: 1, created_by: 'u-2',
    created_at: '2025-04-01T10:00:00Z', updated_at: '2025-04-01T10:00:00Z',
  },
];

const placeholderImg = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE1MCIgZmlsbD0iI2UyZThmMCIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBkb21pbmFudC1iYXNlbGluZT0ibWlkZGxlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk0YTNiOCI+Rm90bzwvdGV4dD48L3N2Zz4=';

export const mockFotosServico: FotoServico[] = [
  { id: 'fs-1', servico_id: 'sv-1', tipo_foto: 'antes', storage_path: '/antes/1.jpg', file_name: 'antes_1.jpg', mime_type: 'image/jpeg', ordem: 1, created_at: '2025-04-07T14:00:00Z', url: placeholderImg },
  { id: 'fs-2', servico_id: 'sv-1', tipo_foto: 'depois', storage_path: '/depois/1.jpg', file_name: 'depois_1.jpg', mime_type: 'image/jpeg', ordem: 1, created_at: '2025-04-07T14:30:00Z', url: placeholderImg },
  { id: 'fs-3', servico_id: 'sv-3', tipo_foto: 'antes', storage_path: '/antes/2.jpg', file_name: 'antes_2.jpg', mime_type: 'image/jpeg', ordem: 1, created_at: '2025-04-01T10:00:00Z', url: placeholderImg },
  { id: 'fs-4', servico_id: 'sv-3', tipo_foto: 'depois', storage_path: '/depois/2.jpg', file_name: 'depois_2.jpg', mime_type: 'image/jpeg', ordem: 1, created_at: '2025-04-01T11:00:00Z', url: placeholderImg },
];

export const mockFotosFinais: FotoOcorrenciaFinal[] = [
  { id: 'ff-1', ocorrencia_id: 'oc-a01', categoria: 'retirada_fios', storage_path: '/ret/1.jpg', file_name: 'ret_1.jpg', mime_type: 'image/jpeg', ordem: 1, created_at: '2025-04-04T15:00:00Z', url: placeholderImg },
  { id: 'ff-2', ocorrencia_id: 'oc-a01', categoria: 'ctop', storage_path: '/ctop/1.jpg', file_name: 'ctop_1.jpg', mime_type: 'image/jpeg', ordem: 1, created_at: '2025-04-04T15:30:00Z', url: placeholderImg },
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
