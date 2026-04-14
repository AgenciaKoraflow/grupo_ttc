import { createFileRoute } from "@tanstack/react-router";
import { useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useData } from "@/contexts/DataContext";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Upload, FileUp, CheckCircle, AlertCircle, MinusCircle } from "lucide-react";

export const Route = createFileRoute("/importar-csv")({
  component: ImportarCSVPage,
});

interface ParsedRow {
  line: number;
  municipio: string;
  cabo_primaria: string;
  at: string;
  contratada: string;
  id_ocorrencia: string;
  status: 'ok' | 'duplicate' | 'error';
  message: string;
}

function normalize(str: string): string {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().trim();
}

const EXPECTED_HEADERS: Record<string, string> = {
  'MUNICIPIO': 'municipio',
  'CABO/PRIMARIA': 'cabo_primaria',
  'AT': 'at',
  'CONTRATADA': 'contratada',
  'ID_OCORRENCIA': 'id_ocorrencia',
};

function ImportarCSVPage() {
  const { user } = useAuth();
  const { ocorrencias, addOcorrencias } = useData();
  const [parsed, setParsed] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState('');
  const [imported, setImported] = useState(false);
  const [importResult, setImportResult] = useState<{ total: number; imported: number; ignored: number; errors: number } | null>(null);

  const handleFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setImported(false);
    setImportResult(null);

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const lines = text.split(/\r?\n/).filter(l => l.trim());
      if (lines.length < 2) { setParsed([]); return; }

      const headerLine = lines[0];
      const headers = headerLine.split(';').map(h => h.replace(/"/g, '').trim());
      const normalizedHeaders = headers.map(h => normalize(h));

      const headerMap: Record<number, string> = {};
      normalizedHeaders.forEach((nh, idx) => {
        for (const [expected, field] of Object.entries(EXPECTED_HEADERS)) {
          if (nh === expected || nh.replace(/\//g, '/') === expected) {
            headerMap[idx] = field;
          }
        }
      });

      const existingIds = new Set(ocorrencias.map(o => o.id_ocorrencia));
      const seenIds = new Set<string>();
      const rows: ParsedRow[] = [];

      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(';').map(c => c.replace(/"/g, '').trim());
        const row: Record<string, string> = {};
        Object.entries(headerMap).forEach(([idx, field]) => {
          row[field] = cols[Number(idx)] || '';
        });

        const id_oc = row.id_ocorrencia || '';
        let status: 'ok' | 'duplicate' | 'error' = 'ok';
        let message = '';

        if (!id_oc) {
          status = 'error';
          message = 'ID_OCORRENCIA vazio';
        } else if (existingIds.has(id_oc) || seenIds.has(id_oc)) {
          status = 'duplicate';
          message = 'ID duplicado';
        } else {
          seenIds.add(id_oc);
        }

        rows.push({
          line: i + 1,
          municipio: row.municipio || '',
          cabo_primaria: row.cabo_primaria || '',
          at: row.at || '',
          contratada: row.contratada || '',
          id_ocorrencia: id_oc,
          status,
          message,
        });
      }
      setParsed(rows);
    };
    reader.readAsText(file, 'UTF-8');
  }, [ocorrencias]);

  const handleImport = () => {
    const valid = parsed.filter(r => r.status === 'ok');
    const count = addOcorrencias(valid.map(r => ({
      id_ocorrencia: r.id_ocorrencia,
      municipio: r.municipio,
      cabo_primaria: r.cabo_primaria || null,
      at: r.at || null,
      contratada: r.contratada || null,
    })));

    setImportResult({
      total: parsed.length,
      imported: count,
      ignored: parsed.filter(r => r.status === 'duplicate').length,
      errors: parsed.filter(r => r.status === 'error').length,
    });
    setImported(true);
  };

  const okCount = parsed.filter(r => r.status === 'ok').length;
  const dupCount = parsed.filter(r => r.status === 'duplicate').length;
  const errCount = parsed.filter(r => r.status === 'error').length;

  return (
    <AppLayout>
      <div className="p-6 space-y-6 max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold tracking-tight">Importar CSV</h1>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Upload do arquivo</CardTitle>
            <CardDescription>
              Formato esperado: MUNICIPIO;CABO/PRIMÁRIA;AT;CONTRATADA;ID_OCORRENCIA (separado por ;)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <label className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-8 cursor-pointer hover:bg-accent/30 transition-colors">
              <FileUp className="h-10 w-10 text-muted-foreground mb-3" />
              <span className="text-sm font-medium">{fileName || 'Clique para selecionar o CSV'}</span>
              <span className="text-xs text-muted-foreground mt-1">Arquivo .csv com separador ;</span>
              <input type="file" accept=".csv,.txt" className="hidden" onChange={handleFile} />
            </label>
          </CardContent>
        </Card>

        {parsed.length > 0 && (
          <>
            <div className="flex items-center gap-4 flex-wrap">
              <Badge variant="secondary" className="gap-1">
                <CheckCircle className="h-3 w-3" /> {okCount} válidas
              </Badge>
              <Badge variant="outline" className="gap-1 text-warning-foreground">
                <MinusCircle className="h-3 w-3" /> {dupCount} duplicadas
              </Badge>
              <Badge variant="outline" className="gap-1 text-destructive">
                <AlertCircle className="h-3 w-3" /> {errCount} erros
              </Badge>
              {!imported && (
                <Button onClick={handleImport} disabled={okCount === 0} className="ml-auto gap-1">
                  <Upload className="h-4 w-4" /> Confirmar Importação ({okCount})
                </Button>
              )}
            </div>

            {importResult && (
              <Card className="border-success/30 bg-success/5">
                <CardContent className="pt-5">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="h-5 w-5 text-success" />
                    <span className="font-semibold">Importação concluída</span>
                  </div>
                  <div className="grid grid-cols-4 gap-4 text-sm">
                    <div><span className="text-muted-foreground">Total:</span> <strong>{importResult.total}</strong></div>
                    <div><span className="text-muted-foreground">Importadas:</span> <strong>{importResult.imported}</strong></div>
                    <div><span className="text-muted-foreground">Ignoradas:</span> <strong>{importResult.ignored}</strong></div>
                    <div><span className="text-muted-foreground">Erros:</span> <strong>{importResult.errors}</strong></div>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="border rounded-lg overflow-hidden bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[60px]">Linha</TableHead>
                    <TableHead>ID Ocorrência</TableHead>
                    <TableHead>Município</TableHead>
                    <TableHead className="hidden md:table-cell">Cabo/Primária</TableHead>
                    <TableHead className="hidden md:table-cell">Contratada</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsed.map((row) => (
                    <TableRow key={row.line} className={row.status === 'error' ? 'bg-destructive/5' : row.status === 'duplicate' ? 'bg-warning/5' : ''}>
                      <TableCell className="text-muted-foreground">{row.line}</TableCell>
                      <TableCell className="font-medium">{row.id_ocorrencia || '—'}</TableCell>
                      <TableCell>{row.municipio}</TableCell>
                      <TableCell className="hidden md:table-cell">{row.cabo_primaria || '—'}</TableCell>
                      <TableCell className="hidden md:table-cell">{row.contratada || '—'}</TableCell>
                      <TableCell>
                        {row.status === 'ok' && <Badge variant="secondary" className="text-xs">OK</Badge>}
                        {row.status === 'duplicate' && <Badge variant="outline" className="text-xs text-warning-foreground">{row.message}</Badge>}
                        {row.status === 'error' && <Badge variant="destructive" className="text-xs">{row.message}</Badge>}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}
