import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import type {
  Ocorrencia, Equipe, TipoServico, ServicoOcorrencia,
  FotoServico, FotoOcorrenciaFinal, Profile, OcorrenciaStatus,
} from '@/types';
import { supabase } from '@/lib/supabase';
import {
  mockOcorrencias, mockEquipes, mockTiposServico, mockServicos,
  mockFotosServico, mockFotosFinais, mockProfiles,
} from '@/mock/data';

export type ImportMode = 'skip' | 'replace';

export interface ImportResult {
  imported: number;
  replaced: number;
  skipped: number;
  errors: number;
}

interface DataStore {
  ocorrencias: Ocorrencia[];
  equipes: Equipe[];
  tiposServico: TipoServico[];
  servicos: ServicoOcorrencia[];
  fotosServico: FotoServico[];
  fotosFinais: FotoOcorrenciaFinal[];
  profiles: Profile[];
  addOcorrencias: (items: Partial<Ocorrencia>[]) => number;
  importOcorrencias: (items: Partial<Ocorrencia>[], mode: ImportMode) => ImportResult;
  updateOcorrencia: (id: string, data: Partial<Ocorrencia>) => void;
  addEquipe: (nome: string) => Equipe;
  updateEquipe: (id: string, data: Partial<Equipe>) => void;
  addTipoServico: (nome: string) => TipoServico;
  updateTipoServico: (id: string, data: Partial<TipoServico>) => void;
  addServico: (data: Partial<ServicoOcorrencia>) => ServicoOcorrencia;
  updateServico: (id: string, data: Partial<ServicoOcorrencia>) => void;
  deleteServico: (id: string) => void;
  addFotoServico: (data: Partial<FotoServico>) => FotoServico;
  deleteFotoServico: (id: string) => void;
  addFotoFinal: (data: Partial<FotoOcorrenciaFinal>) => FotoOcorrenciaFinal;
  deleteFotoFinal: (id: string) => void;
  finalizarOcorrencia: (id: string, userId: string) => void;
  reabrirOcorrencia: (id: string) => void;
  vincularEquipe: (ocorrenciaId: string, equipeId: string | null) => void;
  designarOperador: (ocorrenciaId: string, operadorId: string | null) => void;
  deleteOcorrencia: (id: string) => void;
}

const DataContext = createContext<DataStore | null>(null);

let counter = 100;
const uid = () => `gen-${++counter}`;

