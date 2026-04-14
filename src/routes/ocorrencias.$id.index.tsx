import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useData } from "@/contexts/DataContext";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  ArrowLeft, Plus, Trash2, Image, CheckCircle, RefreshCw, FileText,
  Upload, Camera, X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { OcorrenciaStatus } from "@/types";

export const Route = createFileRoute("/ocorrencias/$id")({
  component: OcorrenciaDetailPage,
});

function StatusBadge({ status }: { status: OcorrenciaStatus }) {
  const map = {
    PENDENTE: { label: 'Pendente', cls: 'status-pendente' },
    EM_ANDAMENTO: { label: 'Em Andamento', cls: 'status-em-andamento' },
    FINALIZADA: { label: 'Finalizada', cls: 'status-finalizada' },
  };
  const s = map[status];
  return <Badge variant="outline" className={cn(s.cls, 'border-0')}>{s.label}</Badge>;
}

function OcorrenciaDetailPage() {
  const { id } = Route.useParams();
  const { user, isAdmin, isOperador } = useAuth();
  const {
    ocorrencias, equipes, tiposServico, servicos, fotosServico, fotosFinais,
    vincularEquipe, addServico, deleteServico, addFotoServico, deleteFotoServico,
    addFotoFinal, deleteFotoFinal, finalizarOcorrencia, reabrirOcorrencia,
  } = useData();
  const navigate = useNavigate();

  const oc = ocorrencias.find(o => o.id === id);
  if (!oc) return (
    <AppLayout>
      <div className="p-6 text-center">
        <p className="text-muted-foreground">Ocorrência não encontrada</p>
        <Link to="/ocorrencias" className="text-primary text-sm mt-2 inline-block">Voltar</Link>
      </div>
    </AppLayout>
  );

  const ocServicos = servicos.filter(s => s.ocorrencia_id === oc.id).sort((a, b) => a.ordem - b.ordem);
  const ocFotosFinais = fotosFinais.filter(f => f.ocorrencia_id === oc.id);
  const retiradaFios = ocFotosFinais.filter(f => f.categoria === 'retirada_fios');
  const ctops = ocFotosFinais.filter(f => f.categoria === 'ctop');
  const isFinalizada = oc.status === 'FINALIZADA';
  const canEdit = !isFinalizada || isAdmin;

  const [showServicoDialog, setShowServicoDialog] = useState(false);
  const [showFinalizar, setShowFinalizar] = useState(false);
  const [novoTipoId, setNovoTipoId] = useState('');
  const [novoObs, setNovoObs] = useState('');

  const handleAddServico = () => {
    if (!novoTipoId) return;
    addServico({
      ocorrencia_id: oc.id,
      tipo_servico_id: novoTipoId,
      observacao: novoObs || null,
      ordem: ocServicos.length + 1,
      created_by: user?.id,
    });
    setNovoTipoId('');
    setNovoObs('');
    setShowServicoDialog(false);
  };

  const handleFotoUpload = (servicoId: string, tipo: 'antes' | 'depois') => {
    const existing = fotosServico.filter(f => f.servico_id === servicoId && f.tipo_foto === tipo);
    addFotoServico({
      servico_id: servicoId,
      tipo_foto: tipo,
      storage_path: `/${tipo}/${Date.now()}.jpg`,
      file_name: `foto_${tipo}_${Date.now()}.jpg`,
      mime_type: 'image/jpeg',
      ordem: existing.length + 1,
    });
  };

  const handleFotoFinalUpload = (categoria: 'retirada_fios' | 'ctop') => {
    const existing = ocFotosFinais.filter(f => f.categoria === categoria);
    addFotoFinal({
      ocorrencia_id: oc.id,
      categoria,
      storage_path: `/${categoria}/${Date.now()}.jpg`,
      file_name: `${categoria}_${Date.now()}.jpg`,
      mime_type: 'image/jpeg',
      ordem: existing.length + 1,
    });
  };

  const canFinalizar = ocServicos.length > 0 && ocServicos.every(sv => {
    const fotos = fotosServico.filter(f => f.servico_id === sv.id);
    return fotos.some(f => f.tipo_foto === 'antes') && fotos.some(f => f.tipo_foto === 'depois');
  });

  const handleFinalizar = () => {
    if (!user) return;
    finalizarOcorrencia(oc.id, user.id);
    setShowFinalizar(false);
  };

  return (
    <AppLayout>
      <div className="p-6 space-y-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate({ to: '/ocorrencias' })}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl font-bold">{oc.id_ocorrencia}</h1>
              <StatusBadge status={oc.status} />
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <Link to="/ocorrencias/$id/relatorio" params={{ id: oc.id }}>
              <Button variant="outline" size="sm" className="gap-1">
                <FileText className="h-4 w-4" /> Relatório
              </Button>
            </Link>
            {isAdmin && isFinalizada && (
              <Button variant="outline" size="sm" className="gap-1" onClick={() => reabrirOcorrencia(oc.id)}>
                <RefreshCw className="h-4 w-4" /> Reabrir
              </Button>
            )}
          </div>
        </div>

        {/* Info */}
        <Card>
          <CardContent className="pt-5">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Município</p>
                <p className="text-sm font-medium">{oc.municipio}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Cabo/Primária</p>
                <p className="text-sm font-medium">{oc.cabo_primaria || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">AT</p>
                <p className="text-sm font-medium">{oc.at || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Contratada</p>
                <p className="text-sm font-medium">{oc.contratada || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Equipe</p>
                {isAdmin && !isFinalizada ? (
                  <Select value={oc.equipe_id || ''} onValueChange={(v) => vincularEquipe(oc.id, v)}>
                    <SelectTrigger className="h-8 mt-1 text-xs">
                      <SelectValue placeholder="Selecionar" />
                    </SelectTrigger>
                    <SelectContent>
                      {equipes.filter(e => e.ativa).map(e => (
                        <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-sm font-medium">{oc.equipe?.nome || 'Sem equipe'}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Serviços */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Serviços Executados</h2>
            {canEdit && !isFinalizada && (
              <Dialog open={showServicoDialog} onOpenChange={setShowServicoDialog}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-1"><Plus className="h-4 w-4" /> Adicionar Serviço</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Novo Serviço</DialogTitle></DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Tipo de Serviço</Label>
                      <Select value={novoTipoId} onValueChange={setNovoTipoId}>
                        <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                        <SelectContent>
                          {tiposServico.filter(t => t.ativo).map(t => (
                            <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Observação (opcional)</Label>
                      <Textarea value={novoObs} onChange={(e) => setNovoObs(e.target.value)} rows={3} />
                    </div>
                  </div>
                  <DialogFooter>
                    <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
                    <Button onClick={handleAddServico} disabled={!novoTipoId}>Adicionar</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>

          {ocServicos.length === 0 ? (
            <Card><CardContent className="py-8 text-center text-muted-foreground text-sm">Nenhum serviço cadastrado</CardContent></Card>
          ) : (
            <div className="space-y-4">
              {ocServicos.map((sv, idx) => {
                const svFotos = fotosServico.filter(f => f.servico_id === sv.id);
                const fotosAntes = svFotos.filter(f => f.tipo_foto === 'antes');
                const fotosDepois = svFotos.filter(f => f.tipo_foto === 'depois');
                return (
                  <Card key={sv.id}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-muted-foreground">#{idx + 1}</span>
                            <CardTitle className="text-sm">{sv.tipo_servico?.nome}</CardTitle>
                          </div>
                          {sv.observacao && <p className="text-xs text-muted-foreground mt-1">{sv.observacao}</p>}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge variant="secondary" className="text-xs">{sv.status_item}</Badge>
                          {canEdit && !isFinalizada && (
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteServico(sv.id)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-xs font-medium text-muted-foreground">Fotos Antes</p>
                            {canEdit && !isFinalizada && (
                              <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => handleFotoUpload(sv.id, 'antes')}>
                                <Camera className="h-3 w-3" /> Add foto
                              </Button>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {fotosAntes.length === 0 ? (
                              <p className="text-xs text-muted-foreground italic">Nenhuma foto</p>
                            ) : fotosAntes.map(f => (
                              <div key={f.id} className="relative group">
                                <img src={f.url} alt="Antes" className="h-20 w-20 rounded-md object-cover border" />
                                {canEdit && !isFinalizada && (
                                  <button onClick={() => deleteFotoServico(f.id)}
                                    className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <X className="h-3 w-3" />
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-xs font-medium text-muted-foreground">Fotos Depois</p>
                            {canEdit && !isFinalizada && (
                              <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => handleFotoUpload(sv.id, 'depois')}>
                                <Camera className="h-3 w-3" /> Add foto
                              </Button>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {fotosDepois.length === 0 ? (
                              <p className="text-xs text-muted-foreground italic">Nenhuma foto</p>
                            ) : fotosDepois.map(f => (
                              <div key={f.id} className="relative group">
                                <img src={f.url} alt="Depois" className="h-20 w-20 rounded-md object-cover border" />
                                {canEdit && !isFinalizada && (
                                  <button onClick={() => deleteFotoServico(f.id)}
                                    className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <X className="h-3 w-3" />
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Finalização */}
        {!isFinalizada && canEdit && (
          <Card className="border-dashed">
            <CardContent className="pt-5">
              <div className="space-y-4">
                <h3 className="font-semibold">Finalizar Ocorrência</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium">Retirada de Fios</p>
                      <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => handleFotoFinalUpload('retirada_fios')}>
                        <Upload className="h-3 w-3" /> Add foto
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {retiradaFios.length === 0 ? (
                        <p className="text-xs text-muted-foreground italic">Nenhuma foto</p>
                      ) : retiradaFios.map(f => (
                        <div key={f.id} className="relative group">
                          <img src={f.url} alt="Retirada fios" className="h-20 w-20 rounded-md object-cover border" />
                          <button onClick={() => deleteFotoFinal(f.id)}
                            className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium">CTOPs</p>
                      <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => handleFotoFinalUpload('ctop')}>
                        <Upload className="h-3 w-3" /> Add foto
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {ctops.length === 0 ? (
                        <p className="text-xs text-muted-foreground italic">Nenhuma foto</p>
                      ) : ctops.map(f => (
                        <div key={f.id} className="relative group">
                          <img src={f.url} alt="CTOP" className="h-20 w-20 rounded-md object-cover border" />
                          <button onClick={() => deleteFotoFinal(f.id)}
                            className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="pt-2">
                  <Button
                    onClick={() => setShowFinalizar(true)}
                    disabled={!canFinalizar}
                    className="gap-1"
                  >
                    <CheckCircle className="h-4 w-4" /> Finalizar Ocorrência
                  </Button>
                  {!canFinalizar && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Para finalizar: adicione ao menos um serviço, cada um com fotos antes e depois.
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Fotos finais (readonly quando finalizada) */}
        {isFinalizada && (retiradaFios.length > 0 || ctops.length > 0) && (
          <div className="space-y-4">
            {retiradaFios.length > 0 && (
              <Card>
                <CardHeader className="pb-3"><CardTitle className="text-sm">Retirada de Fios</CardTitle></CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {retiradaFios.map(f => (
                      <img key={f.id} src={f.url} alt="Retirada fios" className="h-24 w-24 rounded-md object-cover border" />
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
            {ctops.length > 0 && (
              <Card>
                <CardHeader className="pb-3"><CardTitle className="text-sm">CTOPs</CardTitle></CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {ctops.map(f => (
                      <img key={f.id} src={f.url} alt="CTOP" className="h-24 w-24 rounded-md object-cover border" />
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Dialog confirmar finalização */}
        <Dialog open={showFinalizar} onOpenChange={setShowFinalizar}>
          <DialogContent>
            <DialogHeader><DialogTitle>Confirmar Finalização</DialogTitle></DialogHeader>
            <p className="text-sm text-muted-foreground">
              Tem certeza que deseja finalizar esta ocorrência? Após finalizar, o operador não poderá mais editar.
            </p>
            <DialogFooter>
              <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
              <Button onClick={handleFinalizar}>Confirmar Finalização</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
