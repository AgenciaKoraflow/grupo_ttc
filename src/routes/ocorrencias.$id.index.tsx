import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useRef, useCallback, useEffect } from "react";
import { toast } from "sonner";
import { getSignedUrl } from "@/lib/storage";
import { useAuth } from "@/contexts/AuthContext";
import { useData } from "@/contexts/DataContext";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft,
  Plus,
  Trash2,
  CheckCircle,
  RefreshCw,
  FileText,
  Upload,
  Camera,
  X,
  MapPin,
  Cable,
  Tag,
  Building,
  Users,
  Package,
  Check,
  ChevronsUpDown,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { OcorrenciaStatus } from "@/types";
import { usePageTitle } from "@/hooks/usePageTitle";

export const Route = createFileRoute("/ocorrencias/$id/")({
  component: OcorrenciaDetailPage,
});

function compressImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) return Promise.resolve(file);
  return new Promise((resolve) => {
    const img = new Image();
    const objUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objUrl);
      const MAX_PX = 1920;
      let { width, height } = img;
      if (width <= MAX_PX && height <= MAX_PX && file.size < 500_000) {
        resolve(file);
        return;
      }
      if (width > MAX_PX || height > MAX_PX) {
        const ratio = Math.min(MAX_PX / width, MAX_PX / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) =>
          resolve(
            blob
              ? new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), {
                type: "image/jpeg",
              })
              : file,
          ),
        "image/jpeg",
        0.82,
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(objUrl);
      resolve(file);
    };
    img.src = objUrl;
  });
}

function StatusBadge({ status }: { status: OcorrenciaStatus }) {
  const map = {
    PENDENTE: { label: "Pendente", cls: "status-pendente" },
    EM_ANDAMENTO: { label: "Em Andamento", cls: "status-em-andamento" },
    FINALIZADA: { label: "Finalizada", cls: "status-finalizada" },
  };
  const s = map[status];
  return (
    <Badge variant="outline" className={cn(s.cls, "font-semibold text-[11px]")}>
      {s.label}
    </Badge>
  );
}

function InfoItem({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: React.ReactNode;
  icon?: React.ElementType;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5">
        {Icon && <Icon className="h-3 w-3 text-muted-foreground/60" />}
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
      </div>
      <div className="text-sm font-medium text-foreground">{value}</div>
    </div>
  );
}