// Função para carregar dados do Supabase
async function loadDataFromSupabase() {
  try {
    // Carregar equipes
    const { data: equipeData, error: equipeError } = await supabase
      .from('equipes')
      .select('*');

    if (equipeError) throw equipeError;

    // Carregar tipos de serviço
    const { data: tiposData, error: tiposError } = await supabase
      .from('tipos_servico')
      .select('*');

    if (tiposError) throw tiposError;

    // Carregar ocorrências com join de equipes
    const { data: ocorrenciasData, error: ocorrenciasError } = await supabase
      .from('ocorrencias')
      .select(`
        id,
        id_ocorrencia,
        municipio,
        cabo_primaria,
        at,
        nome_at,
        contratada,
        gerente_icomon,
        equipe_id,
        status,
        created_at,
        updated_at,
        created_by,
        equipes (
          id,
          nome,
          ativa,
          created_at
        )
      `);

    if (ocorrenciasError) throw ocorrenciasError;

    // Carregar serviços com join de tipos_servico
    const { data: servicosData, error: servicosError } = await supabase
      .from('servicos')
      .select(`
        id,
        ocorrencia_id,
        tipo_servico_id,
        observacao,
        status_item,
        ordem,
        created_at,
        updated_at,
        created_by,
        tipos_servico (
          id,
          nome,
          ativo,
          created_at
        )
      `);

    if (servicosError) throw servicosError;

    // Carregar fotos de serviços
    const { data: fotosServData, error: fotosServError } = await supabase
      .from('fotos_servico')
      .select('*');

    if (fotosServError) throw fotosServError;

    // Carregar fotos finais
    const { data: fotosFinaisData, error: fotosFinaisError } = await supabase
      .from('fotos_finais')
      .select('*');

    if (fotosFinaisError) throw fotosFinaisError;

    // Transformar dados para o formato esperado
    const ocorrenciasFormatted: Ocorrencia[] = (ocorrenciasData || []).map((oc: any) => ({
      id: oc.id,
      id_ocorrencia: oc.id_ocorrencia,
      municipio: oc.municipio,
      cabo_primaria: oc.cabo_primaria,
      at: oc.at,
      nome_at: oc.nome_at,
      contratada: oc.contratada,
      gerente_icomon: oc.gerente_icomon,
      equipe_id: oc.equipe_id,
      equipe: oc.equipes as Equipe,
      assigned_to: null,
      status: oc.status as OcorrenciaStatus,
      created_at: oc.created_at,
      updated_at: oc.updated_at,
      finalized_at: null,
      finalized_by: null,
    }));

    const servicosFormatted: ServicoOcorrencia[] = (servicosData || []).map((sv: any) => ({
      id: sv.id,
      ocorrencia_id: sv.ocorrencia_id,
      tipo_servico_id: sv.tipo_servico_id,
      tipo_servico: sv.tipos_servico as TipoServico,
      observacao: sv.observacao,
      status_item: sv.status_item,
      ordem: sv.ordem,
      created_by: sv.created_by,
      created_at: sv.created_at,
      updated_at: sv.updated_at,
    }));

    return {
      equipes: (equipeData || []) as Equipe[],
      tiposServico: (tiposData || []) as TipoServico[],
      ocorrencias: ocorrenciasFormatted,
      servicos: servicosFormatted,
      fotosServico: (fotosServData || []) as FotoServico[],
      fotosFinais: (fotosFinaisData || []) as FotoOcorrenciaFinal[],
    };
  } catch (error) {
    console.error('Erro ao carregar dados do Supabase:', error);
    // Retornar dados mock em caso de erro
    return {
      equipes: mockEquipes,
      tiposServico: mockTiposServico,
      ocorrencias: mockOcorrencias,
      servicos: mockServicos,
      fotosServico: mockFotosServico,
      fotosFinais: mockFotosFinais,
    };
  }
}

