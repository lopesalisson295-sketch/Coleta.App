'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import useSWR from 'swr';
import useSWRInfinite from 'swr/infinite';
import { addOfflineAction } from '@/lib/offline-sync';

const fetcher = (url: string) => fetch(url).then(res => res.json());
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StatusBadge } from '@/components/ui/status-badge';
import { ConfirmarModal } from '@/components/ui/confirmar-modal';
import {
  Search, Plus, Truck, MapPin, User, Phone, CheckCircle, Clock, Trash2, X, Camera, Map, Ban
} from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type Entrega = {
  id: string;
  destinatario: string;
  endereco: string;
  telefone: string;
  status: 'PENDENTE' | 'EM_ANDAMENTO' | 'ENTREGUE' | 'CANCELADA' | 'NAO_REALIZADA';
  observacao: string | null;
  descricaoItens: string | null;
  imagemItensUrl: string | null;
  imagemUrl: string | null;
  confirmedAt: string | null;
  createdAt: string;
  motorista: { id: string; nome: string } | null;
  latitude?: number | null;
  longitude?: number | null;
};

const STATUS_OPTIONS = ['TODOS', 'PENDENTE', 'EM_ANDAMENTO', 'AGUARDANDO_APROVACAO', 'ENTREGUE', 'NAO_REALIZADA', 'CANCELADA'];
const STATUS_LABELS: Record<string, string> = {
  TODOS: 'Todos', PENDENTE: 'Pendente', EM_ANDAMENTO: 'Em Andamento', AGUARDANDO_APROVACAO: 'Aguardando Admin',
  ENTREGUE: 'Entregue', NAO_REALIZADA: 'Não Realizada', CANCELADA: 'Cancelada',
};

