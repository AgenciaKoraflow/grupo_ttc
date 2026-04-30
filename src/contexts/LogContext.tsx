import { createContext, useContext, useState, useCallback, useEffect, useMemo, type ReactNode } from 'react';
import type { Log, LogTipo, LogCategoria } from '@/types';
import { supabase } from '@/lib/supabase';

interface LogStore {
  logs: Log[];
  addLog: (data: {
    userId: string | null;
    userNome: string;
    userRole: 'admin' | 'supervisor' | 'operador' | 'sistema';
    tipo: LogTipo;
    categoria: LogCategoria;
    entidadeId: string;
    entidadeNome: string;
    detalhes: string;
  }) => void;
}

const LogContext = createContext<LogStore | null>(null);

function rowToLog(row: any): Log {
  return {
    id: row.id,
    userId: row.user_id,
    userNome: row.user_nome,
    userRole: row.user_role,
    tipo: row.tipo,
    categoria: row.categoria,
    entidadeId: row.entidade_id,
    entidadeNome: row.entidade_nome,
    detalhes: row.detalhes,
    created_at: row.created_at,
  };
}

export function LogProvider({ children }: { children: ReactNode }) {
  const [logs, setLogs] = useState<Log[]>([]);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from('logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);
      if (error) { console.error('[Log] load:', error); return; }
      setLogs((data ?? []).map(rowToLog));
    })();
  }, []);

  const addLog = useCallback((data: {
    userId: string | null;
    userNome: string;
    userRole: 'admin' | 'supervisor' | 'operador' | 'sistema';
    tipo: LogTipo;
    categoria: LogCategoria;
    entidadeId: string;
    entidadeNome: string;
    detalhes: string;
  }) => {
    const localId = crypto.randomUUID();
    const log: Log = {
      id: localId,
      userId: data.userId,
      userNome: data.userNome,
      userRole: data.userRole,
      tipo: data.tipo,
      categoria: data.categoria,
      entidadeId: data.entidadeId,
      entidadeNome: data.entidadeNome,
      detalhes: data.detalhes,
      created_at: new Date().toISOString(),
    };
    setLogs(prev => [log, ...prev]);

    (async () => {
      const { error } = await supabase.from('logs').insert({
        user_id: data.userId,
        user_nome: data.userNome,
        user_role: data.userRole,
        tipo: data.tipo,
        categoria: data.categoria,
        entidade_id: data.entidadeId,
        entidade_nome: data.entidadeNome,
        detalhes: data.detalhes,
      });
      if (error) console.error('[Log] insert:', error);
    })();
  }, []);

  const value = useMemo(() => ({ logs, addLog }), [logs, addLog]);

  return (
    <LogContext.Provider value={value}>
      {children}
    </LogContext.Provider>
  );
}

export function useLog() {
  const ctx = useContext(LogContext);
  if (!ctx) throw new Error('useLog must be used within LogProvider');
  return ctx;
}
