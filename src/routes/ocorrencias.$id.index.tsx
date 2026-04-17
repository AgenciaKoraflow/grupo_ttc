import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useData } from "@/contexts/DataContext";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Plus, Trash2, CheckCircle, RefreshCw, FileText, Upload, Camera, X, MapPin, Cable, Tag, Building, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import type { OcorrenciaStatus } from "@/types";

export const Route = createFileRoute("/ocorrencias/$id/")({
  component: OcorrenciaDetailPage,
});

function StatusBadge({ status }: { status: OcorrenciaStatus }) {
  const map = {
    PENDENTE: { label: 'Pendente', cls: 'status-pendente' },
    EM_ANDAMENTO: { label: 'Em Andamento', cls: 'status-em-andamento' },
    FINALIZADA: { label: 'Finalizada', cls: 'status-finalizada' },
  };
  const s = map[status];
  return <Badge variant="outline" className={cn(s.cls, 'font-semibold text-[11px]')}>{s.label}</Badge>;
}

function InfoItem({ label, value, icon: Icon }: { label: string; value: React.ReactNode; icon?: React.ElementType }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5">
        {Icon && <Icon className="h-3 w-3 text-muted-foreground/60" />}
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      </div>
      <div className="text-sm font-medium text-foreground">{value}</div>
    </div>
  );
}