function OcorrenciaDetailPage() {
  const { id } = Route.useParams();
  usePageTitle(`Ocorrência #${id}`);
  const { user, isAdmin, isSupervisor, canDelete, canEdit, canReopen } =
    useAuth();
  const isAdminOrSupervisor = isAdmin || isSupervisor;
  const {
    ocorrencias,
    equipes,
    tiposServico,
    servicos,
    fotosServico,
    fotosFinais,
    materials,
    ocorrenciaMateriais,
    addOcorrenciaMaterial,
    removeOcorrenciaMaterial,
    vincularEquipe,
    addServico,
    deleteServico,
    addFotoServico,
    deleteFotoServico,
    addFotoFinal,
    deleteFotoFinal,
    finalizarOcorrencia,
    reabrirOcorrencia,
    deleteOcorrencia,
    loadOcorrenciaDetail,
  } = useData();
  const navigate = useNavigate();
  const [detailLoading, setDetailLoading] = useState(true);
  const [showServicoDialog, setShowServicoDialog] = useState(false);

  useEffect(() => {
    let active = true;
    setDetailLoading(true);
    loadOcorrenciaDetail(id).finally(() => {
      if (active) setDetailLoading(false);
    });
    return () => {
      active = false;
    };
  }, [id, loadOcorrenciaDetail]);
  const [showFinalizar, setShowFinalizar] = useState(false);
  const [showExcluir, setShowExcluir] = useState(false);
  const [novoTipoId, setNovoTipoId] = useState("");
  const [alertaFoto, setAlertaFoto] = useState<{
    tipo: string;
    servicoId: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [allowMultiple, setAllowMultiple] = useState(false);
  const [fotoContext, setFotoContext] = useState<{
    servicoId: string;
    tipo: "antes" | "depois";
    isFinal?: boolean;
    categoria?: "retirada_fios" | "ctop";
  } | null>(null);
  const [fotoZoom, setFotoZoom] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [urlOverrides, setUrlOverrides] = useState<Record<string, string>>({});
  const refreshingIds = useRef(new Set<string>());
  const [pendingPreview, setPendingPreview] = useState<{
    key: string;
    url: string;
  } | null>(null);
  const [matComboOpen, setMatComboOpen] = useState(false);
  const [matSearch, setMatSearch] = useState("");
  const [newMatId, setNewMatId] = useState("");
  const [newMatQty, setNewMatQty] = useState("");

  const handleImgError = useCallback(
    async (id: string, bucket: string, path: string) => {
      if (!path || refreshingIds.current.has(id)) return;
      refreshingIds.current.add(id);
      const url = await getSignedUrl(bucket, path);
      if (url) setUrlOverrides((prev) => ({ ...prev, [id]: url }));
    },
    [],
  );

  const oc = ocorrencias.find((o) => o.id === id);

  if (!oc && detailLoading)
    return (
      <AppLayout>
        <div className="p-6 max-w-5xl mx-auto space-y-5">
          <div className="flex items-center gap-3 animate-pulse">
            <div className="h-9 w-9 rounded-xl bg-muted" />
            <div className="h-6 w-48 rounded-lg bg-muted" />
            <div className="h-5 w-20 rounded-full bg-muted" />
          </div>
          <div className="rounded-2xl border border-border/60 bg-card p-5 animate-pulse">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <div className="h-3 w-16 rounded bg-muted" />
                  <div className="h-4 w-24 rounded bg-muted" />
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-border/60 bg-card p-5 space-y-3 animate-pulse">
            <div className="h-5 w-40 rounded bg-muted" />
            <div className="h-24 w-full rounded-xl bg-muted" />
          </div>
        </div>
      </AppLayout>
    );

  if (!oc)
    return (
      <AppLayout>
        <div className="p-6 text-center py-20" role="status">
          <FileText
            className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3"
            aria-hidden="true"
          />
          <p className="text-muted-foreground font-medium">
            Ocorrência não encontrada
          </p>
          <Link
            to="/ocorrencias"
            className="text-primary text-sm mt-2 inline-block hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
          >
            ← Voltar para lista
          </Link>
        </div>
      </AppLayout>
    );

  const ocServicos = servicos
    .filter((s) => s.ocorrencia_id === oc.id)
    .sort((a, b) => {
      if (a.tipo_servico_id < b.tipo_servico_id) return -1;
      if (a.tipo_servico_id > b.tipo_servico_id) return 1;
      return a.ordem - b.ordem;
    });
  const ocMateriais = ocorrenciaMateriais.filter(
    (om) => om.ocorrencia_id === oc.id,
  );
  const activeMaterials = materials.filter((m) => m.ativo);
  const matSearchLower = matSearch.toLowerCase();
  const filteredMaterials = activeMaterials.filter((m) =>
    m.name.toLowerCase().includes(matSearchLower),
  );

  const handleAddMaterial = () => {
    if (!newMatId || !newMatQty || Number(newMatQty) <= 0) return;
    addOcorrenciaMaterial({
      ocorrencia_id: oc.id,
      material_id: newMatId,
      quantity: Number(newMatQty),
    });
    setNewMatId("");
    setNewMatQty("");
    setMatSearch("");
  };

  const selectedMaterial = materials.find((m) => m.id === newMatId);
  const ocFotosFinais = fotosFinais.filter((f) => f.ocorrencia_id === oc.id);
  const retiradaFios = ocFotosFinais.filter(
    (f) => f.categoria === "retirada_fios",
  );
  const ctops = ocFotosFinais.filter((f) => f.categoria === "ctop");
  const isFinalizada = oc.status === "FINALIZADA";
  const canEditOcorrencia = canEdit && (!isFinalizada || isAdminOrSupervisor);

  const handleAddServico = () => {
    if (!novoTipoId) return;
    addServico({
      ocorrencia_id: oc.id,
      tipo_servico_id: novoTipoId,
      observacao: null,
      ordem: ocServicos.length + 1,
      created_by: user?.id,
    });
    setNovoTipoId("");
    setShowServicoDialog(false);
  };

  const prepareImageFile = async (file: File): Promise<File> => {
    const isHeic =
      file.type === "image/heif" ||
      file.type === "image/heic" ||
      file.name.toLowerCase().endsWith(".heif") ||
      file.name.toLowerCase().endsWith(".heic");
    let workFile = file;
    if (isHeic) {
      try {
        const { default: heic2any } = await import("heic2any");
        const result = await heic2any({ blob: file, toType: "image/jpeg" });
        const outBlob = Array.isArray(result) ? result[0] : result;
        workFile = new File(
          [outBlob],
          file.name.replace(/\.hei[cf]$/i, ".jpg"),
          { type: "image/jpeg" },
        );
      } catch {
        /* use original on failure */
      }
    }
    return compressImage(workFile);
  };

  const getFotoUrl = (id: string, fallback: string | undefined) =>
    urlOverrides[id] ?? fallback;

  const handleZoomFoto = (url: string) => setFotoZoom(url);

  const handleFotoUpload = (servicoId: string, tipo: "antes" | "depois") => {
    setAllowMultiple(false);
    setFotoContext({ servicoId, tipo, isFinal: false });
    fileInputRef.current?.click();
  };

  const handleFotoFinalUploadClick = (categoria: "retirada_fios" | "ctop") => {
    setAllowMultiple(true);
    setFotoContext({ servicoId: "", tipo: "antes", categoria, isFinal: true });
    fileInputRef.current?.click();
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !fotoContext) return;

    // Multi-file upload path (only for final photos with multiple selections)
    if (fotoContext.isFinal && files.length > 1) {
      setUploading(true);
      const ordemBase = ocFotosFinais.filter(
        (f) => f.categoria === fotoContext.categoria,
      ).length;
      try {
        for (let i = 0; i < files.length; i++) {
          const processedFile = await prepareImageFile(files[i]);
          await addFotoFinal(processedFile, {
            ocorrencia_id: oc.id,
            categoria: fotoContext.categoria as "retirada_fios" | "ctop",
            ordem: ordemBase + 1 + i,
          });
        }
      } catch (error) {
        console.error("Erro ao fazer upload das fotos:", error);
        toast.error("Falha no upload", {
          description: "Verifique sua conexão e tente novamente.",
        });
      } finally {
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
        setFotoContext(null);
      }
      return;
    }

    const file = files[0];
    if (!file) return;

    const previewKey = fotoContext.isFinal
      ? `final-${fotoContext.categoria}`
      : `${fotoContext.servicoId}-${fotoContext.tipo}`;
    const previewUrl = URL.createObjectURL(file);
    setPendingPreview({ key: previewKey, url: previewUrl });

    setUploading(true);
    try {
      const processedFile = await prepareImageFile(file);

      if (fotoContext.isFinal) {
        const existing = ocFotosFinais.filter(
          (f) => f.categoria === fotoContext.categoria,
        );
        await addFotoFinal(processedFile, {
          ocorrencia_id: oc.id,
          categoria: fotoContext.categoria as "retirada_fios" | "ctop",
          ordem: existing.length + 1,
        });
      } else {
        const existing = fotosServico.filter(
          (f) =>
            f.servico_id === fotoContext.servicoId &&
            f.tipo_foto === fotoContext.tipo,
        );
        await addFotoServico(processedFile, {
          servico_id: fotoContext.servicoId,
          tipo_foto: fotoContext.tipo,
          ordem: existing.length + 1,
        });
      }
    } catch (error) {
      console.error("Erro ao fazer upload da foto:", error);
      toast.error("Falha no upload", {
        description: "Verifique sua conexão e tente novamente.",
      });
    } finally {
      setUploading(false);
      URL.revokeObjectURL(previewUrl);
      setPendingPreview(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setFotoContext(null);
    }
  };

  const finalizarValidation =
    ocServicos.length > 0
      ? ocServicos.map((sv) => {
        const fotos = fotosServico.filter((f) => f.servico_id === sv.id);
        const hasAntes = fotos.some((f) => f.tipo_foto === "antes");
        const hasDepois = fotos.some((f) => f.tipo_foto === "depois");
        return {
          servico: sv,
          hasAntes,
          hasDepois,
          isComplete: hasAntes && hasDepois,
        };
      })
      : [];

  const canFinalizar =
    finalizarValidation.every((v) => v.isComplete) &&
    finalizarValidation.length > 0;

  const handleFinalizar = async () => {
    if (!user) return;
    try {
      await finalizarOcorrencia(oc.id, user.id);
      setShowFinalizar(false);
      toast.success("Ocorrência finalizada com sucesso");
    } catch {
      toast.error("Erro ao finalizar ocorrência", {
        description: "Verifique sua conexão e tente novamente.",
      });
    }
  };

  return (
    <AppLayout>
      <div className="p-4 md:p-6 space-y-5 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex flex-wrap items-center gap-3 animate-fade-in">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-xl hover:bg-accent"
            onClick={() => navigate({ to: "/ocorrencias" })}
            aria-label="Voltar para lista de ocorrências"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          </Button>
          <div className="flex-1 min-w-0 flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-bold text-foreground">
              {oc.id_ocorrencia}
            </h1>
            <StatusBadge status={oc.status} />
          </div>
          <div className="flex flex-wrap gap-2">
            {isAdminOrSupervisor && (
              <Link to="/ocorrencias/$id/relatorio" params={{ id: oc.id }}>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 h-9 font-medium"
                  aria-label="Ver relatório da ocorrência"
                >
                  <FileText className="h-4 w-4" aria-hidden="true" />{" "}
                  <span className="hidden sm:inline">Relatório</span>
                </Button>
              </Link>
            )}
            {isFinalizada &&
              canReopen &&
              (isAdminOrSupervisor || user?.equipe_id === oc.equipe_id) && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 h-9 font-medium"
                  onClick={async () => {
                    try {
                      await reabrirOcorrencia(oc.id, user?.id || "sistema");
                      toast.success("Ocorrência reaberta com sucesso");
                    } catch {
                      toast.error("Erro ao reabrir ocorrência", {
                        description: "Verifique sua conexão e tente novamente.",
                      });
                    }
                  }}
                  aria-label="Reabrir ocorrência"
                >
                  <RefreshCw className="h-4 w-4" aria-hidden="true" />{" "}
                  <span className="hidden sm:inline">Reabrir</span>
                </Button>
              )}
            {canDelete && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 h-9 font-medium text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={() => setShowExcluir(true)}
                aria-label="Excluir ocorrência"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />{" "}
                <span className="hidden sm:inline">Excluir</span>
              </Button>
            )}
          </div>
        </div>

        {/* Info card */}
        <div
          className="rounded-2xl border border-border/60 bg-card p-4 md:p-5 animate-fade-in-up"
          style={{
            boxShadow:
              "0 1px 3px oklch(0.115 0.028 252 / 0.06), 0 4px 12px oklch(0.115 0.028 252 / 0.04)",
          }}
        >
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 md:gap-5">
            <InfoItem label="Município" value={oc.municipio} icon={MapPin} />
            <InfoItem
              label="Cabo/Primária"
              value={oc.cabo_primaria || "—"}
              icon={Cable}
            />
            <InfoItem label="AT" value={oc.at || "—"} icon={Tag} />
            <InfoItem label="Nome AT" value={oc.nome_at || "—"} icon={Tag} />
            <InfoItem
              label="Contratada"
              value={oc.contratada || "—"}
              icon={Building}
            />
            <InfoItem
              label="Gerente"
              value={oc.operador_id || "—"}
              icon={Users}
            />
            <div className="space-y-1">
              <div className="flex items-center gap-1.5">
                <Building className="h-3 w-3 text-muted-foreground/60" />
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Equipe
                </p>
              </div>
              {isAdminOrSupervisor && !isFinalizada ? (
                <Select
                  value={oc.equipe_id || ""}
                  onValueChange={(v) => vincularEquipe(oc.id, v)}
                >
                  <SelectTrigger className="h-8 text-xs border-border/70">
                    <SelectValue placeholder="Selecionar" />
                  </SelectTrigger>
                  <SelectContent>
                    {equipes
                      .filter((e) => e.ativa)
                      .map((e) => (
                        <SelectItem key={e.id} value={e.id}>
                          {e.nome}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-sm font-medium text-foreground">
                  {oc.equipe?.nome || "Sem equipe"}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Serviços */}
        <div className="space-y-3 animate-fade-in-up delay-75">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-foreground">
              Serviços Executados
            </h2>
            <span
              className="text-xs font-bold px-1.5 py-0.5 rounded-md"
              style={{
                background: "oklch(0.50 0.225 255 / 0.12)",
                color: "oklch(0.42 0.18 255)",
              }}
            >
              {ocServicos.length}
            </span>
          </div>

          {detailLoading ? (
            <div className="space-y-3 animate-pulse">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="rounded-2xl border border-border/60 bg-card overflow-hidden"
                >
                  <div
                    className="px-5 py-3.5 border-b border-border/50 flex items-center gap-3"
                    style={{ background: "oklch(0.972 0.004 245 / 0.5)" }}
                  >
                    <div className="h-7 w-7 rounded-lg bg-muted" />
                    <div className="h-4 w-32 rounded bg-muted" />
                  </div>
                  <div className="p-5 grid md:grid-cols-2 gap-5">
                    {[0, 1].map((j) => (
                      <div key={j} className="space-y-3">
                        <div className="h-3 w-20 rounded bg-muted" />
                        <div className="h-20 w-full rounded-xl bg-muted" />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : ocServicos.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card py-12 text-center">
              <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center mx-auto mb-3">
                <Plus className="h-5 w-5 text-muted-foreground/50" />
              </div>
              <p className="text-sm text-muted-foreground font-medium">
                Nenhum serviço cadastrado
              </p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                Adicione serviços executados nesta ocorrência
              </p>
            </div>
          ) : (
            <div className="space-y-3">
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
                  <div
                    key={sv.id}
                    className="rounded-2xl border border-border/60 bg-card overflow-hidden"
                    style={{
                      boxShadow: "0 1px 3px oklch(0.115 0.028 252 / 0.05)",
                    }}
                  >
                    {/* Cabeçalho do serviço */}
                    <div
                      className="flex items-center justify-between px-4 md:px-5 py-3.5 border-b border-border/50"
                      style={{ background: "oklch(0.972 0.004 245 / 0.5)" }}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className="h-7 w-7 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0"
                          style={{
                            background:
                              "linear-gradient(135deg, oklch(0.50 0.225 255), oklch(0.44 0.245 272))",
                          }}
                        >
                          {idx + 1}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-foreground">
                            {sv.tipo_servico?.nome}
                          </p>
                          {sv.observacao && (
                            <p className="text-xs text-muted-foreground mt-0.5 truncate">
                              {sv.observacao}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant="secondary" className="text-xs">
                          {sv.status_item}
                        </Badge>
                        {canEditOcorrencia && !isFinalizada && (
                          <button
                            onClick={() => deleteServico(sv.id)}
                            aria-label={`Remover serviço: ${sv.tipo_servico?.nome}`}
                            className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            <Trash2
                              className="h-3.5 w-3.5"
                              aria-hidden="true"
                            />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Fotos */}
                    <div className="p-5 grid md:grid-cols-2 gap-5">
                      {(["antes", "depois"] as const).map((tipo) => {
                        const fotos =
                          tipo === "antes" ? fotosAntes : fotosDepois;
                        const otherTipo = tipo === "antes" ? "depois" : "antes";
                        const otherFotos =
                          tipo === "antes" ? fotosDepois : fotosAntes;
                        const isIncomplete =
                          fotos.length > 0 && otherFotos.length === 0;
                        return (
                          <div key={tipo}>
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <div
                                  className="h-1.5 w-1.5 rounded-full"
                                  style={{
                                    background:
                                      tipo === "antes"
                                        ? "oklch(0.80 0.165 70)"
                                        : "oklch(0.56 0.185 150)",
                                  }}
                                />
                                <p className="text-xs font-semibold text-foreground capitalize">
                                  Fotos {tipo === "antes" ? "Antes" : "Depois"}
                                </p>
                                <span className="text-xs text-muted-foreground">
                                  ({fotos.length})
                                </span>
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {fotos.length === 0 ? (
                                <button
                                  onClick={() => handleFotoUpload(sv.id, tipo)}
                                  disabled={!canEditOcorrencia || uploading}
                                  aria-label={`Adicionar foto ${tipo === "antes" ? "antes" : "depois"} do serviço`}
                                  className="h-20 w-full rounded-xl border border-dashed border-border flex items-center justify-center hover:bg-accent hover:border-primary/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                  style={{
                                    background: "oklch(0.972 0.004 245 / 0.5)",
                                  }}
                                >
                                  <div className="flex flex-col items-center gap-1.5">
                                    <Camera
                                      className="h-4 w-4 text-muted-foreground/50"
                                      aria-hidden="true"
                                    />
                                    <p className="text-xs text-muted-foreground/60">
                                      {uploading
                                        ? "Enviando..."
                                        : "Adicionar foto"}
                                    </p>
                                  </div>
                                </button>
                              ) : (
                                <>
                                  {fotos.map((f) => (
                                    <div key={f.id} className="relative group">
                                      <img
                                        src={getFotoUrl(f.id, f.url) || ""}
                                        alt={`Foto ${tipo === "antes" ? "antes" : "depois"} do serviço`}
                                        onClick={() => {
                                          const u = getFotoUrl(f.id, f.url);
                                          if (u) handleZoomFoto(u);
                                        }}
                                        onError={() =>
                                          handleImgError(
                                            f.id,
                                            "fotos-servico",
                                            f.storage_path,
                                          )
                                        }
                                        className="h-20 w-20 rounded-xl object-cover border border-border/60 cursor-pointer hover:shadow-lg transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                        style={{
                                          boxShadow:
                                            "0 2px 8px oklch(0.115 0.028 252 / 0.08)",
                                        }}
                                        tabIndex={0}
                                        role="button"
                                        onKeyDown={(e) => {
                                          if (e.key === "Enter") {
                                            const u = getFotoUrl(f.id, f.url);
                                            if (u) handleZoomFoto(u);
                                          }
                                        }}
                                      />
                                      {canEditOcorrencia && !isFinalizada && (
                                        <button
                                          onClick={() =>
                                            deleteFotoServico(f.id)
                                          }
                                          aria-label={`Remover foto ${tipo === "antes" ? "antes" : "depois"}`}
                                          className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-destructive text-white flex items-center justify-center opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                        >
                                          <X
                                            className="h-3 w-3"
                                            aria-hidden="true"
                                          />
                                        </button>
                                      )}
                                    </div>
                                  ))}
                                  {pendingPreview?.key ===
                                    `${sv.id}-${tipo}` && (
                                      <div
                                        className="relative h-20 w-20"
                                        role="status"
                                        aria-label="Enviando foto..."
                                      >
                                        <img
                                          src={pendingPreview.url}
                                          alt="Foto sendo enviada"
                                          className="h-20 w-20 rounded-xl object-cover border border-border/60 opacity-50"
                                        />
                                        <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/20">
                                          <div
                                            className="h-5 w-5 rounded-full border-2 border-white border-t-transparent animate-spin"
                                            aria-hidden="true"
                                          />
                                        </div>
                                      </div>
                                    )}
                                  {canEditOcorrencia &&
                                    !isFinalizada &&
                                    fotos.length < 1 && (
                                      <button
                                        onClick={() =>
                                          handleFotoUpload(sv.id, tipo)
                                        }
                                        disabled={uploading}
                                        aria-label={`Adicionar foto ${tipo === "antes" ? "antes" : "depois"}`}
                                        className="h-20 w-20 rounded-xl border border-dashed border-border flex items-center justify-center hover:bg-accent hover:border-primary/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                        style={{
                                          background:
                                            "oklch(0.972 0.004 245 / 0.5)",
                                        }}
                                      >
                                        <Plus
                                          className="h-4 w-4 text-muted-foreground/50"
                                          aria-hidden="true"
                                        />
                                      </button>
                                    )}
                                </>
                              )}
                            </div>
                            {isIncomplete && (
                              <div
                                className="mt-2 p-2.5 rounded-lg bg-amber-50 border border-amber-200 flex items-start gap-2"
                                role="alert"
                                aria-live="polite"
                              >
                                <Upload
                                  className="h-3.5 w-3.5 text-amber-600 mt-0.5 shrink-0"
                                  aria-hidden="true"
                                />
                                <p className="text-xs text-amber-700">
                                  Adicione também foto{" "}
                                  {otherTipo === "antes"
                                    ? "de antes"
                                    : "de depois"}{" "}
                                  para completar este serviço.
                                </p>
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
          {canEditOcorrencia && !isFinalizada && (
            <div className="flex justify-end">
              <Dialog
                open={showServicoDialog}
                onOpenChange={setShowServicoDialog}
              >
                <DialogTrigger asChild>
                  <Button
                    size="sm"
                    className="gap-1.5 h-9 font-semibold"
                    style={{
                      background:
                        "linear-gradient(135deg, oklch(0.50 0.225 255), oklch(0.44 0.245 272))",
                      boxShadow: "0 4px 12px oklch(0.50 0.225 255 / 0.35)",
                    }}
                  >
                    <Plus className="h-4 w-4" /> Adicionar Serviço
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md max-h-[70vh] flex flex-col">
                  <DialogHeader>
                    <DialogTitle>Novo Serviço</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-2 overflow-y-auto flex-1">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">
                        Tipo de Serviço
                      </Label>
                      <Select value={novoTipoId} onValueChange={setNovoTipoId}>
                        <SelectTrigger className="h-10">
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent className="max-h-40 w-full">
                          {tiposServico
                            .filter((t) => t.ativo)
                            .map((t) => (
                              <SelectItem key={t.id} value={t.id}>
                                {t.nome}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <DialogClose asChild>
                      <Button variant="outline">Cancelar</Button>
                    </DialogClose>
                    <Button
                      onClick={handleAddServico}
                      disabled={!novoTipoId}
                      style={{
                        background:
                          "linear-gradient(135deg, oklch(0.50 0.225 255), oklch(0.44 0.245 272))",
                      }}
                    >
                      Adicionar
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          )}
        </div>

        {/* Materiais Utilizados */}
        <div className="space-y-3 animate-fade-in-up delay-100">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-base font-bold text-foreground">
              Materiais Utilizados
            </h2>
            <span
              className="text-xs font-bold px-1.5 py-0.5 rounded-md"
              style={{
                background: "oklch(0.50 0.225 255 / 0.12)",
                color: "oklch(0.42 0.18 255)",
              }}
            >
              {ocMateriais.length}
            </span>
            <span className="text-xs text-muted-foreground">(opcional)</span>
          </div>

          {ocMateriais.length > 0 && (
            <div
              className="rounded-xl border border-border/60 bg-card overflow-hidden"
              style={{ boxShadow: "0 1px 3px oklch(0.115 0.028 252 / 0.05)" }}
            >
              <table className="w-full text-sm">
                <thead>
                  <tr
                    className="border-b border-border/50"
                    style={{ background: "oklch(0.972 0.004 245 / 0.5)" }}
                  >
                    <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-2.5">
                      Material
                    </th>
                    <th className="text-right text-xs font-semibold text-muted-foreground px-4 py-2.5">
                      Quantidade
                    </th>
                    <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-2.5">
                      Unidade
                    </th>
                    {canEditOcorrencia && !isFinalizada && (
                      <th className="w-10 px-2" />
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {ocMateriais.map((om) => (
                    <tr key={om.id}>
                      <td className="px-4 py-2.5 font-medium">
                        {om.material?.name ?? "—"}
                      </td>
                      <td className="px-4 py-2.5 text-right font-medium tabular-nums">
                        {Number(om.quantity) % 1 === 0
                          ? Number(om.quantity).toLocaleString("pt-BR")
                          : Number(om.quantity).toLocaleString("pt-BR", {
                            minimumFractionDigits: 1,
                            maximumFractionDigits: 3,
                          })}
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground">
                        {om.material?.unit ?? "—"}
                      </td>
                      {canEditOcorrencia && !isFinalizada && (
                        <td className="px-2 py-2.5">
                          <button
                            onClick={() => removeOcorrenciaMaterial(om.id)}
                            aria-label={`Remover ${om.material?.name}`}
                            className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            <Trash2
                              className="h-3.5 w-3.5"
                              aria-hidden="true"
                            />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {canEditOcorrencia && !isFinalizada && (
            <div
              className="rounded-xl border border-border/60 bg-card p-4"
              style={{ boxShadow: "0 1px 3px oklch(0.115 0.028 252 / 0.04)" }}
            >
              <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
                Adicionar material
              </p>
              <div className="flex flex-wrap gap-2 items-end">
                {/* Combobox de material */}
                <div className="flex-1 min-w-[200px]">
                  <p className="text-xs text-muted-foreground mb-1.5">
                    Material
                  </p>
                  <Popover open={matComboOpen} onOpenChange={setMatComboOpen}>
                    <PopoverTrigger asChild>
                      <button
                        role="combobox"
                        aria-expanded={matComboOpen}
                        className="w-full flex items-center justify-between h-9 rounded-md border border-input bg-background px-3 text-sm hover:bg-accent hover:text-accent-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <span
                          className={cn(
                            newMatId
                              ? "text-foreground"
                              : "text-muted-foreground",
                          )}
                        >
                          {newMatId
                            ? materials.find((m) => m.id === newMatId)?.name
                            : "Selecionar material..."}
                        </span>
                        <ChevronsUpDown
                          className="ml-2 h-4 w-4 shrink-0 opacity-50"
                          aria-hidden="true"
                        />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="p-0 w-[280px]" align="start">
                      <Command>
                        <CommandInput
                          placeholder="Buscar material..."
                          value={matSearch}
                          onValueChange={setMatSearch}
                        />
                        <CommandList>
                          <CommandEmpty>
                            Nenhum material encontrado.
                          </CommandEmpty>
                          <CommandGroup>
                            {filteredMaterials.map((m) => (
                              <CommandItem
                                key={m.id}
                                value={m.id}
                                onSelect={() => {
                                  setNewMatId(m.id);
                                  setMatComboOpen(false);
                                  setMatSearch("");
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    newMatId === m.id
                                      ? "opacity-100"
                                      : "opacity-0",
                                  )}
                                  aria-hidden="true"
                                />
                                <span className="flex-1">{m.name}</span>
                                <span className="ml-2 text-xs text-muted-foreground">
                                  {m.unit}
                                </span>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Quantidade */}
                <div className="w-28">
                  <p className="text-xs text-muted-foreground mb-1.5">
                    Quantidade
                    {selectedMaterial ? ` (${selectedMaterial.unit})` : ""}
                  </p>
                  <Input
                    type="number"
                    min="0.001"
                    step="any"
                    value={newMatQty}
                    onChange={(e) => setNewMatQty(e.target.value)}
                    placeholder="0"
                    className="h-9"
                    onKeyDown={(e) => e.key === "Enter" && handleAddMaterial()}
                  />
                </div>

                {/* Botão Adicionar */}
                <Button
                  size="sm"
                  className="h-9 gap-1.5 shrink-0"
                  disabled={!newMatId || !newMatQty || Number(newMatQty) <= 0}
                  onClick={handleAddMaterial}
                  style={{
                    background:
                      "linear-gradient(135deg, oklch(0.50 0.225 255), oklch(0.44 0.245 272))",
                  }}
                >
                  <Plus className="h-4 w-4" /> Adicionar
                </Button>
              </div>
            </div>
          )}

          {ocMateriais.length === 0 && (isFinalizada || !canEditOcorrencia) && (
            <div className="rounded-xl border border-dashed border-border bg-card py-8 text-center">
              <Package className="h-8 w-8 text-muted-foreground/25 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                Nenhum material registrado
              </p>
            </div>
          )}
        </div>

        {/* Serviços Adicionais */}
        {!isFinalizada && canEditOcorrencia && (
          <div
            className="rounded-2xl border border-border/60 bg-card p-5 space-y-4 animate-fade-in-up delay-150"
            style={{ boxShadow: "0 1px 3px oklch(0.115 0.028 252 / 0.05)" }}
          >
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-foreground">Serviços Adicionais</h3>
              <span className="text-xs text-muted-foreground">(opcional)</span>
            </div>

            <div className="grid md:grid-cols-2 gap-5">
              {[
                {
                  key: "retirada_fios" as const,
                  label: "Retirada de Fios",
                  fotos: retiradaFios,
                },
                { key: "ctop" as const, label: "CTOPs", fotos: ctops },
              ].map(({ key, label, fotos }) => (
                <div key={key}>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-semibold text-foreground">
                      {label}
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs gap-1"
                      onClick={() => handleFotoFinalUploadClick(key)}
                      disabled={uploading}
                    >
                      <Upload className="h-3 w-3" />{" "}
                      {uploading ? "Enviando..." : "Add foto"}
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {fotos.length === 0 ? (
                      <div
                        className="h-16 w-full rounded-xl border border-dashed border-border flex items-center justify-center"
                        style={{ background: "oklch(1 0 0 / 0.6)" }}
                      >
                        <p className="text-xs text-muted-foreground/50">
                          Nenhuma foto
                        </p>
                      </div>
                    ) : (
                      <>
                        {fotos.map((f) => (
                          <div key={f.id} className="relative group">
                            <img
                              src={getFotoUrl(f.id, f.url) || ""}
                              alt={label}
                              onError={() =>
                                handleImgError(
                                  f.id,
                                  "fotos-finais",
                                  f.storage_path,
                                )
                              }
                              className="h-20 w-20 rounded-xl object-cover border border-border/60"
                            />
                            <button
                              onClick={() => deleteFotoFinal(f.id)}
                              aria-label={`Remover foto de ${label}`}
                              className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-destructive text-white flex items-center justify-center opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                              <X className="h-3 w-3" aria-hidden="true" />
                            </button>
                          </div>
                        ))}
                        {pendingPreview?.key === `final-${key}` && (
                          <div className="relative h-20 w-20">
                            <img
                              src={pendingPreview.url}
                              alt="Enviando..."
                              className="h-20 w-20 rounded-xl object-cover border border-border/60 opacity-50"
                            />
                            <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/20">
                              <div className="h-5 w-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Fotos finais (readonly) */}
        {isFinalizada && (retiradaFios.length > 0 || ctops.length > 0) && (
          <div
            className="rounded-2xl border border-border/60 bg-card p-5 space-y-4 animate-fade-in-up"
            style={{ boxShadow: "0 1px 3px oklch(0.115 0.028 252 / 0.05)" }}
          >
            <h3 className="font-bold text-foreground">Fotos Finais</h3>
            <div className="grid md:grid-cols-2 gap-5">
              {retiradaFios.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-foreground mb-3">
                    Retirada de Fios
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {retiradaFios.map((f) => (
                      <img
                        key={f.id}
                        src={getFotoUrl(f.id, f.url) || ""}
                        alt="Retirada fios"
                        onClick={() => {
                          const u = getFotoUrl(f.id, f.url);
                          if (u) handleZoomFoto(u);
                        }}
                        onError={() =>
                          handleImgError(f.id, "fotos-finais", f.storage_path)
                        }
                        className="h-20 w-20 rounded-xl object-cover border border-border/60 cursor-pointer hover:shadow-lg transition-shadow"
                      />
                    ))}
                  </div>
                </div>
              )}
              {ctops.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-foreground mb-3">
                    CTOPs
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {ctops.map((f) => (
                      <img
                        key={f.id}
                        src={getFotoUrl(f.id, f.url) || ""}
                        alt="CTOP"
                        onClick={() => {
                          const u = getFotoUrl(f.id, f.url);
                          if (u) handleZoomFoto(u);
                        }}
                        onError={() =>
                          handleImgError(f.id, "fotos-finais", f.storage_path)
                        }
                        className="h-20 w-20 rounded-xl object-cover border border-border/60 cursor-pointer hover:shadow-lg transition-shadow"
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Botão Finalizar */}
        {!isFinalizada && canEditOcorrencia && ocServicos.length > 0 && (
          <div className="flex flex-col gap-3 animate-fade-in-up delay-150">
            {!canFinalizar && (
              <div className="p-4 rounded-xl border border-amber-200 bg-amber-50">
                <p className="text-sm text-amber-800 font-medium">
                  Requisitos para finalizar:
                </p>
                <ul className="text-xs text-amber-700 mt-2 space-y-1 ml-2">
                  {finalizarValidation.map((v, idx) => (
                    <li key={v.servico.id} className="list-disc">
                      Serviço {idx + 1}:{" "}
                      {v.isComplete
                        ? "✓ Completo"
                        : "⚠ Adicione fotos de ANTES e DEPOIS"}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <Button
              onClick={() => setShowFinalizar(true)}
              disabled={!canFinalizar}
              size="lg"
              className="w-full h-11 font-semibold gap-2 text-white"
              style={
                canFinalizar
                  ? {
                    background:
                      "linear-gradient(135deg, oklch(0.56 0.185 150), oklch(0.50 0.175 155))",
                    boxShadow: "0 4px 12px oklch(0.56 0.185 150 / 0.35)",
                  }
                  : {
                    background: "oklch(0.80 0.02 0 / 0.5)",
                  }
              }
            >
              <CheckCircle className="h-5 w-5" /> Finalizar Ocorrência
            </Button>
          </div>
        )}

        {/* Dialog confirmar finalização */}
        <Dialog open={showFinalizar} onOpenChange={setShowFinalizar}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-success" />
                Confirmar Finalização
              </DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground py-2">
              Tem certeza que deseja finalizar esta ocorrência? Após finalizar,
              o operador não poderá mais editar.
            </p>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancelar</Button>
              </DialogClose>
              <Button
                onClick={handleFinalizar}
                style={{
                  background:
                    "linear-gradient(135deg, oklch(0.56 0.185 150), oklch(0.50 0.175 155))",
                  boxShadow: "0 4px 12px oklch(0.56 0.185 150 / 0.35)",
                }}
              >
                Confirmar Finalização
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog confirmar exclusão */}
        <Dialog open={showExcluir} onOpenChange={setShowExcluir}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Trash2 className="h-5 w-5 text-red-600" />
                Excluir Ocorrência
              </DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground py-2">
              Tem certeza que deseja excluir esta ocorrência? Esta ação não pode
              ser desfeita.
            </p>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancelar</Button>
              </DialogClose>
              <Button
                variant="destructive"
                onClick={async () => {
                  try {
                    await deleteOcorrencia(oc.id);
                    setShowExcluir(false);
                    navigate({ to: "/ocorrencias" });
                    toast.success("Ocorrência excluída com sucesso");
                  } catch {
                    toast.error("Erro ao excluir ocorrência", {
                      description: "Verifique sua conexão e tente novamente.",
                    });
                  }
                }}
              >
                Excluir
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal Zoom Foto */}
        <Dialog
          open={!!fotoZoom}
          onOpenChange={(open) => !open && setFotoZoom(null)}
        >
          <DialogContent
            className="max-w-2xl w-full p-2 sm:p-4"
            aria-label="Visualização da foto em tamanho ampliado"
          >
            <DialogClose
              className="absolute top-2 right-2 opacity-70 hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
              aria-label="Fechar visualização"
            />
            {fotoZoom && (
              <img
                src={fotoZoom}
                alt="Foto ampliada"
                className="w-full h-auto rounded-lg max-h-[80vh] object-contain"
              />
            )}
          </DialogContent>
        </Dialog>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/svg+xml,image/webp,image/heif,image/heic,image/gif,image/bmp,image/tiff,image/*"
          multiple={allowMultiple}
          onChange={handleFileSelected}
          style={{ display: "none" }}
        />
      </div>
    </AppLayout>
  );
}
