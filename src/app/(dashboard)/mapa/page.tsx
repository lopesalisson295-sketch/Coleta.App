'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from '@/stores/useToastStore';
import { 
  MapPin, Package, Truck, Search, Compass, RefreshCw, Filter, ZoomIn 
} from 'lucide-react';

// Carrega o componente Mapa dinamicamente desativando SSR
// Isso é essencial no Next.js pois o Leaflet precisa dos objetos 'window' e 'document' do navegador
const Mapa = dynamic(() => import('@/components/mapa/Mapa'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex flex-col items-center justify-center bg-card border rounded-xl min-h-[500px] gap-2">
      <RefreshCw className="h-8 w-8 text-primary animate-spin" />
      <p className="text-sm text-muted-foreground">Iniciando motor de mapas Leaflet...</p>
    </div>
  )
});

interface ItemMapa {
  id: string;
  cliente?: string;
  destinatario?: string;
  endereco: string;
  status: string;
  telefone: string;
  observacao?: string | null;
  latitude: number;
  longitude: number;
  tipo: 'coleta' | 'entrega';
  motorista?: { nome: string } | null;
  veiculo?: { nome: string; placa: string } | null;
}

// Hashing determinístico para plotar coordenadas estáveis em São Paulo quando Nominatim falha/está offline
function getDeterministicCoords(address: string, isCollection: boolean) {
  let hash = 0;
  for (let i = 0; i < address.length; i++) {
    hash = address.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const latOffset = (Math.abs(hash) % 700) / 10000; // 0.00 a 0.07
  const lngOffset = (Math.abs(hash >> 3) % 700) / 10000;
  
// Centraliza em torno do centro expandido de SP
  const baseLat = -23.54 - (isCollection ? 0.005 : 0.035);
  const baseLng = -46.62 - (isCollection ? 0.005 : 0.045);
  
  return {
    lat: baseLat - latOffset,
    lng: baseLng - lngOffset
  };
}

const traduzirStatus = (status: string) => {
  const statusMap: Record<string, string> = {
    PENDENTE: 'Pendente',
    EM_ANDAMENTO: 'Em Trânsito',
    COLETADA: 'Coletada',
    ENTREGUE: 'Entregue',
    CANCELADA: 'Cancelada',
    NAO_REALIZADA: 'Não Realizada',
  };
  return statusMap[status] || status;
};

export default function MapaPage() {
  const [itens, setItens] = useState<ItemMapa[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<ItemMapa | null>(null);

  // Filtros
  const [busca, setBusca] = useState('');
  const [statusFiltro, setStatusFiltro] = useState<'TODOS' | 'PENDENTE' | 'EM_ANDAMENTO' | 'CONCLUIDO'>('TODOS');
  const [tipoFiltro, setTipoFiltro] = useState<'TODOS' | 'COLETA' | 'ENTREGA'>('TODOS');

  const carregarDados = async () => {
    setLoading(true);
    try {
      // Busca coletas e entregas em paralelo
      const [resColetas, resEntregas] = await Promise.all([
        fetch('/api/coletas'),
        fetch('/api/entregas')
      ]);

      if (resColetas.ok && resEntregas.ok) {
        const coletasRaw = await resColetas.json();
        const entregasRaw = await resEntregas.json();

        // Converte em um array único e padroniza os campos para o mapa
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const coletasFormato: ItemMapa[] = coletasRaw.map((c: any) => ({
          ...c,
          tipo: 'coleta' as const,
          latitude: c.latitude || 0,
          longitude: c.longitude || 0,
        }));

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const entregasFormato: ItemMapa[] = entregasRaw.map((e: any) => ({
          ...e,
          tipo: 'entrega' as const,
          latitude: e.latitude || 0,
          longitude: e.longitude || 0,
        }));

        const todosItens = [...coletasFormato, ...entregasFormato];

        // Processa geolocalização no frontend sob demanda
        const itensGeocodificados = await Promise.all(
          todosItens.map(async (item) => {
            if (item.latitude && item.longitude) {
              return item;
            }

            // Geocodificação usando Nominatim OpenStreetMap grátis
            const cacheKey = `geo_${item.endereco}`;
            const cached = localStorage.getItem(cacheKey);
            
            if (cached) {
              try {
                const parsed = JSON.parse(cached);
                return { ...item, latitude: parsed.lat, longitude: parsed.lng };
              } catch {}
            }

            try {
              // Adiciona cidade e país para Nominatim focar no local correto
              const queryAddress = item.endereco.toLowerCase().includes('são paulo')
                ? item.endereco
                : `${item.endereco}, São Paulo, SP, Brasil`;

              const geoRes = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(queryAddress)}&limit=1`,
                {
                  headers: {
                    'Accept': 'application/json',
                    'User-Agent': 'ColetaMax/1.0 (contact: support@coletamax.com)'
                  }
                }
              );

              if (geoRes.ok) {
                const geoData = await geoRes.json();
                if (geoData && geoData.length > 0) {
                  const lat = parseFloat(geoData[0].lat);
                  const lng = parseFloat(geoData[0].lon);
                  
                  localStorage.setItem(cacheKey, JSON.stringify({ lat, lng }));
                  return { ...item, latitude: lat, longitude: lng };
                }
              }
            } catch (e) {
              console.warn('Erro ao geocodificar no Nominatim. Usando coordenadas locais estáveis.', e);
            }

            // Fallback se Nominatim falhar ou der timeout
            const fallback = getDeterministicCoords(item.endereco, item.tipo === 'coleta');
            return { ...item, latitude: fallback.lat, longitude: fallback.lng };
          })
        );

        setItens(itensGeocodificados);
      } else {
        toast('Erro ao buscar registros no servidor', { type: 'error' });
      }
    } catch (error) {
      console.error('Erro na requisição das cargas:', error);
      toast('Falha ao conectar com a API', { type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, []);

  // Filtra itens na barra lateral
  const itensFiltrados = itens.filter((item) => {
    // Filtro de busca textual
    const stringBusca = busca.toLowerCase();
    const nome = (item.cliente || item.destinatario || '').toLowerCase();
    const endereco = item.endereco.toLowerCase();
    const matchBusca = nome.includes(stringBusca) || endereco.includes(stringBusca);

    // Filtro por Tipo (Coleta ou Entrega)
    const matchTipo = tipoFiltro === 'TODOS' || item.tipo.toUpperCase() === tipoFiltro;

    // Filtro por Status
    let matchStatus = false;
    if (statusFiltro === 'TODOS') {
      matchStatus = true;
    } else if (statusFiltro === 'PENDENTE') {
      matchStatus = item.status === 'PENDENTE';
    } else if (statusFiltro === 'EM_ANDAMENTO') {
      matchStatus = item.status === 'EM_ANDAMENTO';
    } else if (statusFiltro === 'CONCLUIDO') {
      matchStatus = item.status === 'COLETADA' || item.status === 'ENTREGUE';
    }

    return matchBusca && matchTipo && matchStatus;
  });

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'PENDENTE':
        return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      case 'EM_ANDAMENTO':
        return 'bg-sky-500/10 text-sky-500 border-sky-500/20';
      case 'COLETADA':
      case 'ENTREGUE':
        return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
      default:
        return 'bg-rose-500/10 text-rose-500 border-rose-500/20';
    }
  };

  return (
    <div className="space-y-6 pb-12 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Compass className="h-6 w-6 text-accent animate-pulse" />
            Mapa Operacional em Tempo Real
          </h1>
          <p className="text-muted-foreground mt-0.5">
            Monitore a localização geocodificada de todas as coletas e entregas no centro urbano de São Paulo.
          </p>
        </div>
        <Button 
          onClick={carregarDados} 
          disabled={loading}
          variant="outline" 
          size="sm" 
          className="gap-2 h-9"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Atualizar Cargas
        </Button>
      </div>

      {/* Main Grid: Lateral List and Central Map */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-stretch">
        
        {/* Painel Lateral: Filtros e Listagem */}
        <Card className="lg:col-span-1 flex flex-col h-[650px] overflow-hidden shadow-md">
          <CardHeader className="pb-3 border-b space-y-3 shrink-0">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                <Filter className="w-4 h-4 text-accent" />
                Filtros Dinâmicos
              </CardTitle>
              <span className="text-[10px] bg-secondary px-2 py-0.5 rounded-full font-bold text-muted-foreground font-mono">
                {itensFiltrados.length} cargas
              </span>
            </div>

            {/* Busca de texto */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                placeholder="Endereço ou Cliente..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="pl-8 bg-secondary text-foreground text-xs h-8.5 border-muted-foreground/20 focus:border-primary/50 transition-colors"
              />
            </div>

            {/* Abas de Filtros de Tipo */}
            <div className="grid grid-cols-3 gap-1 bg-secondary p-0.5 rounded-lg border border-muted-foreground/15 text-[10px] font-bold text-center">
              <button
                onClick={() => setTipoFiltro('TODOS')}
                className={`py-1 rounded-md transition-all ${tipoFiltro === 'TODOS' ? 'bg-background shadow text-primary' : 'text-muted-foreground'}`}
              >
                Todas
              </button>
              <button
                onClick={() => setTipoFiltro('COLETA')}
                className={`py-1 rounded-md transition-all ${tipoFiltro === 'COLETA' ? 'bg-background shadow text-blue-500' : 'text-muted-foreground'}`}
              >
                Coletas
              </button>
              <button
                onClick={() => setTipoFiltro('ENTREGA')}
                className={`py-1 rounded-md transition-all ${tipoFiltro === 'ENTREGA' ? 'bg-background shadow text-emerald-500' : 'text-muted-foreground'}`}
              >
                Entregas
              </button>
            </div>

            {/* Abas de Filtros de Status */}
            <div className="grid grid-cols-4 gap-0.5 bg-secondary p-0.5 rounded-lg border border-muted-foreground/15 text-[9px] font-bold text-center">
              {(['TODOS', 'PENDENTE', 'EM_ANDAMENTO', 'CONCLUIDO'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFiltro(st)}
                  className={`py-1.5 rounded-md transition-all uppercase ${statusFiltro === st ? 'bg-background shadow text-primary' : 'text-muted-foreground'}`}
                >
                  {st === 'EM_ANDAMENTO' ? 'Trânsito' : st === 'CONCLUIDO' ? 'Feito' : st}
                </button>
              ))}
            </div>
          </CardHeader>

          {/* Listagem de Itens */}
          <CardContent className="flex-1 p-0 overflow-y-auto divide-y divide-border/60">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-2">
                <RefreshCw className="h-6 w-6 text-primary animate-spin" />
                <p className="text-[11px] text-muted-foreground">Processando coordenadas...</p>
              </div>
            ) : itensFiltrados.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center text-muted-foreground px-4">
                <MapPin className="w-8 h-8 opacity-25 mb-2.5" />
                <p className="text-xs font-semibold">Nenhuma carga encontrada</p>
                <p className="text-[10px] opacity-75 mt-0.5 leading-tight">Altere seus parâmetros de filtros.</p>
              </div>
            ) : (
              itensFiltrados.map((item) => (
                <div
                  key={`${item.tipo}-${item.id}`}
                  onClick={() => setSelectedItem(item)}
                  className={`p-3.5 hover:bg-secondary/40 transition-all cursor-pointer flex gap-3 text-xs leading-normal relative group ${
                    selectedItem?.id === item.id ? 'bg-secondary border-l-4 border-accent' : ''
                  }`}
                >
                  {/* Ícone Indicador */}
                  <div className={`w-8 h-8 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                    item.tipo === 'coleta' 
                      ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' 
                      : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                  }`}>
                    {item.tipo === 'coleta' ? <Package className="w-4 h-4" /> : <Truck className="w-4 h-4" />}
                  </div>

                  {/* Informações */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex justify-between items-start gap-2">
                      <p className="font-bold text-primary truncate leading-tight">
                        {item.cliente || item.destinatario}
                      </p>
                      <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold border shrink-0 ${getStatusStyle(item.status)}`}>
                        {traduzirStatus(item.status)}
                      </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground truncate leading-relaxed">
                      {item.endereco}
                    </p>
                    
                    {item.motorista && (
                      <p className="text-[9px] text-muted-foreground/90 font-medium">
                        Mot.: <span className="text-primary font-semibold">{item.motorista.nome}</span>
                      </p>
                    )}
                  </div>

                  {/* Botão flutuante rápido para Zoom no item */}
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedItem(item);
                    }}
                    className="absolute right-3 bottom-3 opacity-0 group-hover:opacity-100 transition-opacity bg-accent text-accent-foreground p-1 rounded-md shadow"
                    title="Aproximar no mapa"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Mapa centralizado */}
        <Card className="lg:col-span-3 h-[650px] overflow-hidden shadow-md border relative">
          <Mapa 
            itens={itensFiltrados} 
            selectedItem={selectedItem} 
            onSelectItem={setSelectedItem} 
          />
        </Card>
      </div>
    </div>
  );
}
