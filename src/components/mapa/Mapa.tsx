'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useThemeStore } from '@/stores/useThemeStore';

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

// Correção para os ícones padrão do Leaflet no Next.js (utilizando DivIcons premium customizados)
const createCustomMarker = (status: string, isCollection: boolean) => {
  let colorClass = 'bg-slate-400';
  let pulseClass = '';

  switch (status) {
    case 'PENDENTE':
      colorClass = 'bg-amber-500 border-amber-300';
      pulseClass = 'animate-ping opacity-75';
      break;
    case 'EM_ANDAMENTO':
      colorClass = 'bg-sky-500 border-sky-300';
      pulseClass = 'animate-pulse opacity-90';
      break;
    case 'COLETADA':
    case 'ENTREGUE':
      colorClass = 'bg-emerald-500 border-emerald-300';
      break;
    case 'CANCELADA':
    case 'NAO_REALIZADA':
      colorClass = 'bg-rose-500 border-rose-300';
      break;
  }

  const iconHtml = `
    <div class="relative flex items-center justify-center w-8 h-8 rounded-full border-2 border-white shadow-lg ${colorClass} text-white">
      ${isCollection ? '📦' : '🚚'}
      <div class="absolute -inset-0.5 rounded-full ${pulseClass} ${colorClass} -z-10 opacity-30"></div>
    </div>
  `;

  return L.divIcon({
    html: iconHtml,
    className: 'custom-leaflet-marker',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16]
  });
};

// Componente para mudar a visão do mapa dinamicamente com animação
function ChangeMapView({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    if (center && center[0] !== 0 && center[1] !== 0) {
      map.flyTo(center, zoom, {
        animate: true,
        duration: 1.5
      });
    }
  }, [center, zoom, map]);
  return null;
}

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

interface MapaProps {
  itens: ItemMapa[];
  selectedItem: ItemMapa | null;
  onSelectItem: (item: ItemMapa) => void;
}

// Helper: retorna cores inline baseadas no status (funciona dentro do HTML bruto do Leaflet)
function getStatusInlineStyle(status: string) {
  switch (status) {
    case 'PENDENTE':
      return { bg: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: 'rgba(245,158,11,0.3)' };
    case 'EM_ANDAMENTO':
      return { bg: 'rgba(14,165,233,0.15)', color: '#0ea5e9', border: 'rgba(14,165,233,0.3)' };
    case 'COLETADA':
    case 'ENTREGUE':
      return { bg: 'rgba(16,185,129,0.15)', color: '#10b981', border: 'rgba(16,185,129,0.3)' };
    default:
      return { bg: 'rgba(244,63,94,0.15)', color: '#f43f5e', border: 'rgba(244,63,94,0.3)' };
  }
}

