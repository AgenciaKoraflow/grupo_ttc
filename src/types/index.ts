export type UserRole = 'admin' | 'operador';

export interface Profile {
  id: string;
  nome: string;
  email: string;
  role: UserRole;
  equipe_id: string | null;
  created_at: string;
}

export interface Equipe {
  id: string;
  nome: string;
  ativa: boolean;
  created_at: string;
}

export type OcorrenciaStatus = 'PENDENTE' | 'EM_ANDAMENTO' | 'FINALIZADA';

export interface Ocorrencia {
  id: string;
  id_ocorrencia: string;
  municipio: string;
  cabo_primaria: string | null;
  at: string | null;
  contratada: string | null;
  equipe_id: string | null;
  equipe?: Equipe;
  status: OcorrenciaStatus;
  created_at: string;
  updated_at: string;
  finalized_at: string | null;
  finalized_by: string | null;
}

export interface TipoServico {
  id: string;
  nome: string;
  ativo: boolean;
  created_at: string;
}

export interface ServicoOcorrencia {
  id: string;
  ocorrencia_id: string;
  tipo_servico_id: string;
  tipo_servico?: TipoServico;
  observacao: string | null;
  status_item: string;
  ordem: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface FotoServico {
  id: string;
  servico_id: string;
  tipo_foto: 'antes' | 'depois';
  storage_path: string;
  file_name: string | null;
  mime_type: string | null;
  ordem: number;
  created_at: string;
  url?: string;
}

export interface FotoOcorrenciaFinal {
  id: string;
  ocorrencia_id: string;
  categoria: 'retirada_fios' | 'ctop';
  storage_path: string;
  file_name: string | null;
  mime_type: string | null;
  ordem: number;
  created_at: string;
  url?: string;
}

export interface ImportacaoOcorrencia {
  id: string;
  arquivo_nome: string;
  total_linhas: number;
  total_importadas: number;
  total_ignoradas: number;
  total_erros: number;
  log_json: unknown;
  created_by: string | null;
  created_at: string;
}

export interface ImportacaoItem {
  id: string;
  importacao_id: string;
  linha_numero: number;
  id_ocorrencia: string | null;
  status: 'importado' | 'ignorado' | 'erro';
  mensagem: string | null;
  payload: unknown;
  created_at: string;
}

export interface CSVRow {
  MUNICIPIO: string;
  'CABO/PRIMÁRIA': string;
  AT: string;
  CONTRATADA: string;
  ID_OCORRENCIA: string;
}

export interface DashboardStats {
  total: number;
  pendentes: number;
  em_andamento: number;
  finalizadas: number;
}

export interface OcorrenciaFilters {
  status?: OcorrenciaStatus | '';
  equipe_id?: string;
  municipio?: string;
  contratada?: string;
  search?: string;
}
