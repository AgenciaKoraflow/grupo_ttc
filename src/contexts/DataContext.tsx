import { createContext, useContext, useState, useCallback, useEffect, useMemo, type ReactNode } from 'react';
import type {
  Ocorrencia, Equipe, TipoServico, ServicoOcorrencia,
  FotoServico, FotoOcorrenciaFinal, Profile, OcorrenciaStatus, UserRole,
} from '@/types';
import { supabase } from '@/lib/supabase';
import { useAuth } from './AuthContext';
import { useLog } from './LogContext';

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
  deleteEquipe: (id: string) => void;
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
  reabrirOcorrencia: (id: string, userId: string) => void;
  addProfile: (data: { nome: string; email: string; role: UserRole; equipe_id: string | null }) => Profile;
  updateProfile: (id: string, data: Partial<Profile>) => void;
  deleteProfile: (id: string) => void;
  vincularEquipe: (ocorrenciaId: string, equipeId: string | null) => void;
  designarOperador: (ocorrenciaId: string, operadorId: string | null) => void;
  deleteOcorrencia: (id: string) => void;
}

const DataContext = createContext<DataStore | null>(null);

const PLACEHOLDER_IMG = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE1MCIgZmlsbD0iI2UyZThmMCIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBkb21pbmFudC1iYXNlbGluZT0ibWlkZGxlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk0YTNiOCI+Rm90bzwvdGV4dD48L3N2Zz4=';

interface LoadedData {
  equipes: Equipe[];
  tiposServico: TipoServico[];
  ocorrencias: Ocorrencia[];
  servicos: ServicoOcorrencia[];
  fotosServico: FotoServico[];
  fotosFinais: FotoOcorrenciaFinal[];
  profiles: Profile[];
}

async function loadDataFromSupabase(): Promise<LoadedData> {
  const empty: LoadedData = {
    equipes: [], tiposServico: [], ocorrencias: [],
    servicos: [], fotosServico: [], fotosFinais: [], profiles: [],
  };

  try {
    const [equipeRes, tiposRes, ocorrenciasRes, servicosRes, fotosServRes, fotosFinaisRes, profilesRes] = await Promise.all([
      supabase.from('equipes').select('*').order('nome'),
      supabase.from('tipos_servico').select('*').order('nome'),
      supabase.from('ocorrencias').select(`
        id, id_ocorrencia, municipio, cabo_primaria, at, nome_at, contratada, gerente_icomon,
        operador_id, equipe_id, assigned_to, status, created_at, updated_at, created_by,
        finalized_at, finalized_by, reopened_at, reopened_by,
        equipes (id, nome, ativa, created_at, updated_at)
      `).order('created_at', { ascending: false }),
      supabase.from('servicos').select(`
        id, ocorrencia_id, tipo_servico_id, observacao, status_item, ordem, created_by, created_at, updated_at,
        tipos_servico (id, nome, descricao, ativo, created_at, updated_at)
      `),
      supabase.from('fotos_servico').select('*'),
      supabase.from('fotos_finais').select('*'),
      supabase.from('profiles').select('*').order('nome'),
    ]);

    if (equipeRes.error) { console.error('[Data] equipes:', equipeRes.error); return empty; }
    if (tiposRes.error) { console.error('[Data] tipos_servico:', tiposRes.error); return empty; }
    if (ocorrenciasRes.error) { console.error('[Data] ocorrencias:', ocorrenciasRes.error); return empty; }
    if (servicosRes.error) { console.error('[Data] servicos:', servicosRes.error); return empty; }
    if (fotosServRes.error) { console.error('[Data] fotos_servico:', fotosServRes.error); return empty; }
    if (fotosFinaisRes.error) { console.error('[Data] fotos_finais:', fotosFinaisRes.error); return empty; }
    if (profilesRes.error) { console.error('[Data] profiles:', profilesRes.error); return empty; }

    const ocorrenciasFormatted: Ocorrencia[] = (ocorrenciasRes.data ?? []).map((oc: any) => ({
      id: oc.id,
      id_ocorrencia: oc.id_ocorrencia,
      municipio: oc.municipio,
      cabo_primaria: oc.cabo_primaria,
      at: oc.at,
      nome_at: oc.nome_at,
      contratada: oc.contratada,
      gerente_icomon: oc.gerente_icomon,
      operador_id: oc.operador_id,
      equipe_id: oc.equipe_id,
      equipe: oc.equipes as Equipe ?? undefined,
      assigned_to: oc.assigned_to,
      created_by: oc.created_by,
      status: oc.status as OcorrenciaStatus,
      created_at: oc.created_at,
      updated_at: oc.updated_at,
      finalized_at: oc.finalized_at,
      finalized_by: oc.finalized_by,
      reopened_at: oc.reopened_at,
      reopened_by: oc.reopened_by,
    }));

    const servicosFormatted: ServicoOcorrencia[] = (servicosRes.data ?? []).map((sv: any) => ({
      id: sv.id,
      ocorrencia_id: sv.ocorrencia_id,
      tipo_servico_id: sv.tipo_servico_id,
      tipo_servico: sv.tipos_servico as TipoServico ?? undefined,
      observacao: sv.observacao,
      status_item: sv.status_item,
      ordem: sv.ordem,
      created_by: sv.created_by,
      created_at: sv.created_at,
      updated_at: sv.updated_at,
    }));

    return {
      equipes: (equipeRes.data ?? []) as Equipe[],
      tiposServico: (tiposRes.data ?? []) as TipoServico[],
      ocorrencias: ocorrenciasFormatted,
      servicos: servicosFormatted,
      fotosServico: (fotosServRes.data ?? []) as FotoServico[],
      fotosFinais: (fotosFinaisRes.data ?? []) as FotoOcorrenciaFinal[],
      profiles: (profilesRes.data ?? []) as Profile[],
    };
  } catch (error) {
    console.error('[Data] loadDataFromSupabase:', error);
    return empty;
  }
}