export default function Mapa({ itens, selectedItem, onSelectItem }: MapaProps) {
  const { theme } = useThemeStore();
  const isDark = theme === 'dark';

  const defaultCenter: [number, number] = [-23.55052, -46.633308]; // São Paulo, Brasil
  const [mapCenter, setMapCenter] = useState<[number, number]>(defaultCenter);
  const [mapZoom, setMapZoom] = useState(13);

  // Cores do tema para popup (inline, não Tailwind)
  const popupText = isDark ? '#f1f5f9' : '#0f172a';
  const popupMuted = isDark ? '#94a3b8' : '#64748b';
  const popupBorder = isDark ? '#1e293b' : '#e2e8f0';
  const popupSecondaryBg = isDark ? '#1e293b' : '#f1f5f9';

  // Atualiza o centro do mapa quando um item é selecionado na barra lateral
  useEffect(() => {
    if (selectedItem && selectedItem.latitude && selectedItem.longitude) {
      setMapCenter([selectedItem.latitude, selectedItem.longitude]);
      setMapZoom(15);
    }
  }, [selectedItem]);

  return (
    <div className="w-full h-full rounded-xl overflow-hidden shadow-inner border bg-card relative min-h-[500px]">
      <MapContainer
        center={defaultCenter}
        zoom={12}
        scrollWheelZoom={true}
        className="w-full h-full z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Centralizador animado */}
        <ChangeMapView center={mapCenter} zoom={mapZoom} />

        {/* Marcadores */}
        {itens.map((item) => {
          if (!item.latitude || !item.longitude) return null;
          
          const statusStyle = getStatusInlineStyle(item.status);
          const tipoColor = item.tipo === 'coleta' ? '#3b82f6' : '#10b981';
          const tipoLabel = item.tipo === 'coleta' ? 'Coleta' : 'Entrega';
          const tipoEmoji = item.tipo === 'coleta' ? '📦' : '🚚';

          return (
            <Marker
              key={`${item.tipo}-${item.id}`}
              position={[item.latitude, item.longitude]}
              icon={createCustomMarker(item.status, item.tipo === 'coleta')}
              eventHandlers={{
                click: () => onSelectItem(item)
              }}
            >
              <Popup className="custom-leaflet-popup">
                <div style={{ 
                  padding: '4px', 
                  minWidth: '220px', 
                  fontSize: '12px',
                  color: popupText,
                  fontFamily: 'Inter, system-ui, sans-serif'
                }}>
                  {/* Header do popup */}
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    borderBottom: `1px solid ${popupBorder}`,
                    paddingBottom: '8px',
                    marginBottom: '8px'
                  }}>
                    <span style={{ 
                      fontWeight: 700, 
                      color: tipoColor, 
                      fontSize: '11px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      {tipoEmoji} {tipoLabel}
                    </span>
                    <span style={{
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '9px',
                      fontWeight: 700,
                      backgroundColor: statusStyle.bg,
                      color: statusStyle.color,
                      border: `1px solid ${statusStyle.border}`
                    }}>
                      {traduzirStatus(item.status)}
                    </span>
                  </div>

                  {/* Nome e endereço */}
                  <div style={{ marginBottom: '6px' }}>
                    <p style={{ 
                      fontWeight: 700, 
                      fontSize: '13px', 
                      color: popupText,
                      margin: '0 0 2px 0'
                    }}>
                      {item.cliente || item.destinatario}
                    </p>
                    <p style={{ 
                      color: popupMuted, 
                      fontSize: '10px', 
                      lineHeight: '1.5',
                      margin: 0
                    }}>
                      {item.endereco}
                    </p>
                  </div>

                  {/* Motorista */}
                  {item.motorista && (
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '6px',
                      paddingTop: '6px',
                      borderTop: `1px solid ${popupBorder}`,
                      fontSize: '10px',
                      color: popupMuted,
                      marginBottom: '6px'
                    }}>
                      <span>🧑‍✈️</span>
                      <span>Mot.: <strong style={{ color: popupText, fontWeight: 600 }}>{item.motorista.nome}</strong></span>
                      {item.veiculo && (
                        <span style={{ 
                          fontSize: '9px', 
                          fontFamily: 'monospace',
                          backgroundColor: popupSecondaryBg,
                          padding: '2px 6px',
                          borderRadius: '3px',
                          color: popupMuted
                        }}>
                          {item.veiculo.placa}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Observação */}
                  {item.observacao && (
                    <div style={{
                      backgroundColor: popupSecondaryBg,
                      border: `1px solid ${popupBorder}`,
                      borderLeft: `3px solid ${popupMuted}`,
                      padding: '6px 8px',
                      borderRadius: '4px',
                      fontSize: '9px',
                      color: popupMuted,
                      fontStyle: 'italic',
                      marginBottom: '6px'
                    }}>
                      obs: {item.observacao}
                    </div>
                  )}

                  {/* Botão GPS */}
                  <div style={{ paddingTop: '8px' }}>
                    <a 
                      href={`https://maps.google.com/?q=${encodeURIComponent(item.endereco)}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        backgroundColor: '#10b981',
                        color: '#ffffff',
                        borderRadius: '6px',
                        padding: '8px 0',
                        fontWeight: 700,
                        fontSize: '11px',
                        textDecoration: 'none',
                        width: '100%',
                        textAlign: 'center'
                      }}
                    >
                      🧭 Rotear no GPS
                    </a>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Caixa de Legenda Flutuante — Cores sólidas explícitas */}
      <div 
        className="absolute bottom-4 right-4 z-[400] rounded-lg shadow-xl border"
        style={{
          backgroundColor: isDark ? 'rgba(15,23,42,0.95)' : 'rgba(255,255,255,0.95)',
          backdropFilter: 'blur(12px)',
          borderColor: isDark ? '#1e293b' : '#e2e8f0',
          padding: '12px',
          maxWidth: '155px',
          fontSize: '10px'
        }}
      >
        <p style={{ 
          fontWeight: 700, 
          color: popupText,
          borderBottom: `1px solid ${popupBorder}`,
          paddingBottom: '6px',
          marginBottom: '6px'
        }}>
          Status da Carga
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#f59e0b', flexShrink: 0 }} />
            <span style={{ color: popupMuted }}>Pendente</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#0ea5e9', flexShrink: 0 }} />
            <span style={{ color: popupMuted }}>Em Trânsito</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#10b981', flexShrink: 0 }} />
            <span style={{ color: popupMuted }}>Concluído</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#f43f5e', flexShrink: 0 }} />
            <span style={{ color: popupMuted }}>Não Realizada</span>
          </div>
        </div>
      </div>
    </div>
  );
}
