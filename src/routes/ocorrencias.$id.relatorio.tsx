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
  const pdfContainerRef = useRef<HTMLDivElement>(null);

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

  // Sorted by tipo_servico_id first to group equal services, then by ordem
  const ocServicos = servicos
    .filter((s) => s.ocorrencia_id === oc.id)
    .sort((a, b) => {
      if (a.tipo_servico_id < b.tipo_servico_id) return -1;
      if (a.tipo_servico_id > b.tipo_servico_id) return 1;
      return a.ordem - b.ordem;
    });

  const retiradaFios = fotosFinais.filter(
    (f) => f.ocorrencia_id === oc.id && f.categoria === "retirada_fios",
  );
  const ctops = fotosFinais.filter(
    (f) => f.ocorrencia_id === oc.id && f.categoria === "ctop",
  );
  const dataAtual = new Date().toLocaleDateString("pt-BR");
  const isFinalizada = oc.status === "FINALIZADA";

  // 1 service per page: 520px photos don't allow 2 services per A4 page
  const servicePages = ocServicos.map((sv) => [sv]);
  const hasExtras = retiradaFios.length > 0 || ctops.length > 0;

  const downloadPDF = async () => {
    if (!pdfContainerRef.current || downloading || !isFinalizada) return;
    setDownloading(true);
    try {
      const pageEls = Array.from(
        pdfContainerRef.current.querySelectorAll<HTMLElement>(".pdf-a4-page"),
      );
      if (pageEls.length === 0) return;

      const pdf = new jsPDF({
        unit: "mm",
        format: "a4",
        orientation: "portrait",
      });

      for (let i = 0; i < pageEls.length; i++) {
        const canvas = await html2canvas(pageEls[i], {
          scale: 2,
          useCORS: true,
          allowTaint: false,
          backgroundColor: "#ffffff",
          logging: false,
          imageTimeout: 15000,
        });
        const imgData = canvas.toDataURL("image/jpeg", 0.92);
        if (i > 0) pdf.addPage();
        pdf.addImage(imgData, "JPEG", 0, 0, 210, 297);
      }

      const equipeNome = oc.equipe?.nome ?? "Equipe";
      const caboNome = oc.cabo_primaria ?? "Desconhecido";
      const safeName = `${equipeNome} - ${caboNome}`.replace(/[<>:"/\\|?*\x00-\x1f]/g, "").replace(/\s+/g, " ").trim();
      pdf.save(`${safeName}.pdf`);
    } finally {
      setDownloading(false);
    }
  };

  // PDF render helpers — defined as functions to produce fresh elements each call

  const renderPDFFooter = () => (
    <div
      style={{
        background: "#0f172a",
        color: "#cbd5e1",
        padding: "12px 32px",
        fontSize: 11,
        textAlign: "center",
        flexShrink: 0,
      }}
    >
      Este documento contém informações confidenciais e é destinado
      exclusivamente ao seu destinatário.
    </div>
  );

  const renderPDFExtras = () => (
    <>
      {retiradaFios.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div
            style={{
              fontSize: 15,
              fontWeight: 700,
              textTransform: "uppercase",
              borderBottom: "2px solid #e2e8f0",
              paddingBottom: 10,
              marginBottom: 14,
              color: "#0f172a",
            }}
          >
            Retirada de Fios
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 16,
            }}
          >
            {retiradaFios.map((f) => (
              <div
                key={f.id}
                style={{
                  borderRadius: 8,
                  overflow: "hidden",
                  border: "1px solid #e2e8f0",
                }}
              >
                <img
                  src={f.url}
                  alt="Retirada de fios"
                  crossOrigin="anonymous"
                  style={{ width: "100%", height: 160, objectFit: "cover" }}
                />
              </div>
            ))}
          </div>
        </div>
      )}
      {ctops.length > 0 && (
        <div>
          <div
            style={{
              fontSize: 15,
              fontWeight: 700,
              textTransform: "uppercase",
              borderBottom: "2px solid #e2e8f0",
              paddingBottom: 10,
              marginBottom: 14,
              color: "#0f172a",
            }}
          >
            CTOP's
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 16,
            }}
          >
            {ctops.map((f) => (
              <div
                key={f.id}
                style={{
                  borderRadius: 8,
                  overflow: "hidden",
                  border: "1px solid #e2e8f0",
                }}
              >
                <img
                  src={f.url}
                  alt="CTOP"
                  crossOrigin="anonymous"
                  style={{ width: "100%", height: 160, objectFit: "cover" }}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );

  const renderPDFPageHeader = () => (
    <>
      <div
        style={{
          background: "linear-gradient(to right, #0f172a, #1e293b)",
          color: "white",
          padding: "20px 32px",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 24,
          }}
        >
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>
              Relatório de Preventiva — {oc.id_ocorrencia} |{" "}
              {oc.cabo_primaria || "—"}
            </div>
            <div style={{ color: "#cbd5e1", fontSize: 12 }}>
              Soluções em Serviços e Inteligência
            </div>
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
              gap: 12,
            }}
          >
            <img src="/logo-ttc.png" alt="Logo TTC" style={{ height: 48 }} />
            <div style={{ fontSize: 11, color: "white", fontWeight: 600 }}>
              {dataAtual}
            </div>
          </div>
        </div>
      </div>

      <div
        style={{
          background: "#f8fafc",
          borderBottom: "4px solid #0f172a",
          padding: "16px 32px",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: "14px 20px",
          }}
        >
          {(
            [
              ["EMPRESA", "TTC"],
              ["ID PRIMÁRIA", oc.id_ocorrencia],
              ["MUNICÍPIO", oc.municipio],
              ["AT", oc.at || "—"],
              ["CABO/PRIMÁRIA", oc.cabo_primaria || "—"],
              ["NOME AT", oc.nome_at || "—"],
              ["CONTRATADA", oc.contratada || "—"],
              ["EQUIPE", oc.equipe?.nome || "—"],
            ] as [string, string][]
          ).map(([label, value]) => (
            <div key={label}>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: "#475569",
                  textTransform: "uppercase",
                  marginBottom: 3,
                }}
              >
                {label}
              </div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#0f172a" }}>
                {value}
              </div>
            </div>
          ))}
        </div>
      </div>

    </>
  );

  const renderPDFService = (sv: (typeof ocServicos)[0], globalIdx: number) => {
    const svFotos = fotosServico.filter((f) => f.servico_id === sv.id);
    const fotosAntes = svFotos.filter((f) => f.tipo_foto === "antes");
    const fotosDepois = svFotos.filter((f) => f.tipo_foto === "depois");
    const grupos = [
      { fotos: fotosAntes, label: "ANTES", cor: "#f59e0b" },
      { fotos: fotosDepois, label: "DEPOIS", cor: "#22c55e" },
    ];
    return (
      <div key={sv.id}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 12,
          }}
        >
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 8,
              background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontWeight: 700,
              fontSize: 13,
              flexShrink: 0,
            }}
          >
            {globalIdx + 1}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>
              {sv.tipo_servico?.nome}
            </div>
            {sv.observacao && (
              <div style={{ fontSize: 11, color: "#475569", marginTop: 2 }}>
                {sv.observacao}
              </div>
            )}
          </div>
          <div
            style={{
              fontSize: 10,
              border: "1px solid #e2e8f0",
              borderRadius: 4,
              padding: "2px 8px",
              color: "#64748b",
            }}
          >
            {sv.status_item}
          </div>
        </div>

        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}
        >
          {grupos.map(({ fotos, label, cor }) => (
            <div key={label}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 10,
                }}
              >
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    background: cor,
                    display: "inline-block",
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{ fontSize: 11, fontWeight: 700, color: "#0f172a" }}
                >
                  {label}
                </span>
              </div>
              {fotos.length === 0 ? (
                <div
                  style={{
                    background: "#f1f5f9",
                    borderRadius: 8,
                    height: 100,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#94a3b8",
                    fontSize: 11,
                    border: "1px solid #e2e8f0",
                  }}
                >
                  Sem fotos registradas
                </div>
              ) : (
                <>
                  {fotos.map((f) => (
                    <img
                      key={f.id}
                      src={f.url}
                      alt={label}
                      crossOrigin="anonymous"
                      style={{
                        height: 520,
                        width: "100%",
                        objectFit: "cover",
                        borderRadius: 8,
                        border: "1px solid #e2e8f0",
                      }}
                    />
                  ))}
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <AppLayout>
      <div
        className="min-h-screen bg-white h-full"
        style={{ position: "relative" }}
      >
        {/* Controles — excluídos do PDF */}
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

        {/* Relatório visível (para leitura em tela) */}
        <div className="max-w-4xl mx-auto">
          <div className="bg-white">
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

                      {/* Antes/Depois lado a lado */}
                      <div className="grid grid-cols-2 gap-8">
                        {(["antes", "depois"] as const).map((tipo) => {
                          const fotos =
                            tipo === "antes" ? fotosAntes : fotosDepois;
                          return (
                            <div key={tipo}>
                              <div className="flex items-center gap-2 mb-4">
                                <span
                                  className={cn(
                                    "inline-block h-3 w-3 rounded-full",
                                    tipo === "antes"
                                      ? "bg-amber-400"
                                      : "bg-green-500",
                                  )}
                                />
                                <p className="font-bold text-sm text-slate-900">
                                  {tipo === "antes" ? "ANTES" : "DEPOIS"}
                                </p>
                              </div>
                              {fotos.length === 0 ? (
                                <div className="bg-slate-100 rounded-lg h-48 flex items-center justify-center text-slate-400 text-sm border border-slate-200">
                                  Sem fotos registradas
                                </div>
                              ) : (
                                <div className="grid gap-3">
                                  {fotos.map((f) => (
                                    <img
                                      key={f.id}
                                      src={f.url}
                                      alt={
                                        tipo === "antes" ? "Antes" : "Depois"
                                      }
                                      crossOrigin="anonymous"
                                      className="rounded-lg object-cover border border-slate-200 shadow-sm w-full"
                                      style={{ height: "520px" }}
                                    />
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
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
            <div className="bg-slate-900 text-slate-300 p-6 text-xs">
              <p className="text-center">
                Este documento contém informações confidenciais e é destinado
                exclusivamente ao seu destinatário.
              </p>
            </div>
          </div>
        </div>

        {/* Páginas A4 ocultas — usadas exclusivamente para geração do PDF */}
        {isFinalizada && (
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              left: "-99999px",
              top: 0,
              pointerEvents: "none",
            }}
          >
            <div ref={pdfContainerRef}>
              {/* Página 1: cabeçalho + 1 serviço (ou extras se não houver serviços) */}
              <div
                className="pdf-a4-page"
                style={{
                  width: 794,
                  height: 1122,
                  background: "white",
                  display: "flex",
                  flexDirection: "column",
                  overflow: "hidden",
                }}
              >
                {renderPDFPageHeader()}
                <div
                  style={{
                    flex: 1,
                    padding: "16px 32px 0",
                    overflow: "hidden",
                  }}
                >
                  {servicePages.length > 0 ? (
                    <>
                      <div
                        style={{
                          fontSize: 15,
                          fontWeight: 700,
                          textTransform: "uppercase",
                          borderBottom: "2px solid #e2e8f0",
                          paddingBottom: 10,
                          marginBottom: 16,
                          color: "#0f172a",
                        }}
                      >
                        Serviços Executados
                      </div>
                      {renderPDFService(servicePages[0][0], 0)}
                    </>
                  ) : hasExtras ? (
                    renderPDFExtras()
                  ) : null}
                </div>
                {renderPDFFooter()}
              </div>

              {/* Páginas 2+: 1 serviço por página */}
              {servicePages.slice(1).map((pageServices, pi) => {
                const startIdx = pi + 1;
                return (
                  <div
                    key={pi}
                    className="pdf-a4-page"
                    style={{
                      width: 794,
                      height: 1122,
                      background: "white",
                      display: "flex",
                      flexDirection: "column",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        flex: 1,
                        padding: "24px 32px 0",
                        overflow: "hidden",
                        display: "flex",
                        flexDirection: "column",
                        gap: 20,
                      }}
                    >
                      {pageServices.map((sv, i) =>
                        renderPDFService(sv, startIdx + i),
                      )}
                    </div>
                    {renderPDFFooter()}
                  </div>
                );
              })}

              {/* Página de extras: retirada de fios + CTOPs */}
              {servicePages.length > 0 && hasExtras && (
                <div
                  className="pdf-a4-page"
                  style={{
                    width: 794,
                    height: 1122,
                    background: "white",
                    display: "flex",
                    flexDirection: "column",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      flex: 1,
                      padding: "24px 32px 0",
                      overflow: "hidden",
                    }}
                  >
                    {renderPDFExtras()}
                  </div>
                  {renderPDFFooter()}
                </div>
              )}
            </div>
          </div>
        )}
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
