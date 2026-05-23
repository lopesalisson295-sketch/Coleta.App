'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/stores/useToastStore';
import { 
  Smartphone, MessageSquare, Save, Loader2, AlertCircle, 
  CheckCircle2, Info, ToggleLeft, ToggleRight, Play, Eye, Zap, TestTube2
} from 'lucide-react';

interface Settings {
  telefoneGrupo: string;
  
  rotaIniciarClienteAtivo: boolean;
  rotaIniciarClienteTemplate: string;
  rotaIniciarGrupoAtivo: boolean;
  rotaIniciarGrupoTemplate: string;

  conclusaoClienteAtivo: boolean;
  conclusaoClienteTemplate: string;
  conclusaoGrupoAtivo: boolean;
  conclusaoGrupoTemplate: string;

  cancelamentoClienteAtivo: boolean;
  cancelamentoClienteTemplate: string;
  cancelamentoGrupoAtivo: boolean;
  cancelamentoGrupoTemplate: string;
}

interface DadosTeste {
  tipo: 'rota_iniciar' | 'conclusao' | 'cancelamento';
  cliente: string;
  endereco: string;
  telefoneCliente: string;
  motoristaNome: string;
  ajudanteNome: string;
  veiculoNome: string;
  observacao: string;
}

export default function AutomacaoPage() {
  const [settings, setSettings] = useState<Settings>({
    telefoneGrupo: '',
    rotaIniciarClienteAtivo: true,
    rotaIniciarClienteTemplate: '',
    rotaIniciarGrupoAtivo: true,
    rotaIniciarGrupoTemplate: '',
    conclusaoClienteAtivo: true,
    conclusaoClienteTemplate: '',
    conclusaoGrupoAtivo: true,
    conclusaoGrupoTemplate: '',
    cancelamentoClienteAtivo: true,
    cancelamentoClienteTemplate: '',
    cancelamentoGrupoAtivo: true,
    cancelamentoGrupoTemplate: '',
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);

  // Estados do Painel de Teste
  const [dadosTeste, setDadosTeste] = useState<DadosTeste>({
    tipo: 'rota_iniciar',
    cliente: 'Cliente Exemplo',
    endereco: 'Rua Augusta, 1200 - Consolação, São Paulo',
    telefoneCliente: '11999998888',
    motoristaNome: 'Carlos Silva',
    ajudanteNome: 'Pedro Santos',
    veiculoNome: 'Fiorino (ABC-1234)',
    observacao: '',
  });
  const [enviandoTeste, setEnviandoTeste] = useState(false);
  const [resultadoTeste, setResultadoTeste] = useState<string | null>(null);

  useEffect(() => {
    carregarConfiguracoes();
  }, []);

  const carregarConfiguracoes = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/automacao');
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
      } else {
        setErro('Erro ao carregar configurações');
      }
    } catch (error) {
      console.error(error);
      setErro('Erro de conexão ao carregar configurações');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setSettings(prev => ({ ...prev, [name]: value }));
    setErro(null);
    setSucesso(false);
  };

  const handleToggle = (key: keyof Settings) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] as any }));
    setErro(null);
    setSucesso(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setErro(null);
    setSucesso(false);

    try {
      const res = await fetch('/api/automacao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      if (res.ok) {
        setSucesso(true);
        toast('Configurações salvas com sucesso!', { type: 'success' });
        setTimeout(() => setSucesso(false), 3000);
      } else {
        const data = await res.json();
        setErro(data.error || 'Erro ao salvar configurações');
      }
    } catch (error) {
      console.error(error);
      setErro('Erro de conexão com o servidor');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTesteChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setDadosTeste(prev => ({ ...prev, [name]: value }));
    setResultadoTeste(null);
  };

  const handleDispararTeste = async () => {
    setEnviandoTeste(true);
    setResultadoTeste(null);
    try {
      const res = await fetch('/api/automacao/testar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dadosTeste),
      });

      const data = await res.json();

      if (res.ok && data.sucesso) {
        setResultadoTeste(data.log || 'Mensagens disparadas com sucesso!');
        toast('Teste de automação disparado com sucesso!', { 
          type: 'success',
          description: 'Verifique o WhatsApp do destinatário e do grupo.' 
        });
      } else {
        setResultadoTeste(`Erro: ${data.error || 'Falha ao disparar teste.'}`);
        toast(data.error || 'Erro ao disparar teste', { type: 'error' });
      }
    } catch (error) {
      console.error(error);
      setResultadoTeste('Erro de conexão com o servidor.');
      toast('Erro de rede ao disparar teste', { type: 'error' });
    } finally {
      setEnviandoTeste(false);
    }
  };

  const tipoLabels: Record<string, { label: string; emoji: string; desc: string }> = {
    rota_iniciar: { label: 'Rota Iniciada', emoji: '🚀', desc: 'Simula quando uma coleta/entrega muda para Em Andamento' },
    conclusao: { label: 'Carga Concluída', emoji: '✅', desc: 'Simula quando uma coleta/entrega é finalizada com sucesso' },
    cancelamento: { label: 'Carga Cancelada', emoji: '❌', desc: 'Simula quando uma coleta/entrega é cancelada ou não realizada' },
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-3">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
        <p className="text-sm text-muted-foreground">Carregando configurações de automação...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Smartphone className="h-6 w-6 text-accent" />
            Automação de WhatsApp
          </h1>
          <p className="text-muted-foreground mt-0.5">
            Configure os gatilhos e templates de mensagens que são disparados automaticamente.
          </p>
        </div>
        <Button 
          onClick={handleSubmit}
          disabled={isSaving}
          className="gap-2 shrink-0 bg-primary hover:bg-primary/90 text-primary-foreground shadow-md transition-all duration-200"
        >
          {isSaving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {isSaving ? 'Salvando...' : 'Salvar Configurações'}
        </Button>
      </div>

      {erro && (
        <div className="flex items-center gap-2.5 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 animate-in fade-in duration-200">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span className="text-sm font-medium">{erro}</span>
        </div>
      )}

      {sucesso && (
        <div className="flex items-center gap-2.5 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 animate-in fade-in duration-200">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <span className="text-sm font-medium">Configurações de automação salvas com sucesso!</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lado esquerdo: Gatilhos */}
        <div className="lg:col-span-2 space-y-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Card Grupo WhatsApp */}
            <Card className="p-5 space-y-4">
              <h2 className="text-base font-semibold flex items-center gap-2 border-b pb-3">
                <MessageSquare className="h-5 w-5 text-primary" />
                Grupo da Empresa
              </h2>
              <div className="space-y-2">
                <label className="text-sm font-medium">Numero/ID do Grupo no WhatsApp</label>
                <Input
                  name="telefoneGrupo"
                  value={settings.telefoneGrupo}
                  onChange={handleChange}
                  placeholder="Ex: 120363024888888@g.us ou 5511999999999"
                  className="focus:border-primary/50 transition-colors"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Número internacional formatado com DDI e DDD ou a hash de identificação JID do grupo no WhatsApp.
                </p>
              </div>
            </Card>

            {/* Gatilho 1: Início de Rota */}
            <Card className="p-5 space-y-5">
              <div className="flex items-center justify-between border-b pb-3">
                <h2 className="text-base font-semibold flex items-center gap-2">
                  <Play className="h-4 w-4 text-emerald-500 fill-emerald-500" />
                  Gatilho: Rota Iniciada
                </h2>
                <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded border">
                  Status: EM TRANSITO
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Mensagem Cliente */}
                <div className="space-y-3 p-4 rounded-xl border bg-white dark:bg-slate-900">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-semibold">Mensagem ao Cliente</label>
                    <button
                      type="button"
                      onClick={() => handleToggle('rotaIniciarClienteAtivo')}
                      className="text-primary hover:opacity-85 transition-opacity"
                    >
                      {settings.rotaIniciarClienteAtivo ? (
                        <ToggleRight className="h-7 w-7 text-emerald-500" />
                      ) : (
                        <ToggleLeft className="h-7 w-7 text-muted-foreground" />
                      )}
                    </button>
                  </div>
                  <Textarea
                    name="rotaIniciarClienteTemplate"
                    value={settings.rotaIniciarClienteTemplate}
                    onChange={handleChange}
                    disabled={!settings.rotaIniciarClienteAtivo}
                    placeholder="Escreva a mensagem..."
                    rows={4}
                    className="disabled:opacity-50 transition-all text-xs"
                  />
                </div>

                {/* Mensagem Grupo */}
                <div className="space-y-3 p-4 rounded-xl border bg-white dark:bg-slate-900">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-semibold">Mensagem ao Grupo</label>
                    <button
                      type="button"
                      onClick={() => handleToggle('rotaIniciarGrupoAtivo')}
                      className="text-primary hover:opacity-85 transition-opacity"
                    >
                      {settings.rotaIniciarGrupoAtivo ? (
                        <ToggleRight className="h-7 w-7 text-emerald-500" />
                      ) : (
                        <ToggleLeft className="h-7 w-7 text-muted-foreground" />
                      )}
                    </button>
                  </div>
                  <Textarea
                    name="rotaIniciarGrupoTemplate"
                    value={settings.rotaIniciarGrupoTemplate}
                    onChange={handleChange}
                    disabled={!settings.rotaIniciarGrupoAtivo}
                    placeholder="Escreva a mensagem..."
                    rows={4}
                    className="disabled:opacity-50 transition-all text-xs"
                  />
                </div>
              </div>
            </Card>

            {/* Gatilho 2: Conclusão */}
            <Card className="p-5 space-y-5">
              <div className="flex items-center justify-between border-b pb-3">
                <h2 className="text-base font-semibold flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  Gatilho: Carga Finalizada com Sucesso
                </h2>
                <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded border">
                  Status: COLETADA / ENTREGUE
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Mensagem Cliente */}
                <div className="space-y-3 p-4 rounded-xl border bg-white dark:bg-slate-900">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-semibold">Mensagem ao Cliente</label>
                    <button
                      type="button"
                      onClick={() => handleToggle('conclusaoClienteAtivo')}
                      className="text-primary hover:opacity-85 transition-opacity"
                    >
                      {settings.conclusaoClienteAtivo ? (
                        <ToggleRight className="h-7 w-7 text-emerald-500" />
                      ) : (
                        <ToggleLeft className="h-7 w-7 text-muted-foreground" />
                      )}
                    </button>
                  </div>
                  <Textarea
                    name="conclusaoClienteTemplate"
                    value={settings.conclusaoClienteTemplate}
                    onChange={handleChange}
                    disabled={!settings.conclusaoClienteAtivo}
                    placeholder="Escreva a mensagem..."
                    rows={4}
                    className="disabled:opacity-50 transition-all text-xs"
                  />
                </div>

                {/* Mensagem Grupo */}
                <div className="space-y-3 p-4 rounded-xl border bg-white dark:bg-slate-900">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-semibold">Mensagem ao Grupo</label>
                    <button
                      type="button"
                      onClick={() => handleToggle('conclusaoGrupoAtivo')}
                      className="text-primary hover:opacity-85 transition-opacity"
                    >
                      {settings.conclusaoGrupoAtivo ? (
                        <ToggleRight className="h-7 w-7 text-emerald-500" />
                      ) : (
                        <ToggleLeft className="h-7 w-7 text-muted-foreground" />
                      )}
                    </button>
                  </div>
                  <Textarea
                    name="conclusaoGrupoTemplate"
                    value={settings.conclusaoGrupoTemplate}
                    onChange={handleChange}
                    disabled={!settings.conclusaoGrupoAtivo}
                    placeholder="Escreva a mensagem..."
                    rows={4}
                    className="disabled:opacity-50 transition-all text-xs"
                  />
                </div>
              </div>
            </Card>

            {/* Gatilho 3: Cancelamento */}
            <Card className="p-5 space-y-5">
              <div className="flex items-center justify-between border-b pb-3">
                <h2 className="text-base font-semibold flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-rose-500" />
                  Gatilho: Carga Cancelada / Falha na Rota
                </h2>
                <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded border">
                  Status: CANCELADA / NAO REALIZADA
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Mensagem Cliente */}
                <div className="space-y-3 p-4 rounded-xl border bg-white dark:bg-slate-900">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-semibold">Mensagem ao Cliente</label>
                    <button
                      type="button"
                      onClick={() => handleToggle('cancelamentoClienteAtivo')}
                      className="text-primary hover:opacity-85 transition-opacity"
                    >
                      {settings.cancelamentoClienteAtivo ? (
                        <ToggleRight className="h-7 w-7 text-emerald-500" />
                      ) : (
                        <ToggleLeft className="h-7 w-7 text-muted-foreground" />
                      )}
                    </button>
                  </div>
                  <Textarea
                    name="cancelamentoClienteTemplate"
                    value={settings.cancelamentoClienteTemplate}
                    onChange={handleChange}
                    disabled={!settings.cancelamentoClienteAtivo}
                    placeholder="Escreva a mensagem..."
                    rows={4}
                    className="disabled:opacity-50 transition-all text-xs"
                  />
                </div>

                {/* Mensagem Grupo */}
                <div className="space-y-3 p-4 rounded-xl border bg-white dark:bg-slate-900">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-semibold">Mensagem ao Grupo</label>
                    <button
                      type="button"
                      onClick={() => handleToggle('cancelamentoGrupoAtivo')}
                      className="text-primary hover:opacity-85 transition-opacity"
                    >
                      {settings.cancelamentoGrupoAtivo ? (
                        <ToggleRight className="h-7 w-7 text-emerald-500" />
                      ) : (
                        <ToggleLeft className="h-7 w-7 text-muted-foreground" />
                      )}
                    </button>
                  </div>
                  <Textarea
                    name="cancelamentoGrupoTemplate"
                    value={settings.cancelamentoGrupoTemplate}
                    onChange={handleChange}
                    disabled={!settings.cancelamentoGrupoAtivo}
                    placeholder="Escreva a mensagem..."
                    rows={4}
                    className="disabled:opacity-50 transition-all text-xs"
                  />
                </div>
              </div>
            </Card>

          </form>
        </div>

        {/* Lado direito: Tags + Simulador de Teste */}
        <div className="space-y-6">
          {/* Variáveis Dinâmicas */}
          <Card className="p-5 bg-card border shadow-sm space-y-4">
            <h3 className="font-semibold text-sm flex items-center gap-2 border-b pb-3 text-primary">
              <Info className="h-4.5 w-4.5 text-accent" />
              Variaveis Dinamicas
            </h3>
            <p className="text-xs text-muted-foreground">
              Você pode incluir os seguintes marcadores de texto nos templates para que sejam substituídos automaticamente pelas informações em tempo real da carga:
            </p>
            <div className="space-y-3 pt-2 text-xs">
              <div className="p-2 rounded bg-white dark:bg-slate-900 border">
                <span className="font-bold text-accent font-mono block mb-1">{`{cliente}`}</span>
                <span className="text-muted-foreground">Substitui pelo nome do Cliente/Destinatario.</span>
              </div>
              <div className="p-2 rounded bg-white dark:bg-slate-900 border">
                <span className="font-bold text-accent font-mono block mb-1">{`{veiculo}`}</span>
                <span className="text-muted-foreground">Nome e placa do veículo atribuído.</span>
              </div>
              <div className="p-2 rounded bg-white dark:bg-slate-900 border">
                <span className="font-bold text-accent font-mono block mb-1">{`{motorista}`}</span>
                <span className="text-muted-foreground">Nome do motorista responsavel pela rota.</span>
              </div>
              <div className="p-2 rounded bg-white dark:bg-slate-900 border">
                <span className="font-bold text-accent font-mono block mb-1">{`{ajudante}`}</span>
                <span className="text-muted-foreground">Nome do ajudante escalado na operação.</span>
              </div>
              <div className="p-2 rounded bg-white dark:bg-slate-900 border">
                <span className="font-bold text-accent font-mono block mb-1">{`{endereco}`}</span>
                <span className="text-muted-foreground">Endereço completo da operação.</span>
              </div>
              <div className="p-2 rounded bg-white dark:bg-slate-900 border">
                <span className="font-bold text-accent font-mono block mb-1">{`{observacao}`}</span>
                <span className="text-muted-foreground">Motivo do cancelamento / observação da falha.</span>
              </div>
            </div>
          </Card>

          {/* Simulador de Teste de Automação */}
          <Card className="p-5 border shadow-sm space-y-4 bg-gradient-to-br from-accent/5 to-sky-500/5 dark:from-accent/10 dark:to-sky-500/10">
            <h3 className="font-semibold text-sm flex items-center gap-2 border-b pb-3 text-primary">
              <TestTube2 className="h-4.5 w-4.5 text-accent" />
              Simulador de Disparos
            </h3>
            <p className="text-xs text-muted-foreground">
              Teste os templates configurados acima enviando mensagens reais com dados simulados.
            </p>

            <div className="space-y-3">
              {/* Tipo de Gatilho */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Tipo de Gatilho</label>
                <select
                  name="tipo"
                  value={dadosTeste.tipo}
                  onChange={handleTesteChange as any}
                  className="flex h-10 w-full items-center rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                >
                  <option value="rota_iniciar">🚀 Rota Iniciada (Em Andamento)</option>
                  <option value="conclusao">✅ Carga Concluída (Coletada/Entregue)</option>
                  <option value="cancelamento">❌ Cancelada / Não Realizada</option>
                </select>
                <p className="text-[10px] text-muted-foreground">{tipoLabels[dadosTeste.tipo]?.desc}</p>
              </div>

              {/* Dados Mock */}
              <div className="grid grid-cols-1 gap-2.5">
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Cliente</label>
                  <Input name="cliente" value={dadosTeste.cliente} onChange={handleTesteChange} className="h-8 text-xs" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Telefone do Cliente</label>
                  <Input name="telefoneCliente" value={dadosTeste.telefoneCliente} onChange={handleTesteChange} className="h-8 text-xs font-mono" placeholder="11999998888" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Endereço</label>
                  <Input name="endereco" value={dadosTeste.endereco} onChange={handleTesteChange} className="h-8 text-xs" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Motorista</label>
                    <Input name="motoristaNome" value={dadosTeste.motoristaNome} onChange={handleTesteChange} className="h-8 text-xs" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Ajudante</label>
                    <Input name="ajudanteNome" value={dadosTeste.ajudanteNome} onChange={handleTesteChange} className="h-8 text-xs" />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Veiculo</label>
                  <Input name="veiculoNome" value={dadosTeste.veiculoNome} onChange={handleTesteChange} className="h-8 text-xs" />
                </div>
                {dadosTeste.tipo === 'cancelamento' && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Motivo / Observação</label>
                    <Input name="observacao" value={dadosTeste.observacao} onChange={handleTesteChange} className="h-8 text-xs" placeholder="Ex: Cliente ausente no local" />
                  </div>
                )}
              </div>

              {/* Botão de Disparo */}
              <div className="pt-2">
                <div className="bg-amber-500/10 border border-amber-500/20 rounded p-2 mb-3 text-[10px] text-amber-600 dark:text-amber-400">
                  <p><strong>Aviso:</strong> O teste obedece às configurações ativas acima. Se o "Cliente" e o "Grupo" estiverem ativos, a mensagem será enviada para ambos os números (exceto se for o mesmo número).</p>
                </div>
                <Button
                  type="button"
                  onClick={handleDispararTeste}
                  disabled={enviandoTeste || !dadosTeste.cliente || !dadosTeste.telefoneCliente}
                  className="w-full gap-2 bg-accent hover:bg-accent/90 text-accent-foreground font-semibold shadow-md text-xs h-9"
                >
                  {enviandoTeste ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Zap className="h-3.5 w-3.5" />
                  )}
                  {enviandoTeste ? 'Disparando...' : 'Disparar Teste Agora'}
                </Button>
              </div>

              {/* Resultado do Teste */}
              {resultadoTeste && (
                <div className="bg-slate-950 text-slate-300 p-3 rounded-lg text-[10px] font-mono max-h-32 overflow-y-auto border border-white/5 whitespace-pre-wrap">
                  <p className="text-emerald-400 font-semibold mb-1">Resultado do Disparo:</p>
                  {resultadoTeste}
                </div>
              )}
            </div>
          </Card>

          {/* Dica de Produtividade */}
          <Card className="p-5 bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/20 space-y-2">
            <h4 className="font-bold text-xs flex items-center gap-1.5 text-primary">
              <Eye className="h-4 w-4" />
              Como Funciona
            </h4>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Estes templates são ativados automaticamente quando o status de uma coleta ou entrega muda no sistema. Ao clicar em Iniciar, Confirmar ou Não Realizada, o disparo acontece em tempo real via WhatsApp Web conectado.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
