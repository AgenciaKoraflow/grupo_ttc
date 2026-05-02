import { supabase } from '@/lib/supabase';
import type { Material, OcorrenciaMaterial } from '@/types';

export async function fetchMateriais(): Promise<Material[]> {
  const { data, error } = await supabase.from('materials').select('*').order('name');
  if (error) {
    console.error('[materiais.service] fetch:', error);
    return [];
  }
  return (data ?? []) as Material[];
}

export type MaterialInsert = Pick<Material, 'id' | 'name' | 'unit' | 'ativo'>;

export async function insertMaterial(payload: MaterialInsert): Promise<void> {
  const { error } = await supabase.from('materials').insert(payload);
  if (error) console.error('[materiais.service] insert:', error);
}

export type MaterialUpdate = {
  updated_at: string;
  name?: string;
  unit?: string;
  ativo?: boolean;
};

export async function updateMaterial(id: string, data: MaterialUpdate): Promise<void> {
  const { error } = await supabase.from('materials').update(data).eq('id', id);
  if (error) console.error('[materiais.service] update:', error);
}

export async function deleteMaterial(id: string): Promise<void> {
  const { error } = await supabase.from('materials').delete().eq('id', id);
  if (error) console.error('[materiais.service] delete:', error);
}

export async function fetchOcorrenciaMateriais(): Promise<OcorrenciaMaterial[]> {
  const { data, error } = await supabase
    .from('occurrence_materials')
    .select('*, material:materials(*)')
    .order('created_at');
  if (error) {
    console.error('[materiais.service] fetchOcorrenciaMateriais:', error);
    return [];
  }
  return (data ?? []) as OcorrenciaMaterial[];
}

export type OcorrenciaMaterialInsert = Pick<OcorrenciaMaterial, 'id' | 'ocorrencia_id' | 'material_id' | 'quantity'>;

export async function insertOcorrenciaMaterial(payload: OcorrenciaMaterialInsert): Promise<void> {
  const { error } = await supabase.from('occurrence_materials').insert(payload);
  if (error) console.error('[materiais.service] insertOcorrenciaMaterial:', error);
}

export async function deleteOcorrenciaMaterial(id: string): Promise<void> {
  const { error } = await supabase.from('occurrence_materials').delete().eq('id', id);
  if (error) console.error('[materiais.service] deleteOcorrenciaMaterial:', error);
}
