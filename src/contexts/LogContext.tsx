import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from 'react';
import type { Log, LogTipo, LogCategoria } from '@/types';

interface LogStore {
  logs: Log[];
  addLog: (data: {
    userId: string | null;
    userNome: string;
    userRole: 'admin' | 'operador' | 'sistema';
    tipo: LogTipo;
    categoria: LogCategoria;
    entidadeId: string;
    entidadeNome: string;
    detalhes: string;
  }) => void;
}

const LogContext = createContext<LogStore | null>(null);

let logCounter = 1;
const uid = () => `log-${logCounter++}`;

export function LogProvider({ children }: { children: ReactNode }) {
  const [logs, setLogs] = useState<Log[]>([]);

  const addLog = useCallback((data: {
    userId: string | null;
    userNome: string;
    userRole: 'admin' | 'operador' | 'sistema';
    tipo: LogTipo;
    categoria: LogCategoria;
    entidadeId: string;
    entidadeNome: string;
    detalhes: string;
  }) => {
    const log: Log = {
      id: uid(),
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
  }, []);

  const value = useMemo(() => ({
    logs,
    addLog,
  }), [logs, addLog]);

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
