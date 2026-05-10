import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useCallback, useRef, useMemo, useEffect } from "react";
import * as XLSX from "xlsx";
import { useAuth } from "@/contexts/AuthContext";
import { useData } from "@/contexts/DataContext";
import type { ImportMode, ImportResult } from "@/contexts/DataContext";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import {
  Search, FileText, SlidersHorizontal, Upload,
  CheckCircle, AlertCircle, MinusCircle, FileUp, X,
  Plus, RefreshCw, Users, Hand, Trash2, ChevronDown, Calendar,
  ArrowUpDown, ChevronUp, XCircle, Download,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { OcorrenciaStatus } from "@/types";
import { usePageTitle } from "@/hooks/usePageTitle";
import { TablePagination } from "@/components/TablePagination";

export const Route = createFileRoute("/ocorrencias/")({
  component: OcorrenciasPage,
});

// ─── Parser helpers ─────────────────────────────────────────────────────────

function normalize(str: string): string {
  // Remove caracteres especiais, acentos, e caracteres corrompidos
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[^\w\s]/g, '') // Remove caracteres especiais (mantém só letras, números, espaços)
    .toUpperCase()
    .trim();
}

const COL_MAP: Record<string, string> = {
  'MUNICIPIO': 'municipio',
  'CABO/PRIMARIA': 'cabo_primaria',
  'CABOPRIMARIA': 'cabo_primaria',
  'CABO_PRIMARIA': 'cabo_primaria',
  'CABO PRIMARIA': 'cabo_primaria',
  'CABOPRIMRIA': 'cabo_primaria', // Variação com encoding corrompido
  'CABO PRIMRIA': 'cabo_primaria', // Variação com encoding corrompido
  'AT': 'at',
  'CONTRATADA': 'contratada',
  'ID_OCORRENCIA': 'id_ocorrencia',
  'NOME AT': 'nome_at',
  'NOMEAT': 'nome_at',
  'NOME_AT': 'nome_at',
  'OPERADOR': 'operador_id',
  'OPERADOR_ID': 'operador_id',
  'OPERADORID': 'operador_id',
  'GERENTE ICOMON': 'gerente_icomon',
  'GERENTEICOMON': 'gerente_icomon',
  'GERENTE_ICOMON': 'gerente_icomon',
};

interface ParsedRow {
  line: number;
  municipio: string;
  cabo_primaria: string;
  at: string;
  contratada: string;
  id_ocorrencia: string;
  nome_at: string;
  gerente_icomon: string;
  operador_id: string;
  rowStatus: 'ok' | 'duplicate' | 'cabo_duplicate' | 'error';
  message: string;
}

function rowsFromMatrix(
  headers: string[],
  matrix: string[][],
  existingIds: Set<string>,
  existingCabos: Set<string>,
): ParsedRow[] {
  const normalizedHeaders = headers.map(h => normalize(h));
  const headerMap: Record<number, string> = {};

  normalizedHeaders.forEach((nh, idx) => {
    for (const [expected, field] of Object.entries(COL_MAP)) {
      if (normalize(expected) === nh) {
        headerMap[idx] = field;
        break;
      }
    }
  });

  const seenIds = new Set<string>();
  const seenCabos = new Set<string>();
  return matrix.map((cols, i) => {
    const row: Record<string, string> = {};
    Object.entries(headerMap).forEach(([idx, field]) => {
      row[field] = (cols[Number(idx)] || '').trim();
    });

    const id_oc = row.id_ocorrencia || '';
    const cabo = row.cabo_primaria?.trim() || '';
    let rowStatus: 'ok' | 'duplicate' | 'cabo_duplicate' | 'error' = 'ok';
    let message = '';

    if (!id_oc) {
      rowStatus = 'error';
      message = 'ID_OCORRENCIA vazio';
    } else if (existingIds.has(id_oc) || seenIds.has(id_oc)) {
      rowStatus = 'duplicate';
      message = 'ID duplicado';
    } else if (cabo && (existingCabos.has(cabo) || seenCabos.has(cabo))) {
      rowStatus = 'cabo_duplicate';
      message = 'Cabo/Primária já cadastrado';
    } else {
      seenIds.add(id_oc);
      if (cabo) seenCabos.add(cabo);
    }

    return {
      line: i + 2,
      municipio: row.municipio || '',
      cabo_primaria: row.cabo_primaria || '',
      at: row.at || '',
      contratada: row.contratada || '',
      id_ocorrencia: id_oc,
      nome_at: row.nome_at || '',
      gerente_icomon: row.gerente_icomon || '',
      operador_id: row.operador_id || '',
      rowStatus,
      message,
    };
  });
}

// ─── Date helpers ────────────────────────────────────────────────────────────

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
}

// ─── Status Badge ────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: OcorrenciaStatus }) {
  const map = {
    PENDENTE: { label: 'Pendente', cls: 'status-pendente' },
    EM_ANDAMENTO: { label: 'Em Andamento', cls: 'status-em-andamento' },
    FINALIZADA: { label: 'Finalizada', cls: 'status-finalizada' },
  };
  const s = map[status];
  return (
    <Badge variant="outline" className={cn(s.cls, 'text-[10px] font-semibold whitespace-nowrap')}>
      {s.label}
    </Badge>
  );
}

// ─── Import Dialog ───────────────────────────────────────────────────────────

type ImportStep = 'upload' | 'review' | 'done';

interface ModeOption {
  mode: ImportMode;
  icon: React.ElementType;
  label: string;
  description: string;
  color: string;
  bg: string;
  border: string;
}