export function DataProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { addLog } = useLog();
  const [ocorrencias, setOcorrencias] = useState<Ocorrencia[]>([]);
  const [equipes, setEquipes] = useState<Equipe[]>([]);
  const [tiposServico, setTiposServico] = useState<TipoServico[]>([]);
  const [servicos, setServicos] = useState<ServicoOcorrencia[]>([]);
  const [fotosServico, setFotosServico] = useState<FotoServico[]>([]);
  const [fotosFinais, setFotosFinais] = useState<FotoOcorrenciaFinal[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);

  const logAction = useCallback((tipo: string, categoria: string, entidadeId: string, entidadeNome: string, detalhes: string) => {
    addLog({
      userId: user?.id || null,
      userNome: user?.nome || 'Sistema',
      userRole: user?.role || 'sistema',
      tipo: tipo as any,
      categoria: categoria as any,
      entidadeId,
      entidadeNome,
      detalhes,
    });
  }, [user, addLog]);

  useEffect(() => {
    loadDataFromSupabase().then(data => {
      setEquipes(data.equipes);
      setTiposServico(data.tiposServico);
      setOcorrencias(data.ocorrencias);
      setServicos(data.servicos);
      setFotosServico(data.fotosServico);
      setFotosFinais(data.fotosFinais);
      setProfiles(data.profiles);
    });
  }, []);

  // ─── Ocorrências ───────────────────────────────────────────────────────────

  const addOcorrencias = useCallback((items: Partial<Ocorrencia>[]): number => {
    let count = 0;
    const newOcs: Ocorrencia[] = [];
    const insertPayloads: any[] = [];

    for (const item of items) {
      if (!item.id_ocorrencia) continue;
      const exists = ocorrencias.some(o => o.id_ocorrencia === item.id_ocorrencia) ||
                     newOcs.some(o => o.id_ocorrencia === item.id_ocorrencia);
      if (exists) continue;
      const newId = crypto.randomUUID();
      newOcs.push({
        id: newId,
        id_ocorrencia: item.id_ocorrencia,
        municipio: item.municipio || '',
        cabo_primaria: item.cabo_primaria || null,
        at: item.at || null,
        contratada: item.contratada || null,
        nome_at: item.nome_at || null,
        gerente_icomon: item.gerente_icomon || null,
        operador_id: item.operador_id || null,
        equipe_id: null,
        assigned_to: null,
        created_by: user?.id || null,
        status: 'PENDENTE',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        finalized_at: null,
        finalized_by: null,
        reopened_at: null,
        reopened_by: null,
      });
      insertPayloads.push({
        id: newId,
        id_ocorrencia: item.id_ocorrencia,
        municipio: item.municipio || '',
        cabo_primaria: item.cabo_primaria || null,
        at: item.at || null,
        contratada: item.contratada || null,
        nome_at: item.nome_at || null,
        gerente_icomon: item.gerente_icomon || null,
        operador_id: item.operador_id || null,
        created_by: user?.id || null,
      });
      count++;
    }

    if (newOcs.length) {
      setOcorrencias(prev => [...prev, ...newOcs]);
      (async () => {
        const { error } = await supabase.from('ocorrencias').insert(insertPayloads);
        if (error) console.error('[Data] addOcorrencias insert:', error);
      })();
    }
    return count;
  }, [ocorrencias, user]);

  const importOcorrencias = useCallback((items: Partial<Ocorrencia>[], mode: ImportMode): ImportResult => {
    const result: ImportResult = { imported: 0, replaced: 0, skipped: 0, errors: 0 };
    const newOcs: Ocorrencia[] = [];
    const replacements: { id: string; data: Partial<Ocorrencia> }[] = [];
    const insertPayloads: any[] = [];
    const updatePayloads: { id: string; data: any }[] = [];

    const existingMap = new Map(ocorrencias.map(o => [o.id_ocorrencia, o]));
    const seenInBatch = new Set<string>();

    for (const item of items) {
      if (!item.id_ocorrencia) { result.errors++; continue; }

      const isDupInBatch = seenInBatch.has(item.id_ocorrencia);
      const existingOc = existingMap.get(item.id_ocorrencia);

      const newId = crypto.randomUUID();
      const now = new Date().toISOString();
      const payload: Ocorrencia = {
        id: newId,
        id_ocorrencia: item.id_ocorrencia,
        municipio: item.municipio || '',
        cabo_primaria: item.cabo_primaria || null,
        at: item.at || null,
        contratada: item.contratada || null,
        nome_at: item.nome_at || null,
        gerente_icomon: item.gerente_icomon || null,
        operador_id: item.operador_id || null,
        equipe_id: null,
        assigned_to: null,
        created_by: user?.id || null,
        status: 'PENDENTE',
        created_at: now,
        updated_at: now,
        finalized_at: null,
        finalized_by: null,
        reopened_at: null,
        reopened_by: null,
      };

      if (!existingOc && !isDupInBatch) {
        newOcs.push(payload);
        seenInBatch.add(item.id_ocorrencia);
        result.imported++;
        insertPayloads.push({
          id: newId,
          id_ocorrencia: item.id_ocorrencia,
          municipio: item.municipio || '',
          cabo_primaria: item.cabo_primaria || null,
          at: item.at || null,
          contratada: item.contratada || null,
          nome_at: item.nome_at || null,
          gerente_icomon: item.gerente_icomon || null,
          operador_id: item.operador_id || null,
          created_by: user?.id || null,
        });
      } else if (mode === 'skip' || isDupInBatch) {
        result.skipped++;
      } else if (mode === 'replace' && existingOc) {
        const updateData = {
          municipio: payload.municipio,
          cabo_primaria: payload.cabo_primaria,
          at: payload.at,
          contratada: payload.contratada,
          nome_at: payload.nome_at,
          gerente_icomon: payload.gerente_icomon,
          operador_id: payload.operador_id,
          updated_at: new Date().toISOString(),
        };
        replacements.push({ id: existingOc.id, data: updateData });
        seenInBatch.add(item.id_ocorrencia);
        result.replaced++;
        updatePayloads.push({ id: existingOc.id, data: updateData });
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

      (async () => {
        if (insertPayloads.length > 0) {
          const { error } = await supabase.from('ocorrencias').insert(insertPayloads);
          if (error) console.error('[Data] importOcorrencias insert:', error);
        }
        for (const up of updatePayloads) {
          const { error } = await supabase.from('ocorrencias').update(up.data).eq('id', up.id);
          if (error) console.error('[Data] importOcorrencias update:', error);
        }
      })();
    }

    return result;
  }, [ocorrencias, user]);

  const updateOcorrencia = useCallback((id: string, data: Partial<Ocorrencia>) => {
    setOcorrencias(prev => prev.map(o => o.id === id ? { ...o, ...data, updated_at: new Date().toISOString() } : o));

    (async () => {
      const payload: any = { updated_at: new Date().toISOString() };
      if (data.municipio !== undefined) payload.municipio = data.municipio;
      if (data.cabo_primaria !== undefined) payload.cabo_primaria = data.cabo_primaria;
      if (data.at !== undefined) payload.at = data.at;
      if (data.nome_at !== undefined) payload.nome_at = data.nome_at;
      if (data.contratada !== undefined) payload.contratada = data.contratada;
      if (data.operador_id !== undefined) payload.operador_id = data.operador_id;
      if (data.status !== undefined) payload.status = data.status;

      const { error } = await supabase.from('ocorrencias').update(payload).eq('id', id);
      if (error) console.error('[Data] updateOcorrencia:', error);
    })();
  }, []);

  const vincularEquipe = useCallback((ocorrenciaId: string, equipeId: string | null) => {
    const eq = equipeId ? equipes.find(e => e.id === equipeId) : undefined;
    setOcorrencias(prev => prev.map(o =>
      o.id === ocorrenciaId ? { ...o, equipe_id: equipeId, equipe: eq, updated_at: new Date().toISOString() } : o
    ));

    (async () => {
      const { error } = await supabase.from('ocorrencias')
        .update({ equipe_id: equipeId, updated_at: new Date().toISOString() })
        .eq('id', ocorrenciaId);
      if (error) console.error('[Data] vincularEquipe:', error);
    })();
  }, [equipes]);

  const designarOperador = useCallback((ocorrenciaId: string, operadorId: string | null) => {
    setOcorrencias(prev => prev.map(o =>
      o.id === ocorrenciaId ? { ...o, assigned_to: operadorId, updated_at: new Date().toISOString() } : o
    ));

    (async () => {
      const { error } = await supabase.from('ocorrencias')
        .update({ assigned_to: operadorId, updated_at: new Date().toISOString() })
        .eq('id', ocorrenciaId);
      if (error) console.error('[Data] designarOperador:', error);
    })();
  }, []);

  const finalizarOcorrencia = useCallback((id: string, userId: string) => {
    const oc = ocorrencias.find(o => o.id === id);
    const now = new Date().toISOString();
    setOcorrencias(prev => prev.map(o =>
      o.id === id ? {
        ...o,
        status: 'FINALIZADA' as OcorrenciaStatus,
        finalized_at: now,
        finalized_by: userId,
        updated_at: now,
      } : o
    ));

    if (oc) logAction('FINALIZACAO', 'OCORRENCIA', id, oc.id_ocorrencia, 'Ocorrência finalizada');

    (async () => {
      const { error } = await supabase.from('ocorrencias')
        .update({ status: 'FINALIZADA', finalized_at: now, finalized_by: userId, updated_at: now })
        .eq('id', id);
      if (error) console.error('[Data] finalizarOcorrencia:', error);
    })();
  }, [ocorrencias, logAction]);

  const reabrirOcorrencia = useCallback((id: string, userId: string) => {
    const oc = ocorrencias.find(o => o.id === id);
    const now = new Date().toISOString();
    setOcorrencias(prev => prev.map(o =>
      o.id === id ? {
        ...o,
        status: 'EM_ANDAMENTO' as OcorrenciaStatus,
        finalized_at: null,
        finalized_by: null,
        reopened_at: now,
        reopened_by: userId,
        updated_at: now,
      } : o
    ));

    if (oc) logAction('REABERTURA', 'OCORRENCIA', id, oc.id_ocorrencia, 'Ocorrência reaberta');

    (async () => {
      const { error } = await supabase.from('ocorrencias')
        .update({
          status: 'EM_ANDAMENTO',
          finalized_at: null,
          finalized_by: null,
          reopened_at: now,
          reopened_by: userId,
          updated_at: now,
        })
        .eq('id', id);
      if (error) console.error('[Data] reabrirOcorrencia:', error);
    })();
  }, [ocorrencias, logAction]);

  const deleteOcorrencia = useCallback((id: string) => {
    setOcorrencias(prev => prev.filter(o => o.id !== id));

    (async () => {
      const { error } = await supabase.from('ocorrencias').delete().eq('id', id);
      if (error) console.error('[Data] deleteOcorrencia:', error);
    })();
  }, []);

  // ─── Equipes ───────────────────────────────────────────────────────────────

  const addEquipe = useCallback((nome: string): Equipe => {
    const now = new Date().toISOString();
    const eq: Equipe = { id: crypto.randomUUID(), nome, ativa: true, created_at: now, updated_at: now };
    setEquipes(prev => [...prev, eq]);
    logAction('CRIACAO', 'EQUIPE', eq.id, nome, 'Nova equipe criada');

    (async () => {
      const { error } = await supabase.from('equipes').insert({ id: eq.id, nome, ativa: true });
      if (error) console.error('[Data] addEquipe:', error);
    })();

    return eq;
  }, [logAction]);

  const updateEquipe = useCallback((id: string, data: Partial<Equipe>) => {
    const equipe = equipes.find(e => e.id === id);
    setEquipes(prev => prev.map(e => e.id === id ? { ...e, ...data, updated_at: new Date().toISOString() } : e));

    if (equipe) logAction('ATUALIZACAO', 'EQUIPE', id, data.nome ?? equipe.nome, 'Equipe atualizada');

    (async () => {
      const payload: any = { updated_at: new Date().toISOString() };
      if (data.nome !== undefined) payload.nome = data.nome;
      if (data.ativa !== undefined) payload.ativa = data.ativa;
      const { error } = await supabase.from('equipes').update(payload).eq('id', id);
      if (error) console.error('[Data] updateEquipe:', error);
    })();
  }, [equipes, logAction]);

  const deleteEquipe = useCallback((id: string) => {
    const equipe = equipes.find(e => e.id === id);
    setEquipes(prev => prev.filter(e => e.id !== id));
    setProfiles(prev => prev.map(p => p.equipe_id === id ? { ...p, equipe_id: null } : p));

    if (equipe) logAction('EXCLUSAO', 'EQUIPE', id, equipe.nome, 'Equipe deletada');

    (async () => {
      // Desassociar perfis antes de deletar (FK constraint)
      const { error: nullErr } = await supabase.from('profiles')
        .update({ equipe_id: null })
        .eq('equipe_id', id);
      if (nullErr) console.error('[Data] deleteEquipe nullify profiles:', nullErr);

      const { error } = await supabase.from('equipes').delete().eq('id', id);
      if (error) console.error('[Data] deleteEquipe:', error);
    })();
  }, [equipes, logAction]);

  // ─── Tipos de Serviço ──────────────────────────────────────────────────────

  const addTipoServico = useCallback((nome: string): TipoServico => {
    const now = new Date().toISOString();
    const ts: TipoServico = { id: crypto.randomUUID(), nome, descricao: null, ativo: true, created_at: now, updated_at: now };
    setTiposServico(prev => [...prev, ts]);

    (async () => {
      const { error } = await supabase.from('tipos_servico').insert({ id: ts.id, nome, descricao: null, ativo: true });
      if (error) console.error('[Data] addTipoServico:', error);
    })();

    return ts;
  }, []);

  const updateTipoServico = useCallback((id: string, data: Partial<TipoServico>) => {
    setTiposServico(prev => prev.map(t => t.id === id ? { ...t, ...data, updated_at: new Date().toISOString() } : t));

    (async () => {
      const payload: any = { updated_at: new Date().toISOString() };
      if (data.nome !== undefined) payload.nome = data.nome;
      if (data.descricao !== undefined) payload.descricao = data.descricao;
      if (data.ativo !== undefined) payload.ativo = data.ativo;
      const { error } = await supabase.from('tipos_servico').update(payload).eq('id', id);
      if (error) console.error('[Data] updateTipoServico:', error);
    })();
  }, []);

  // ─── Serviços ──────────────────────────────────────────────────────────────

  const addServico = useCallback((data: Partial<ServicoOcorrencia>): ServicoOcorrencia => {
    const ts = tiposServico.find(t => t.id === data.tipo_servico_id);
    const newId = crypto.randomUUID();
    const now = new Date().toISOString();
    const sv: ServicoOcorrencia = {
      id: newId,
      ocorrencia_id: data.ocorrencia_id || '',
      tipo_servico_id: data.tipo_servico_id || '',
      tipo_servico: ts,
      observacao: data.observacao || null,
      status_item: data.status_item || 'Regularizado',
      ordem: data.ordem || 1,
      created_by: data.created_by || null,
      created_at: now,
      updated_at: now,
    };
    setServicos(prev => [...prev, sv]);
    setOcorrencias(prev => prev.map(o =>
      o.id === data.ocorrencia_id && o.status === 'PENDENTE'
        ? { ...o, status: 'EM_ANDAMENTO' as OcorrenciaStatus, updated_at: now }
        : o
    ));

    (async () => {
      const { error } = await supabase.from('servicos').insert({
        id: newId,
        ocorrencia_id: data.ocorrencia_id,
        tipo_servico_id: data.tipo_servico_id,
        observacao: data.observacao || null,
        status_item: data.status_item || 'Regularizado',
        ordem: data.ordem || 1,
        created_by: data.created_by || null,
      });
      if (error) { console.error('[Data] addServico:', error); return; }

      const oc = ocorrencias.find(o => o.id === data.ocorrencia_id);
      if (oc && oc.status === 'PENDENTE') {
        const { error: updateError } = await supabase.from('ocorrencias')
          .update({ status: 'EM_ANDAMENTO', updated_at: now })
          .eq('id', data.ocorrencia_id);
        if (updateError) console.error('[Data] addServico status update:', updateError);
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

    (async () => {
      const payload: any = { updated_at: new Date().toISOString() };
      if (data.tipo_servico_id !== undefined) payload.tipo_servico_id = data.tipo_servico_id;
      if (data.observacao !== undefined) payload.observacao = data.observacao;
      if (data.status_item !== undefined) payload.status_item = data.status_item;
      if (data.ordem !== undefined) payload.ordem = data.ordem;

      const { error } = await supabase.from('servicos').update(payload).eq('id', id);
      if (error) console.error('[Data] updateServico:', error);
    })();
  }, [tiposServico]);

  const deleteServico = useCallback((id: string) => {
    setFotosServico(prev => prev.filter(f => f.servico_id !== id));
    setServicos(prev => prev.filter(s => s.id !== id));

    (async () => {
      const { error } = await supabase.from('servicos').delete().eq('id', id);
      if (error) console.error('[Data] deleteServico:', error);
    })();
  }, []);

  // ─── Fotos ─────────────────────────────────────────────────────────────────


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
      url: data.url || PLACEHOLDER_IMG,
    };
    setFotosServico(prev => [...prev, f]);

    (async () => {
      const { error } = await supabase.from('fotos_servico').insert({
        id: newId,
        servico_id: data.servico_id,
        tipo_foto: data.tipo_foto || 'antes',
        storage_path: data.storage_path || '',
        file_name: data.file_name || null,
        mime_type: data.mime_type || null,
        url: data.url || null,
        ordem: data.ordem || 1,
      });
      if (error) console.error('[Data] addFotoServico:', error);
    })();

    return f;
  }, []);

  const deleteFotoServico = useCallback((id: string) => {
    setFotosServico(prev => prev.filter(f => f.id !== id));

    (async () => {
      const { error } = await supabase.from('fotos_servico').delete().eq('id', id);
      if (error) console.error('[Data] deleteFotoServico:', error);
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
      url: data.url || PLACEHOLDER_IMG,
    };
    setFotosFinais(prev => [...prev, f]);

    (async () => {
      const { error } = await supabase.from('fotos_finais').insert({
        id: newId,
        ocorrencia_id: data.ocorrencia_id,
        categoria: data.categoria || 'retirada_fios',
        storage_path: data.storage_path || '',
        file_name: data.file_name || null,
        mime_type: data.mime_type || null,
        url: data.url || null,
        ordem: data.ordem || 1,
      });
      if (error) console.error('[Data] addFotoFinal:', error);
    })();

    return f;
  }, []);

  const deleteFotoFinal = useCallback((id: string) => {
    setFotosFinais(prev => prev.filter(f => f.id !== id));

    (async () => {
      const { error } = await supabase.from('fotos_finais').delete().eq('id', id);
      if (error) console.error('[Data] deleteFotoFinal:', error);
    })();
  }, []);

  // ─── Profiles ──────────────────────────────────────────────────────────────
  // RISCO: criação de usuário via frontend não é suportada sem service_role key.
  // addProfile apenas insere na tabela profiles; se o auth.users correspondente
  // não existir, o INSERT vai falhar por FK constraint. Implementar via Edge Function.
  const addProfile = useCallback((data: { nome: string; email: string; role: UserRole; equipe_id: string | null }): Profile => {
    const now = new Date().toISOString();
    const profile: Profile = {
      id: crypto.randomUUID(),
      nome: data.nome,
      email: data.email,
      role: data.role,
      equipe_id: data.equipe_id,
      must_change_password: true,
      created_at: now,
      updated_at: now,
    };
    setProfiles(prev => [...prev, profile]);
    logAction('CRIACAO', 'USUARIO', profile.id, data.nome, `Novo usuário criado com perfil ${data.role}`);

    (async () => {
      const { error } = await supabase.from('profiles').insert({
        id: profile.id,
        nome: data.nome,
        email: data.email,
        role: data.role,
        equipe_id: data.equipe_id,
        must_change_password: true,
      });
      if (error) console.error('[Data] addProfile (requer Edge Function para criar auth.user):', error);
    })();

    return profile;
  }, [logAction]);

  const updateProfile = useCallback((id: string, data: Partial<Profile>) => {
    const profile = profiles.find(p => p.id === id);
    setProfiles(prev => prev.map(p => p.id === id ? { ...p, ...data, updated_at: new Date().toISOString() } : p));

    if (profile) {
      const detalhes = data.must_change_password ? 'Senha resetada' : 'Perfil atualizado';
      logAction('ATUALIZACAO', 'USUARIO', id, profile.nome, detalhes);
    }

    (async () => {
      const payload: any = { updated_at: new Date().toISOString() };
      if (data.nome !== undefined) payload.nome = data.nome;
      if (data.role !== undefined) payload.role = data.role;
      if (data.equipe_id !== undefined) payload.equipe_id = data.equipe_id;
      if (data.must_change_password !== undefined) payload.must_change_password = data.must_change_password;

      const { error } = await supabase.from('profiles').update(payload).eq('id', id);
      if (error) console.error('[Data] updateProfile:', error);
    })();
  }, [profiles, logAction]);

  const deleteProfile = useCallback((id: string) => {
    const profile = profiles.find(p => p.id === id);
    setProfiles(prev => prev.filter(p => p.id !== id));

    if (profile) logAction('EXCLUSAO', 'USUARIO', id, profile.nome, 'Usuário deletado');

    (async () => {
      const { error } = await supabase.from('profiles').delete().eq('id', id);
      if (error) console.error('[Data] deleteProfile:', error);
    })();
  }, [profiles, logAction]);

  // ──────────────────────────────────────────────────────────────────────────

  const value = useMemo(() => ({
    ocorrencias, equipes, tiposServico, servicos, fotosServico, fotosFinais, profiles,
    addOcorrencias, importOcorrencias, updateOcorrencia, addEquipe, updateEquipe, deleteEquipe,
    addTipoServico, updateTipoServico, addServico, updateServico, deleteServico,
    addFotoServico, deleteFotoServico, addFotoFinal, deleteFotoFinal,
    finalizarOcorrencia, reabrirOcorrencia, addProfile, updateProfile, deleteProfile,
    vincularEquipe, designarOperador, deleteOcorrencia,
  }), [
    ocorrencias, equipes, tiposServico, servicos, fotosServico, fotosFinais, profiles,
    addOcorrencias, importOcorrencias, updateOcorrencia, addEquipe, updateEquipe, deleteEquipe,
    addTipoServico, updateTipoServico, addServico, updateServico, deleteServico,
    addFotoServico, deleteFotoServico, addFotoFinal, deleteFotoFinal,
    finalizarOcorrencia, reabrirOcorrencia, addProfile, updateProfile, deleteProfile,
    vincularEquipe, designarOperador, deleteOcorrencia,
  ]);

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
}
