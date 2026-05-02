import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useData } from "@/contexts/DataContext";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  FileDown,
  MapPin,
  Users,
  Tag,
  Building,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { usePageTitle } from "@/hooks/usePageTitle";
import html2canvas from "html2canvas-pro";
import { jsPDF } from "jspdf";

export const Route = createFileRoute("/ocorrencias/$id/relatorio")({
  component: RelatorioPage,
});

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string }> = {
    PENDENTE: {
      label: "Pendente",
      color: "bg-amber-100 text-amber-800 border-amber-200",
    },
    EM_ANDAMENTO: {
      label: "Em Andamento",
      color: "bg-blue-100 text-blue-800 border-blue-200",
    },
    FINALIZADA: {
      label: "Finalizada",
      color: "bg-green-100 text-green-800 border-green-200",
    },
  };
  const s = map[status] || {
    label: status,
    color: "bg-gray-100 text-gray-800 border-gray-200",
  };
  return (
    <span
      className={cn(
        "px-3 py-1 rounded-full text-xs font-semibold border",
        s.color,
      )}
    >
      {s.label}
    </span>
  );
}

function RelatorioPage() {
  const { id } = Route.useParams();
  usePageTitle(`Relatório #${id}`);
  const {
    ocorrencias,
    servicos,
    fotosServico,
    fotosFinais,
    loadOcorrenciaDetail,
  } = useData();
  const [detailLoading, setDetailLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    loadOcorrenciaDetail(id).finally(() => {
      if (active) setDetailLoading(false);
    });
    return () => {
      active = false;
    };
  }, [id, loadOcorrenciaDetail]);

  const oc = ocorrencias.find((o) => o.id === id);

  if (!oc && detailLoading)
    return (
      <AppLayout>
        <div className="p-6 text-center text-muted-foreground">
          Carregando relatório...
        </div>
      </AppLayout>
    );

  if (!oc)
    return (
      <AppLayout>
        <div className="p-6 text-center text-muted-foreground">
          Ocorrência não encontrada
        </div>
      </AppLayout>
    );

  const ocServicos = servicos
    .filter((s) => s.ocorrencia_id === oc.id)
    .sort((a, b) => a.ordem - b.ordem);
  const retiradaFios = fotosFinais.filter(
    (f) => f.ocorrencia_id === oc.id && f.categoria === "retirada_fios",
  );
  const ctops = fotosFinais.filter(
    (f) => f.ocorrencia_id === oc.id && f.categoria === "ctop",
  );
  const dataAtual = new Date().toLocaleDateString("pt-BR");

  const isFinalizada = oc.status === "FINALIZADA";

  const downloadPDF = async () => {
    const element = reportRef.current;
    if (!element || downloading || !isFinalizada) return;

    setDownloading(true);
    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: false,
        backgroundColor: "#ffffff",
        logging: false,
        imageTimeout: 15000,
      });

      const imgData = canvas.toDataURL("image/jpeg", 0.95);
      const pdf = new jsPDF({
        unit: "mm",
        format: "a4",
        orientation: "portrait",
      });

      const pageWidth = pdf.internal.pageSize.getWidth(); // 210 mm
      const pageHeight = pdf.internal.pageSize.getHeight(); // 297 mm
      const scaledImgHeight = (canvas.height * pageWidth) / canvas.width;

      let heightLeft = scaledImgHeight;
      let position = 0;

      pdf.addImage(imgData, "JPEG", 0, position, pageWidth, scaledImgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position -= pageHeight;
        pdf.addPage();
        pdf.addImage(imgData, "JPEG", 0, position, pageWidth, scaledImgHeight);
        heightLeft -= pageHeight;
      }

      const dateStr = new Date().toISOString().split("T")[0];
      pdf.save(`relatorio-operacoes-${dateStr}.pdf`);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <AppLayout>
      <div className="min-h-screen bg-white h-full">
        {/* Controles — excluídos da captura do PDF */}
        <div className="sticky top-0 z-10 bg-white border-b p-4 flex items-center justify-between">
          <Link to="/ocorrencias/$id" params={{ id: oc.id }}>
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" /> Voltar
            </Button>
          </Link>
          <div className="flex flex-col items-end gap-1">
            <Button
              size="sm"
              className="gap-2"
              onClick={downloadPDF}
              disabled={downloading || !isFinalizada}
              title={
                !isFinalizada
                  ? "O download só está disponível para ocorrências finalizadas"
                  : undefined
              }
            >
              {downloading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Gerando PDF...
                </>
              ) : (
                <>
                  <FileDown className="h-4 w-4" /> Baixar PDF
                </>
              )}
            </Button>
            {!isFinalizada && (
              <p className="text-[11px] text-muted-foreground">
                Disponível apenas para ocorrências finalizadas
              </p>
            )}
          </div>
        </div>

        {/* Conteúdo capturado para o PDF */}
        <div className="max-w-4xl mx-auto">
          <div ref={reportRef} className="bg-white">
            {/* Cabeçalho */}
            <div className="bg-linear-to-r from-slate-900 to-slate-800 text-white p-8">
              <div className="flex items-start justify-between gap-6">
                <div className="flex-1">
                  <h1 className="text-3xl font-bold mb-2">
                    Relatório de Preventiva — {oc.id_ocorrencia} |{" "}
                    {oc.cabo_primaria || "—"}
                  </h1>
                  <p className="text-slate-300 text-sm">
                    Soluções em Serviços e Inteligência
                  </p>
                </div>
                <div className="flex flex-col items-end gap-4">
                  <img src="/logo-ttc.png" alt="Logo TTC" className="h-16" />
                  <div className="text-right text-xs text-slate-300">
                    <p className="font-semibold text-white">{dataAtual}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Informações gerais */}
            <div className="bg-slate-50 border-b-4 border-slate-900 p-8">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <InfoField icon={Building} label="EMPRESA" value="TTC" />
                <InfoField
                  icon={Tag}
                  label="ID PRIMÁRIA"
                  value={oc.id_ocorrencia}
                />
                <InfoField
                  icon={MapPin}
                  label="MUNICÍPIO"
                  value={oc.municipio}
                />
                <InfoField icon={Tag} label="AT" value={oc.at || "—"} />
                <InfoField
                  icon={Tag}
                  label="CABO/PRIMÁRIA"
                  value={oc.cabo_primaria || "—"}
                />
                <InfoField
                  icon={Building}
                  label="NOME AT"
                  value={oc.nome_at || "—"}
                />
                <InfoField
                  icon={Building}
                  label="CONTRATADA"
                  value={oc.contratada || "—"}
                />
                <InfoField
                  icon={Users}
                  label="EQUIPE"
                  value={oc.equipe?.nome || "—"}
                />
              </div>
            </div>

            {/* Status */}
            <div className="bg-white px-8 py-6 border-b-2 border-slate-300 flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase text-slate-600">
                Status da Ocorrência
              </h2>
              <StatusBadge status={oc.status} />
            </div>

            {/* Serviços Executados */}
            {ocServicos.length > 0 && (
              <div className="bg-white p-8 space-y-8">
                <h2 className="text-2xl font-bold text-slate-900 uppercase border-b-2 border-slate-200 pb-4">
                  Serviços Executados
                </h2>

                {ocServicos.map((sv, idx) => {
                  const svFotos = fotosServico.filter(
                    (f) => f.servico_id === sv.id,
                  );
                  const fotosAntes = svFotos.filter(
                    (f) => f.tipo_foto === "antes",
                  );
                  const fotosDepois = svFotos.filter(
                    (f) => f.tipo_foto === "depois",
                  );

                  return (
                    <div key={sv.id} className="mb-6">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="shrink-0 w-10 h-10 rounded-lg bg-linear-to-br from-blue-600 to-blue-700 flex items-center justify-center text-white font-bold text-sm">
                          {idx + 1}
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-bold text-slate-900">
                            {sv.tipo_servico?.nome}
                          </h3>
                          {sv.observacao && (
                            <p className="text-xs text-slate-600 mt-1">
                              {sv.observacao}
                            </p>
                          )}
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {sv.status_item}
                        </Badge>
                      </div>

                      {/* Antes/Depois sempre na mesma linha, lado a lado */}
                      <div className="grid grid-cols-2 gap-8">
                        <div>
                          <div className="flex items-center gap-2 mb-4">
                            <span className="inline-block h-3 w-3 rounded-full bg-amber-400" />
                            <p className="font-bold text-sm text-slate-900">
                              ANTES
                            </p>
                          </div>
                          {fotosAntes.length === 0 ? (
                            <div className="bg-slate-100 rounded-lg h-48 flex items-center justify-center text-slate-400 text-sm border border-slate-200">
                              Sem fotos registradas
                            </div>
                          ) : (
                            <div className="grid grid-cols-2 gap-3">
                              {fotosAntes.map((f) => (
                                <img
                                  key={f.id}
                                  src={f.url}
                                  alt="Antes"
                                  crossOrigin="anonymous"
                                  className="rounded-lg object-cover border border-slate-200 shadow-sm"
                                  style={{ aspectRatio: "1" }}
                                />
                              ))}
                            </div>
                          )}
                        </div>

                        <div>
                          <div className="flex items-center gap-2 mb-4">
                            <span className="inline-block h-3 w-3 rounded-full bg-green-500" />
                            <p className="font-bold text-sm text-slate-900">
                              DEPOIS
                            </p>
                          </div>
                          {fotosDepois.length === 0 ? (
                            <div className="bg-slate-100 rounded-lg h-48 flex items-center justify-center text-slate-400 text-sm border border-slate-200">
                              Sem fotos registradas
                            </div>
                          ) : (
                            <div className="grid grid-cols-2 gap-3">
                              {fotosDepois.map((f) => (
                                <img
                                  key={f.id}
                                  src={f.url}
                                  alt="Depois"
                                  crossOrigin="anonymous"
                                  className="rounded-lg object-cover border border-slate-200 shadow-sm"
                                  style={{ aspectRatio: "1" }}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Retirada de Fios */}
            {retiradaFios.length > 0 && (
              <div className="bg-slate-50 border-t p-8">
                <h2 className="text-2xl font-bold text-slate-900 uppercase border-b-2 border-slate-200 pb-4 mb-6">
                  Retirada de Fios
                </h2>
                <div className="grid grid-cols-3 gap-6">
                  {retiradaFios.map((f) => (
                    <div
                      key={f.id}
                      className="rounded-lg overflow-hidden border border-slate-200 shadow-sm"
                    >
                      <img
                        src={f.url}
                        alt="Retirada de fios"
                        crossOrigin="anonymous"
                        className="w-full h-48 object-cover"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* CTOPs */}
            {ctops.length > 0 && (
              <div className="bg-white border-t p-8">
                <h2 className="text-2xl font-bold text-slate-900 uppercase border-b-2 border-slate-200 pb-4 mb-6">
                  CTOP's
                </h2>
                <div className="grid grid-cols-3 gap-6">
                  {ctops.map((f) => (
                    <div
                      key={f.id}
                      className="rounded-lg overflow-hidden border border-slate-200 shadow-sm"
                    >
                      <img
                        src={f.url}
                        alt="CTOP"
                        crossOrigin="anonymous"
                        className="w-full h-48 object-cover"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Rodapé */}
            <div className="bg-slate-900 text-slate-300 p-6 text-xs bottom-0 left-0 right-0">
              <p className="text-center">
                Este documento contém informações confidenciais e é destinado
                exclusivamente ao seu destinatário.
              </p>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

function InfoField({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <Icon className="h-4 w-4 text-slate-700" />
        <p className="text-xs font-bold text-slate-600 uppercase">{label}</p>
      </div>
      <p className="font-semibold text-slate-900 text-sm">{value}</p>
    </div>
  );
}
