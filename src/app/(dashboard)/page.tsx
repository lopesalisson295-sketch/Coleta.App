"use client"
import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Package, Truck, Clock, CheckCircle, AlertTriangle, Activity, CalendarIcon, X } from "lucide-react"
import dynamic from "next/dynamic"
import { StatusBadge } from "@/components/ui/status-badge"
import { useThemeStore } from "@/stores/useThemeStore"
import useSWR from 'swr'
import { Button } from "@/components/ui/button"

// Lazy load Recharts
const LazyChart = dynamic(() => import('recharts').then(mod => ({
  default: ({ data, title, isDailyView }: any) => (
    <div className="flex flex-col space-y-4">
      <h3 className="font-semibold text-sm px-2 pt-2">{title}</h3>
      <mod.ResponsiveContainer width="100%" height={250}>
        <mod.BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <mod.XAxis dataKey="name" stroke="#888888" fontSize={10} tickLine={false} axisLine={false} />
          <mod.YAxis stroke="#888888" fontSize={10} tickLine={false} axisLine={false} allowDecimals={false} />
          <mod.Tooltip cursor={{fill: 'transparent'}} />
          <mod.Legend wrapperStyle={{ fontSize: '12px' }} />
          <mod.Bar dataKey="concluidas" name="Concluídas" fill="#10B981" radius={[4, 4, 0, 0]} maxBarSize={40} />
          <mod.Bar dataKey="falhas" name="Não Realizadas" fill="#EF4444" radius={[4, 4, 0, 0]} maxBarSize={40} />
        </mod.BarChart>
      </mod.ResponsiveContainer>
    </div>
  )
})), { 
  ssr: false, 
  loading: () => <div className="h-[280px] w-full animate-pulse bg-muted/50 rounded-lg" /> 
})

const fetcher = (url: string) => fetch(url).then(res => res.json())

const meses = [
  { value: 1, label: 'Janeiro' }, { value: 2, label: 'Fevereiro' },
  { value: 3, label: 'Março' }, { value: 4, label: 'Abril' },
  { value: 5, label: 'Maio' }, { value: 6, label: 'Junho' },
  { value: 7, label: 'Julho' }, { value: 8, label: 'Agosto' },
  { value: 9, label: 'Setembro' }, { value: 10, label: 'Outubro' },
  { value: 11, label: 'Novembro' }, { value: 12, label: 'Dezembro' }
];

const anos = [2024, 2025, 2026, 2027];