const MODE_OPTIONS: ModeOption[] = [
  {
    mode: 'skip',
    icon: Plus,
    label: 'Importar apenas novos',
    description: 'Duplicatas são ignoradas. Só os IDs que ainda não existem serão criados.',
    color: 'oklch(0.36 0.14 150)',
    bg: 'oklch(0.56 0.185 150 / 0.10)',
    border: 'oklch(0.56 0.185 150 / 0.30)',
  },
  {
    mode: 'replace',
    icon: RefreshCw,
    label: 'Atualizar duplicatas',
    description: 'Dados dos registros existentes são atualizados. Status, equipe e fotos são preservados.',
    color: 'oklch(0.38 0.14 235)',
    bg: 'oklch(0.55 0.18 235 / 0.10)',
    border: 'oklch(0.55 0.18 235 / 0.30)',
  },
];

function ImportDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { ocorrencias, importOcorrencias } = useData();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<ImportStep>('upload');
  const [parsed, setParsed] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState('');
  const [mode, setMode] = useState<ImportMode>('skip');
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [dragging, setDragging] = useState(false);

  const reset = () => {
    setParsed([]);
    setFileName('');
    setStep('upload');
    setMode('skip');
    setImportResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const processFile = useCallback((file: File) => {
    setFileName(file.name);
    setStep('upload');
    setImportResult(null);

    const existingIds = new Set(ocorrencias.map(o => o.id_ocorrencia));
    const existingCabos = new Set(
      ocorrencias.map(o => o.cabo_primaria?.trim()).filter((c): c is string => !!c)
    );
    const ext = file.name.split('.').pop()?.toLowerCase();

    const finish = (headers: string[], matrix: string[][]) => {
      const rows = rowsFromMatrix(headers, matrix, existingIds, existingCabos);
      setParsed(rows);
      setStep('review');
    };

    if (ext === 'xlsx' || ext === 'xls') {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const data = new Uint8Array(ev.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const raw = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1 }) as string[][];
        if (raw.length < 2) { setParsed([]); return; }
        finish(raw[0].map(String), raw.slice(1).filter(r => r.some(c => String(c || '').trim())).map(r => r.map(c => String(c ?? ''))));
      };
      reader.readAsArrayBuffer(file);
    } else {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const text = ev.target?.result as string;
        const lines = text.split(/\r?\n/).filter(l => l.trim());
        if (lines.length < 2) { setParsed([]); return; }
        finish(lines[0].split(';').map(h => h.replace(/"/g, '').trim()), lines.slice(1).map(l => l.split(';').map(c => c.replace(/"/g, '').trim())));
      };
      reader.readAsText(file, 'UTF-8');
    }
  }, [ocorrencias]);

  const handleFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleImport = () => {
    const allRows = parsed.filter(r => r.rowStatus !== 'error' && r.rowStatus !== 'cabo_duplicate');
    const result = importOcorrencias(allRows.map(r => ({
      id_ocorrencia: r.id_ocorrencia,
      municipio: r.municipio,
      cabo_primaria: r.cabo_primaria || null,
      at: r.at || null,
      contratada: r.contratada || null,
      nome_at: r.nome_at || null,
      gerente_icomon: r.gerente_icomon || null,
      operador_id: r.operador_id || null,
    })), mode);
    setImportResult(result);
    setStep('done');
  };

  const handleClose = () => { reset(); onClose(); };

  const newCount = parsed.filter(r => r.rowStatus === 'ok').length;
  const dupCount = parsed.filter(r => r.rowStatus === 'duplicate').length;
  const caboCount = parsed.filter(r => r.rowStatus === 'cabo_duplicate').length;
  const errCount = parsed.filter(r => r.rowStatus === 'error').length;
  const hasDups = dupCount > 0;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-3xl max-h-[92vh] flex flex-col p-0 gap-0 overflow-hidden">

        {/* Header */}
        <DialogHeader className="px-6 py-4 border-b border-border/60 shrink-0">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Upload className="h-4 w-4 text-primary" />
            Importar Planilha
          </DialogTitle>
          <p className="text-xs text-muted-foreground mt-0.5">
            Suporta <strong>.xlsx</strong> e <strong>.csv</strong> (separador <code>;</code>)
            · Colunas: MUNICIPIO, CABO/PRIMÁRIA, AT, CONTRATADA, ID_OCORRENCIA, NOME AT, OPERADOR
          </p>
        </DialogHeader>

        {/* Stepper */}
        <div className="flex items-center gap-0 px-6 pt-4 pb-0 shrink-0">
          {(['upload', 'review', 'done'] as ImportStep[]).map((s, i) => {
            const labels = ['1. Upload', '2. Revisão', '3. Resultado'];
            const active = step === s;
            const done = (step === 'review' && i === 0) || (step === 'done' && i < 2);
            return (
              <div key={s} className="flex items-center">
                <div className={cn('flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all', active ? 'text-primary' : done ? 'text-muted-foreground' : 'text-muted-foreground/40')}>
                  <span
                    className={cn('h-4.5 w-4.5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0', active ? 'text-white' : done ? 'text-white' : 'text-muted-foreground/40')}
                    style={active ? { background: 'oklch(0.50 0.225 255)' } : done ? { background: 'oklch(0.56 0.185 150)' } : { background: 'oklch(0.85 0.01 250)' }}
                  >
                    {done ? '✓' : i + 1}
                  </span>
                  {labels[i]}
                </div>
                {i < 2 && <div className="w-8 h-px bg-border mx-1" />}
              </div>
            );
          })}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">

          {/* ── STEP: UPLOAD ── */}
          {step === 'upload' && (
            <label
              className={cn(
                'flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-12 cursor-pointer transition-all duration-150',
                dragging ? 'border-primary bg-primary/8 scale-[0.99]' : 'border-border hover:border-primary/40 hover:bg-accent/30'
              )}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
            >
              <div className="h-14 w-14 rounded-2xl flex items-center justify-center mb-4"
                style={{ background: 'linear-gradient(135deg, oklch(0.50 0.225 255 / 0.14), oklch(0.44 0.245 272 / 0.08))' }}>
                <FileUp className="h-7 w-7" style={{ color: 'oklch(0.50 0.225 255)' }} />
              </div>
              <p className="text-sm font-semibold text-foreground">
                {dragging ? 'Solte o arquivo aqui' : 'Arraste ou clique para selecionar'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">.xlsx · .xls · .csv (separador ;)</p>
              <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv,.txt" className="hidden" onChange={handleFile} />
            </label>
          )}

          {/* ── STEP: REVIEW ── */}
          {step === 'review' && (
            <>
              {/* Arquivo + trocar */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-semibold text-foreground">{fileName}</span>
                  <span className="text-xs text-muted-foreground">— {parsed.length} linhas</span>
                </div>
                <button onClick={reset} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors">
                  <X className="h-3.5 w-3.5" /> Trocar arquivo
                </button>
              </div>

              {/* Sumário */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl p-3.5 flex items-center gap-3"
                  style={{ background: 'oklch(0.56 0.185 150 / 0.10)', border: '1px solid oklch(0.56 0.185 150 / 0.25)' }}>
                  <CheckCircle className="h-5 w-5 shrink-0" style={{ color: 'oklch(0.56 0.185 150)' }} />
                  <div>
                    <p className="text-lg font-bold text-foreground leading-none">{newCount}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">novos</p>
                  </div>
                </div>
                <div className="rounded-xl p-3.5 flex items-center gap-3"
                  style={{ background: 'oklch(0.80 0.165 70 / 0.10)', border: '1px solid oklch(0.80 0.165 70 / 0.25)' }}>
                  <MinusCircle className="h-5 w-5 shrink-0" style={{ color: 'oklch(0.40 0.12 70)' }} />
                  <div>
                    <p className="text-lg font-bold text-foreground leading-none">{dupCount}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">ID duplicado</p>
                  </div>
                </div>
                <div className="rounded-xl p-3.5 flex items-center gap-3"
                  style={{ background: 'oklch(0.60 0.22 350 / 0.08)', border: '1px solid oklch(0.60 0.22 350 / 0.25)' }}>
                  <XCircle className="h-5 w-5 shrink-0" style={{ color: 'oklch(0.50 0.22 350)' }} />
                  <div>
                    <p className="text-lg font-bold text-foreground leading-none">{caboCount}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">cabo duplicado</p>
                  </div>
                </div>
                <div className="rounded-xl p-3.5 flex items-center gap-3"
                  style={{ background: 'oklch(0.50 0.235 27 / 0.08)', border: '1px solid oklch(0.50 0.235 27 / 0.20)' }}>
                  <AlertCircle className="h-5 w-5 shrink-0" style={{ color: 'oklch(0.50 0.235 27)' }} />
                  <div>
                    <p className="text-lg font-bold text-foreground leading-none">{errCount}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">erros</p>
                  </div>
                </div>
              </div>

              {/* Aviso de cabo/primária duplicado — sempre bloqueados */}
              {caboCount > 0 && (
                <div className="flex items-start gap-3 rounded-xl px-4 py-3"
                  style={{ background: 'oklch(0.60 0.22 350 / 0.07)', border: '1px solid oklch(0.60 0.22 350 / 0.25)' }}>
                  <XCircle className="h-4 w-4 shrink-0 mt-0.5" style={{ color: 'oklch(0.50 0.22 350)' }} />
                  <p className="text-xs leading-relaxed" style={{ color: 'oklch(0.38 0.18 350)' }}>
                    <span className="font-semibold">{caboCount} registro{caboCount > 1 ? 's' : ''} bloqueado{caboCount > 1 ? 's' : ''}:</span>{' '}
                    Cabo/Primária já cadastrado no sistema. Esses registros não serão importados.
                    Corrija o Cabo/Primária na planilha para incluí-los.
                  </p>
                </div>
              )}

              {/* Seletor de modo — só aparece quando tem duplicatas */}
              {hasDups && (
                <div className="space-y-2.5">
                  <p className="text-xs font-semibold text-foreground uppercase tracking-wider">
                    O que fazer com as {dupCount} duplicata{dupCount > 1 ? 's' : ''}?
                  </p>
                  <div className="space-y-2">
                    {MODE_OPTIONS.map((opt) => (
                      <button
                        key={opt.mode}
                        onClick={() => setMode(opt.mode)}
                        className="w-full flex items-start gap-3.5 rounded-xl p-4 text-left transition-all duration-150"
                        style={mode === opt.mode ? {
                          background: opt.bg,
                          border: `1.5px solid ${opt.border}`,
                          boxShadow: `0 0 0 1px ${opt.border}`,
                        } : {
                          background: 'oklch(0.972 0.004 245 / 0.5)',
                          border: '1.5px solid oklch(0.868 0.014 245)',
                        }}
                      >
                        <div className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                          style={{ background: mode === opt.mode ? opt.bg : 'oklch(0.94 0.012 245)' }}>
                          <opt.icon className="h-4 w-4" style={{ color: mode === opt.mode ? opt.color : 'oklch(0.55 0.02 250)' }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground">{opt.label}</p>
                          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{opt.description}</p>
                        </div>
                        <div className="h-4 w-4 rounded-full border-2 flex items-center justify-center shrink-0 mt-1"
                          style={mode === opt.mode ? { borderColor: opt.color, background: opt.color } : { borderColor: 'oklch(0.75 0.02 250)' }}>
                          {mode === opt.mode && <span className="h-1.5 w-1.5 rounded-full bg-white block" />}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Preview tabela */}
              <div className="rounded-xl border border-border/60 overflow-hidden">
                <div className="grid gap-2 px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border/60"
                  style={{ gridTemplateColumns: '36px 1fr 1fr 1fr 70px 1fr 1fr 1fr 68px', background: 'oklch(0.972 0.004 245 / 0.7)' }}>
                  <span>#</span>
                  <span>ID Ocorr.</span>
                  <span>Município</span>
                  <span>Cabo/Primária</span>
                  <span>AT</span>
                  <span>Contratada</span>
                  <span>Nome AT</span>
                  <span>Gerente</span>
                  <span>Status</span>
                </div>
                <div className="divide-y divide-border/40 max-h-[240px] overflow-y-auto">
                  {parsed.map((row) => (
                    <div key={row.line} className="grid gap-2 px-4 py-2 text-xs items-center"
                      style={{
                        gridTemplateColumns: '36px 1fr 1fr 1fr 70px 1fr 1fr 1fr 68px',
                        background: row.rowStatus === 'error'
                          ? 'oklch(0.50 0.235 27 / 0.06)'
                          : row.rowStatus === 'duplicate'
                            ? 'oklch(0.80 0.165 70 / 0.06)'
                            : row.rowStatus === 'cabo_duplicate'
                              ? 'oklch(0.60 0.22 350 / 0.05)'
                              : undefined,
                      }}>
                      <span className="text-muted-foreground">{row.line}</span>
                      <span className="font-medium text-foreground truncate">{row.id_ocorrencia || '—'}</span>
                      <span className="text-foreground/80 truncate">{row.municipio}</span>
                      <span className="text-muted-foreground truncate">{row.cabo_primaria || '—'}</span>
                      <span className="text-muted-foreground truncate">{row.at || '—'}</span>
                      <span className="text-muted-foreground truncate">{row.contratada || '—'}</span>
                      <span className="text-muted-foreground truncate">{row.nome_at || '—'}</span>
                      <span className="text-muted-foreground truncate">{row.gerente_icomon || '—'}</span>
                      <span>
                        {row.rowStatus === 'ok' && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
                            style={{ background: 'oklch(0.56 0.185 150 / 0.15)', color: 'oklch(0.36 0.14 150)' }}>Novo</span>
                        )}
                        {row.rowStatus === 'duplicate' && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
                            style={{ background: 'oklch(0.80 0.165 70 / 0.18)', color: 'oklch(0.40 0.12 70)' }}>ID dup.</span>
                        )}
                        {row.rowStatus === 'cabo_duplicate' && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
                            title={row.message}
                            style={{ background: 'oklch(0.60 0.22 350 / 0.15)', color: 'oklch(0.45 0.22 350)' }}>Cabo dup.</span>
                        )}
                        {row.rowStatus === 'error' && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
                            style={{ background: 'oklch(0.50 0.235 27 / 0.15)', color: 'oklch(0.50 0.235 27)' }}>Erro</span>
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* ── STEP: DONE ── */}
          {step === 'done' && importResult && (
            <div className="py-4 space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-2xl flex items-center justify-center shrink-0"
                  style={{ background: 'oklch(0.56 0.185 150 / 0.15)' }}>
                  <CheckCircle className="h-6 w-6" style={{ color: 'oklch(0.56 0.185 150)' }} />
                </div>
                <div>
                  <p className="font-bold text-foreground text-base">Importação concluída!</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{fileName}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Novos importados', value: importResult.imported, color: 'oklch(0.56 0.185 150)', bg: 'oklch(0.56 0.185 150 / 0.10)', border: 'oklch(0.56 0.185 150 / 0.25)' },
                  { label: 'Atualizados', value: importResult.replaced, color: 'oklch(0.38 0.14 235)', bg: 'oklch(0.55 0.18 235 / 0.10)', border: 'oklch(0.55 0.18 235 / 0.25)' },
                  { label: 'Ignorados', value: importResult.skipped, color: 'oklch(0.46 0.028 252)', bg: 'oklch(0.935 0.014 245)', border: 'oklch(0.868 0.014 245)' },
                  { label: 'Cabo/Primária dup.', value: caboCount, color: 'oklch(0.50 0.22 350)', bg: 'oklch(0.60 0.22 350 / 0.07)', border: 'oklch(0.60 0.22 350 / 0.25)' },
                  { label: 'Erros (ID vazio)', value: importResult.errors, color: 'oklch(0.50 0.235 27)', bg: 'oklch(0.50 0.235 27 / 0.08)', border: 'oklch(0.50 0.235 27 / 0.20)' },
                ].map(({ label, value, color, bg, border }) => (
                  <div key={label} className="rounded-xl p-3.5" style={{ background: bg, border: `1px solid ${border}` }}>
                    <p className="text-xl font-bold" style={{ color }}>{value}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="px-6 py-4 border-t border-border/60 shrink-0 flex justify-between gap-3">
          <Button variant="outline" onClick={handleClose}>
            {step === 'done' ? 'Fechar' : 'Cancelar'}
          </Button>

          {step === 'review' && (
            <Button
              onClick={handleImport}
              disabled={newCount === 0 && !hasDups}
              className="gap-2 font-semibold"
              style={(newCount > 0 || hasDups) ? {
                background: 'linear-gradient(135deg, oklch(0.50 0.225 255), oklch(0.44 0.245 272))',
                boxShadow: '0 4px 12px oklch(0.50 0.225 255 / 0.35)',
              } : undefined}
            >
              <Upload className="h-4 w-4" />
              {hasDups
                ? `Confirmar (${newCount} novos + ${dupCount} duplicatas)`
                : `Importar ${newCount} registro${newCount !== 1 ? 's' : ''}`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── CSV Export ──────────────────────────────────────────────────────────────

function exportCSV(rows: { id_ocorrencia: string; municipio: string; cabo_primaria: string | null; at: string | null; nome_at: string | null; contratada: string | null; finalized_at: string | null; equipe?: { nome: string } | undefined; status: OcorrenciaStatus; gerente_icomon: string | null }[]) {
  const STATUS_LABEL: Record<OcorrenciaStatus, string> = {
    PENDENTE: 'Pendente',
    EM_ANDAMENTO: 'Em Andamento',
    FINALIZADA: 'Finalizada',
  };
  const headers = ['ID Ocorrência', 'Município', 'Cabo/Primária', 'AT', 'Nome AT', 'Contratada', 'Data Finalização', 'Equipe', 'Status', 'Gerente'];
  const escape = (v: string | null | undefined) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const dataRows = rows.map(o => [
    o.id_ocorrencia,
    o.municipio,
    o.cabo_primaria,
    o.at,
    o.nome_at,
    o.contratada,
    o.finalized_at ? formatDate(o.finalized_at) : '',
    o.equipe?.nome,
    STATUS_LABEL[o.status],
    o.gerente_icomon,
  ].map(escape).join(';'));
  const csv = '﻿' + [headers.map(escape).join(';'), ...dataRows].join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ocorrencias_${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Sort ────────────────────────────────────────────────────────────────────

type SortCol = 'status' | 'id_ocorrencia' | 'municipio' | 'finalized_at';

const STATUS_ORDER: Record<string, number> = { PENDENTE: 0, EM_ANDAMENTO: 1, FINALIZADA: 2 };

function SortHeader({ col, label, sortCol, sortDir, onSort, className }: {
  col: SortCol;
  label: string;
  sortCol: SortCol | null;
  sortDir: 'asc' | 'desc';
  onSort: (col: SortCol) => void;
  className?: string;
}) {
  const active = sortCol === col;
  return (
    <button
      className={cn(
        'flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors cursor-pointer select-none whitespace-nowrap',
        className,
      )}
      onClick={() => onSort(col)}
    >
      {label}
      {active
        ? sortDir === 'asc'
          ? <ChevronUp className="h-3 w-3 opacity-70" />
          : <ChevronDown className="h-3 w-3 opacity-70" />
        : <ArrowUpDown className="h-3 w-3 opacity-30 group-hover:opacity-60" />
      }
    </button>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

function OcorrenciasPage() {
  usePageTitle("Ocorrências");
  const { user, isAdmin, isSupervisor, canDelete, canCreate } = useAuth();
  const isAdminOrSupervisor = isAdmin || isSupervisor;
  const { ocorrencias, equipes, profiles, vincularEquipe, designarOperador, deleteOcorrencia } = useData();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [equipeFilter, setEquipeFilter] = useState<string>("");
  const [operadorFilter, setOperadorFilter] = useState<string>("");
  const [statusViewFilter, setStatusViewFilter] = useState<"all" | "backlog" | "finalizadas">("all");
  const [periodoFilter, setPeriodoFilter] = useState<"all" | "hoje" | "7dias" | "mes" | "custom">("all");
  const [dataInicialFilter, setDataInicialFilter] = useState("");
  const [dataFinalFilter, setDataFinalFilter] = useState("");
  const [showImport, setShowImport] = useState(false);
  const [showDesignacao, setShowDesignacao] = useState(false);
  const [showExcluir, setShowExcluir] = useState(false);
  const [ocorrenciaSelecionada, setOcorrenciaSelecionada] = useState<string | null>(null);
  const [equipeSelecionada, setEquipeSelecionada] = useState<string>("");
  const [operadorSelecionado, setOperadorSelecionado] = useState<string>("");
  const [editingEquipeId, setEditingEquipeId] = useState<string | null>(null);
  const [sortCol, setSortCol] = useState<SortCol | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const handleSort = useCallback((col: SortCol) => {
    if (sortCol === col) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortCol(col);
      setSortDir('asc');
    }
    setPage(0);
  }, [sortCol]);

  const ocorrenciaAtual = useMemo(
    () => ocorrencias.find(o => o.id === ocorrenciaSelecionada),
    [ocorrencias, ocorrenciaSelecionada],
  );
  const operadorAtual = ocorrenciaAtual?.assignedUser;

  const hasFilters = !!(statusFilter || equipeFilter || search || operadorFilter || periodoFilter !== "all");

  const filtered = useMemo(() => {
    let result = isAdminOrSupervisor
      ? ocorrencias
      : ocorrencias.filter(o => o.equipe_id === user?.equipe_id);
    if (statusFilter) result = result.filter(o => o.status === statusFilter);

    if (statusViewFilter === "backlog") result = result.filter(o => o.status === "PENDENTE" || o.status === "EM_ANDAMENTO");
    if (statusViewFilter === "finalizadas") result = result.filter(o => o.status === "FINALIZADA");
    if (equipeFilter) result = result.filter(o => o.equipe_id === equipeFilter);
    if (operadorFilter) result = result.filter(o => o.assigned_to === operadorFilter);
    if (periodoFilter !== "all") {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      let startDate: Date | null = null;
      let endDate: Date | null = null;
      if (periodoFilter === "hoje") {
        startDate = today;
        endDate = new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1);
      } else if (periodoFilter === "7dias") {
        startDate = new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000);
        endDate = new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1);
      } else if (periodoFilter === "mes") {
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);
      } else if (periodoFilter === "custom") {
        if (dataInicialFilter) startDate = new Date(dataInicialFilter + "T00:00:00");
        if (dataFinalFilter) endDate = new Date(dataFinalFilter + "T23:59:59");
      }
      result = result.filter(o => {
        if (!o.finalized_at) return false;
        const d = new Date(o.finalized_at);
        if (startDate && d < startDate) return false;
        if (endDate && d > endDate) return false;
        return true;
      });
    }
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(o =>
        o.id_ocorrencia.toLowerCase().includes(s) ||
        o.municipio.toLowerCase().includes(s) ||
        (o.contratada || '').toLowerCase().includes(s)
      );
    }
    if (sortCol) {
      result = [...result].sort((a, b) => {
        let cmp = 0;
        if (sortCol === 'status') {
          cmp = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
        } else if (sortCol === 'id_ocorrencia') {
          cmp = a.id_ocorrencia.localeCompare(b.id_ocorrencia);
        } else if (sortCol === 'municipio') {
          cmp = a.municipio.localeCompare(b.municipio);
        } else if (sortCol === 'finalized_at') {
          const da = a.finalized_at ? new Date(a.finalized_at).getTime() : 0;
          const db = b.finalized_at ? new Date(b.finalized_at).getTime() : 0;
          cmp = da - db;
        }
        return sortDir === 'asc' ? cmp : -cmp;
      });
    }
    return result;
  }, [ocorrencias, isAdminOrSupervisor, user?.equipe_id, statusFilter, statusViewFilter, equipeFilter, operadorFilter, periodoFilter, dataInicialFilter, dataFinalFilter, search, sortCol, sortDir]);

  const PAGE_SIZE = 25;
  const [page, setPage] = useState(0);

  useEffect(() => { setPage(0); }, [search, statusFilter, statusViewFilter, equipeFilter, operadorFilter, periodoFilter, dataInicialFilter, dataFinalFilter]);

  const paginatedFiltered = useMemo(
    () => filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE),
    [filtered, page],
  );
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  return (
    <AppLayout>
      <div className="p-6 space-y-5 max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-y-2 animate-fade-in">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Ocorrências</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {filtered.length} {filtered.length === 1 ? 'registro' : 'registros'}{hasFilters ? ' filtrados' : ''}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-2 h-9 font-semibold text-sm"
              onClick={() => exportCSV(filtered)}
              disabled={filtered.length === 0}
            >
              <Download className="h-4 w-4" /> Exportar CSV
            </Button>
            {canCreate && (
              <Button
                size="sm"
                className="gap-2 h-9 font-semibold text-sm"
                style={{
                  background: 'linear-gradient(135deg, oklch(0.50 0.225 255), oklch(0.44 0.245 272))',
                  boxShadow: '0 4px 12px oklch(0.50 0.225 255 / 0.35)',
                }}
                onClick={() => setShowImport(true)}
              >
                <Upload className="h-4 w-4" /> Importar Planilha
              </Button>
            )}
          </div>
        </div>

        {/* Filtros */}
        <div
          className="rounded-2xl border border-border/60 bg-card p-4 animate-fade-in-up"
          style={{ boxShadow: '0 1px 3px oklch(0.115 0.028 252 / 0.05)' }}
        >
          <div className="flex items-center gap-2 mb-3">
            <SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Filtros</span>
          </div>
          <div className="flex flex-wrap gap-3 w-full">
            <div className="relative flex-1 min-w-[160px] sm:min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por ID, município..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 bg-background border-border/70"
              />
            </div>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v === 'all' ? '' : v)}>
              <SelectTrigger className="flex-1 sm:flex-none sm:w-[155px] h-9 bg-background border-border/70">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="PENDENTE">Pendente</SelectItem>
                <SelectItem value="EM_ANDAMENTO">Em Andamento</SelectItem>
                <SelectItem value="FINALIZADA">Finalizada</SelectItem>
              </SelectContent>
            </Select>
            {isAdminOrSupervisor && (
              <Select value={equipeFilter} onValueChange={(v) => setEquipeFilter(v === 'all' ? '' : v)}>
                <SelectTrigger className="flex-1 sm:flex-none sm:w-[155px] h-9 bg-background border-border/70">
                  <SelectValue placeholder="Equipe" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as equipes</SelectItem>
                  {equipes.filter(e => e.ativa).map(e => (
                    <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {hasFilters && (
              <Button
                variant="ghost"
                size="sm"
                className="h-9 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => { setSearch(''); setStatusFilter(''); setEquipeFilter(''); setPeriodoFilter('all'); setDataInicialFilter(''); setDataFinalFilter(''); }}
              >
                Limpar filtros
              </Button>
            )}
          </div>

          {/* Filtros de data de finalização */}
          <div className="flex flex-wrap items-center gap-3 mt-3 pt-3 border-t border-border/40">
            <div className="flex items-center gap-1.5 shrink-0">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Finalização</span>
            </div>
            <div className="flex flex-wrap gap-2 flex-1">
              {([
                { key: 'all', label: 'Todos' },
                { key: 'hoje', label: 'Hoje' },
                { key: '7dias', label: 'Últimos 7 dias' },
                { key: 'mes', label: 'Mês atual' },
                { key: 'custom', label: 'Personalizado' },
              ] as const).map(({ key, label }) => (
                <Button
                  key={key}
                  variant={periodoFilter === key ? "default" : "outline"}
                  size="sm"
                  className="h-8 text-xs font-medium"
                  onClick={() => {
                    setPeriodoFilter(key);
                    if (key !== 'custom') { setDataInicialFilter(''); setDataFinalFilter(''); }
                  }}
                >
                  {label}
                </Button>
              ))}
              {periodoFilter === "custom" && (
                <div className="flex items-center gap-2">
                  <Input
                    type="date"
                    value={dataInicialFilter}
                    onChange={(e) => setDataInicialFilter(e.target.value)}
                    className="h-8 w-[140px] text-xs bg-background border-border/70"
                  />
                  <span className="text-xs text-muted-foreground">até</span>
                  <Input
                    type="date"
                    value={dataFinalFilter}
                    onChange={(e) => setDataFinalFilter(e.target.value)}
                    className="h-8 w-[140px] text-xs bg-background border-border/70"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Status View Filters */}
          <div className="flex gap-2 mt-3 pt-3 border-t border-border/40">
            <Button
              variant={statusViewFilter === "all" ? "default" : "outline"}
              size="sm"
              className="h-8 text-xs font-medium"
              onClick={() => setStatusViewFilter("all")}
            >
              Todos
            </Button>
            <Button
              variant={statusViewFilter === "backlog" ? "default" : "outline"}
              size="sm"
              className="h-8 text-xs font-medium"
              onClick={() => setStatusViewFilter("backlog")}
            >
              Backlog
            </Button>
            <Button
              variant={statusViewFilter === "finalizadas" ? "default" : "outline"}
              size="sm"
              className="h-8 text-xs font-medium"
              onClick={() => setStatusViewFilter("finalizadas")}
            >
              Finalizadas
            </Button>
          </div>
        </div>

        {/* Tabela premium */}
        <div
          className="rounded-2xl border border-border/60 bg-card overflow-hidden animate-fade-in-up delay-75"
          style={{ boxShadow: '0 1px 3px oklch(0.115 0.028 252 / 0.06), 0 4px 12px oklch(0.115 0.028 252 / 0.04)' }}
        >
          {filtered.length === 0 ? (
            <div className="py-16 text-center px-4" role="status" aria-live="polite">
              <div
                className="h-12 w-12 rounded-2xl flex items-center justify-center mx-auto mb-3"
                style={{ background: 'oklch(0.50 0.225 255 / 0.08)' }}
              >
                <FileText className="h-6 w-6" aria-hidden="true" style={{ color: 'oklch(0.50 0.225 255 / 0.5)' }} />
              </div>
              <p className="text-sm font-medium text-muted-foreground">Nenhuma ocorrência encontrada</p>
              {canCreate && !hasFilters && (
                <button
                  className="mt-3 text-xs text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
                  onClick={() => setShowImport(true)}
                >
                  Importar planilha para começar
                </button>
              )}
              {hasFilters && (
                <p className="text-xs text-muted-foreground/60 mt-1">Tente ajustar os filtros</p>
              )}
            </div>
          ) : (
            <>
              {/* Table header — desktop only */}
              <div
                className="hidden md:grid gap-3 px-5 py-3 border-b border-border/60 items-center"
                style={{
                  gridTemplateColumns: '1.5fr 1.2fr 1.2fr 0.7fr 1fr 1fr 1.2fr 0.8fr 1.1fr 1.3fr',
                  background: 'oklch(0.972 0.004 245 / 0.7)',
                }}
                role="row"
                aria-label="Cabeçalho da tabela"
              >
                <SortHeader col="id_ocorrencia" label="ID Ocorrência" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
                <SortHeader col="municipio" label="Município" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap">Cabo/Primária</span>
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap">AT</span>
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap hidden lg:block">Nome AT</span>
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap hidden lg:block">Contratada</span>
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap">Equipe</span>
                <SortHeader col="status" label="Status" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
                <SortHeader col="finalized_at" label="Finalização" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} className="hidden xl:flex" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap hidden xl:block">Gerente Icomon</span>
              </div>

              {/* Rows — mobile cards + desktop grid */}
              <div className="divide-y divide-border/40" role="list" aria-label="Ocorrências">
                {paginatedFiltered.map((oc, idx) => (
                  <div key={oc.id} role="listitem">
                    {/* Mobile card */}
                    <div
                      className="md:hidden flex flex-col gap-3 px-4 py-4 cursor-pointer transition-all duration-150 hover:bg-accent/40 active:bg-accent/60"
                      onClick={() => navigate({ to: '/ocorrencias/$id', params: { id: oc.id } })}
                      role="button"
                      tabIndex={0}
                      aria-label={`Ocorrência ${oc.id_ocorrencia}, ${oc.municipio}`}
                      onKeyDown={(e) => e.key === 'Enter' && navigate({ to: '/ocorrencias/$id', params: { id: oc.id } })}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div
                            className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0"
                            style={{ background: 'oklch(0.50 0.225 255 / 0.10)' }}
                          >
                            <FileText className="h-3.5 w-3.5" aria-hidden="true" style={{ color: 'oklch(0.50 0.225 255)' }} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-semibold text-foreground truncate">{oc.id_ocorrencia}</div>
                            <div className="text-xs text-muted-foreground">{oc.municipio}</div>
                          </div>
                        </div>
                        <StatusBadge status={oc.status} />
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Cabo: <span className="text-foreground">{oc.cabo_primaria || '—'}</span>
                        {oc.at && <span className="ml-3">AT: <span className="text-foreground">{oc.at}</span></span>}
                      </div>
                      {oc.status === 'FINALIZADA' && oc.finalized_at && (
                        <div className="text-xs text-muted-foreground">
                          Finalizada em: <span className="text-foreground font-medium">{formatDate(oc.finalized_at)}</span>
                        </div>
                      )}
                      <div onClick={(e) => e.stopPropagation()}>
                        {editingEquipeId === oc.id ? (
                          <Select
                            value={equipeSelecionada}
                            onValueChange={(value) => {
                              const eqId = value === "none" ? null : value;
                              vincularEquipe(oc.id, eqId);
                              setEditingEquipeId(null);
                              setEquipeSelecionada("");
                            }}
                          >
                            <SelectTrigger className="w-full h-9 text-sm" aria-label="Selecionar equipe">
                              <SelectValue placeholder="Selecione uma equipe" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Sem equipe</SelectItem>
                              {equipes.filter(e => e.ativa).map(e => (
                                <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <button
                            onClick={() => { setEditingEquipeId(oc.id); setEquipeSelecionada(oc.equipe_id || ""); }}
                            className="text-xs text-muted-foreground hover:text-foreground px-2 py-1.5 rounded hover:bg-muted transition-colors w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            aria-label={`Alterar equipe: ${oc.equipe?.nome ?? 'Sem equipe'}`}
                          >
                            Equipe: <span className="text-foreground font-medium">{oc.equipe?.nome ?? 'Sem equipe'}</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Desktop row */}
                    <div
                      className="hidden md:grid gap-3 px-5 py-3.5 items-center cursor-pointer transition-all duration-150 hover:bg-accent/40 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                      style={{
                        gridTemplateColumns: '1.5fr 1.2fr 1.2fr 0.7fr 1fr 1fr 1.2fr 0.8fr 1.1fr 1.3fr',
                        background: idx % 2 !== 0 ? 'oklch(0.972 0.004 245 / 0.35)' : undefined,
                      }}
                      onClick={() => navigate({ to: '/ocorrencias/$id', params: { id: oc.id } })}
                      role="button"
                      tabIndex={0}
                      aria-label={`Ocorrência ${oc.id_ocorrencia}, ${oc.municipio}`}
                      onKeyDown={(e) => e.key === 'Enter' && navigate({ to: '/ocorrencias/$id', params: { id: oc.id } })}
                    >
                      <span className="text-sm font-semibold text-foreground truncate">{oc.id_ocorrencia}</span>
                      <span className="text-sm text-foreground/80 truncate">{oc.municipio}</span>
                      <span className="text-sm text-muted-foreground truncate">{oc.cabo_primaria || '—'}</span>
                      <span className="text-sm text-muted-foreground truncate">{oc.at || '—'}</span>
                      <span className="text-sm text-muted-foreground truncate hidden lg:block">{oc.nome_at || '—'}</span>
                      <span className="text-sm text-muted-foreground truncate hidden lg:block">{oc.contratada || '—'}</span>
                      <div onClick={(e) => e.stopPropagation()}>
                        {editingEquipeId === oc.id ? (
                          <Select
                            value={equipeSelecionada}
                            onValueChange={(value) => {
                              const eqId = value === "none" ? null : value;
                              vincularEquipe(oc.id, eqId);
                              setEditingEquipeId(null);
                              setEquipeSelecionada("");
                            }}
                          >
                            <SelectTrigger className="w-full h-8 text-sm" aria-label="Selecionar equipe">
                              <SelectValue placeholder="Selecione uma equipe" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Sem equipe</SelectItem>
                              {equipes.filter(e => e.ativa).map(e => (
                                <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <button
                            onClick={() => { setEditingEquipeId(oc.id); setEquipeSelecionada(oc.equipe_id || ""); }}
                            className="text-sm text-muted-foreground truncate cursor-pointer hover:text-foreground hover:bg-muted px-2 py-1 rounded transition-colors w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            aria-label={`Alterar equipe: ${oc.equipe?.nome ?? 'Sem equipe'}`}
                          >
                            {oc.equipe?.nome ?? <span className="text-muted-foreground/40 italic">Sem equipe</span>}
                          </button>
                        )}
                      </div>
                      <div><StatusBadge status={oc.status} /></div>
                      <span className="text-sm text-muted-foreground truncate hidden xl:block">{formatDate(oc.finalized_at)}</span>
                      <span className="text-sm text-muted-foreground truncate hidden xl:block">{oc.gerente_icomon || '—'}</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Paginação */}
        <TablePagination
          page={page} totalPages={totalPages} total={filtered.length}
          pageSize={PAGE_SIZE} onPageChange={setPage}
          className="animate-fade-in-up"
        />

      </div>

      {/* Dialog de importação */}
      <ImportDialog open={showImport} onClose={() => setShowImport(false)} />

      {/* Dialog de Designação */}
      <Dialog open={showDesignacao} onOpenChange={setShowDesignacao}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between w-full pr-8">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Designar Ocorrência
              </div>
              {canDelete && ocorrenciaSelecionada && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50 absolute right-4"
                  onClick={() => { setShowDesignacao(false); setShowExcluir(true); }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {operadorAtual && (
              <div className="bg-muted/50 rounded-lg p-3 flex items-center gap-3">
                <div className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold text-white bg-gradient-to-br from-blue-500 to-blue-600">
                  {operadorAtual.nome.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-medium">Operador Atual</p>
                  <p className="text-xs text-muted-foreground">{operadorAtual.nome}</p>
                </div>
              </div>
            )}
            <div className="space-y-2">
              <label className="text-sm font-medium">Equipe</label>
              <Select value={equipeSelecionada} onValueChange={setEquipeSelecionada}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma equipe" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem equipe</SelectItem>
                  {equipes.filter(e => e.ativa).map(e => (
                    <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {equipeSelecionada && equipeSelecionada !== "none" && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Operador</label>
                <Select value={operadorSelecionado} onValueChange={setOperadorSelecionado}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um operador" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Qualquer operador</SelectItem>
                    {profiles.filter(p => p.equipe_id === equipeSelecionada && p.role === 'operador').map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancelar</Button>
            </DialogClose>
            <Button 
              onClick={() => {
                if (ocorrenciaSelecionada) {
                  const eqId = equipeSelecionada === "none" ? null : equipeSelecionada;
                  const opId = operadorSelecionado === "none" ? null : operadorSelecionado;
                  vincularEquipe(ocorrenciaSelecionada, eqId);
                  designarOperador(ocorrenciaSelecionada, opId);
                  setShowDesignacao(false);
                  setOcorrenciaSelecionada(null);
                  setEquipeSelecionada("");
                  setOperadorSelecionado("");
                }
              }}
              disabled={!ocorrenciaSelecionada}
            >
              <Hand className="h-4 w-4 mr-2" />
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Exclusão */}
      <Dialog open={showExcluir} onOpenChange={setShowExcluir}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="h-5 w-5" />
              Excluir Ocorrência
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              Tem certeza que deseja excluir esta ocorrência? Esta ação não pode ser desfeita.
            </p>
            <div className="flex gap-3 mt-4">
              <DialogClose asChild>
                <Button variant="outline" className="flex-1">Cancelar</Button>
              </DialogClose>
              {canDelete && (
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={() => {
                    if (ocorrenciaSelecionada) {
                      deleteOcorrencia(ocorrenciaSelecionada);
                      setShowExcluir(false);
                      setOcorrenciaSelecionada(null);
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Excluir
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
