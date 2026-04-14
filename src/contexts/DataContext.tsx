import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type {
  Ocorrencia, Equipe, TipoServico, ServicoOcorrencia,
  FotoServico, FotoOcorrenciaFinal, Profile, OcorrenciaStatus,
} from '@/types';
import {
  mockOcorrencias, mockEquipes, mockTiposServico, mockServicos,
  mockFotosServico, mockFotosFinais, mockProfiles,
} from '@/mock/data';

interface DataStore {
  ocorrencias: Ocorrencia[];
  equipes: Equipe[];
  tiposServico: TipoServico[];
  servicos: ServicoOcorrencia[];
  fotosServico: FotoServico[];
  fotosFinais: FotoOcorrenciaFinal[];
  profiles: Profile[];
  addOcorrencias: (items: Partial<Ocorrencia>[]) => number;
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
  vincularEquipe: (ocorrenciaId: string, equipeId: string) => void;
}

const DataContext = createContext<DataStore | null>(null);

let counter = 100;
const uid = () => `gen-${++counter}`;

export function DataProvider({ children }: { children: ReactNode }) {
  const [ocorrencias, setOcorrencias] = useState<Ocorrencia[]>(mockOcorrencias);
  const [equipes, setEquipes] = useState<Equipe[]>(mockEquipes);
  const [tiposServico, setTiposServico] = useState<TipoServico[]>(mockTiposServico);
  const [servicos, setServicos] = useState<ServicoOcorrencia[]>(mockServicos);
  const [fotosServico, setFotosServico] = useState<FotoServico[]>(mockFotosServico);
  const [fotosFinais, setFotosFinais] = useState<FotoOcorrenciaFinal[]>(mockFotosFinais);
  const [profiles] = useState<Profile[]>(mockProfiles);

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
        equipe_id: null,
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

  const updateOcorrencia = useCallback((id: string, data: Partial<Ocorrencia>) => {
    setOcorrencias(prev => prev.map(o => o.id === id ? { ...o, ...data, updated_at: new Date().toISOString() } : o));
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
    const sv: ServicoOcorrencia = {
      id: uid(),
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
    return sv;
  }, [tiposServico]);

  const updateServico = useCallback((id: string, data: Partial<ServicoOcorrencia>) => {
    setServicos(prev => prev.map(s => {
      if (s.id !== id) return s;
      const ts = data.tipo_servico_id ? tiposServico.find(t => t.id === data.tipo_servico_id) : s.tipo_servico;
      return { ...s, ...data, tipo_servico: ts, updated_at: new Date().toISOString() };
    }));
  }, [tiposServico]);

  const deleteServico = useCallback((id: string) => {
    setFotosServico(prev => prev.filter(f => f.servico_id !== id));
    setServicos(prev => prev.filter(s => s.id !== id));
  }, []);

  const placeholderImg = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE1MCIgZmlsbD0iI2UyZThmMCIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBkb21pbmFudC1iYXNlbGluZT0ibWlkZGxlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk0YTNiOCI+Rm90bzwvdGV4dD48L3N2Zz4=';

  const addFotoServico = useCallback((data: Partial<FotoServico>): FotoServico => {
    const f: FotoServico = {
      id: uid(),
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
    return f;
  }, []);

  const deleteFotoServico = useCallback((id: string) => {
    setFotosServico(prev => prev.filter(f => f.id !== id));
  }, []);

  const addFotoFinal = useCallback((data: Partial<FotoOcorrenciaFinal>): FotoOcorrenciaFinal => {
    const f: FotoOcorrenciaFinal = {
      id: uid(),
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
    return f;
  }, []);

  const deleteFotoFinal = useCallback((id: string) => {
    setFotosFinais(prev => prev.filter(f => f.id !== id));
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
  }, []);

  const reabrirOcorrencia = useCallback((id: string) => {
    setOcorrencias(prev => prev.map(o =>
      o.id === id ? {
        ...o, status: 'EM_ANDAMENTO' as OcorrenciaStatus,
        finalized_at: null, finalized_by: null,
        updated_at: new Date().toISOString(),
      } : o
    ));
  }, []);

  const vincularEquipe = useCallback((ocorrenciaId: string, equipeId: string) => {
    const eq = equipes.find(e => e.id === equipeId);
    setOcorrencias(prev => prev.map(o =>
      o.id === ocorrenciaId ? { ...o, equipe_id: equipeId, equipe: eq, updated_at: new Date().toISOString() } : o
    ));
  }, [equipes]);

  return (
    <DataContext.Provider value={{
      ocorrencias, equipes, tiposServico, servicos, fotosServico, fotosFinais, profiles,
      addOcorrencias, updateOcorrencia, addEquipe, updateEquipe,
      addTipoServico, updateTipoServico, addServico, updateServico, deleteServico,
      addFotoServico, deleteFotoServico, addFotoFinal, deleteFotoFinal,
      finalizarOcorrencia, reabrirOcorrencia, vincularEquipe,
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