export default function DashboardPage() {
  const { theme } = useThemeStore()
  const hoje = new Date();
  
  const [mesFiltro, setMesFiltro] = useState(hoje.getMonth() + 1);
  const [anoFiltro, setAnoFiltro] = useState(hoje.getFullYear());
  const [dataExata, setDataExata] = useState('');

  // Se tiver dataExata, manda ela na URL, senao manda mes/ano
  const query = dataExata 
    ? `?data=${dataExata}` 
    : `?mes=${mesFiltro}&ano=${anoFiltro}`;

  const { data, error, isLoading } = useSWR(`/api/dashboard${query}`, fetcher, {
    refreshInterval: 10000 
  })

  if (isLoading && !data) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  const { metrics, chartDataColetas, chartDataEntregas, ultimasAtividades, isDailyView } = data || { 
    metrics: { totalColetas: 0, totalEntregas: 0, coletasPendentes: 0, entregasPendentes: 0, coletasConcluidas: 0, entregasConcluidas: 0, coletasFalhas: 0, entregasFalhas: 0 },
    chartDataColetas: [], chartDataEntregas: [], ultimasAtividades: [], isDailyView: false
  }

  const totalGeral = metrics.totalColetas + metrics.totalEntregas;
  const concluidasGeral = metrics.coletasConcluidas + metrics.entregasConcluidas;
  const falhasGeral = metrics.coletasFalhas + metrics.entregasFalhas;

  const taxaSucesso = totalGeral > 0 ? ((concluidasGeral / totalGeral) * 100).toFixed(1) : 0;

  const cards = [
    { title: "Volume Total", subtitle: "Coletas + Entregas", value: totalGeral, icon: Activity, color: "text-blue-500" },
    { title: "Concluídas", subtitle: "Realizadas com Sucesso", value: concluidasGeral, icon: CheckCircle, color: "text-emerald-500" },
    { title: "Não Realizadas", subtitle: "Falhas registradas", value: falhasGeral, icon: AlertTriangle, color: "text-rose-500" },
    { title: "Taxa de Sucesso", subtitle: "Relação Concluídas/Total", value: `${taxaSucesso}%`, icon: Package, color: "text-accent" },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Desempenho analítico da operação.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 bg-muted/20 p-2 rounded-lg border border-border/50 shadow-sm">
          {/* Picker de Data Exata */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <CalendarIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input 
                type="date" 
                value={dataExata}
                onChange={(e) => setDataExata(e.target.value)}
                className="flex h-9 items-center rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring text-muted-foreground"
              />
            </div>
            {dataExata && (
              <Button variant="ghost" size="sm" onClick={() => setDataExata('')} className="h-9 px-2 text-muted-foreground">
                <X className="h-4 w-4 mr-1" /> Limpar
              </Button>
            )}
          </div>

          <div className="h-6 w-px bg-border mx-1 hidden sm:block"></div>

          {/* Pickers de Mes e Ano (desabilitados se tiver dataExata) */}
          <div className="flex gap-2 opacity-100 transition-opacity" style={{ opacity: dataExata ? 0.5 : 1 }}>
            <select 
              value={mesFiltro} 
              onChange={(e) => { setMesFiltro(Number(e.target.value)); setDataExata(''); }}
              className="flex h-9 items-center rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed"
              disabled={!!dataExata}
            >
              {meses.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
            <select 
              value={anoFiltro} 
              onChange={(e) => { setAnoFiltro(Number(e.target.value)); setDataExata(''); }}
              className="flex h-9 items-center rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed"
              disabled={!!dataExata}
            >
              {anos.map(a => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {cards.map((card, i) => (
          <Card key={i} className="glass-card">
            <CardHeader className="flex flex-row items-start justify-between pb-2">
              <div className="space-y-1">
                <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
                <CardDescription className="text-xs">{card.subtitle}</CardDescription>
              </div>
              <div className={`p-2 rounded-md bg-muted/40 ${card.color}`}>
                <card.icon className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{card.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-full lg:col-span-4 glass-card">
          <CardHeader>
            <CardTitle>Desempenho Gráfico ({isDailyView ? 'Por Hora' : 'Por Dia'})</CardTitle>
            <CardDescription>Volume de Sucessos x Falhas nas Coletas e Entregas separadamente</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <LazyChart data={chartDataColetas} title="Estatísticas de Coletas" isDailyView={isDailyView} />
            <LazyChart data={chartDataEntregas} title="Estatísticas de Entregas" isDailyView={isDailyView} />
          </CardContent>
        </Card>

        <Card className="col-span-full lg:col-span-3 glass-card overflow-hidden flex flex-col">
          <CardHeader>
            <CardTitle>Últimas Movimentações</CardTitle>
            <CardDescription>Atividades recentes no sistema geral</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 overflow-auto">
            <div className="space-y-4">
              {ultimasAtividades.map((atividade: any) => (
                <div key={atividade.id} className="flex items-center gap-4">
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${atividade.cliente ? 'bg-blue-500/10' : 'bg-indigo-500/10'}`}>
                    {atividade.cliente ? <Package className="h-4 w-4 text-blue-500" /> : <Truck className="h-4 w-4 text-indigo-500" />}
                  </div>
                  <div className="flex-1 space-y-1 min-w-0">
                    <p className="text-sm font-medium leading-none truncate">{atividade.cliente || atividade.destinatario}</p>
                    <p className="text-xs text-muted-foreground line-clamp-1">{atividade.endereco}</p>
                  </div>
                  <StatusBadge status={atividade.status} />
                </div>
              ))}
              {ultimasAtividades.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhuma atividade recente encontrada neste período.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