function OcorrenciaDetailPage() {
  const { id } = Route.useParams();
  const { user, isAdmin } = useAuth();
  const {
    ocorrencias, equipes, tiposServico, servicos, fotosServico, fotosFinais,
    vincularEquipe, addServico, deleteServico, addFotoServico, deleteFotoServico,
    addFotoFinal, deleteFotoFinal, finalizarOcorrencia, reabrirOcorrencia, deleteOcorrencia,
  } = useData();
  const navigate = useNavigate();
  const [showServicoDialog, setShowServicoDialog] = useState(false);
  const [showFinalizar, setShowFinalizar] = useState(false);
  const [showExcluir, setShowExcluir] = useState(false);
  const [novoTipoId, setNovoTipoId] = useState('');
  const [alertaFoto, setAlertaFoto] = useState<{ tipo: string; servicoId: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fotoContext, setFotoContext] = useState<{ servicoId: string; tipo: 'antes' | 'depois'; isFinal?: boolean; categoria?: 'retirada_fios' | 'ctop' } | null>(null);
  const [fotoZoom, setFotoZoom] = useState<string | null>(null);
  const imageCache = useRef<Map<string, string>>(new Map());

  const oc = ocorrencias.find(o => o.id === id);

  if (!oc) return (
    <AppLayout>
      <div className="p-6 text-center py-20">
        <p className="text-muted-foreground">Ocorrência não encontrada</p>
        <Link to="/ocorrencias" className="text-primary text-sm mt-2 inline-block">← Voltar</Link>
      </div>
    </AppLayout>
  );

  const ocServicos = servicos.filter(s => s.ocorrencia_id === oc.id).sort((a, b) => a.ordem - b.ordem);
  const ocFotosFinais = fotosFinais.filter(f => f.ocorrencia_id === oc.id);
  const retiradaFios = ocFotosFinais.filter(f => f.categoria === 'retirada_fios');
  const ctops = ocFotosFinais.filter(f => f.categoria === 'ctop');
  const isFinalizada = oc.status === 'FINALIZADA';
  const canEdit = !isFinalizada || isAdmin;

  const handleAddServico = () => {
    if (!novoTipoId) return;
    addServico({
      ocorrencia_id: oc.id,
      tipo_servico_id: novoTipoId,
      observacao: null,
      ordem: ocServicos.length + 1,
      created_by: user?.id,
    });
    setNovoTipoId('');
    setShowServicoDialog(false);
  };

  const createThumbnail = (dataUrl: string, mimeType: string = ''): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxSize = 300;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxSize) {
            height = (height * maxSize) / width;
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = (width * maxSize) / height;
            height = maxSize;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    });
  };

  const convertHeifToJpeg = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const isHeif = file.type === 'image/heif' || file.type === 'image/heic' || file.name.toLowerCase().endsWith('.heif') || file.name.toLowerCase().endsWith('.heic');

      if (!isHeif) {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
        return;
      }

      // Para HEIF, usar heic2any se disponível
      if ((window as any).heic2any) {
        const reader = new FileReader();
        reader.onload = async (e) => {
          try {
            const blob = await (window as any).heic2any({ blob: file });
            const reader2 = new FileReader();
            reader2.onload = () => resolve(reader2.result as string);
            reader2.readAsDataURL(blob);
          } catch (err) {
            const reader2 = new FileReader();
            reader2.onload = () => resolve(reader2.result as string);
            reader2.readAsDataURL(file);
          }
        };
        reader.readAsDataURL(file);
        return;
      }

      // Fallback: tentar ler como está
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleZoomFoto = (thumbnailUrl: string) => {
    const originalUrl = imageCache.current?.get(thumbnailUrl) || thumbnailUrl;
    setFotoZoom(originalUrl);
  };

  const handleFotoUpload = (servicoId: string, tipo: 'antes' | 'depois') => {
    setFotoContext({ servicoId, tipo, isFinal: false });
    fileInputRef.current?.click();
  };

  const handleFotoFinalUploadClick = (categoria: 'retirada_fios' | 'ctop') => {
    setFotoContext({ servicoId: '', categoria, isFinal: true });
    fileInputRef.current?.click();
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !fotoContext) return;

    try {
      const originalUrl = await convertHeifToJpeg(file);
      const thumbnailUrl = await createThumbnail(originalUrl, file.type);

      // Armazenar imagem original em cache para visualização em zoom
      imageCache.current?.set(thumbnailUrl, originalUrl);

      if (fotoContext.isFinal) {
        // Foto final (retirada_fios ou ctop)
        const existing = ocFotosFinais.filter(f => f.categoria === fotoContext.categoria);
        addFotoFinal({
          ocorrencia_id: oc.id,
          categoria: fotoContext.categoria as 'retirada_fios' | 'ctop',
          storage_path: `/${fotoContext.categoria}/${Date.now()}_${file.name}`,
          file_name: file.name,
          mime_type: 'image/jpeg',
          ordem: existing.length + 1,
          url: thumbnailUrl,
        });
      } else {
        // Foto de serviço (antes/depois)
        const existing = fotosServico.filter(
          f => f.servico_id === fotoContext.servicoId && f.tipo_foto === fotoContext.tipo
        );
        addFotoServico({
          servico_id: fotoContext.servicoId,
          tipo_foto: fotoContext.tipo,
          storage_path: `/${fotoContext.tipo}/${Date.now()}_${file.name}`,
          file_name: file.name,
          mime_type: 'image/jpeg',
          ordem: existing.length + 1,
          url: thumbnailUrl,
        });
      }
    } catch (error) {
      console.error('Erro ao processar imagem:', error);
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setFotoContext(null);
  };


  const finalizarValidation = ocServicos.length > 0 ? ocServicos.map(sv => {
    const fotos = fotosServico.filter(f => f.servico_id === sv.id);
    const hasAntes = fotos.some(f => f.tipo_foto === 'antes');
    const hasDepois = fotos.some(f => f.tipo_foto === 'depois');
    return { servico: sv, hasAntes, hasDepois, isComplete: hasAntes && hasDepois };
  }) : [];

  const canFinalizar = finalizarValidation.every(v => v.isComplete) && finalizarValidation.length > 0;

  const handleFinalizar = () => {
    if (!user) return;
    finalizarOcorrencia(oc.id, user.id);
    setShowFinalizar(false);
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
            onClick={() => navigate({ to: '/ocorrencias' })}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1 min-w-0 flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-bold text-foreground">{oc.id_ocorrencia}</h1>
            <StatusBadge status={oc.status} />
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to="/ocorrencias/$id/relatorio" params={{ id: oc.id }}>
              <Button variant="outline" size="sm" className="gap-1.5 h-9 font-medium">
                <FileText className="h-4 w-4" /> <span className="hidden sm:inline">Relatório</span>
              </Button>
            </Link>
            {isAdmin && isFinalizada && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 h-9 font-medium"
                onClick={() => reabrirOcorrencia(oc.id)}
              >
                <RefreshCw className="h-4 w-4" /> <span className="hidden sm:inline">Reabrir</span>
              </Button>
            )}
            {isAdmin && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 h-9 font-medium text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={() => setShowExcluir(true)}
              >
                <Trash2 className="h-4 w-4" /> <span className="hidden sm:inline">Excluir</span>
              </Button>
            )}
          </div>
        </div>

        {/* Info card */}
        <div
          className="rounded-2xl border border-border/60 bg-card p-4 md:p-5 animate-fade-in-up"
          style={{ boxShadow: '0 1px 3px oklch(0.115 0.028 252 / 0.06), 0 4px 12px oklch(0.115 0.028 252 / 0.04)' }}
        >
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 md:gap-5">
            <InfoItem label="Município" value={oc.municipio} icon={MapPin} />
            <InfoItem label="Cabo/Primária" value={oc.cabo_primaria || '—'} icon={Cable} />
            <InfoItem label="AT" value={oc.at || '—'} icon={Tag} />
            <InfoItem label="Nome AT" value={oc.nome_at || '—'} icon={Tag} />
            <InfoItem label="Contratada" value={oc.contratada || '—'} icon={Building} />
            <InfoItem label="Gerente Icomon" value={oc.gerente_icomon || '—'} icon={Users} />
            <div className="space-y-1">
              <div className="flex items-center gap-1.5">
                <Building className="h-3 w-3 text-muted-foreground/60" />
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Equipe</p>
              </div>
              {isAdmin && !isFinalizada ? (
                <Select value={oc.equipe_id || ''} onValueChange={(v) => vincularEquipe(oc.id, v)}>
                  <SelectTrigger className="h-8 text-xs border-border/70">
                    <SelectValue placeholder="Selecionar" />
                  </SelectTrigger>
                  <SelectContent>
                    {equipes.filter(e => e.ativa).map(e => (
                      <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-sm font-medium text-foreground">{oc.equipe?.nome || 'Sem equipe'}</p>
              )}
            </div>
          </div>
        </div>

        {/* Serviços */}
        <div className="space-y-3 animate-fade-in-up delay-75">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-foreground">Serviços Executados</h2>
              <span
                className="text-xs font-bold px-1.5 py-0.5 rounded-md"
                style={{
                  background: 'oklch(0.50 0.225 255 / 0.12)',
                  color: 'oklch(0.42 0.18 255)',
                }}
              >
                {ocServicos.length}
              </span>
            </div>
            {canEdit && !isFinalizada && (
              <Dialog open={showServicoDialog} onOpenChange={setShowServicoDialog}>
                <DialogTrigger asChild>
                  <Button
                    size="sm"
                    className="gap-1.5 h-9 font-semibold"
                    style={{
                      background: 'linear-gradient(135deg, oklch(0.50 0.225 255), oklch(0.44 0.245 272))',
                      boxShadow: '0 4px 12px oklch(0.50 0.225 255 / 0.35)',
                    }}
                  >
                    <Plus className="h-4 w-4" /> Adicionar Serviço
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md max-h-[70vh] flex flex-col">
                  <DialogHeader><DialogTitle>Novo Serviço</DialogTitle></DialogHeader>
                  <div className="space-y-4 py-2 overflow-y-auto flex-1">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Tipo de Serviço</Label>
                      <Select value={novoTipoId} onValueChange={setNovoTipoId}>
                        <SelectTrigger className="h-10"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                        <SelectContent className="max-h-40 w-full">
                          {tiposServico.filter(t => t.ativo).map(t => (
                            <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
                    <Button
                      onClick={handleAddServico}
                      disabled={!novoTipoId}
                      style={{ background: 'linear-gradient(135deg, oklch(0.50 0.225 255), oklch(0.44 0.245 272))' }}
                    >
                      Adicionar
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>

          {ocServicos.length === 0 ? (
            <div
              className="rounded-2xl border border-dashed border-border bg-card py-12 text-center"
            >
              <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center mx-auto mb-3">
                <Plus className="h-5 w-5 text-muted-foreground/50" />
              </div>
              <p className="text-sm text-muted-foreground font-medium">Nenhum serviço cadastrado</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Adicione serviços executados nesta ocorrência</p>
            </div>
          ) : (
            <div className="space-y-3">
              {ocServicos.map((sv, idx) => {
                const svFotos = fotosServico.filter(f => f.servico_id === sv.id);
                const fotosAntes = svFotos.filter(f => f.tipo_foto === 'antes');
                const fotosDepois = svFotos.filter(f => f.tipo_foto === 'depois');
                return (
                  <div
                    key={sv.id}
                    className="rounded-2xl border border-border/60 bg-card overflow-hidden"
                    style={{ boxShadow: '0 1px 3px oklch(0.115 0.028 252 / 0.05)' }}
                  >
                    {/* Cabeçalho do serviço */}
                    <div className="flex items-center justify-between px-4 md:px-5 py-3.5 border-b border-border/50"
                      style={{ background: 'oklch(0.972 0.004 245 / 0.5)' }}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className="h-7 w-7 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0"
                          style={{ background: 'linear-gradient(135deg, oklch(0.50 0.225 255), oklch(0.44 0.245 272))' }}
                        >
                          {idx + 1}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-foreground">{sv.tipo_servico?.nome}</p>
                          {sv.observacao && <p className="text-xs text-muted-foreground mt-0.5 truncate">{sv.observacao}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant="secondary" className="text-xs">{sv.status_item}</Badge>
                        {canEdit && !isFinalizada && (
                          <button
                            onClick={() => deleteServico(sv.id)}
                            className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Fotos */}
                    <div className="p-5 grid md:grid-cols-2 gap-5">
                      {(['antes', 'depois'] as const).map(tipo => {
                        const fotos = tipo === 'antes' ? fotosAntes : fotosDepois;
                        const otherTipo = tipo === 'antes' ? 'depois' : 'antes';
                        const otherFotos = tipo === 'antes' ? fotosDepois : fotosAntes;
                        const isIncomplete = (fotos.length > 0 && otherFotos.length === 0);
                        return (
                          <div key={tipo}>
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <div
                                  className="h-1.5 w-1.5 rounded-full"
                                  style={{
                                    background: tipo === 'antes'
                                      ? 'oklch(0.80 0.165 70)'
                                      : 'oklch(0.56 0.185 150)',
                                  }}
                                />
                                <p className="text-xs font-semibold text-foreground capitalize">
                                  Fotos {tipo === 'antes' ? 'Antes' : 'Depois'}
                                </p>
                                <span className="text-xs text-muted-foreground">({fotos.length})</span>
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {fotos.length === 0 ? (
                                <button
                                  onClick={() => handleFotoUpload(sv.id, tipo)}
                                  disabled={!canEdit || isFinalizada}
                                  className="h-20 w-full rounded-xl border border-dashed border-border flex items-center justify-center hover:bg-accent hover:border-primary/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                  style={{ background: 'oklch(0.972 0.004 245 / 0.5)' }}
                                >
                                  <div className="flex flex-col items-center gap-1.5">
                                    <Camera className="h-4 w-4 text-muted-foreground/50" />
                                    <p className="text-xs text-muted-foreground/60">Adicionar foto</p>
                                  </div>
                                </button>
                              ) : (
                                <>
                                  {fotos.map(f => (
                                    <div key={f.id} className="relative group">
                                      <img
                                        src={f.url}
                                        alt={`Foto ${tipo}`}
                                        onClick={() => handleZoomFoto(f.url)}
                                        className="h-20 w-20 rounded-xl object-cover border border-border/60 cursor-pointer hover:shadow-lg transition-shadow"
                                        style={{ boxShadow: '0 2px 8px oklch(0.115 0.028 252 / 0.08)' }}
                                      />
                                      {canEdit && !isFinalizada && (
                                        <button
                                          onClick={() => deleteFotoServico(f.id)}
                                          className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-destructive text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                                        >
                                          <X className="h-3 w-3" />
                                        </button>
                                      )}
                                    </div>
                                  ))}
                                  {canEdit && !isFinalizada && (
                                    <button
                                      onClick={() => handleFotoUpload(sv.id, tipo)}
                                      className="h-20 w-20 rounded-xl border border-dashed border-border flex items-center justify-center hover:bg-accent hover:border-primary/50 transition-all"
                                      style={{ background: 'oklch(0.972 0.004 245 / 0.5)' }}
                                    >
                                      <Plus className="h-4 w-4 text-muted-foreground/50" />
                                    </button>
                                  )}
                                </>
                              )}
                            </div>
                            {isIncomplete && (
                              <div className="mt-2 p-2 rounded-lg bg-amber-50 border border-amber-200 flex items-start gap-2">
                                <div className="text-amber-600 mt-0.5">⚠</div>
                                <p className="text-xs text-amber-700">Adicione também foto {otherTipo === 'antes' ? 'de antes' : 'de depois'}</p>
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
        </div>

        {/* Serviços Adicionais */}
        {!isFinalizada && canEdit && (
          <div
            className="rounded-2xl border border-border/60 bg-card p-5 space-y-4 animate-fade-in-up delay-150"
            style={{ boxShadow: '0 1px 3px oklch(0.115 0.028 252 / 0.05)' }}
          >
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-foreground">Serviços Adicionais</h3>
              <span className="text-xs text-muted-foreground">(opcional)</span>
            </div>

            <div className="grid md:grid-cols-2 gap-5">
              {([
                { key: 'retirada_fios' as const, label: 'Retirada de Fios', fotos: retiradaFios },
                { key: 'ctop' as const, label: 'CTOPs', fotos: ctops },
              ]).map(({ key, label, fotos }) => (
                <div key={key}>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-semibold text-foreground">{label}</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs gap-1"
                      onClick={() => handleFotoFinalUploadClick(key)}
                    >
                      <Upload className="h-3 w-3" /> Add foto
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {fotos.length === 0 ? (
                      <div
                        className="h-16 w-full rounded-xl border border-dashed border-border flex items-center justify-center"
                        style={{ background: 'oklch(1 0 0 / 0.6)' }}
                      >
                        <p className="text-xs text-muted-foreground/50">Nenhuma foto</p>
                      </div>
                    ) : fotos.map(f => (
                      <div key={f.id} className="relative group">
                        <img
                          src={f.url}
                          alt={label}
                          className="h-20 w-20 rounded-xl object-cover border border-border/60"
                        />
                        <button
                          onClick={() => deleteFotoFinal(f.id)}
                          className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-destructive text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
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
            style={{ boxShadow: '0 1px 3px oklch(0.115 0.028 252 / 0.05)' }}
          >
            <h3 className="font-bold text-foreground">Fotos Finais</h3>
            <div className="grid md:grid-cols-2 gap-5">
              {retiradaFios.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-foreground mb-3">Retirada de Fios</p>
                  <div className="flex flex-wrap gap-2">
                    {retiradaFios.map(f => (
                      <img key={f.id} src={f.url} alt="Retirada fios"
                        onClick={() => handleZoomFoto(f.url)}
                        className="h-20 w-20 rounded-xl object-cover border border-border/60 cursor-pointer hover:shadow-lg transition-shadow" />
                    ))}
                  </div>
                </div>
              )}
              {ctops.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-foreground mb-3">CTOPs</p>
                  <div className="flex flex-wrap gap-2">
                    {ctops.map(f => (
                      <img key={f.id} src={f.url} alt="CTOP"
                        onClick={() => handleZoomFoto(f.url)}
                        className="h-20 w-20 rounded-xl object-cover border border-border/60 cursor-pointer hover:shadow-lg transition-shadow" />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Botão Finalizar */}
        {!isFinalizada && canEdit && ocServicos.length > 0 && (
          <div className="flex flex-col gap-3 animate-fade-in-up delay-150">
            {!canFinalizar && (
              <div className="p-4 rounded-xl border border-amber-200 bg-amber-50">
                <p className="text-sm text-amber-800 font-medium">Requisitos para finalizar:</p>
                <ul className="text-xs text-amber-700 mt-2 space-y-1 ml-2">
                  {finalizarValidation.map((v, idx) => (
                    <li key={v.servico.id} className="list-disc">
                      Serviço {idx + 1}: {v.isComplete ? '✓ Completo' : '⚠ Adicione fotos de ANTES e DEPOIS'}
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
              style={canFinalizar ? {
                background: 'linear-gradient(135deg, oklch(0.56 0.185 150), oklch(0.50 0.175 155))',
                boxShadow: '0 4px 12px oklch(0.56 0.185 150 / 0.35)',
              } : {
                background: 'oklch(0.80 0.02 0 / 0.5)',
              }}
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
              Tem certeza que deseja finalizar esta ocorrência? Após finalizar, o operador não poderá mais editar.
            </p>
            <DialogFooter>
              <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
              <Button
                onClick={handleFinalizar}
                style={{
                  background: 'linear-gradient(135deg, oklch(0.56 0.185 150), oklch(0.50 0.175 155))',
                  boxShadow: '0 4px 12px oklch(0.56 0.185 150 / 0.35)',
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
              Tem certeza que deseja excluir esta ocorrência? Esta ação não pode ser desfeita.
            </p>
            <DialogFooter>
              <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
              <Button
                variant="destructive"
                onClick={() => {
                  deleteOcorrencia(oc.id);
                  setShowExcluir(false);
                  navigate({ to: '/ocorrencias' });
                }}
              >
                Excluir
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal Zoom Foto */}
        <Dialog open={!!fotoZoom} onOpenChange={(open) => !open && setFotoZoom(null)}>
          <DialogContent className="max-w-2xl w-full p-2 sm:p-4">
            <DialogClose className="absolute top-2 right-2 opacity-70 hover:opacity-100" />
            {fotoZoom && (
              <img
                src={fotoZoom}
                alt="Foto em zoom"
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
          onChange={handleFileSelected}
          style={{ display: 'none' }}
          capture="environment"
        />
      </div>
    </AppLayout>
  );
}
