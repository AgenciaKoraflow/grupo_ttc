import { supabase } from '@/lib/supabase';
import type { ServicoOcorrencia, TipoServico } from '@/types';

type ServicoRow = {
  id: string;
  ocorrencia_id: string;
  tipo_servico_id: string;
  observacao: string | null;
  status_item: string;
  ordem: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  tipos_servico: {
    id: string;
    nome: string;
    descricao: string | null;
    ativo: boolean;
    created_at: string;
    updated_at: string;
  } | null;
};

function mapRow(row: ServicoRow): ServicoOcorrencia {
  return {
    id: row.id,
    ocorrencia_id: row.ocorrencia_id,
    tipo_servico_id: row.tipo_servico_id,
    tipo_servico: (row.tipos_servico as TipoServico) ?? undefined,
    observacao: row.observacao,
    status_item: row.status_item,
    ordem: row.ordem,
    created_by: row.created_by,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function fetchServicos(): Promise<ServicoOcorrencia[]> {
  const { data, error } = await supabase
    .from('servicos')
    .select(`
      id, ocorrencia_id, tipo_servico_id, observacao, status_item, ordem,
      created_by, created_at, updated_at,
      tipos_servico (id, nome, descricao, ativo, created_at, updated_at)
    `);

  if (error) {
    console.error('[servicos.service] fetch:', error);
    return [];
  }

  return (data ?? []).map(row => mapRow(row as unknown as ServicoRow));
}

export async function fetchServicosByOcorrencia(ocorrenciaId: string): Promise<ServicoOcorrencia[]> {
  const { data, error } = await supabase
    .from('servicos')
    .select(`
      id, ocorrencia_id, tipo_servico_id, observacao, status_item, ordem,
      created_by, created_at, updated_at,
      tipos_servico (id, nome, descricao, ativo, created_at, updated_at)
    `)
    .eq('ocorrencia_id', ocorrenciaId)
    .order('ordem');

  if (error) {
    console.error('[servicos.service] fetchByOcorrencia:', error);
    return [];
  }

  return (data ?? []).map(row => mapRow(row as unknown as ServicoRow));
}

export type ServicoInsert = {
  id: string;
  ocorrencia_id: string;
  tipo_servico_id: string;
  observacao: string | null;
  status_item: string;
  ordem: number;
  created_by: string | null;
};

export async function insertServico(payload: ServicoInsert): Promise<void> {
  const { error } = await supabase.from('servicos').insert(payload);
  if (error) console.error('[servicos.service] insert:', error);
}

export type ServicoUpdate = {
  updated_at: string;
  tipo_servico_id?: string;
  observacao?: string | null;
  status_item?: string;
  ordem?: number;
};

export async function updateServico(id: string, data: ServicoUpdate): Promise<void> {
  const { error } = await supabase.from('servicos').update(data).eq('id', id);
  if (error) console.error('[servicos.service] update:', error);
}

export async function deleteServico(id: string): Promise<void> {
  const { error } = await supabase.from('servicos').delete().eq('id', id);
  if (error) console.error('[servicos.service] delete:', error);
}