export default function EntregasPage() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === 'ADMIN';

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFiltro, setStatusFiltro] = useState('TODOS');
  const [modalEntrega, setModalEntrega] = useState<Entrega | null>(null);
  const [fotoExpandida, setFotoExpandida] = useState<string | null>(null);

  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimalOrder, setOptimalOrder] = useState<{ id: string, order: number }[] | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setOptimalOrder(null);
  }, [debouncedSearch, statusFiltro]);

  const getKey = (pageIndex: number, previousPageData: Entrega[]) => {
    if (previousPageData && !previousPageData.length) return null;
    const params = new URLSearchParams({ search: debouncedSearch, status: statusFiltro, page: (pageIndex + 1).toString(), limit: '20' });
    return `/api/entregas?${params.toString()}`;
  };

  const { data, size, setSize, isValidating, mutate } = useSWRInfinite<Entrega[]>(getKey, fetcher, {
    keepPreviousData: true,
  });

  const entregasBrutas = data ? data.flat() : [];
  const isLoading = !data && isValidating;
  const isReachingEnd = data && data[data.length - 1]?.length < 20;

  const displayEntregas = [...entregasBrutas];
  if (optimalOrder && optimalOrder.length > 0) {
    displayEntregas.sort((a, b) => {
      const orderA = optimalOrder.find(o => o.id === a.id)?.order ?? 999;
      const orderB = optimalOrder.find(o => o.id === b.id)?.order ?? 999;
      return orderA - orderB;
    });
  }

  const handleOtimizarRota = async () => {
    setIsOptimizing(true);
    try {
      const pendingPoints = entregasBrutas.filter(e => e.status === 'PENDENTE');
      const res = await fetch('/api/otimizar-rota', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ points: pendingPoints })
      });
      if (!res.ok) throw new Error();
      const { ordered } = await res.json();
      setOptimalOrder(ordered);
    } catch (error) {
      alert('Não foi possível otimizar a rota. Verifique se os endereços são válidos.');
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleConfirmar = async (dados: { status: string; observacao: string; imagemUrl?: string }) => {
    if (!modalEntrega) return;
    await fetch(`/api/entregas/${modalEntrega.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...dados, confirmedAt: new Date().toISOString() }),
    });
    setModalEntrega(null);
    mutate();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir esta entrega?')) return;
    try {
      const res = await fetch(`/api/entregas/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        alert('Erro ao excluir: ' + (data.error || 'Desconhecido'));
        return;
      }
      mutate();
    } catch (e) {
      console.error(e);
      alert('Erro interno ao excluir');
    }
  };

  const handleCancelar = async (id: string) => {
    if (!confirm('Tem certeza que deseja cancelar esta entrega? Ela será marcada como CANCELADA.')) return;
    const payload = { status: 'CANCELADA' };
    if (!navigator.onLine) {
      await addOfflineAction({ url: `/api/entregas/${id}`, method: 'PUT', body: payload });
    } else {
      await fetch(`/api/entregas/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    }
    mutate();
  };

  const handleIniciar = async (entrega: Entrega) => {
    const payload = { status: 'EM_ANDAMENTO' };
    if (!navigator.onLine) {
      await addOfflineAction({ url: `/api/entregas/${entrega.id}`, method: 'PUT', body: payload });
    } else {
      await fetch(`/api/entregas/${entrega.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    }
    mutate();
  };

  const handleAprovarFoto = async (entrega: Entrega) => {
    if (!confirm('Aprovar a foto e finalizar a entrega? O cliente será notificado.')) return;
    const payload = { 
      status: 'ENTREGUE',
      confirmedAt: new Date().toISOString(),
    };
    if (!navigator.onLine) {
      await addOfflineAction({ url: `/api/entregas/${entrega.id}`, method: 'PUT', body: payload });
    } else {
      await fetch(`/api/entregas/${entrega.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    }
    mutate();
  };

  const handleFalharDireto = async (entrega: Entrega) => {
    if (!confirm('Confirmar a falha desta entrega? O cliente será notificado do cancelamento.')) return;
    const payload = { status: 'NAO_REALIZADA' };
    if (!navigator.onLine) {
      await addOfflineAction({ url: `/api/entregas/${entrega.id}`, method: 'PUT', body: payload });
    } else {
      await fetch(`/api/entregas/${entrega.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    }
    mutate();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Entregas</h1>
          <p className="text-muted-foreground">
            {isAdmin ? 'Gerencie todas as entregas da operação.' : 'Suas entregas atribuídas.'}
          </p>
        </div>
        {isAdmin && (
          <Link href="/entregas/nova">
            <Button className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Nova Entrega
            </Button>
          </Link>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por destinatário ou endereço..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="flex gap-2 overflow-x-auto pb-1 sm:pb-0 w-full sm:w-auto">
            {STATUS_OPTIONS.map((s) => (
              <button
                key={s}
                onClick={() => setStatusFiltro(s)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                  statusFiltro === s
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                {STATUS_LABELS[s]}
              </button>
            ))}
          </div>

          {!isAdmin && statusFiltro === 'PENDENTE' && (
            <Button 
              onClick={handleOtimizarRota} 
              disabled={isOptimizing || entregasBrutas.filter(e => e.status === 'PENDENTE').length < 2}
              className="w-full sm:w-auto gap-2 bg-emerald-600 hover:bg-emerald-700"
            >
              {isOptimizing ? <Clock className="w-4 h-4 animate-spin" /> : <Map className="w-4 h-4" />}
              Otimizar Rota
            </Button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-28 rounded-xl bg-muted/40 animate-pulse" />
          ))}
        </div>
      ) : displayEntregas.length === 0 ? (
        <Card className="p-12 text-center">
          <Truck className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
          <p className="font-medium">Nenhuma entrega encontrada</p>
          <p className="text-sm text-muted-foreground mt-1">Ajuste os filtros ou crie uma nova entrega.</p>
        </Card>
      ) : (
        <AnimatePresence>
          <div className="grid gap-3">
            {displayEntregas.map((entrega, index) => (
              <motion.div
                key={entrega.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className={`p-4 transition-all hover:shadow-md ${
                  entrega.status === 'ENTREGUE' ? 'border-emerald-500/40 bg-emerald-500/5' :
                  entrega.status === 'NAO_REALIZADA' ? 'border-rose-500/40 bg-rose-500/5' :
                  entrega.status === 'EM_ANDAMENTO' && entrega.imagemUrl ? (
                    entrega.observacao?.includes('[FALHA]') ? 'border-amber-500/40 bg-amber-500/5 ring-1 ring-amber-500/20' : 'border-teal-500/40 bg-teal-500/5 ring-1 ring-teal-500/20'
                  ) :
                  'hover:border-primary/30'
                }`}>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                            <Truck className="w-4 h-4 text-primary" />
                          </div>
                          <div>
                            <p className="font-semibold text-sm leading-tight">{entrega.destinatario}</p>
                            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                              <MapPin className="w-3 h-3" />
                              {entrega.endereco}
                            </p>
                          </div>
                        </div>
                        <StatusBadge status={entrega.status} item={entrega} />
                      </div>

                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {entrega.telefone}
                        </span>
                        {entrega.motorista && (
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {entrega.motorista.nome}
                          </span>
                        )}
                        {entrega.ajudante && (
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <User className="w-3 h-3" />
                            Aux: {entrega.ajudante.nome}
                          </span>
                        )}
                        {entrega.veiculo && (
                          <span className="flex items-center gap-1">
                            <Truck className="w-3 h-3" />
                            {entrega.veiculo.nome} ({entrega.veiculo.placa})
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {entrega.createdAt && !isNaN(new Date(entrega.createdAt).getTime()) ? formatDistanceToNow(new Date(entrega.createdAt), { addSuffix: true, locale: ptBR }) : 'Sem data'}
                        </span>
                      </div>

                      {entrega.observacao && (
                        <p className="text-xs text-muted-foreground italic bg-muted/40 rounded px-2 py-1">
                          &ldquo;{entrega.observacao}&rdquo;
                        </p>
                      )}

                      {(entrega.descricaoItens || entrega.imagemItensUrl) && (
                        <div className="mt-3 p-3 rounded-lg border bg-blue-50/50 dark:bg-blue-950/20 border-blue-100 dark:border-blue-900/30 flex flex-col sm:flex-row gap-3">
                          {entrega.imagemItensUrl && (
                            <div 
                              className="h-16 w-16 shrink-0 rounded-md overflow-hidden border border-blue-200/50 cursor-pointer hover:opacity-80 transition-opacity"
                              onClick={() => setFotoExpandida(entrega.imagemItensUrl!)}
                            >
                              <img src={entrega.imagemItensUrl} alt="Item a transportar" className="h-full w-full object-cover" />
                            </div>
                          )}
                          <div className="flex-1">
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-1 block">Item a transportar</span>
                            {entrega.descricaoItens ? (
                              <p className="text-xs text-slate-700 dark:text-slate-300 font-medium leading-relaxed">
                                {entrega.descricaoItens}
                              </p>
                            ) : (
                              <p className="text-xs text-muted-foreground italic">Ver foto anexada</p>
                            )}
                          </div>
                        </div>
                      )}

                      {entrega.imagemUrl && (
                        <div className="mt-2">
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">Comprovante de Entrega</span>
                          <div 
                            className="h-14 w-14 sm:h-16 sm:w-16 rounded-md overflow-hidden border cursor-pointer hover:opacity-80 transition-opacity ring-1 ring-black/5"
                            onClick={() => setFotoExpandida(entrega.imagemUrl!)}
                          >
                            <img src={entrega.imagemUrl} alt="Comprovante" className="h-full w-full object-cover" />
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      {entrega.status === 'PENDENTE' && (
                        <Button size="sm" variant="outline" onClick={() => handleIniciar(entrega)}
                          className="text-blue-500 border-blue-500/30 hover:bg-blue-500/10">
                          Iniciar Rota
                        </Button>
                      )}
                      {((entrega.status === 'EM_ANDAMENTO' && !entrega.imagemUrl) || (isAdmin && entrega.status === 'PENDENTE')) && (
                        <Button size="sm" onClick={() => setModalEntrega(entrega)} className="gap-1 bg-amber-500 hover:bg-amber-600 text-white">
                          <Camera className="w-4 h-4" />
                          {isAdmin ? 'Registrar / Falhar' : 'Enviar Foto'}
                        </Button>
                      )}
                      {entrega.status === 'EM_ANDAMENTO' && entrega.imagemUrl && (
                        isAdmin ? (
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => handleAprovarFoto(entrega)}
                              className="gap-1 bg-emerald-500 hover:bg-emerald-600 text-white">
                              <CheckCircle className="w-4 h-4" />
                              Aprovar
                            </Button>
                            <Button size="sm" onClick={() => handleFalharDireto(entrega)}
                              className="gap-1 bg-rose-500 hover:bg-rose-600 text-white">
                              <X className="w-4 h-4" />
                              Falhar
                            </Button>
                          </div>
                        ) : (
                          <div className="text-xs font-medium text-amber-600 bg-amber-500/10 px-3 py-1.5 rounded-md border border-amber-500/20">
                            Aguardando Admin
                          </div>
                        )
                      )}
                      {isAdmin && (
                        <div className="flex gap-2">
                          {entrega.status !== 'CANCELADA' && entrega.status !== 'ENTREGUE' && entrega.status !== 'NAO_REALIZADA' && (
                            <Button
                              variant="outline" size="sm"
                              className="h-8 w-8 p-0 border-orange-500/20 hover:bg-orange-500/10"
                              onClick={() => handleCancelar(entrega.id)}
                              title="Cancelar Entrega"
                            >
                              <Ban className="h-4 w-4 text-orange-500" />
                            </Button>
                          )}
                          <Button
                            variant="outline" size="sm"
                            className="h-8 w-8 p-0 border-rose-500/20 hover:bg-rose-500/10"
                            onClick={() => handleDelete(entrega.id)}
                            title="Excluir Entrega"
                          >
                            <Trash2 className="h-4 w-4 text-rose-500" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </AnimatePresence>
      )}

      {displayEntregas.length > 0 && !isReachingEnd && (
        <div className="flex justify-center pt-4">
          <Button variant="outline" onClick={() => setSize(size + 1)} disabled={isValidating}>
            {isValidating ? 'Carregando...' : 'Carregar mais'}
          </Button>
        </div>
      )}

      <AnimatePresence>
        {fotoExpandida && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4"
            onClick={() => setFotoExpandida(null)}
          >
            <div className="relative max-w-4xl max-h-[90vh] w-full h-full flex items-center justify-center">
              <Button 
                variant="ghost" 
                size="icon" 
                className="absolute top-2 right-2 md:top-4 md:right-4 text-white hover:bg-white/20 bg-black/40 rounded-full"
                onClick={(e) => { e.stopPropagation(); setFotoExpandida(null); }}
              >
                <X className="h-6 w-6" />
              </Button>
              <motion.img 
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.95 }}
                src={fotoExpandida} 
                alt="Comprovante em tela cheia" 
                className="max-w-full max-h-full object-contain rounded-md shadow-2xl border border-white/10" 
                onClick={(e) => e.stopPropagation()} 
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {modalEntrega && (
        <ConfirmarModal
          titulo={`Registrar: ${modalEntrega.destinatario}`}
          isOpen={!!modalEntrega}
          onClose={() => setModalEntrega(null)}
          onConfirmar={handleConfirmar}
          tipo="entrega"
          isAdmin={isAdmin}
        />
      )}
    </div>
  );
}
