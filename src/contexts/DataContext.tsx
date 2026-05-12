import { createContext, useContext, useState, useCallback, useEffect, useMemo, useRef, type ReactNode } from 'react';
import type {
  Ocorrencia, Equipe, TipoServico, ServicoOcorrencia,
  FotoServico, FotoOcorrenciaFinal, Profile, OcorrenciaStatus, UserRole,
  LogTipo, LogCategoria, Material, OcorrenciaMaterial,
} from '@/types';
import { getSignedUrl } from '@/lib/storage';
import { useAuth } from './AuthContext';
import { useLog } from './LogContext';
import { Sentry } from '@/lib/sentry';
import * as OcorrenciasService from '@/services/ocorrencias.service';
import * as EquipesService from '@/services/equipes.service';
import * as TiposServicoService from '@/services/tiposServico.service';
import * as ServicosService from '@/services/servicos.service';
import * as FotosService from '@/services/fotos.service';
import * as ProfilesService from '@/services/profiles.service';
import * as MateriaisService from '@/services/materiais.service';

export type ImportMode = 'skip' | 'replace';

export interface ImportResult {
  imported: number;
  replaced: number;
  skipped: number;
  errors: number;
}

interface DataStore {
  ocorrencias: Ocorrencia[];
  loadOcorrenciaDetail: (id: string) => Promise<void>;
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
  deleteTipoServico: (id: string) => void;
  addServico: (data: Partial<ServicoOcorrencia>) => ServicoOcorrencia;
  updateServico: (id: string, data: Partial<ServicoOcorrencia>) => void;
  deleteServico: (id: string) => void;
  addFotoServico: (file: File, meta: { servico_id: string; tipo_foto: 'antes' | 'depois'; ordem: number }) => Promise<FotoServico>;
  deleteFotoServico: (id: string) => void;
  addFotoFinal: (file: File, meta: { ocorrencia_id: string; categoria: 'retirada_fios' | 'ctop'; ordem: number }) => Promise<FotoOcorrenciaFinal>;
  deleteFotoFinal: (id: string) => void;
  finalizarOcorrencia: (id: string, userId: string) => Promise<void>;
  reabrirOcorrencia: (id: string, userId: string) => Promise<void>;
  addProfile: (data: { nome: string; email: string; role: UserRole; equipe_id: string | null }) => Promise<{ profile: Profile; tempPassword: string }>;
  updateProfile: (id: string, data: Partial<Profile>) => void;
  deleteProfile: (id: string) => void;
  vincularEquipe: (ocorrenciaId: string, equipeId: string | null) => void;
  designarOperador: (ocorrenciaId: string, operadorId: string | null) => void;
  deleteOcorrencia: (id: string) => Promise<void>;
  materials: Material[];
  ocorrenciaMateriais: OcorrenciaMaterial[];
  addMaterial: (data: { name: string; unit: string }) => Material;
  updateMaterial: (id: string, data: Partial<Material>) => void;
  deleteMaterial: (id: string) => void;
  addOcorrenciaMaterial: (data: { ocorrencia_id: string; material_id: string; quantity: number }) => OcorrenciaMaterial;
  removeOcorrenciaMaterial: (id: string) => void;
}