export function DataProvider({ children }: { children: ReactNode }) {
  const [ocorrencias, setOcorrencias] = useState<Ocorrencia[]>([]);
  const [equipes, setEquipes] = useState<Equipe[]>([]);
  const [tiposServico, setTiposServico] = useState<TipoServico[]>([]);
  const [servicos, setServicos] = useState<ServicoOcorrencia[]>([]);
  const [fotosServico, setFotosServico] = useState<FotoServico[]>([]);
  const [fotosFinais, setFotosFinais] = useState<FotoOcorrenciaFinal[]>([]);
  const [profiles] = useState<Profile[]>(mockProfiles);
  const [isLoading, setIsLoading] = useState(true);

  // Carregar dados ao montar
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      const data = await loadDataFromSupabase();
      setEquipes(data.equipes);
      setTiposServico(data.tiposServico);
      setOcorrencias(data.ocorrencias);
      setServicos(data.servicos);
      setFotosServico(data.fotosServico);
      setFotosFinais(data.fotosFinais);
      setIsLoading(false);
    };
    loadData();
  }, []);

  const addOcorrencias = useCallback((items: Partial<Ocorrencia>[]): number => {
    let count = 0;
    const newOcs: Ocorrencia[] = [];
    for (const item of items) {
      if (!item.id_ocorrencia) continue;
      const exists = ocorrencias.some(o => o.id_ocorrencia === item.id_ocorrencia) ||
                     newOcs.some(o => o.id_ocorrencia === item.id_ocorrencia);
      if (exists) continue;
      newOcs.push({
        id: uid(),
        id_ocorrencia: item.id_ocorrencia,
        municipio: item.municipio || '',
        cabo_primaria: item.cabo_primaria || null,
        at: item.at || null,
        contratada: item.contratada || null,
        nome_at: item.nome_at || null,
        gerente_icomon: item.gerente_icomon || null,
        equipe_id: null,
        assigned_to: null,
        status: 'PENDENTE',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        finalized_at: null,
        finalized_by: null,
      });
      count++;
    }
    if (newOcs.length) setOcorrencias(prev => [...prev, ...newOcs]);
    return count;
  }, [ocorrencias]);

  const importOcorrencias = useCallback((items: Partial<Ocorrencia>[], mode: ImportMode): ImportResult => {
    const result: ImportResult = { imported: 0, replaced: 0, skipped: 0, errors: 0 };
    const newOcs: Ocorrencia[] = [];
    const replacements: { id: string; data: Partial<Ocorrencia> }[] = [];
    const insertPayloads: any[] = [];
    const updatePayloads: { id: string; data: any }[] = [];

    // snapshot de IDs atuais (inclui os que estamos adicionando no batch)
    const existingMap = new Map(
      [...ocorrencias].map(o => [o.id_ocorrencia, o])
    );
    const seenInBatch = new Set<string>();

    for (const item of items) {
      if (!item.id_ocorrencia) { result.errors++; continue; }

      const isDupInBatch = seenInBatch.has(item.id_ocorrencia);
      const existingOc = existingMap.get(item.id_ocorrencia);

      const newId = crypto.randomUUID();
      const payload: Ocorrencia = {
        id: newId,
        id_ocorrencia: item.id_ocorrencia,
        municipio: item.municipio || '',
        cabo_primaria: item.cabo_primaria || null,
        at: item.at || null,
        contratada: item.contratada || null,
        nome_at: item.nome_at || null,
        gerente_icomon: item.gerente_icomon || null,
        equipe_id: null,
        assigned_to: null,
        status: 'PENDENTE',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        finalized_at: null,
        finalized_by: null,
      };

      if (!existingOc && !isDupInBatch) {
        newOcs.push(payload);
        seenInBatch.add(item.id_ocorrencia);
        result.imported++;

        // Adicionar para INSERT no Supabase
        insertPayloads.push({
          id: newId,
          id_ocorrencia: item.id_ocorrencia,
          municipio: item.municipio || '',
          cabo_primaria: item.cabo_primaria || null,
          at: item.at || null,
          contratada: item.contratada || null,
          nome_at: item.nome_at || null,
          gerente_icomon: item.gerente_icomon || null,
        });
      } else if (mode === 'skip') {
        result.skipped++;
      } else if (mode === 'replace' && existingOc && !isDupInBatch) {
        replacements.push({
          id: existingOc.id,
          data: {
            municipio: payload.municipio,
            cabo_primaria: payload.cabo_primaria,
            at: payload.at,
            contratada: payload.contratada,
            nome_at: payload.nome_at,
            gerente_icomon: payload.gerente_icomon,
            updated_at: new Date().toISOString(),
          },
        });
        seenInBatch.add(item.id_ocorrencia);
        result.replaced++;

        // Adicionar para UPDATE no Supabase
        updatePayloads.push({
          id: existingOc.id,
          data: {
            municipio: payload.municipio,
            cabo_primaria: payload.cabo_primaria,
            at: payload.at,
            contratada: payload.contratada,
            nome_at: payload.nome_at,
            gerente_icomon: payload.gerente_icomon,
            updated_at: new Date().toISOString(),
          },
        });
      } else {
        result.skipped++;
      }
    }

    if (newOcs.length || replacements.length) {
      setOcorrencias(prev => {
        let next = [...prev];
        for (const rep of replacements) {
          next = next.map(o => o.id === rep.id ? { ...o, ...rep.data } : o);
        }
        return [...next, ...newOcs];
      });

      // Sincronizar com Supabase
      (async () => {
        // INSERT novos registros
        if (insertPayloads.length > 0) {
          const { error } = await supabase
            .from('ocorrencias')
            .insert(insertPayloads);
          if (error) console.error('Erro ao inserir ocorrências:', error);
        }

        // UPDATE registros existentes
        for (const up of updatePayloads) {
          const { error } = await supabase
            .from('ocorrencias')
            .update(up.data)
            .eq('id', up.id);
          if (error) console.error('Erro ao atualizar ocorrência:', error);
        }
      })();
    }

    return result;
  }, [ocorrencias]);

  const updateOcorrencia = useCallback((id: string, data: Partial<Ocorrencia>) => {
    // Atualizar localmente
    setOcorrencias(prev => prev.map(o => o.id === id ? { ...o, ...data, updated_at: new Date().toISOString() } : o));

    // Sincronizar com Supabase
    (async () => {
      const updatePayload: any = {
        updated_at: new Date().toISOString(),
      };
      if (data.municipio !== undefined) updatePayload.municipio = data.municipio;
      if (data.cabo_primaria !== undefined) updatePayload.cabo_primaria = data.cabo_primaria;
      if (data.at !== undefined) updatePayload.at = data.at;
      if (data.nome_at !== undefined) updatePayload.nome_at = data.nome_at;
      if (data.contratada !== undefined) updatePayload.contratada = data.contratada;
      if (data.gerente_icomon !== undefined) updatePayload.gerente_icomon = data.gerente_icomon;
      if (data.status !== undefined) updatePayload.status = data.status;

      const { error } = await supabase
        .from('ocorrencias')
        .update(updatePayload)
        .eq('id', id);

      if (error) console.error('Erro ao atualizar ocorrência:', error);
    })();
  }, []);

  const addEquipe = useCallback((nome: string): Equipe => {
    const eq: Equipe = { id: uid(), nome, ativa: true, created_at: new Date().toISOString() };
    setEquipes(prev => [...prev, eq]);
    return eq;
  }, []);

  const updateEquipe = useCallback((id: string, data: Partial<Equipe>) => {
    setEquipes(prev => prev.map(e => e.id === id ? { ...e, ...data } : e));
  }, []);

  const addTipoServico = useCallback((nome: string): TipoServico => {
    const ts: TipoServico = { id: uid(), nome, ativo: true, created_at: new Date().toISOString() };
    setTiposServico(prev => [...prev, ts]);
    return ts;
  }, []);

  const updateTipoServico = useCallback((id: string, data: Partial<TipoServico>) => {
    setTiposServico(prev => prev.map(t => t.id === id ? { ...t, ...data } : t));
  }, []);

  const addServico = useCallback((data: Partial<ServicoOcorrencia>): ServicoOcorrencia => {
    const ts = tiposServico.find(t => t.id === data.tipo_servico_id);
    const newId = crypto.randomUUID();
    const sv: ServicoOcorrencia = {
      id: newId,
      ocorrencia_id: data.ocorrencia_id || '',
      tipo_servico_id: data.tipo_servico_id || '',
      tipo_servico: ts,
      observacao: data.observacao || null,
      status_item: data.status_item || 'Regularizado',
      ordem: data.ordem || 1,
      created_by: data.created_by || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setServicos(prev => [...prev, sv]);
    // auto set status to EM_ANDAMENTO
    setOcorrencias(prev => prev.map(o =>
      o.id === data.ocorrencia_id && o.status === 'PENDENTE'
        ? { ...o, status: 'EM_ANDAMENTO' as OcorrenciaStatus, updated_at: new Date().toISOString() }
        : o
    ));

    // Salvar no Supabase
    (async () => {
      const { error } = await supabase
        .from('servicos')
        .insert({
          id: newId,
          ocorrencia_id: data.ocorrencia_id,
          tipo_servico_id: data.tipo_servico_id,
          observacao: data.observacao || null,
          status_item: data.status_item || 'Regularizado',
          ordem: data.ordem || 1,
          created_by: data.created_by || null,
        });

      if (error) console.error('Erro ao adicionar serviço:', error);

      // Atualizar status da ocorrência se necessário
      const oc = ocorrencias.find(o => o.id === data.ocorrencia_id);
      if (oc && oc.status === 'PENDENTE') {
        const { error: updateError } = await supabase
          .from('ocorrencias')
          .update({ status: 'EM_ANDAMENTO', updated_at: new Date().toISOString() })
          .eq('id', data.ocorrencia_id);

        if (updateError) console.error('Erro ao atualizar status:', updateError);
      }
    })();

    return sv;
  }, [tiposServico, ocorrencias]);

  const updateServico = useCallback((id: string, data: Partial<ServicoOcorrencia>) => {
    setServicos(prev => prev.map(s => {
      if (s.id !== id) return s;
      const ts = data.tipo_servico_id ? tiposServico.find(t => t.id === data.tipo_servico_id) : s.tipo_servico;
      return { ...s, ...data, tipo_servico: ts, updated_at: new Date().toISOString() };
    }));

    // Sincronizar com Supabase
    (async () => {
      const updatePayload: any = { updated_at: new Date().toISOString() };
      if (data.tipo_servico_id !== undefined) updatePayload.tipo_servico_id = data.tipo_servico_id;
      if (data.observacao !== undefined) updatePayload.observacao = data.observacao;
      if (data.status_item !== undefined) updatePayload.status_item = data.status_item;
      if (data.ordem !== undefined) updatePayload.ordem = data.ordem;

      const { error } = await supabase
        .from('servicos')
        .update(updatePayload)
        .eq('id', id);

      if (error) console.error('Erro ao atualizar serviço:', error);
    })();
  }, [tiposServico]);

  const deleteServico = useCallback((id: string) => {
    setFotosServico(prev => prev.filter(f => f.servico_id !== id));
    setServicos(prev => prev.filter(s => s.id !== id));

    // Sincronizar com Supabase
    (async () => {
      const { error } = await supabase
        .from('servicos')
        .delete()
        .eq('id', id);

      if (error) console.error('Erro ao deletar serviço:', error);
    })();
  }, []);

  const placeholderImg = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE1MCIgZmlsbD0iI2UyZThmMCIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBkb21pbmFudC1iYXNlbGluZT0ibWlkZGxlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk0YTNiOCI+Rm90bzwvdGV4dD48L3N2Zz4=';

  const addFotoServico = useCallback((data: Partial<FotoServico>): FotoServico => {
    const newId = crypto.randomUUID();
    const f: FotoServico = {
      id: newId,
      servico_id: data.servico_id || '',
      tipo_foto: data.tipo_foto || 'antes',
      storage_path: data.storage_path || '',
      file_name: data.file_name || null,
      mime_type: data.mime_type || null,
      ordem: data.ordem || 1,
      created_at: new Date().toISOString(),
      url: data.url || placeholderImg,
    };
    setFotosServico(prev => [...prev, f]);

    // Salvar no Supabase
    (async () => {
      const { error } = await supabase
        .from('fotos_servico')
        .insert({
          id: newId,
          servico_id: data.servico_id,
          tipo_foto: data.tipo_foto || 'antes',
          storage_path: data.storage_path || '',
          file_name: data.file_name || null,
          mime_type: data.mime_type || null,
          url: data.url || null,
          ordem: data.ordem || 1,
        });

      if (error) console.error('Erro ao adicionar foto de serviço:', error);
    })();

    return f;
  }, []);

  const deleteFotoServico = useCallback((id: string) => {
    setFotosServico(prev => prev.filter(f => f.id !== id));

    // Sincronizar com Supabase
    (async () => {
      const { error } = await supabase
        .from('fotos_servico')
        .delete()
        .eq('id', id);

      if (error) console.error('Erro ao deletar foto de serviço:', error);
    })();
  }, []);

  const addFotoFinal = useCallback((data: Partial<FotoOcorrenciaFinal>): FotoOcorrenciaFinal => {
    const newId = crypto.randomUUID();
    const f: FotoOcorrenciaFinal = {
      id: newId,
      ocorrencia_id: data.ocorrencia_id || '',
      categoria: data.categoria || 'retirada_fios',
      storage_path: data.storage_path || '',
      file_name: data.file_name || null,
      mime_type: data.mime_type || null,
      ordem: data.ordem || 1,
      created_at: new Date().toISOString(),
      url: data.url || placeholderImg,
    };
    setFotosFinais(prev => [...prev, f]);

    // Salvar no Supabase
    (async () => {
      const { error } = await supabase
        .from('fotos_finais')
        .insert({
          id: newId,
          ocorrencia_id: data.ocorrencia_id,
          categoria: data.categoria || 'retirada_fios',
          storage_path: data.storage_path || '',
          file_name: data.file_name || null,
          mime_type: data.mime_type || null,
          url: data.url || null,
          ordem: data.ordem || 1,
        });

      if (error) console.error('Erro ao adicionar foto final:', error);
    })();

    return f;
  }, []);

  const deleteFotoFinal = useCallback((id: string) => {
    setFotosFinais(prev => prev.filter(f => f.id !== id));

    // Sincronizar com Supabase
    (async () => {
      const { error } = await supabase
        .from('fotos_finais')
        .delete()
        .eq('id', id);

      if (error) console.error('Erro ao deletar foto final:', error);
    })();
  }, []);

  const finalizarOcorrencia = useCallback((id: string, userId: string) => {
    setOcorrencias(prev => prev.map(o =>
      o.id === id ? {
        ...o, status: 'FINALIZADA' as OcorrenciaStatus,
        finalized_at: new Date().toISOString(),
        finalized_by: userId,
        updated_at: new Date().toISOString(),
      } : o
    ));

    // Sincronizar com Supabase
    (async () => {
      const { error } = await supabase
        .from('ocorrencias')
        .update({
          status: 'FINALIZADA',
          created_by: userId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) console.error('Erro ao finalizar ocorrência:', error);
    })();
  }, []);

  const reabrirOcorrencia = useCallback((id: string) => {
    setOcorrencias(prev => prev.map(o =>
      o.id === id ? {
        ...o, status: 'EM_ANDAMENTO' as OcorrenciaStatus,
        finalized_at: null, finalized_by: null,
        updated_at: new Date().toISOString(),
      } : o
    ));

    // Sincronizar com Supabase
    (async () => {
      const { error } = await supabase
        .from('ocorrencias')
        .update({
          status: 'EM_ANDAMENTO',
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) console.error('Erro ao reabrir ocorrência:', error);
    })();
  }, []);

  const vincularEquipe = useCallback((ocorrenciaId: string, equipeId: string | null) => {
    const eq = equipeId ? equipes.find(e => e.id === equipeId) : null;

    // Atualizar localmente
    setOcorrencias(prev => prev.map(o =>
      o.id === ocorrenciaId ? { ...o, equipe_id: equipeId, equipe: eq || undefined, updated_at: new Date().toISOString() } : o
    ));

    // Sincronizar com Supabase
    (async () => {
      const { error } = await supabase
        .from('ocorrencias')
        .update({
          equipe_id: equipeId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', ocorrenciaId);

      if (error) console.error('Erro ao vincular equipe:', error);
    })();
  }, [equipes]);

  const designarOperador = useCallback((ocorrenciaId: string, operadorId: string | null) => {
    const user = operadorId ? profiles.find(p => p.id === operadorId) : null;
    setOcorrencias(prev => prev.map(o =>
      o.id === ocorrenciaId ? { ...o, assigned_to: operadorId, assignedUser: user || undefined, updated_at: new Date().toISOString() } : o
    ));
  }, [profiles]);

  const deleteOcorrencia = useCallback((id: string) => {
    setOcorrencias(prev => prev.filter(o => o.id !== id));

    // Sincronizar com Supabase
    (async () => {
      const { error } = await supabase
        .from('ocorrencias')
        .delete()
        .eq('id', id);

      if (error) console.error('Erro ao deletar ocorrência:', error);
    })();
  }, []);

  return (
    <DataContext.Provider value={{
      ocorrencias, equipes, tiposServico, servicos, fotosServico, fotosFinais, profiles,
      addOcorrencias, importOcorrencias, updateOcorrencia, addEquipe, updateEquipe,
      addTipoServico, updateTipoServico, addServico, updateServico, deleteServico,
      addFotoServico, deleteFotoServico, addFotoFinal, deleteFotoFinal,
      finalizarOcorrencia, reabrirOcorrencia, vincularEquipe, designarOperador,
      deleteOcorrencia,
    }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
}
