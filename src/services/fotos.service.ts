import { supabase } from '@/lib/supabase';
import { getSignedUrl, getSignedUrls } from '@/lib/storage';
import type { FotoServico, FotoOcorrenciaFinal } from '@/types';

export async function fetchFotosServico(): Promise<FotoServico[]> {
  const { data, error } = await supabase.from('fotos_servico').select('*');
  if (error) {
    console.error('[fotos.service] fetch fotos_servico:', error);
    return [];
  }

  const paths = (data ?? []).map(f => f.storage_path as string).filter(Boolean);
  const urlMap = await getSignedUrls('fotos-servico', paths);

  return (data ?? []).map(f => ({
    ...f,
    url: urlMap.get(f.storage_path) ?? undefined,
  })) as FotoServico[];
}

export async function fetchFotosFinais(): Promise<FotoOcorrenciaFinal[]> {
  const { data, error } = await supabase.from('fotos_finais').select('*');
  if (error) {
    console.error('[fotos.service] fetch fotos_finais:', error);
    return [];
  }

  const paths = (data ?? []).map(f => f.storage_path as string).filter(Boolean);
  const urlMap = await getSignedUrls('fotos-finais', paths);

  return (data ?? []).map(f => ({
    ...f,
    url: urlMap.get(f.storage_path) ?? undefined,
  })) as FotoOcorrenciaFinal[];
}

export type FotoServicoInsert = {
  id: string;
  servico_id: string;
  tipo_foto: 'antes' | 'depois';
  storage_path: string;
  file_name: string;
  mime_type: string;
  ordem: number;
};

export type FotoFinalInsert = {
  id: string;
  ocorrencia_id: string;
  categoria: 'retirada_fios' | 'ctop';
  storage_path: string;
  file_name: string;
  mime_type: string;
  ordem: number;
};

export async function createFotoServico(
  file: File,
  meta: { servico_id: string; tipo_foto: 'antes' | 'depois'; ordem: number },
): Promise<{ id: string; storagePath: string; fileName: string; mimeType: string }> {
  const newId = crypto.randomUUID();
  const ext = file.name.split('.').pop() ?? 'jpg';
  const storagePath = `${meta.servico_id}/${meta.tipo_foto}/${newId}.${ext}`;
  const mimeType = file.type || 'image/jpeg';

  const { error: uploadError } = await supabase.storage
    .from('fotos-servico')
    .upload(storagePath, file, { contentType: file.type });
  if (uploadError) throw uploadError;

  const { error } = await supabase.from('fotos_servico').insert({
    id: newId,
    servico_id: meta.servico_id,
    tipo_foto: meta.tipo_foto,
    storage_path: storagePath,
    file_name: file.name,
    mime_type: mimeType,
    ordem: meta.ordem,
  } satisfies FotoServicoInsert);
  if (error) console.error('[fotos.service] insertFotoServico:', error);

  return { id: newId, storagePath, fileName: file.name, mimeType };
}

export async function removeFotoServico(id: string, storagePath: string): Promise<void> {
  const { error: storageError } = await supabase.storage
    .from('fotos-servico')
    .remove([storagePath]);
  if (storageError) console.error('[fotos.service] removeFotoServico storage:', storageError);

  const { error } = await supabase.from('fotos_servico').delete().eq('id', id);
  if (error) console.error('[fotos.service] removeFotoServico db:', error);
}

export async function createFotoFinal(
  file: File,
  meta: { ocorrencia_id: string; categoria: 'retirada_fios' | 'ctop'; ordem: number },
): Promise<{ id: string; storagePath: string; fileName: string; mimeType: string }> {
  const newId = crypto.randomUUID();
  const ext = file.name.split('.').pop() ?? 'jpg';
  const storagePath = `${meta.ocorrencia_id}/${meta.categoria}/${newId}.${ext}`;
  const mimeType = file.type || 'image/jpeg';

  const { error: uploadError } = await supabase.storage
    .from('fotos-finais')
    .upload(storagePath, file, { contentType: file.type });
  if (uploadError) throw uploadError;

  const { error } = await supabase.from('fotos_finais').insert({
    id: newId,
    ocorrencia_id: meta.ocorrencia_id,
    categoria: meta.categoria,
    storage_path: storagePath,
    file_name: file.name,
    mime_type: mimeType,
    ordem: meta.ordem,
  } satisfies FotoFinalInsert);
  if (error) console.error('[fotos.service] insertFotoFinal:', error);

  return { id: newId, storagePath, fileName: file.name, mimeType };
}

export async function removeFotoFinal(id: string, storagePath: string): Promise<void> {
  const { error: storageError } = await supabase.storage
    .from('fotos-finais')
    .remove([storagePath]);
  if (storageError) console.error('[fotos.service] removeFotoFinal storage:', storageError);

  const { error } = await supabase.from('fotos_finais').delete().eq('id', id);
  if (error) console.error('[fotos.service] removeFotoFinal db:', error);
}