const DataContext = createContext<DataStore | null>(null);

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
  const [materials, setMaterials] = useState<Material[]>([]);
  const [ocorrenciaMateriais, setOcorrenciaMateriais] = useState<OcorrenciaMaterial[]>([]);

  // Refs to avoid stale closures without causing callback churn
  const loadedDetailIds = useRef(new Set<string>());
  const ocorrenciasRef = useRef<Ocorrencia[]>([]);
  useEffect(() => { ocorrenciasRef.current = ocorrencias; }, [ocorrencias]);

  const logAction = useCallback((
    tipo: LogTipo,
    categoria: LogCategoria,
    entidadeId: string,
    entidadeNome: string,
    detalhes: string,
  ) => {
    addLog({
      userId: user?.id ?? null,
      userNome: user?.nome ?? 'Sistema',
      userRole: user?.role ?? 'sistema',
      tipo,
      categoria,
      entidadeId,
      entidadeNome,
      detalhes,
    });
  }, [user, addLog]);

  // ─── Initial load (sem servicos/fotos — lazy) ──────────────────────────────

  useEffect(() => {
    if (!user) {
      setOcorrencias([]);
      setEquipes([]);
      setTiposServico([]);
      setProfiles([]);
      setMaterials([]);
      setOcorrenciaMateriais([]);
      loadedDetailIds.current.clear();
      return;
    }

    const init = async () => {
      const [equipes, tiposServico, profiles, materials, ocorrenciaMateriais, ocorrencias] =
        await Promise.all([
          EquipesService.fetchEquipes(),
          TiposServicoService.fetchTiposServico(),
          ProfilesService.fetchProfiles(),
          MateriaisService.fetchMateriais(),
          MateriaisService.fetchOcorrenciaMateriais(),
          OcorrenciasService.fetchOcorrencias(),
        ]);

      setEquipes(equipes);
      setTiposServico(tiposServico);
      setProfiles(profiles);
      setMaterials(materials);
      setOcorrenciaMateriais(ocorrenciaMateriais);
      setOcorrencias(ocorrencias);
    };

    void init();
  }, [user?.id]);

  // ─── Lazy loading de servicos + fotos por ocorrência ───────────────────────

  const loadOcorrenciaDetail = useCallback(async (ocorrenciaId: string) => {
    if (loadedDetailIds.current.has(ocorrenciaId)) return;
    loadedDetailIds.current.add(ocorrenciaId);

    try {
      const ocExists = ocorrenciasRef.current.some(o => o.id === ocorrenciaId);

      const [servicosData, fotosFinaisData, fetchedOc] = await Promise.all([
        ServicosService.fetchServicosByOcorrencia(ocorrenciaId),
        FotosService.fetchFotosFinaisByOcorrencia(ocorrenciaId),
        ocExists ? Promise.resolve(null) : OcorrenciasService.fetchOcorrenciaById(ocorrenciaId),
      ]);

      if (fetchedOc) {
        setOcorrencias(prev => {
          if (prev.some(o => o.id === ocorrenciaId)) return prev;
          return [fetchedOc, ...prev];
        });
      }

      const servicoIds = servicosData.map(s => s.id);
      const fotosServicoData = await FotosService.fetchFotosServicoByServicos(servicoIds);

      setServicos(prev => {
        const existingIds = new Set(prev.map(s => s.id));
        const newItems = servicosData.filter(s => !existingIds.has(s.id));
        return newItems.length > 0 ? [...prev, ...newItems] : prev;
      });

      setFotosServico(prev => {
        const existingIds = new Set(prev.map(f => f.id));
        const newItems = fotosServicoData.filter(f => !existingIds.has(f.id));
        return newItems.length > 0 ? [...prev, ...newItems] : prev;
      });

      setFotosFinais(prev => {
        const existingIds = new Set(prev.map(f => f.id));
        const newItems = fotosFinaisData.filter(f => !existingIds.has(f.id));
        return newItems.length > 0 ? [...prev, ...newItems] : prev;
      });
    } catch (error) {
      console.error('[DataContext] loadOcorrenciaDetail:', error);
      loadedDetailIds.current.delete(ocorrenciaId);
    }
  }, []);

  // ─── Ocorrências ───────────────────────────────────────────────────────────

  const addOcorrencias = useCallback((items: Partial<Ocorrencia>[]): number => {
    let count = 0;
    const newOcs: Ocorrencia[] = [];
    const insertPayloads: OcorrenciasService.OcorrenciaInsert[] = [];

    for (const item of items) {
      if (!item.id_ocorrencia) continue;
      const alreadyExists =
        ocorrencias.some(o => o.id_ocorrencia === item.id_ocorrencia) ||
        newOcs.some(o => o.id_ocorrencia === item.id_ocorrencia);
      if (alreadyExists) continue;

      const newId = crypto.randomUUID();
      const now = new Date().toISOString();
      const payload: OcorrenciasService.OcorrenciaInsert = {
        id: newId,
        id_ocorrencia: item.id_ocorrencia,
        municipio: item.municipio ?? '',
        cabo_primaria: item.cabo_primaria ?? null,
        at: item.at ?? null,
        contratada: item.contratada ?? null,
        nome_at: item.nome_at ?? null,
        gerente_icomon: item.gerente_icomon ?? null,
        operador_id: item.operador_id ?? null,
        created_by: user?.id ?? null,
      };
      newOcs.push({
        ...payload,
        equipe_id: null,
        assigned_to: null,
        status: 'PENDENTE',
        created_at: now,
        updated_at: now,
        finalized_at: null,
        finalized_by: null,
        reopened_at: null,
        reopened_by: null,
      });
      insertPayloads.push(payload);
      count++;
    }

    if (newOcs.length) {
      setOcorrencias(prev => [...newOcs, ...prev]);
      void OcorrenciasService.insertOcorrencias(insertPayloads);
    }
    return count;
  }, [ocorrencias, user]);

  const importOcorrencias = useCallback((items: Partial<Ocorrencia>[], mode: ImportMode): ImportResult => {
    const result: ImportResult = { imported: 0, replaced: 0, skipped: 0, errors: 0 };
    const newOcs: Ocorrencia[] = [];
    const replacements: { id: string; data: Partial<Ocorrencia> }[] = [];
    const insertPayloads: OcorrenciasService.OcorrenciaInsert[] = [];
    const updatePayloads: { id: string; data: OcorrenciasService.OcorrenciaUpdate }[] = [];

    const existingMap = new Map(ocorrencias.map(o => [o.id_ocorrencia, o]));
    const seenInBatch = new Set<string>();

    for (const item of items) {
      if (!item.id_ocorrencia) { result.errors++; continue; }

      const isDupInBatch = seenInBatch.has(item.id_ocorrencia);
      const existingOc = existingMap.get(item.id_ocorrencia);
      const newId = crypto.randomUUID();
      const now = new Date().toISOString();

      if (!existingOc && !isDupInBatch) {
        const insertPayload: OcorrenciasService.OcorrenciaInsert = {
          id: newId,
          id_ocorrencia: item.id_ocorrencia,
          municipio: item.municipio ?? '',
          cabo_primaria: item.cabo_primaria ?? null,
          at: item.at ?? null,
          contratada: item.contratada ?? null,
          nome_at: item.nome_at ?? null,
          gerente_icomon: item.gerente_icomon ?? null,
          operador_id: item.operador_id ?? null,
          created_by: user?.id ?? null,
        };
        newOcs.push({
          ...insertPayload,
          equipe_id: null,
          assigned_to: null,
          status: 'PENDENTE',
          created_at: now,
          updated_at: now,
          finalized_at: null,
          finalized_by: null,
          reopened_at: null,
          reopened_by: null,
        });
        insertPayloads.push(insertPayload);
        seenInBatch.add(item.id_ocorrencia);
        result.imported++;
      } else if (mode === 'replace' && existingOc && !isDupInBatch) {
        const updateData: OcorrenciasService.OcorrenciaUpdate = {
          updated_at: now,
          municipio: item.municipio ?? '',
          cabo_primaria: item.cabo_primaria ?? null,
          at: item.at ?? null,
          contratada: item.contratada ?? null,
          nome_at: item.nome_at ?? null,
          gerente_icomon: item.gerente_icomon ?? null,
          operador_id: item.operador_id ?? null,
        };
        replacements.push({ id: existingOc.id, data: updateData });
        updatePayloads.push({ id: existingOc.id, data: updateData });
        seenInBatch.add(item.id_ocorrencia);
        result.replaced++;
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
        return [...newOcs, ...next];
      });

      const run = async () => {
        if (insertPayloads.length > 0) await OcorrenciasService.insertOcorrencias(insertPayloads);
        for (const up of updatePayloads) await OcorrenciasService.updateOcorrencia(up.id, up.data);
      };
      void run();
    }

    return result;
  }, [ocorrencias, user]);

  const updateOcorrencia = useCallback((id: string, data: Partial<Ocorrencia>) => {
    const now = new Date().toISOString();
    setOcorrencias(prev => prev.map(o => o.id === id ? { ...o, ...data, updated_at: now } : o));

    const update: OcorrenciasService.OcorrenciaUpdate = { updated_at: now };
    if (data.municipio !== undefined) update.municipio = data.municipio;
    if (data.cabo_primaria !== undefined) update.cabo_primaria = data.cabo_primaria;
    if (data.at !== undefined) update.at = data.at;
    if (data.nome_at !== undefined) update.nome_at = data.nome_at;
    if (data.contratada !== undefined) update.contratada = data.contratada;
    if (data.operador_id !== undefined) update.operador_id = data.operador_id;
    if (data.status !== undefined) update.status = data.status;

    void OcorrenciasService.updateOcorrencia(id, update);
  }, []);

  const vincularEquipe = useCallback((ocorrenciaId: string, equipeId: string | null) => {
    const eq = equipeId ? equipes.find(e => e.id === equipeId) : undefined;
    const now = new Date().toISOString();
    setOcorrencias(prev => prev.map(o =>
      o.id === ocorrenciaId ? { ...o, equipe_id: equipeId, equipe: eq, updated_at: now } : o
    ));
    void OcorrenciasService.updateOcorrencia(ocorrenciaId, { equipe_id: equipeId, updated_at: now });
  }, [equipes]);

  const designarOperador = useCallback((ocorrenciaId: string, operadorId: string | null) => {
    const now = new Date().toISOString();
    setOcorrencias(prev => prev.map(o =>
      o.id === ocorrenciaId ? { ...o, assigned_to: operadorId, updated_at: now } : o
    ));
    void OcorrenciasService.updateOcorrencia(ocorrenciaId, { assigned_to: operadorId, updated_at: now });
  }, []);

  const finalizarOcorrencia = useCallback(async (id: string, userId: string): Promise<void> => {
    const oc = ocorrencias.find(o => o.id === id);
    const now = new Date().toISOString();
    // Capture previous state for rollback
    const prev = oc ? { status: oc.status, finalized_at: oc.finalized_at, finalized_by: oc.finalized_by, updated_at: oc.updated_at } : null;

    setOcorrencias(current => current.map(o =>
      o.id === id
        ? { ...o, status: 'FINALIZADA' as OcorrenciaStatus, finalized_at: now, finalized_by: userId, updated_at: now }
        : o
    ));

    try {
      await OcorrenciasService.updateOcorrencia(id, {
        status: 'FINALIZADA', finalized_at: now, finalized_by: userId, updated_at: now,
      });
      if (oc) logAction('FINALIZACAO', 'OCORRENCIA', id, oc.id_ocorrencia, 'Ocorrência finalizada');
    } catch (error) {
      Sentry.captureException(error);
      if (prev) {
        setOcorrencias(current => current.map(o =>
          o.id === id ? { ...o, ...prev } : o
        ));
      }
      throw error;
    }
  }, [ocorrencias, logAction]);

  const reabrirOcorrencia = useCallback(async (id: string, userId: string): Promise<void> => {
    const oc = ocorrencias.find(o => o.id === id);
    const now = new Date().toISOString();
    const prev = oc ? { status: oc.status, finalized_at: oc.finalized_at, finalized_by: oc.finalized_by, reopened_at: oc.reopened_at, reopened_by: oc.reopened_by, updated_at: oc.updated_at } : null;

    setOcorrencias(current => current.map(o =>
      o.id === id
        ? { ...o, status: 'EM_ANDAMENTO' as OcorrenciaStatus, finalized_at: null, finalized_by: null, reopened_at: now, reopened_by: userId, updated_at: now }
        : o
    ));

    try {
      await OcorrenciasService.updateOcorrencia(id, {
        status: 'EM_ANDAMENTO', finalized_at: null, finalized_by: null,
        reopened_at: now, reopened_by: userId, updated_at: now,
      });
      if (oc) logAction('REABERTURA', 'OCORRENCIA', id, oc.id_ocorrencia, 'Ocorrência reaberta');
    } catch (error) {
      Sentry.captureException(error);
      if (prev) {
        setOcorrencias(current => current.map(o =>
          o.id === id ? { ...o, ...prev } : o
        ));
      }
      throw error;
    }
  }, [ocorrencias, logAction]);

  const deleteOcorrencia = useCallback(async (id: string): Promise<void> => {
    const oc = ocorrencias.find(o => o.id === id);
    setOcorrencias(prev => prev.filter(o => o.id !== id));

    try {
      await OcorrenciasService.deleteOcorrencia(id);
    } catch (error) {
      Sentry.captureException(error);
      if (oc) setOcorrencias(prev => [oc, ...prev]);
      throw error;
    }
  }, [ocorrencias]);

  // ─── Equipes ───────────────────────────────────────────────────────────────

  const addEquipe = useCallback((nome: string): Equipe => {
    const now = new Date().toISOString();
    const eq: Equipe = { id: crypto.randomUUID(), nome, ativa: true, created_at: now, updated_at: now };
    setEquipes(prev => [...prev, eq]);
    logAction('CRIACAO', 'EQUIPE', eq.id, nome, 'Nova equipe criada');
    void EquipesService.insertEquipe({ id: eq.id, nome, ativa: true });
    return eq;
  }, [logAction]);

  const updateEquipe = useCallback((id: string, data: Partial<Equipe>) => {
    const equipe = equipes.find(e => e.id === id);
    const now = new Date().toISOString();
    setEquipes(prev => prev.map(e => e.id === id ? { ...e, ...data, updated_at: now } : e));
    if (equipe) logAction('ATUALIZACAO', 'EQUIPE', id, data.nome ?? equipe.nome, 'Equipe atualizada');

    const update: EquipesService.EquipeUpdate = { updated_at: now };
    if (data.nome !== undefined) update.nome = data.nome;
    if (data.ativa !== undefined) update.ativa = data.ativa;
    void EquipesService.updateEquipe(id, update);
  }, [equipes, logAction]);

  const deleteEquipe = useCallback((id: string) => {
    const equipe = equipes.find(e => e.id === id);
    setEquipes(prev => prev.filter(e => e.id !== id));
    setProfiles(prev => prev.map(p => p.equipe_id === id ? { ...p, equipe_id: null } : p));
    if (equipe) logAction('EXCLUSAO', 'EQUIPE', id, equipe.nome, 'Equipe deletada');

    const run = async () => {
      await EquipesService.nullifyEquipeInProfiles(id);
      await EquipesService.deleteEquipe(id);
    };
    void run();
  }, [equipes, logAction]);

  // ─── Tipos de Serviço ──────────────────────────────────────────────────────

  const addTipoServico = useCallback((nome: string): TipoServico => {
    const now = new Date().toISOString();
    const ts: TipoServico = { id: crypto.randomUUID(), nome, descricao: null, ativo: true, created_at: now, updated_at: now };
    setTiposServico(prev => [...prev, ts]);
    void TiposServicoService.insertTipoServico({ id: ts.id, nome, descricao: null, ativo: true });
    return ts;
  }, []);

  const updateTipoServico = useCallback((id: string, data: Partial<TipoServico>) => {
    const now = new Date().toISOString();
    setTiposServico(prev => prev.map(t => t.id === id ? { ...t, ...data, updated_at: now } : t));

    const update: TiposServicoService.TipoServicoUpdate = { updated_at: now };
    if (data.nome !== undefined) update.nome = data.nome;
    if (data.descricao !== undefined) update.descricao = data.descricao;
    if (data.ativo !== undefined) update.ativo = data.ativo;
    void TiposServicoService.updateTipoServico(id, update);
  }, []);

  const deleteTipoServico = useCallback((id: string) => {
    const ts = tiposServico.find(t => t.id === id);
    setTiposServico(prev => prev.filter(t => t.id !== id));
    if (ts) logAction('EXCLUSAO', 'TIPO_SERVICO', id, ts.nome, 'Tipo de serviço excluído');
    void TiposServicoService.deleteTipoServico(id);
  }, [tiposServico, logAction]);

  // ─── Serviços ──────────────────────────────────────────────────────────────

  const addServico = useCallback((data: Partial<ServicoOcorrencia>): ServicoOcorrencia => {
    const ts = tiposServico.find(t => t.id === data.tipo_servico_id);
    const newId = crypto.randomUUID();
    const now = new Date().toISOString();
    const sv: ServicoOcorrencia = {
      id: newId,
      ocorrencia_id: data.ocorrencia_id ?? '',
      tipo_servico_id: data.tipo_servico_id ?? '',
      tipo_servico: ts,
      observacao: data.observacao ?? null,
      status_item: data.status_item ?? 'PENDENTE',
      ordem: data.ordem ?? 1,
      created_by: data.created_by ?? null,
      created_at: now,
      updated_at: now,
    };
    setServicos(prev => [...prev, sv]);

    const ocorrencia = ocorrencias.find(o => o.id === data.ocorrencia_id);
    const needsStatusUpdate = ocorrencia?.status === 'PENDENTE';
    if (needsStatusUpdate) {
      setOcorrencias(prev => prev.map(o =>
        o.id === data.ocorrencia_id
          ? { ...o, status: 'EM_ANDAMENTO' as OcorrenciaStatus, updated_at: now }
          : o
      ));
    }

    const run = async () => {
      await ServicosService.insertServico({
        id: newId,
        ocorrencia_id: sv.ocorrencia_id,
        tipo_servico_id: sv.tipo_servico_id,
        observacao: sv.observacao,
        status_item: sv.status_item,
        ordem: sv.ordem,
        created_by: sv.created_by,
      });
      if (needsStatusUpdate) {
        await OcorrenciasService.updateOcorrencia(sv.ocorrencia_id, { status: 'EM_ANDAMENTO', updated_at: now });
      }
    };
    void run();

    return sv;
  }, [tiposServico, ocorrencias]);

  const updateServico = useCallback((id: string, data: Partial<ServicoOcorrencia>) => {
    const now = new Date().toISOString();
    setServicos(prev => prev.map(s => {
      if (s.id !== id) return s;
      const ts = data.tipo_servico_id ? tiposServico.find(t => t.id === data.tipo_servico_id) : s.tipo_servico;
      return { ...s, ...data, tipo_servico: ts, updated_at: now };
    }));

    const update: ServicosService.ServicoUpdate = { updated_at: now };
    if (data.tipo_servico_id !== undefined) update.tipo_servico_id = data.tipo_servico_id;
    if (data.observacao !== undefined) update.observacao = data.observacao;
    if (data.status_item !== undefined) update.status_item = data.status_item;
    if (data.ordem !== undefined) update.ordem = data.ordem;
    void ServicosService.updateServico(id, update);
  }, [tiposServico]);

  const deleteServico = useCallback((id: string) => {
    setFotosServico(prev => prev.filter(f => f.servico_id !== id));
    setServicos(prev => prev.filter(s => s.id !== id));
    void ServicosService.deleteServico(id);
  }, []);

  // ─── Fotos ─────────────────────────────────────────────────────────────────

  const addFotoServico = useCallback(async (
    file: File,
    meta: { servico_id: string; tipo_foto: 'antes' | 'depois'; ordem: number },
  ): Promise<FotoServico> => {
    const { id, storagePath, fileName, mimeType } = await FotosService.createFotoServico(file, meta);
    const url = (await getSignedUrl('fotos-servico', storagePath)) ?? undefined;

    const foto: FotoServico = {
      id,
      servico_id: meta.servico_id,
      tipo_foto: meta.tipo_foto,
      storage_path: storagePath,
      file_name: fileName,
      mime_type: mimeType,
      ordem: meta.ordem,
      created_at: new Date().toISOString(),
      url,
    };
    setFotosServico(prev => [...prev, foto]);
    return foto;
  }, []);

  const deleteFotoServico = useCallback((id: string) => {
    const foto = fotosServico.find(f => f.id === id);
    setFotosServico(prev => prev.filter(f => f.id !== id));
    if (foto) void FotosService.removeFotoServico(id, foto.storage_path);
  }, [fotosServico]);

  const addFotoFinal = useCallback(async (
    file: File,
    meta: { ocorrencia_id: string; categoria: 'retirada_fios' | 'ctop'; ordem: number },
  ): Promise<FotoOcorrenciaFinal> => {
    const { id, storagePath, fileName, mimeType } = await FotosService.createFotoFinal(file, meta);
    const url = (await getSignedUrl('fotos-finais', storagePath)) ?? undefined;

    const foto: FotoOcorrenciaFinal = {
      id,
      ocorrencia_id: meta.ocorrencia_id,
      categoria: meta.categoria,
      storage_path: storagePath,
      file_name: fileName,
      mime_type: mimeType,
      ordem: meta.ordem,
      created_at: new Date().toISOString(),
      url,
    };
    setFotosFinais(prev => [...prev, foto]);
    return foto;
  }, []);

  const deleteFotoFinal = useCallback((id: string) => {
    const foto = fotosFinais.find(f => f.id === id);
    setFotosFinais(prev => prev.filter(f => f.id !== id));
    if (foto) void FotosService.removeFotoFinal(id, foto.storage_path);
  }, [fotosFinais]);

  // ─── Profiles ──────────────────────────────────────────────────────────────

  const addProfile = useCallback(async (
    data: { nome: string; email: string; role: UserRole; equipe_id: string | null },
  ): Promise<{ profile: Profile; tempPassword: string }> => {
    const result = await ProfilesService.createProfile(data);
    setProfiles(prev => [...prev, result.profile]);
    logAction('CRIACAO', 'USUARIO', result.profile.id, data.nome, `Novo usuário criado com perfil ${data.role}`);
    return result;
  }, [logAction]);

  const updateProfile = useCallback((id: string, data: Partial<Profile>) => {
    const profile = profiles.find(p => p.id === id);
    const now = new Date().toISOString();
    setProfiles(prev => prev.map(p => p.id === id ? { ...p, ...data, updated_at: now } : p));

    if (profile) {
      const detalhes = data.must_change_password ? 'Senha resetada' : 'Perfil atualizado';
      logAction('ATUALIZACAO', 'USUARIO', id, profile.nome, detalhes);
    }

    const run = async () => {
      if (data.email !== undefined && data.email !== profile?.email) {
        await ProfilesService.updateProfileEmail(id, data.email);
      }

      const update: ProfilesService.ProfileUpdate = { updated_at: now };
      if (data.nome !== undefined) update.nome = data.nome;
      if (data.role !== undefined) update.role = data.role;
      if (data.equipe_id !== undefined) update.equipe_id = data.equipe_id;
      if (data.must_change_password !== undefined) update.must_change_password = data.must_change_password;
      if (data.ativo !== undefined) update.ativo = data.ativo;
      await ProfilesService.updateProfile(id, update);
    };
    void run();
  }, [profiles, logAction]);

  const deleteProfile = useCallback((id: string) => {
    const profile = profiles.find(p => p.id === id);
    setProfiles(prev => prev.filter(p => p.id !== id));
    if (profile) logAction('EXCLUSAO', 'USUARIO', id, profile.nome, 'Usuário deletado');
    void ProfilesService.deleteProfile(id);
  }, [profiles, logAction]);

  // ─── Materiais ─────────────────────────────────────────────────────────────

  const addMaterial = useCallback((data: { name: string; unit: string }): Material => {
    const now = new Date().toISOString();
    const mat: Material = { id: crypto.randomUUID(), name: data.name, unit: data.unit, ativo: true, created_at: now, updated_at: now };
    setMaterials(prev => [...prev, mat]);
    void MateriaisService.insertMaterial({ id: mat.id, name: mat.name, unit: mat.unit, ativo: true });
    return mat;
  }, []);

  const updateMaterial = useCallback((id: string, data: Partial<Material>) => {
    const now = new Date().toISOString();
    setMaterials(prev => prev.map(m => m.id === id ? { ...m, ...data, updated_at: now } : m));
    const update: MateriaisService.MaterialUpdate = { updated_at: now };
    if (data.name !== undefined) update.name = data.name;
    if (data.unit !== undefined) update.unit = data.unit;
    if (data.ativo !== undefined) update.ativo = data.ativo;
    void MateriaisService.updateMaterial(id, update);
  }, []);

  const deleteMaterial = useCallback((id: string) => {
    setMaterials(prev => prev.filter(m => m.id !== id));
    void MateriaisService.deleteMaterial(id);
  }, []);

  const addOcorrenciaMaterial = useCallback((data: {
    ocorrencia_id: string;
    material_id: string;
    quantity: number;
  }): OcorrenciaMaterial => {
    const mat = materials.find(m => m.id === data.material_id);
    const newId = crypto.randomUUID();
    const now = new Date().toISOString();
    const om: OcorrenciaMaterial = {
      id: newId,
      ocorrencia_id: data.ocorrencia_id,
      material_id: data.material_id,
      material: mat,
      quantity: data.quantity,
      created_at: now,
    };
    setOcorrenciaMateriais(prev => [...prev, om]);
    void MateriaisService.insertOcorrenciaMaterial({
      id: newId,
      ocorrencia_id: data.ocorrencia_id,
      material_id: data.material_id,
      quantity: data.quantity,
    });
    return om;
  }, [materials]);

  const removeOcorrenciaMaterial = useCallback((id: string) => {
    setOcorrenciaMateriais(prev => prev.filter(om => om.id !== id));
    void MateriaisService.deleteOcorrenciaMaterial(id);
  }, []);

  // ──────────────────────────────────────────────────────────────────────────

  const value = useMemo(() => ({
    ocorrencias, loadOcorrenciaDetail,
    equipes, tiposServico, servicos, fotosServico, fotosFinais, profiles,
    materials, ocorrenciaMateriais,
    addOcorrencias, importOcorrencias, updateOcorrencia, addEquipe, updateEquipe, deleteEquipe,
    addTipoServico, updateTipoServico, deleteTipoServico, addServico, updateServico, deleteServico,
    addFotoServico, deleteFotoServico, addFotoFinal, deleteFotoFinal,
    finalizarOcorrencia, reabrirOcorrencia, addProfile, updateProfile, deleteProfile,
    vincularEquipe, designarOperador, deleteOcorrencia,
    addMaterial, updateMaterial, deleteMaterial,
    addOcorrenciaMaterial, removeOcorrenciaMaterial,
  }), [
    ocorrencias, loadOcorrenciaDetail,
    equipes, tiposServico, servicos, fotosServico, fotosFinais, profiles,
    materials, ocorrenciaMateriais,
    addOcorrencias, importOcorrencias, updateOcorrencia, addEquipe, updateEquipe, deleteEquipe,
    addTipoServico, updateTipoServico, deleteTipoServico, addServico, updateServico, deleteServico,
    addFotoServico, deleteFotoServico, addFotoFinal, deleteFotoFinal,
    finalizarOcorrencia, reabrirOcorrencia, addProfile, updateProfile, deleteProfile,
    vincularEquipe, designarOperador, deleteOcorrencia,
    addMaterial, updateMaterial, deleteMaterial,
    addOcorrenciaMaterial, removeOcorrenciaMaterial,
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
