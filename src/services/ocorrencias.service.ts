import { supabase } from '@/lib/supabase';
import type { Ocorrencia, OcorrenciaStatus } from '@/types';

type OcorrenciaRow = {
  id: string;
  id_ocorrencia: string;
  municipio: string;
  cabo_primaria: string | null;
  at: string | null;
  nome_at: string | null;
  contratada: string | null;
  gerente_icomon: string | null;
  operador_id: string | null;
  equipe_id: string | null;
  assigned_to: string | null;
  created_by: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  finalized_at: string | null;
  finalized_by: string | null;
  reopened_at: string | null;
  reopened_by: string | null;
  equipes: {
    id: string;
    nome: string;
    ativa: boolean;
    created_at: string;
    updated_at: string;
  } | null;
};

export type OcorrenciaInsert = {
  id: string;
  id_ocorrencia: string;
  municipio: string;
  cabo_primaria: string | null;
  at: string | null;
  contratada: string | null;
  nome_at: string | null;
  gerente_icomon: string | null;
  operador_id: string | null;
  created_by: string | null;
};

export type OcorrenciaUpdate = {
  updated_at: string;
  municipio?: string;
  cabo_primaria?: string | null;
  at?: string | null;
  nome_at?: string | null;
  contratada?: string | null;
  gerente_icomon?: string | null;
  operador_id?: string | null;
  status?: OcorrenciaStatus;
  equipe_id?: string | null;
  assigned_to?: string | null;
  finalized_at?: string | null;
  finalized_by?: string | null;
  reopened_at?: string | null;
  reopened_by?: string | null;
};

function mapRow(row: OcorrenciaRow): Ocorrencia {
  return {
    id: row.id,
    id_ocorrencia: row.id_ocorrencia,
    municipio: row.municipio,
    cabo_primaria: row.cabo_primaria,
    at: row.at,
    nome_at: row.nome_at,
    contratada: row.contratada,
    gerente_icomon: row.gerente_icomon,
    operador_id: row.operador_id,
    equipe_id: row.equipe_id,
    equipe: row.equipes ?? undefined,
    assigned_to: row.assigned_to,
    created_by: row.created_by,
    status: row.status as OcorrenciaStatus,
    created_at: row.created_at,
    updated_at: row.updated_at,
    finalized_at: row.finalized_at,
    finalized_by: row.finalized_by,
    reopened_at: row.reopened_at,
    reopened_by: row.reopened_by,
  };
}

const OCORRENCIA_SELECT = `
  id, id_ocorrencia, municipio, cabo_primaria, at, nome_at, contratada, gerente_icomon,
  operador_id, equipe_id, assigned_to, status, created_at, updated_at, created_by,
  finalized_at, finalized_by, reopened_at, reopened_by,
  equipes (id, nome, ativa, created_at, updated_at)
`;

export const OCORRENCIAS_PAGE_SIZE = 50;

export async function fetchOcorrencias(): Promise<Ocorrencia[]> {
  const { data, error } = await supabase
    .from('ocorrencias')
    .select(OCORRENCIA_SELECT)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[ocorrencias.service] fetch:', error);
    return [];
  }

  return (data ?? []).map(row => mapRow(row as unknown as OcorrenciaRow));
}

export async function fetchOcorrenciasPaged(
  offset: number,
  limit = OCORRENCIAS_PAGE_SIZE,
): Promise<{ data: Ocorrencia[]; hasMore: boolean }> {
  const { data, error } = await supabase
    .from('ocorrencias')
    .select(OCORRENCIA_SELECT)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('[ocorrencias.service] fetchPaged:', error);
    return { data: [], hasMore: false };
  }

  const rows = data ?? [];
  return {
    data: rows.map(row => mapRow(row as unknown as OcorrenciaRow)),
    hasMore: rows.length === limit,
  };
}

export async function fetchOcorrenciaById(id: string): Promise<Ocorrencia | null> {
  const { data, error } = await supabase
    .from('ocorrencias')
    .select(OCORRENCIA_SELECT)
    .eq('id', id)
    .single();

  if (error) {
    if (error.code !== 'PGRST116') console.error('[ocorrencias.service] fetchById:', error);
    return null;
  }

  return data ? mapRow(data as unknown as OcorrenciaRow) : null;
}

export async function insertOcorrencia(payload: OcorrenciaInsert): Promise<void> {
  const { error } = await supabase.from('ocorrencias').insert(payload);
  if (error) console.error('[ocorrencias.service] insert:', error);
}

export async function insertOcorrencias(payloads: OcorrenciaInsert[]): Promise<void> {
  if (payloads.length === 0) return;
  const { error } = await supabase.from('ocorrencias').insert(payloads);
  if (error) console.error('[ocorrencias.service] insertMany:', error);
}

export async function updateOcorrencia(id: string, data: OcorrenciaUpdate): Promise<void> {
  const { error } = await supabase.from('ocorrencias').update(data).eq('id', id);
  if (error) console.error('[ocorrencias.service] update:', error);
}

export async function deleteOcorrencia(id: string): Promise<void> {
  const { error } = await supabase.from('ocorrencias').delete().eq('id', id);
  if (error) console.error('[ocorrencias.service] delete:', error);
}
