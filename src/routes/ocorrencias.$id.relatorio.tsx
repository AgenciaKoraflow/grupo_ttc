import { createFileRoute, Link } from "@tanstack/react-router";
import { useData } from "@/contexts/DataContext";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Printer } from "lucide-react";

export const Route = createFileRoute("/ocorrencias/$id/relatorio")({
  component: RelatorioPage,
});

function RelatorioPage() {
  const { id } = Route.useParams();
  const { ocorrencias, servicos, fotosServico, fotosFinais } = useData();

  const oc = ocorrencias.find(o => o.id === id);
  if (!oc) return (
    <AppLayout>
      <div className="p-6 text-center text-muted-foreground">Ocorrência não encontrada</div>
    </AppLayout>
  );

  const ocServicos = servicos.filter(s => s.ocorrencia_id === oc.id).sort((a, b) => a.ordem - b.ordem);
  const retiradaFios = fotosFinais.filter(f => f.ocorrencia_id === oc.id && f.categoria === 'retirada_fios');
  const ctops = fotosFinais.filter(f => f.ocorrencia_id === oc.id && f.categoria === 'ctop');

  return (
    <AppLayout>
      <div className="p-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6 no-print">
          <Link to="/ocorrencias/$id" params={{ id: oc.id }}>
            <Button variant="ghost" size="sm" className="gap-1"><ArrowLeft className="h-4 w-4" /> Voltar</Button>
          </Link>
          <Button size="sm" className="gap-1" onClick={() => window.print()}>
            <Printer className="h-4 w-4" /> Imprimir / PDF
          </Button>
        </div>

        {/* Print-friendly report */}
        <div className="bg-card border rounded-lg p-8 space-y-8 print:border-0 print:shadow-none print:p-0">
          {/* Header */}
          <div className="border-b pb-6">
            <h1 className="text-xl font-bold mb-4">Relatório de Preventiva</h1>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <div><span className="text-muted-foreground">ID Ocorrência:</span> <strong>{oc.id_ocorrencia}</strong></div>
              <div><span className="text-muted-foreground">Município:</span> <strong>{oc.municipio}</strong></div>
              <div><span className="text-muted-foreground">Cabo/Primária:</span> <strong>{oc.cabo_primaria || '—'}</strong></div>
              <div><span className="text-muted-foreground">AT:</span> <strong>{oc.at || '—'}</strong></div>
              <div><span className="text-muted-foreground">Contratada:</span> <strong>{oc.contratada || '—'}</strong></div>
              <div><span className="text-muted-foreground">Equipe:</span> <strong>{oc.equipe?.nome || '—'}</strong></div>
              <div><span className="text-muted-foreground">Status:</span> <strong>{oc.status}</strong></div>
            </div>
          </div>

          {/* Serviços */}
          <div className="space-y-6">
            <h2 className="text-lg font-bold">Serviços Executados</h2>
            {ocServicos.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">Nenhum serviço registrado</p>
            ) : (
              ocServicos.map((sv, idx) => {
                const svFotos = fotosServico.filter(f => f.servico_id === sv.id);
                const fotosAntes = svFotos.filter(f => f.tipo_foto === 'antes');
                const fotosDepois = svFotos.filter(f => f.tipo_foto === 'depois');
                return (
                  <div key={sv.id} className="border rounded-lg p-5 space-y-4 print:break-inside-avoid">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Serviço #{idx + 1}</p>
                        <p className="font-semibold text-sm">{sv.tipo_servico?.nome}</p>
                        {sv.observacao && <p className="text-xs text-muted-foreground mt-1">{sv.observacao}</p>}
                      </div>
                      <Badge variant="secondary" className="text-xs shrink-0">{sv.status_item}</Badge>
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-2">Antes</p>
                        <div className="flex flex-wrap gap-2">
                          {fotosAntes.length === 0 ? (
                            <p className="text-xs text-muted-foreground italic">Sem fotos</p>
                          ) : fotosAntes.map(f => (
                            <img key={f.id} src={f.url} alt="Antes" className="h-32 w-32 rounded-md object-cover border print:h-24 print:w-24" />
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-2">Depois</p>
                        <div className="flex flex-wrap gap-2">
                          {fotosDepois.length === 0 ? (
                            <p className="text-xs text-muted-foreground italic">Sem fotos</p>
                          ) : fotosDepois.map(f => (
                            <img key={f.id} src={f.url} alt="Depois" className="h-32 w-32 rounded-md object-cover border print:h-24 print:w-24" />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Retirada de fios */}
          <div className="space-y-3 print-break">
            <h2 className="text-lg font-bold">Retirada de Fios</h2>
            {retiradaFios.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">Nenhuma foto registrada</p>
            ) : (
              <div className="flex flex-wrap gap-3">
                {retiradaFios.map(f => (
                  <img key={f.id} src={f.url} alt="Retirada de fios" className="h-40 w-40 rounded-md object-cover border print:h-28 print:w-28" />
                ))}
              </div>
            )}
          </div>

          {/* CTOPs */}
          <div className="space-y-3">
            <h2 className="text-lg font-bold">CTOPs</h2>
            {ctops.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">Nenhuma foto registrada</p>
            ) : (
              <div className="flex flex-wrap gap-3">
                {ctops.map(f => (
                  <img key={f.id} src={f.url} alt="CTOP" className="h-40 w-40 rounded-md object-cover border print:h-28 print:w-28" />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
