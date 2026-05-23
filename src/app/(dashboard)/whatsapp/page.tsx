'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import dynamic from 'next/dynamic';
import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const ProfilePicture = React.memo(function ProfilePicture({ jid, nome, isGroup }: { jid: string; nome: string; isGroup?: boolean }) {
  const [isVisible, setIsVisible] = useState(false);
  const imgRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '50px' }
    );
    
    if (imgRef.current) {
      observer.observe(imgRef.current);
    }
    return () => observer.disconnect();
  }, []);

  const { data, error } = useSWR(isVisible ? `/api/whatsapp/foto?jid=${encodeURIComponent(jid)}` : null, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 300000 // Cache de 5 minutos
  });

  return (
    <div ref={imgRef} className="w-full h-full flex items-center justify-center">
      {!isVisible || (!data?.url && !error && isVisible) ? (
        <span className="animate-pulse w-full h-full bg-muted rounded-full" />
      ) : !data?.url || error ? (
        isGroup ? <Users className="w-5 h-5 text-emerald-600" /> : <span>{nome.charAt(0).toUpperCase()}</span>
      ) : (
        <img src={data.url} alt={nome} className="w-full h-full object-cover" />
      )}
    </div>
  );
});

const EmojiPicker = dynamic(() => import('emoji-picker-react'), { ssr: false });
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/stores/useToastStore';
import { 
  Smartphone, Battery, Signal, RefreshCw, Send, 
  AlertCircle, ShieldCheck, QrCode, Power, Search, MessageSquare, Terminal,
  MoreVertical, Paperclip, Mic, CheckCheck,
  Users, X, Smile, ChevronLeft
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Dispositivo {
  numero: string;
  nome: string;
  bateria: number;
  sinal: string;
  operadora: string;
  conectadoEm: string | null;
}

interface MensagemHistorico {
  id: string;
  para: string;
  nome: string;
  tipo: string;
  conteudo: string;
  status: string;
  data: string;
}

interface WhatsAppContato {
  id: string;
  nome: string;
  numero: string;
  isGroup: false;
}

interface WhatsAppGrupo {
  id: string;
  nome: string;
  participantes: number;
  isGroup: true;
}

interface WhatsAppConversa {
  id: string;
  nome: string;
  numero: string;
  isGroup: boolean;
  ultimaMensagem: string;
  data: string;
  lidas: number;
  profilePicUrl?: string | null;
}

const WhatsAppAudioPlayer = React.memo(function WhatsAppAudioPlayer({ src }: { src: string }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(console.error);
    }
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onLoadedMetadata = () => {
      if (audio.duration && isFinite(audio.duration)) {
        setDuration(audio.duration);
      }
    };
    const onEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('durationchange', onLoadedMetadata);
    audio.addEventListener('ended', onEnded);

    // Se o áudio já carregou os metadados antes do listener
    if (audio.duration && isFinite(audio.duration)) {
      setDuration(audio.duration);
    }

    return () => {
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('durationchange', onLoadedMetadata);
      audio.removeEventListener('ended', onEnded);
    };
  }, [src]);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = val;
      setCurrentTime(val);
    }
  };

  const formatTime = (time: number) => {
    if (isNaN(time) || !isFinite(time)) return '0:00';
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex items-center gap-3 py-1 px-1 rounded-xl bg-transparent w-full min-w-[220px]">
      <audio ref={audioRef} src={src} preload="metadata" />
      <button 
        type="button"
        onClick={togglePlay}
        className="w-9 h-9 rounded-full flex items-center justify-center bg-[#00a884] text-white hover:scale-105 transition-transform duration-200 shadow-sm shrink-0"
      >
        {isPlaying ? (
          <svg className="w-4.5 h-4.5 fill-current" viewBox="0 0 24 24">
            <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
          </svg>
        ) : (
          <svg className="w-4.5 h-4.5 fill-current ml-0.5" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z"/>
          </svg>
        )}
      </button>
      <div className="flex-1 space-y-1 min-w-0">
        <input 
          type="range"
          min="0"
          max={duration || 100}
          value={currentTime}
          onChange={handleSliderChange}
          className="w-full h-1 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-[#00a884] pointer-events-auto"
        />
        <div className="flex justify-between text-[9px] text-muted-foreground font-semibold leading-none">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration || currentTime)}</span>
        </div>
      </div>
      <div className="relative shrink-0 flex items-center justify-center">
        <div className="w-8.5 h-8.5 rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 flex items-center justify-center border border-emerald-500/10 text-emerald-600 dark:text-emerald-400">
          <Mic className="w-4 h-4" />
        </div>
        <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-[#00a884] flex items-center justify-center shadow-sm">
          <svg className="w-2.5 h-2.5 fill-current text-white" viewBox="0 0 24 24">
            <path d="M12 2A10 10 0 1022 12A10 10 0 0012 2M10.8 16.8L6 12L7.68 10.32L10.8 13.44L16.32 7.92L18 9.6L10.8 16.8Z"/>
          </svg>
        </span>
      </div>
    </div>
  );
});

export default function WhatsAppPage() {
  const [conectado, setConectado] = useState(false);
  const [status, setStatus] = useState<'desconectado' | 'conectando' | 'autenticando' | 'conectado' | 'erro'>('desconectado');
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [dispositivo, setDispositivo] = useState<Dispositivo | null>(null);
  const [historico, setHistorico] = useState<MensagemHistorico[]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Estados de Form
  const [numeroTeste, setNumeroTeste] = useState('');
  const [mensagemTeste, setMensagemTeste] = useState('');
  const [enviandoTeste, setEnviandoTeste] = useState(false);
  const [buscaHistorico, setBuscaHistorico] = useState('');
  const [showLogs, setShowLogs] = useState(false);
  const [contatoSelecionado, setContatoSelecionado] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // Contatos e Grupos reais do WhatsApp
  const [whatsappContatos, setWhatsappContatos] = useState<WhatsAppContato[]>([]);
  const [whatsappGrupos, setWhatsappGrupos] = useState<WhatsAppGrupo[]>([]);
  const { data: conversasSWR, mutate: mutateConversas } = useSWR(conectado ? '/api/whatsapp/conversas' : null, fetcher, {
    revalidateOnFocus: false, // Já temos polling de eventos, não precisa revalidar no foco
    refreshInterval: 45000,  // Refresh completo apenas a cada 45s — leve e eficiente
    dedupingInterval: 20000  // Respeita o cache de 20s do backend
  });
  
  const whatsappConversas = conversasSWR?.conversas || [];

  const [sincronizando, setSincronizando] = useState(false);
  const [abaContatos, setAbaContatos] = useState<'historico' | 'contatos' | 'grupos'>('historico');
  const [mensagensAtuais, setMensagensAtuais] = useState<any[]>([]);
  const [carregandoMensagens, setCarregandoMensagens] = useState(false);

  // Envio de mídia
  const [enviandoMidia, setEnviandoMidia] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Gravação de áudio
  const [isGravando, setIsGravando] = useState(false);
  const [segundosGravacao, setSegundosGravacao] = useState(0);
  const [volumeLevel, setVolumeLevel] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout>();

  // Visualização de Imagem em Tela Cheia
  const [imagemVisualizar, setImagemVisualizar] = useState<string | null>(null);
  const [imagemZoom, setImagemZoom] = useState(false);

  // Teste de microfone local
  const [testandoMic, setTestandoMic] = useState(false);
  const [audioTesteUrl, setAudioTesteUrl] = useState<string | null>(null);
  const [segundosTeste, setSegundosTeste] = useState(0);
  const mediaRecorderTesteRef = useRef<MediaRecorder | null>(null);
  const chunksTesteRef = useRef<Blob[]>([]);
  const timerTesteRef = useRef<NodeJS.Timeout>();
  const [volumeTeste, setVolumeTeste] = useState(0);

  const anteriorConectado = useRef<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const carregarDados = async (silencioso = false) => {
    try {
      const res = await fetch('/api/whatsapp/conexao');
      if (res.ok) {
        const data = await res.json();
        setConectado(data.conectado);
        setStatus(data.status);
        setQrCode(data.qrCode);
        setErro(data.erro);
        setDispositivo(data.dispositivo);
        setHistorico(data.historico);
        setLogs(data.logs || []);

        if (data.conectado && !anteriorConectado.current && !silencioso) {
          toast('WhatsApp conectado com sucesso!', { 
            type: 'success', 
            description: 'Automações de frete e avisos de rota estão prontas para disparos reais.' 
          });
        }
        anteriorConectado.current = data.conectado;
      }
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
      if (!silencioso) {
        toast('Erro de rede ao carregar painel', { type: 'error' });
      }
    } finally {
      if (!silencioso) {
        setLoading(false);
      }
    }
  };

  // Carrega contatos e grupos do WhatsApp real
  const carregarContatosReais = useCallback(async () => {
    if (!conectado) return;
    try {
      const res = await fetch('/api/whatsapp/contatos');
      if (res.ok) {
        const data = await res.json();
        setWhatsappContatos(data.contatos || []);
        setWhatsappGrupos(data.grupos || []);
      }
    } catch (error) {
      console.error('Erro ao carregar contatos:', error);
    }
  }, [conectado]);

  const carregarConversasReais = useCallback(async () => {
    if (!conectado) return;
    setSincronizando(true);
    try {
      await mutateConversas();
      toast('Conversas sincronizadas com sucesso!', { type: 'success' });
    } catch (error) {
      toast('Erro de rede ao sincronizar conversas', { type: 'error' });
    } finally {
      setSincronizando(false);
    }
  }, [conectado, mutateConversas]);

  // Timeout para detectar quando a sincronização fica travada em "autenticando"
  const authTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    carregarDados();
    
    // Polling adaptativo: 1.5s enquanto espera QR, 5s quando conectado
    let timeoutId: NodeJS.Timeout;
    const poll = async () => {
      await carregarDados(true);
      const delay = anteriorConectado.current ? 5000 : 1500;
      timeoutId = setTimeout(poll, delay);
    };
    
    timeoutId = setTimeout(poll, 1500);
    return () => clearTimeout(timeoutId);
  }, []);

  // Se ficar preso em "autenticando" por mais de 45 segundos, reseta para desconectado
  useEffect(() => {
    if (status === 'autenticando') {
      if (authTimeoutRef.current) clearTimeout(authTimeoutRef.current);
      authTimeoutRef.current = setTimeout(() => {
        setStatus('desconectado');
        setConectado(false);
        setQrCode(null);
        toast('A sincronização da sessão expirou.', {
          type: 'warning',
          description: 'Clique em "Ativar Servidor WhatsApp" para tentar novamente.'
        });
      }, 45000);
    } else {
      if (authTimeoutRef.current) {
        clearTimeout(authTimeoutRef.current);
        authTimeoutRef.current = null;
      }
    }
    return () => {
      if (authTimeoutRef.current) clearTimeout(authTimeoutRef.current);
    };
  }, [status]);

  // Carrega contatos E sincroniza conversas automaticamente quando conecta
  useEffect(() => {
    if (conectado) {
      carregarContatosReais();
      // Auto-sync: dispara a primeira busca de conversas instantaneamente ao conectar
      mutateConversas();
    } else {
      setWhatsappContatos([]);
      setWhatsappGrupos([]);
    }
  }, [conectado, carregarContatosReais, mutateConversas]);

  // Carrega mensagens do contato selecionado
  useEffect(() => {
    if (!contatoSelecionado || !conectado) {
      setMensagensAtuais([]);
      return;
    }
    
    const carregarHistorico = async () => {
      setCarregandoMensagens(true);
      try {
        const numeroParaBusca = contatoSelecionado;
        
        const res = await fetch(`/api/whatsapp/mensagens?numero=${encodeURIComponent(numeroParaBusca)}`);
        if (res.ok) {
          const data = await res.json();
          setMensagensAtuais(data.mensagens || []);
        }
      } catch (e) {
        console.error('Erro ao buscar mensagens', e);
      } finally {
        setCarregandoMensagens(false);
      }
    };
    
    carregarHistorico();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contatoSelecionado, conectado]);

  // Polling de Eventos em Tempo Real — inteligente: pausa quando a aba está em segundo plano
  useEffect(() => {
    if (!conectado) return;
    
    const pollEventos = async () => {
      // Não faz polling se a aba não estiver visível (economiza recursos)
      if (typeof document !== 'undefined' && document.hidden) return;

      try {
        const res = await fetch('/api/whatsapp/eventos');
        if (res.ok) {
          const data = await res.json();
          const eventos = data.eventos || [];
          
          if (eventos.length > 0) {
            // 1. Atualizar conversasSWR
            mutateConversas((prev: any) => {
              if (!prev || !prev.conversas) return prev;
              let novasConversas = [...prev.conversas];
              let precisaAtualizar = false;
              
              eventos.forEach((evt: any) => {
                const index = novasConversas.findIndex(c => c.numero === evt.numero || c.id === evt.chatId);
                if (index !== -1) {
                  const conversa = novasConversas[index];
                  conversa.ultimaMensagem = evt.body || '[Mídia]';
                  conversa.data = new Date(evt.timestamp * 1000).toISOString();
                  if (!evt.fromMe && contatoSelecionado !== evt.chatId) {
                    conversa.lidas = (conversa.lidas || 0) + 1;
                  }
                  novasConversas.splice(index, 1);
                  novasConversas.unshift(conversa);
                  precisaAtualizar = true;
                } else {
                  novasConversas.unshift({
                    id: evt.chatId,
                    nome: evt.senderName,
                    numero: evt.numero,
                    isGroup: evt.chatId.includes('@g.us'),
                    profilePicUrl: null,
                    lidas: evt.fromMe ? 0 : 1,
                    ultimaMensagem: evt.body || '[Mídia]',
                    data: new Date(evt.timestamp * 1000).toISOString()
                  });
                  precisaAtualizar = true;
                }
              });
              
              return precisaAtualizar ? { ...prev, conversas: novasConversas } : prev;
            }, false);

            setMensagensAtuais(prev => {
              const novos = eventos.filter((e: any) => e.chatId === contatoSelecionado);
              if (novos.length > 0) {
                const formataMensagem = novos.map((n: any) => ({
                  id: n.id,
                  body: n.body,
                  fromMe: n.fromMe,
                  hasMedia: n.hasMedia,
                  type: n.type,
                  chatId: n.chatId,
                  timestamp: n.timestamp
                }));
                const paraAdicionar = formataMensagem.filter((novaMsg: any) => !prev.some(m => m.id === novaMsg.id));
                if (paraAdicionar.length > 0) {
                  return [...prev, ...paraAdicionar];
                }
              }
              return prev;
            });
          }
        }
      } catch (error) {
        // ignora erro silencioso
      }
    };

    // Polling a cada 5s — equilíbrio entre velocidade e leveza
    const interval = setInterval(pollEventos, 5000);
    return () => clearInterval(interval);
  }, [conectado, contatoSelecionado]);

  // Salva referências do contato anterior e tamanho de mensagens para rolar de forma inteligente
  const prevContatoRef = useRef<string | null>(null);
  const prevCountRef = useRef<number>(0);

  useEffect(() => {
    const totalMsgs = mensagensAtuais?.length || 0;
    // Só rola para baixo se mudou de contato OU se o número de mensagens aumentou (nova mensagem recebida/enviada)
    if (contatoSelecionado !== prevContatoRef.current || totalMsgs > prevCountRef.current) {
      scrollToBottom();
    }
    prevContatoRef.current = contatoSelecionado;
    prevCountRef.current = totalMsgs;
  }, [contatoSelecionado, mensagensAtuais]);

  // Enviar imagem via WhatsApp
  const handleEnviarImagem = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5000000) {
      toast('Imagem muito grande. Use uma imagem de ate 5MB.', { type: 'error' });
      return;
    }

    const destino = contatoSelecionado || numeroTeste;
    if (!destino) {
      toast('Selecione um contato ou digite um numero.', { type: 'error' });
      return;
    }

    setEnviandoMidia(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const base64 = reader.result as string;
        const legenda = mensagemTeste.trim() || undefined;

        const res = await fetch('/api/whatsapp/media', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ para: destino, tipo: 'imagem', conteudo: base64, legenda }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.novaMensagem) setHistorico(prev => [data.novaMensagem, ...prev]);
          setMensagemTeste('');
          toast('Imagem enviada com sucesso!', { type: 'success' });
        } else {
          const err = await res.json();
          toast(err.error || 'Erro ao enviar imagem.', { type: 'error' });
        }
      } catch {
        toast('Erro de conexão ao enviar imagem.', { type: 'error' });
      } finally {
        setEnviandoMidia(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsDataURL(file);
  };

  // Gravação de áudio
  const iniciarGravacao = async () => {
    const destino = contatoSelecionado || numeroTeste;
    if (!destino) {
      toast('Selecione um contato ou digite um número.', { type: 'error' });
      return;
    }

    // 1. Validação de contexto de mídia seguro (HTTPS ou localhost)
    if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      toast('Ambiente inseguro ou sem suporte a áudio.', {
        type: 'error',
        description: 'A gravação de áudio exige conexão segura (HTTPS ou localhost). Se estiver testando em rede local, acesse usando http://localhost:3000 ou configure SSL/HTTPS.'
      });
      return;
    }

    // 2. Inicialização síncrona do AudioContext
    const AudioContextClass = typeof window !== 'undefined' ? (window.AudioContext || (window as any).webkitAudioContext) : null;
    let audioCtx: AudioContext | null = null;
    if (AudioContextClass) {
      try {
        audioCtx = new AudioContextClass();
      } catch (err) {
        console.error('Falha ao instanciar AudioContext síncrono:', err);
      }
    }

    // Variável de controle local para monitorar se houve qualquer som na gravação
    let maxVolume = 0;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      
      // Determina as melhores opções de gravação suportadas
      let options = {};
      if (typeof MediaRecorder !== 'undefined') {
        if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
          options = { mimeType: 'audio/webm;codecs=opus' };
        } else if (MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')) {
          options = { mimeType: 'audio/ogg;codecs=opus' };
        } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
          options = { mimeType: 'audio/mp4' };
        }
      }
      
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;

      // 3. Configuração do Analisador com o stream de áudio ativo
      if (audioCtx) {
        try {
          if (audioCtx.state === 'suspended') {
            await audioCtx.resume();
          }
          const source = audioCtx.createMediaStreamSource(stream);
          const analyser = audioCtx.createAnalyser();
          analyser.fftSize = 256;
          const bufferLength = analyser.frequencyBinCount;
          const dataArray = new Uint8Array(bufferLength);
          source.connect(analyser);

          const checkVolume = () => {
            if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') {
              audioCtx?.close().catch(console.error);
              setVolumeLevel(0);
              return;
            }
            analyser.getByteFrequencyData(dataArray);
            let sum = 0;
            for (let i = 0; i < bufferLength; i++) {
              sum += dataArray[i];
            }
            const average = sum / bufferLength;
            setVolumeLevel(average); // Mapeia o volume (0 a 255)
            
            // Registra o pico de volume capturado
            if (average > maxVolume) {
              maxVolume = average;
            }
            
            requestAnimationFrame(checkVolume);
          };
          requestAnimationFrame(checkVolume);
        } catch (audioErr) {
          console.error('Erro na Web Audio API após obter stream:', audioErr);
        }
      }

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const totalSize = audioChunksRef.current.reduce((acc, chunk) => acc + chunk.size, 0);
        
        // 1. Verifica áudio tecnicamente vazio
        if (audioChunksRef.current.length === 0 || totalSize < 200) {
          toast('O áudio gravado está vazio. Verifique se o seu microfone está funcionando e se concedeu permissão de áudio.', { 
            type: 'error',
            description: 'Nenhum sinal de arquivo de áudio foi gerado pelo navegador.'
          });
          stream.getTracks().forEach(track => track.stop());
          setVolumeLevel(0);
          return;
        }

        // 2. Verifica se a gravação capturou apenas silêncio total (suspicion de microfone desligado)
        if (maxVolume < 2.0) {
          toast('Microfone sem captura de som!', { 
            type: 'warning',
            description: 'O arquivo foi gerado, mas está completamente silencioso. Verifique se o microfone físico do notebook está desmutado ou ativo nas configurações do Windows.'
          });
        }

        const audioBlob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType || 'audio/webm' });
        const audioReader = new FileReader();
        audioReader.readAsDataURL(audioBlob);
        audioReader.onloadend = async () => {
          const base64Audio = audioReader.result as string;
          setEnviandoMidia(true);
          try {
            const res = await fetch('/api/whatsapp/media', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ para: destino, tipo: 'audio', conteudo: base64Audio }),
            });
            if (res.ok) {
              const data = await res.json();
              if (data.novaMensagem) setHistorico(prev => [data.novaMensagem, ...prev]);
              toast('Áudio enviado com sucesso!', { type: 'success' });
            } else {
              const err = await res.json();
              toast(err.error || 'Erro ao enviar áudio.', { type: 'error' });
            }
          } catch (err) {
            console.error('Erro de rede ao enviar áudio:', err);
            toast('Erro de conexão ao enviar áudio.', { type: 'error' });
          } finally {
            setEnviandoMidia(false);
          }
        };
        stream.getTracks().forEach(track => track.stop());
        setVolumeLevel(0);
      };

      mediaRecorder.start();
      setIsGravando(true);
      setSegundosGravacao(0);
      setVolumeLevel(0);
      maxVolume = 0; // Reseta o pico de volume
      timerRef.current = setInterval(() => setSegundosGravacao(prev => prev + 1), 1000);
    } catch (err: any) {
      console.error('Erro ao acessar microfone:', err);
      if (audioCtx) {
        audioCtx.close().catch(console.error);
      }
      
      const isPermissionDenied = err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError';
      toast(isPermissionDenied ? 'Permissão de microfone negada!' : 'Não foi possível acessar o microfone.', { 
        type: 'error',
        description: isPermissionDenied 
          ? 'Clique no cadeado na barra de endereços do seu navegador e ative a permissão para usar o microfone deste site.'
          : err.message || 'Verifique se seu microfone está conectado e se o som está habilitado no sistema.'
      });
    }
  };

  const pararGravacao = () => {
    if (mediaRecorderRef.current && isGravando) {
      mediaRecorderRef.current.stop();
      setIsGravando(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const cancelarGravacao = () => {
    if (mediaRecorderRef.current && isGravando) {
      mediaRecorderRef.current.onstop = () => {
        mediaRecorderRef.current?.stream.getTracks().forEach(track => track.stop());
        setVolumeLevel(0);
      };
      mediaRecorderRef.current.stop();
      setIsGravando(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  // Funções de Teste de Microfone Local (Ouvir Retorno Instantâneo)
  const iniciarTesteMic = async () => {
    setAudioTesteUrl(null);
    setVolumeTeste(0);
    setSegundosTeste(0);
    chunksTesteRef.current = [];

    if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      toast('Ambiente inseguro ou sem suporte a áudio.', {
        type: 'error',
        description: 'O teste de microfone exige conexão segura (HTTPS ou localhost).'
      });
      return;
    }

    const AudioContextClass = typeof window !== 'undefined' ? (window.AudioContext || (window as any).webkitAudioContext) : null;
    let audioCtx: AudioContext | null = null;
    if (AudioContextClass) {
      try {
        audioCtx = new AudioContextClass();
      } catch (err) {
        console.error('Falha ao instanciar AudioContext de teste:', err);
      }
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunksTesteRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderTesteRef.current = mediaRecorder;

      if (audioCtx) {
        try {
          if (audioCtx.state === 'suspended') {
            await audioCtx.resume();
          }
          const source = audioCtx.createMediaStreamSource(stream);
          const analyser = audioCtx.createAnalyser();
          analyser.fftSize = 256;
          const bufferLength = analyser.frequencyBinCount;
          const dataArray = new Uint8Array(bufferLength);
          source.connect(analyser);

          const checkVolume = () => {
            if (!mediaRecorderTesteRef.current || mediaRecorderTesteRef.current.state === 'inactive') {
              audioCtx?.close().catch(console.error);
              setVolumeTeste(0);
              return;
            }
            analyser.getByteFrequencyData(dataArray);
            let sum = 0;
            for (let i = 0; i < bufferLength; i++) {
              sum += dataArray[i];
            }
            const average = sum / bufferLength;
            setVolumeTeste(average);
            requestAnimationFrame(checkVolume);
          };
          requestAnimationFrame(checkVolume);
        } catch (audioErr) {
          console.error('Erro na Web Audio API do teste:', audioErr);
        }
      }

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksTesteRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const totalSize = chunksTesteRef.current.reduce((acc, chunk) => acc + chunk.size, 0);
        if (chunksTesteRef.current.length === 0 || totalSize < 200) {
          toast('Nenhum som capturado no teste!', {
            type: 'error',
            description: 'Verifique se seu microfone está fisicamente desmutado.'
          });
          stream.getTracks().forEach(track => track.stop());
          return;
        }

        const audioBlob = new Blob(chunksTesteRef.current, { type: mediaRecorder.mimeType || 'audio/webm' });
        const localUrl = URL.createObjectURL(audioBlob);
        setAudioTesteUrl(localUrl);
        stream.getTracks().forEach(track => track.stop());
        toast('Gravação de teste concluída!', {
          type: 'success',
          description: 'Use o player de teste para ouvir o som capturado e verificar o microfone.'
        });
      };

      mediaRecorder.start();
      setTestandoMic(true);
      timerTesteRef.current = setInterval(() => setSegundosTeste(prev => prev + 1), 1000);
    } catch (err: any) {
      console.error('Erro ao acessar microfone para teste:', err);
      if (audioCtx) {
        audioCtx.close().catch(console.error);
      }
      toast('Não foi possível acessar o microfone para o teste.', {
        type: 'error',
        description: err.message || 'Garanta que a permissão de microfone está ativa nas configurações.'
      });
    }
  };

  const pararTesteMic = () => {
    if (mediaRecorderTesteRef.current && testandoMic) {
      mediaRecorderTesteRef.current.stop();
      setTestandoMic(false);
      if (timerTesteRef.current) clearInterval(timerTesteRef.current);
    }
  };

  const formatarTempo = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  const handleConectarReal = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/whatsapp/conexao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ acao: 'conectar' }),
      });

      if (res.ok) {
        const data = await res.json();
        setStatus('conectando');
        setLogs(data.logs || []);
        toast('Inicializando servidor WhatsApp Web...', { 
          type: 'info', 
          description: 'Aguarde alguns segundos enquanto carregamos o leitor de QR Code.' 
        });
      } else {
        toast('Erro ao inicializar conexão', { type: 'error' });
      }
    } catch {
      toast('Erro de rede ao conectar', { type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleDesconectar = async () => {
    if (!confirm('Deseja realmente desconectar o WhatsApp do ColetaMax? As automações serão pausadas.')) return;
    
    setLoading(true);
    try {
      const res = await fetch('/api/whatsapp/conexao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ acao: 'desconectar' }),
      });

      if (res.ok) {
        setConectado(false);
        setStatus('desconectado');
        setQrCode(null);
        toast('Dispositivo desconectado!', { 
          type: 'warning', 
          description: 'A sessão ativa do WhatsApp Web foi encerrada.' 
        });
        carregarDados(true);
      }
    } catch {
      toast('Erro ao desconectar dispositivo', { type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleEnviarTeste = async (e: React.FormEvent) => {
    e.preventDefault();
    const destino = contatoSelecionado || numeroTeste;
    if (!destino.trim() || !mensagemTeste.trim() || enviandoTeste) return;

    setEnviandoTeste(true);

    try {
      const res = await fetch('/api/whatsapp/conexao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          acao: 'enviar_teste',
          dados: { para: destino, conteudo: mensagemTeste }
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setHistorico(prev => [data.novaMensagem, ...prev]);
        setMensagemTeste('');
        toast('Mensagem disparada com sucesso!', { 
          type: 'success', 
          description: conectado 
            ? `Notificação real entregue a ${numeroTeste}.` 
            : `Modo simulado ativado (Celular desconectado).` 
        });
      } else {
        const errorData = await res.json();
        toast(errorData.error || 'Falha ao enviar mensagem', { type: 'error' });
      }
    } catch {
      toast('Erro de rede ao enviar teste', { type: 'error' });
    } finally {
      setEnviandoTeste(false);
    }
  };

  // Agrupa mensagens por contato (numero) para simular conversas
  const contatosUnicos = Array.from(new Set(historico.map(h => h.para)));
  
  const historicoFiltrado = historico.filter(h => {
    const matchBusca = !buscaHistorico || 
      h.para.toLowerCase().includes(buscaHistorico.toLowerCase()) ||
      h.nome.toLowerCase().includes(buscaHistorico.toLowerCase()) ||
      h.conteudo.toLowerCase().includes(buscaHistorico.toLowerCase());
    const matchContato = !contatoSelecionado || h.para === contatoSelecionado;
    return matchBusca && matchContato;
  });

  const getUltimaMensagem = (contato: string) => {
    return historico.find(h => h.para === contato);
  };

  const getStatusIcon = (msgStatus: string) => {
    switch (msgStatus) {
      case 'LIDA':
        return <CheckCheck className="w-3.5 h-3.5 text-sky-400" />;
      case 'ENVIADA':
        return <CheckCheck className="w-3.5 h-3.5 text-slate-400" />;
      default:
        return <AlertCircle className="w-3 h-3 text-rose-400" />;
    }
  };

  if (loading && status === 'desconectado' && !qrCode) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-3">
        <RefreshCw className="h-8 w-8 text-primary animate-spin" />
        <p className="text-sm text-muted-foreground">Carregando painel de conexão WhatsApp...</p>
      </div>
    );
  }

  return (
    <div className="space-y-0 max-w-6xl mx-auto pb-6">
      <AnimatePresence mode="wait">
        {/* ========================================= */}
        {/* ========================================= */}
        {/* TELA DE INICIALIZAÇÃO (Conectando ou Autenticando) */}
        {/* ========================================= */}
        {(status === 'conectando' || status === 'autenticando') && !qrCode ? (
          <motion.div
            key="conectando"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="flex flex-col items-center justify-center py-20 px-4 text-center bg-card border rounded-xl shadow-md max-w-xl mx-auto"
          >
            <div className="relative mb-6">
              <div className="w-16 h-16 rounded-full border-4 border-accent border-t-transparent animate-spin" />
              <Smartphone className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 text-accent animate-pulse" />
            </div>
            
            <h2 className="text-lg font-semibold text-primary">
              {status === 'autenticando' ? 'Sincronizando Sessão WhatsApp...' : 'Iniciando Servidor WhatsApp...'}
            </h2>
            <p className="text-sm text-muted-foreground max-w-sm mt-2">
              {status === 'autenticando' 
                ? 'Uma sessão anterior foi encontrada. Estamos carregando as mensagens e sincronizando os dados de forma segura. Isso pode levar alguns segundos.' 
                : 'Estamos preparando a sessão segura do Google Chrome local. O QR Code aparecerá abaixo em alguns segundos.'}
            </p>
            
            <div className="w-full mt-6 max-w-xs mx-auto">
              <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-accent rounded-full animate-pulse" style={{ width: '65%', animation: 'pulse 1.5s ease-in-out infinite' }} />
              </div>
              <p className="text-[10px] text-muted-foreground text-center mt-2">Isso pode levar alguns segundos...</p>
            </div>
            
            <div className="mt-8">
              <Button 
                onClick={handleDesconectar}
                variant="outline"
                className="text-xs text-rose-500 border-rose-200 hover:bg-rose-50 hover:text-rose-600 font-semibold gap-1.5"
              >
                <Power className="w-3.5 h-3.5" />
                Cancelar e Limpar Sessão
              </Button>
            </div>
          </motion.div>

        /* ========================================= */
        /* TELA DE QR CODE (Pareamento WhatsApp Web Style) */
        /* ========================================= */
        ) : !conectado ? (
          <motion.div
            key="desconectado"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="rounded-xl overflow-hidden border shadow-lg bg-card"
          >
            {/* Header estilo WhatsApp Web */}
            <div className="bg-[#00a884] dark:bg-[#00a884] px-8 py-6 text-white">
              <h1 className="text-2xl font-light tracking-tight">WhatsApp Web</h1>
              <p className="text-white/80 text-sm mt-1">
                Envie e receba mensagens automaticamente pelo ColetaMax
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-0">
              {/* Instruções (esquerda) */}
              <div className="col-span-1 md:col-span-3 p-8 flex flex-col justify-center">
                <h2 className="text-xl font-normal text-foreground mb-6">
                  Para usar o WhatsApp no ColetaMax:
                </h2>

                <div className="space-y-5 text-sm leading-relaxed">
                  <div className="flex gap-3.5">
                    <span className="flex items-center justify-center w-7 h-7 rounded-full bg-[#00a884] text-white font-bold text-xs shrink-0 mt-0.5">1</span>
                    <p className="text-muted-foreground">Abra o <strong className="font-semibold text-foreground">WhatsApp</strong> em seu aparelho celular corporativo.</p>
                  </div>
                  <div className="flex gap-3.5">
                    <span className="flex items-center justify-center w-7 h-7 rounded-full bg-[#00a884] text-white font-bold text-xs shrink-0 mt-0.5">2</span>
                    <p className="text-muted-foreground">Toque em <strong className="font-semibold text-foreground">Configurações</strong> (engrenagem) ou <strong className="font-semibold text-foreground">Aparelhos Conectados</strong>.</p>
                  </div>
                  <div className="flex gap-3.5">
                    <span className="flex items-center justify-center w-7 h-7 rounded-full bg-[#00a884] text-white font-bold text-xs shrink-0 mt-0.5">3</span>
                    <p className="text-muted-foreground">Clique em <strong className="font-semibold text-foreground">Conectar um aparelho</strong> e aponte a câmera para o QR Code ao lado.</p>
                  </div>
                  <div className="flex gap-3.5">
                    <span className="flex items-center justify-center w-7 h-7 rounded-full bg-[#00a884] text-white font-bold text-xs shrink-0 mt-0.5">4</span>
                    <p className="text-muted-foreground">Após a leitura, a tela mudará automaticamente para o painel de chat operacional.</p>
                  </div>
                </div>

                <div className="pt-6 mt-6 border-t flex items-center gap-2.5 text-xs text-muted-foreground">
                  <ShieldCheck className="h-4 w-4 text-[#00a884] shrink-0" />
                  <span>Conexão direta e segura criptografada ponta a ponta.</span>
                </div>
                {erro && (
                  <div className="mt-3 text-rose-500 font-semibold flex items-center gap-1 text-xs">
                    <AlertCircle className="w-3.5 h-3.5" />
                    Erro na instanciação do servidor
                  </div>
                )}
              </div>

              {/* QR Code (direita) */}
              <div className="col-span-1 md:col-span-2 p-8 flex flex-col items-center justify-center border-l bg-slate-50 dark:bg-slate-950/50">
                {/* Container do QR Code — SEMPRE fundo branco sólido */}
                <div className="relative bg-white p-5 rounded-2xl shadow-lg border border-slate-200 overflow-hidden" style={{ minWidth: '260px', minHeight: '260px' }}>
                  {qrCode ? (
                    <motion.div 
                      className="flex items-center justify-center"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3 }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img 
                        src={qrCode} 
                        alt="WhatsApp Web QR Code" 
                        className="w-60 h-60 object-contain select-none"
                        style={{ backgroundColor: '#ffffff', imageRendering: 'crisp-edges' }}
                      />
                    </motion.div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-[240px] gap-3">
                      <QrCode className="w-16 h-16 text-slate-300 animate-pulse" />
                      <p className="text-xs text-slate-400 text-center">Servidor desativado</p>
                    </div>
                  )}

                  {/* Barra de scanner animada */}
                  {qrCode && <div className="qr-scanner-line" />}
                </div>

                <div className="mt-5 w-full space-y-3 max-w-[260px]">
                  {qrCode ? (
                    <div className="text-xs text-muted-foreground flex items-center justify-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#00a884] animate-pulse" />
                      Aguardando leitura do celular...
                    </div>
                  ) : (
                    <Button 
                      onClick={handleConectarReal}
                      className="w-full gap-2 bg-[#00a884] hover:bg-[#00a884]/90 text-white shadow-md font-semibold text-xs"
                    >
                      <Power className="h-4 w-4" />
                      Ativar Servidor WhatsApp
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </motion.div>

        /* ========================================= */
        /* TELA CONECTADO: Chat Estilo WhatsApp Web  */
        /* ========================================= */
        ) : (
          <motion.div
            key="conectado"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="rounded-2xl overflow-hidden border border-slate-200/80 dark:border-slate-800 shadow-xl bg-card flex flex-col"
            style={{ height: 'calc(100vh - 140px)', minHeight: '600px' }}
          >
            {/* Estrutura principal do chat: sidebar + painel de mensagens */}
            <div className="flex h-full">
              
              {/* ===== SIDEBAR ESQUERDA: Lista de Contatos ===== */}
              <div className={`w-full md:w-[360px] shrink-0 border-r flex flex-col bg-card h-full ${contatoSelecionado ? 'hidden md:flex' : 'flex'}`}>
                {/* Header da sidebar estilo SaaS Premium */}
                <div className="bg-gradient-to-r from-emerald-50/40 to-teal-50/20 dark:from-slate-900/60 dark:to-slate-900/10 px-4 py-4 border-b flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center shadow-md shadow-emerald-500/10 shrink-0">
                      <Smartphone className="w-5 h-5 text-white" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-foreground leading-tight truncate">{dispositivo?.nome || 'ColetaMax'}</p>
                      <p className="text-[10px] text-muted-foreground flex items-center gap-1.5 mt-0.5 font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Conectado
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => setShowLogs(!showLogs)} 
                      title={showLogs ? "Voltar ao Chat" : "Console do Servidor"}
                      className={`h-8 w-8 rounded-xl shrink-0 ${showLogs ? 'text-emerald-500 bg-emerald-500/10' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                    >
                      <Terminal className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={handleDesconectar} 
                      title="Desconectar"
                      className="h-8 w-8 text-rose-500 hover:bg-rose-500/10 hover:text-rose-600 rounded-xl shrink-0"
                    >
                      <Power className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Busca */}
                <div className="px-3 py-2.5 bg-card border-b shrink-0">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Pesquisar ou começar uma nova conversa"
                      value={buscaHistorico}
                      onChange={(e) => setBuscaHistorico(e.target.value)}
                      className="pl-9 text-xs h-9 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-xl"
                    />
                  </div>
                </div>

                {/* Abas: Historico / Contatos / Grupos */}
                <div className="flex bg-slate-100 dark:bg-slate-850/50 p-1 mx-3 mt-3 mb-2 rounded-xl shrink-0 border border-slate-200/50 dark:border-slate-800/80">
                  {(['historico', 'contatos', 'grupos'] as const).map((aba) => (
                    <button
                      key={aba}
                      onClick={() => setAbaContatos(aba)}
                      className={`flex-1 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-all rounded-lg ${
                        abaContatos === aba
                          ? 'bg-white dark:bg-slate-700 text-[#00a884] shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {aba === 'historico' ? 'Conversas' : aba === 'contatos' ? `Contatos (${whatsappContatos.length})` : `Grupos (${whatsappGrupos.length})`}
                    </button>
                  ))}
                </div>

                {/* Lista de Contatos */}
                <div className="flex-1 overflow-y-auto px-2 space-y-1">
                  {/* Botão Novo Chat */}
                  <button
                    onClick={() => {
                      setContatoSelecionado(null);
                      setNumeroTeste('');
                      setAbaContatos('historico');
                    }}
                    className={`w-full px-3 py-3 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-all rounded-xl border border-transparent text-left ${
                      contatoSelecionado === null && abaContatos === 'historico' ? 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20' : ''
                    }`}
                  >
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shrink-0 shadow-sm">
                      <Send className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-foreground">Disparo Rápido / Nova Conversa</p>
                      <p className="text-[10px] text-muted-foreground truncate font-medium">Enviar para qualquer número...</p>
                    </div>
                  </button>

                  {/* === ABA: Contatos Reais === */}
                  {abaContatos === 'contatos' && (
                    <>
                      {whatsappContatos.length === 0 ? (
                        <div className="p-6 text-center text-muted-foreground">
                          <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
                          <p className="text-xs font-medium">Nenhum contato encontrado.</p>
                          <p className="text-[10px] mt-1 opacity-70">Conecte o WhatsApp para ver seus contatos.</p>
                        </div>
                      ) : (
                        whatsappContatos
                          .filter(c => !buscaHistorico || c.nome.toLowerCase().includes(buscaHistorico.toLowerCase()) || c.numero.includes(buscaHistorico))
                          .map((c) => (
                            <button
                              key={c.id}
                              onClick={() => {
                                setContatoSelecionado(c.id);
                                setNumeroTeste(c.numero);
                              }}
                              className={`w-full px-3 py-2.5 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-all rounded-xl border border-transparent text-left ${
                                contatoSelecionado === c.id ? 'bg-[#00a884]/10 text-[#00a884] dark:bg-[#00a884]/20' : ''
                              }`}
                            >
                              <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 text-xs font-bold text-slate-600 dark:text-slate-300 border">
                                {c.nome.charAt(0).toUpperCase()}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold text-foreground truncate">{c.nome}</p>
                                <p className="text-[10px] text-muted-foreground font-mono">+{c.numero}</p>
                              </div>
                            </button>
                          ))
                      )}
                    </>
                  )}

                  {/* === ABA: Grupos Reais === */}
                  {abaContatos === 'grupos' && (
                    <>
                      {whatsappGrupos.length === 0 ? (
                        <div className="p-6 text-center text-muted-foreground">
                          <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
                          <p className="text-xs font-medium">Nenhum grupo encontrado.</p>
                          <p className="text-[10px] mt-1 opacity-70">Conecte o WhatsApp para ver seus grupos.</p>
                        </div>
                      ) : (
                        whatsappGrupos
                          .filter(g => !buscaHistorico || g.nome.toLowerCase().includes(buscaHistorico.toLowerCase()))
                          .map((g) => (
                            <button
                              key={g.id}
                              onClick={() => {
                                setContatoSelecionado(g.id);
                                setNumeroTeste(g.id);
                              }}
                              className={`w-full px-3 py-2.5 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-all rounded-xl border border-transparent text-left ${
                                contatoSelecionado === g.id ? 'bg-[#00a884]/10 text-[#00a884] dark:bg-[#00a884]/20' : ''
                              }`}
                            >
                              <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/50 flex items-center justify-center shrink-0 text-emerald-600 dark:text-emerald-400">
                                <Users className="w-4.5 h-4.5" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold text-foreground truncate">{g.nome}</p>
                                <p className="text-[10px] text-muted-foreground font-medium">{g.participantes} participantes</p>
                              </div>
                            </button>
                          ))
                      )}
                    </>
                  )}

                  {/* === ABA: Historico de Conversas === */}
                  {abaContatos === 'historico' && (
                    <div className="space-y-0.5">
                      <div className="px-2 py-1.5 flex justify-between items-center">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Suas Conversas</span>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={carregarConversasReais} 
                          disabled={sincronizando || !conectado}
                          className="h-5 text-[9px] px-2 text-[#00a884] hover:text-[#00a884] hover:bg-[#00a884]/10 rounded-full font-bold"
                        >
                          <RefreshCw className={`w-2.5 h-2.5 mr-1 ${sincronizando ? 'animate-spin' : ''}`} />
                          Sincronizar
                        </Button>
                      </div>
                      
                      {whatsappConversas.length === 0 ? (
                        <div className="p-6 text-center text-muted-foreground">
                          <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
                          <p className="text-xs font-medium">Nenhuma conversa carregada.</p>
                          <p className="text-[10px] mt-1 opacity-70">Clique em Sincronizar para buscar do seu celular.</p>
                        </div>
                      ) : (
                        whatsappConversas.map((conversa: any) => {
                          const matchBusca = !buscaHistorico || 
                            conversa.nome.toLowerCase().includes(buscaHistorico.toLowerCase()) || 
                            conversa.numero.includes(buscaHistorico);
                          
                          if (!matchBusca) return null;

                          const estaSelecionado = contatoSelecionado === conversa.id;

                          return (
                            <button
                              key={conversa.id}
                              onClick={() => {
                                setContatoSelecionado(conversa.id);
                                setNumeroTeste(conversa.numero);
                                if (conversa.lidas > 0) {
                                  // Atualiza o cache do SWR instantaneamente e visualmente (lidas: 0)
                                  mutateConversas((prev: any) => {
                                    if (!prev) return prev;
                                    return {
                                      ...prev,
                                      conversas: prev.conversas.map((c: any) => 
                                        c.id === conversa.id ? { ...c, lidas: 0 } : c
                                      )
                                    };
                                  }, false);
                                  // Notifica a API para marcar como lida no backend/celular
                                  fetch('/api/whatsapp/ler', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ numero: conversa.id })
                                  }).catch(console.error);
                                }
                              }}
                              className={`w-full px-3 py-3 flex items-center gap-3 rounded-2xl transition-all duration-350 text-left relative border border-transparent ${
                                estaSelecionado 
                                  ? 'bg-gradient-to-r from-emerald-50 to-teal-50/50 dark:from-emerald-950/20 dark:to-slate-900/50 text-emerald-900 dark:text-emerald-100 border-emerald-500/10 shadow-sm font-semibold' 
                                  : 'hover:bg-slate-50 dark:hover:bg-slate-800/30'
                              }`}
                            >
                              <div className="w-11 h-11 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 text-sm font-bold text-slate-600 dark:text-slate-300 overflow-hidden shadow-sm border border-slate-200/30">
                                <ProfilePicture jid={conversa.id} nome={conversa.nome} isGroup={conversa.isGroup} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-center mb-0.5">
                                  <p className="text-[13px] font-bold text-foreground truncate">{conversa.nome}</p>
                                  <span className={`text-[9px] shrink-0 font-medium ${conversa.lidas > 0 ? 'text-[#00a884] font-bold animate-pulse' : 'text-muted-foreground'}`}>
                                    {formatDistanceToNow(new Date(conversa.data), { addSuffix: false, locale: ptBR })}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <p className="text-[11px] text-muted-foreground truncate font-medium">
                                    {conversa.ultimaMensagem || 'Iniciar conversa...'}
                                  </p>
                                </div>
                              </div>
                              {conversa.lidas > 0 && (
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 bg-[#00a884] text-white text-[9px] font-bold w-5 h-5 flex items-center justify-center rounded-full shadow-md">
                                  {conversa.lidas > 99 ? '99+' : conversa.lidas}
                                </span>
                              )}
                            </button>
                          );
                        })
                      )}
                    </div>
                  )}

                </div>

                {/* Info do dispositivo na base */}
                <div className="px-4 py-3 bg-slate-50/50 dark:bg-slate-950/30 border-t text-[10px] text-muted-foreground shrink-0 space-y-1 font-medium">
                  <div className="flex justify-between">
                    <span className="flex items-center gap-1.5"><Signal className="w-3 h-3 text-[#00a884]" /> Sinal Integrado</span>
                    <span className="flex items-center gap-1.5"><Battery className="w-3 h-3 text-emerald-500 fill-emerald-500/20" /> {dispositivo?.bateria}%</span>
                  </div>
                  <div className="flex justify-between font-mono">
                    <span>{dispositivo?.numero}</span>
                    <span>{dispositivo?.conectadoEm ? new Date(dispositivo.conectadoEm).toLocaleDateString('pt-BR') : ''}</span>
                  </div>
                </div>
              </div>

              {/* ===== PAINEL CENTRAL: Área de Chat ===== */}
              <div className={`flex-1 flex flex-col h-full bg-slate-50/50 dark:bg-slate-950/20 ${(!contatoSelecionado && !showLogs) ? 'hidden md:flex' : 'flex'}`}>
                
                {showLogs ? (
                  /* === LOGS DO SERVIDOR === */
                  <>
                    <div className="bg-slate-900 px-4 md:px-6 py-4 border-b border-slate-800 flex items-center justify-between shrink-0">
                      <div className="flex items-center gap-2.5 md:gap-3">
                        {/* Botão de Voltar para Mobile */}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setShowLogs(false)}
                          className="h-8 w-8 text-slate-400 hover:text-white rounded-lg md:hidden shrink-0"
                          title="Voltar para a lista"
                        >
                          <ChevronLeft className="h-5 w-5" />
                        </Button>
                        <Terminal className="h-5 w-5 text-emerald-400 animate-pulse shrink-0" />
                        <div>
                          <p className="text-sm font-bold text-emerald-400 font-mono">Console de Atividades</p>
                          <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">WhatsApp Web Puppeteer Engine</p>
                        </div>
                      </div>
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    </div>
                    <div className="flex-1 bg-slate-950 p-6 font-mono text-[11px] text-slate-300 overflow-y-auto space-y-2 border-l border-slate-900 shadow-inner">
                      {logs.length === 0 ? (
                        <p className="text-slate-500 italic">Aguardando novos eventos do servidor...</p>
                      ) : (
                        logs.map((log, idx) => (
                          <div key={idx} className="flex gap-2.5 border-b border-white/[0.03] pb-1.5">
                            <span className="text-emerald-500 font-bold shrink-0">&gt;</span>
                            <span className="break-all whitespace-pre-wrap">{log}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </>
                ) : !contatoSelecionado ? (
                  /* === TELA PLACEHOLDER DE CHAT (DASHBOARD PREMIUM) === */
                  <div className="flex-1 flex flex-col justify-between p-8 bg-slate-50/50 dark:bg-slate-950/40 overflow-y-auto">
                    <div className="max-w-2xl mx-auto w-full space-y-8 py-10">
                      {/* Header de Boas Vindas */}
                      <div className="text-center space-y-3">
                        <div className="inline-flex p-4 rounded-3xl bg-gradient-to-br from-emerald-400/20 to-teal-500/10 text-emerald-600 dark:text-emerald-400 mb-2 border border-emerald-500/20 shadow-md">
                          <Smartphone className="w-8 h-8" />
                        </div>
                        <h2 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-100">
                          Painel WhatsApp Integrado
                        </h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto font-medium">
                          Envie fretes, confirme coletas e gerencie automações em tempo real com sua frota corporativa.
                        </p>
                      </div>

                      {/* Grid de Diagnósticos */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/60 dark:border-slate-850 shadow-sm space-y-3">
                          <div className="flex items-center justify-between text-muted-foreground">
                            <span className="text-[9px] font-bold uppercase tracking-wider">Status Conexão</span>
                            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                          </div>
                          <div className="space-y-1">
                            <p className="text-base font-extrabold text-slate-850 dark:text-slate-100">Ativo & Pareado</p>
                            <p className="text-[10px] text-muted-foreground font-medium leading-none">Chrome Puppeteer OK</p>
                          </div>
                        </div>

                        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/60 dark:border-slate-850 shadow-sm space-y-3">
                          <div className="flex items-center justify-between text-muted-foreground">
                            <span className="text-[9px] font-bold uppercase tracking-wider">Energia e Celular</span>
                            <Battery className="w-4 h-4 text-emerald-500" />
                          </div>
                          <div className="space-y-1">
                            <p className="text-base font-extrabold text-slate-850 dark:text-slate-100">{dispositivo?.bateria}% Carregado</p>
                            <p className="text-[10px] text-muted-foreground font-medium leading-none truncate">{dispositivo?.nome || 'Dispositivo'}</p>
                          </div>
                        </div>

                        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/60 dark:border-slate-850 shadow-sm space-y-3">
                          <div className="flex items-center justify-between text-muted-foreground">
                            <span className="text-[9px] font-bold uppercase tracking-wider">Sinal / Operadora</span>
                            <Signal className="w-4 h-4 text-emerald-500" />
                          </div>
                          <div className="space-y-1">
                            <p className="text-base font-extrabold text-slate-850 dark:text-slate-100">Excelente</p>
                            <p className="text-[10px] text-muted-foreground font-medium leading-none">WiFi/Celular conectado</p>
                          </div>
                        </div>
                      </div>

                      {/* Iniciar nova conversa rápido */}
                      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/60 dark:border-slate-850 shadow-md space-y-4">
                        <div className="space-y-1">
                          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-850 dark:text-slate-100">Abrir Nova Janela de Conversa</h3>
                          <p className="text-xs text-muted-foreground font-medium">Digite um número com DDD (apenas dígitos) para abrir a timeline de mensagens.</p>
                        </div>
                        
                        <form onSubmit={(e) => {
                          e.preventDefault();
                          if (numeroTeste.trim()) {
                            setContatoSelecionado(numeroTeste);
                          }
                        }} className="flex gap-2">
                          <Input
                            type="tel"
                            value={numeroTeste}
                            onChange={(e) => setNumeroTeste(e.target.value)}
                            placeholder="Ex: 11999998888 (DDD + Número)"
                            className="text-xs h-10 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-xl"
                          />
                          <Button 
                            type="submit"
                            disabled={!numeroTeste.trim()}
                            className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl px-5 h-10 text-xs font-bold shadow-md shadow-emerald-500/10 gap-2 flex items-center border border-emerald-400"
                          >
                            <Send className="w-3.5 h-3.5" />
                            Abrir Chat
                          </Button>
                        </form>
                      </div>

                      {/* Ferramenta de Teste de Microfone */}
                      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/60 dark:border-slate-850 shadow-md space-y-4">
                        <div className="space-y-1">
                          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                            <Mic className="w-4 h-4 text-emerald-500" />
                            Diagnóstico e Teste de Microfone Local
                          </h3>
                          <p className="text-xs text-muted-foreground font-medium">Use esta ferramenta para testar o microfone do seu computador e ouvir o retorno instantaneamente no navegador.</p>
                        </div>

                        {testandoMic ? (
                          <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border">
                            <div className="flex items-center gap-3">
                              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">Gravando áudio de teste...</span>
                              <span className="font-mono text-xs font-extrabold bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 px-2.5 py-0.5 rounded-full">{segundosTeste}s</span>
                            </div>

                            {/* Equalizador de Teste */}
                            <div className="flex items-center gap-0.5 h-4 overflow-hidden">
                              {[...Array(8)].map((_, i) => {
                                const factor = Math.sin((i / 7) * Math.PI) * 0.8 + 0.2;
                                const height = Math.min(16, Math.max(3, (volumeTeste / 255) * 16 * factor + Math.random() * 2));
                                return (
                                  <div
                                    key={i}
                                    className="w-0.5 bg-emerald-500 rounded-full transition-all duration-75"
                                    style={{ height: `${height}px` }}
                                  />
                                );
                              })}
                            </div>

                            <Button onClick={pararTesteMic} className="bg-rose-500 hover:bg-rose-600 text-white rounded-lg text-[10px] h-7 px-3 font-bold">
                              Parar e Ouvir
                            </Button>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <Button onClick={iniciarTesteMic} className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs h-9 px-4 font-bold shadow-md shadow-emerald-500/10 gap-2 flex items-center">
                              <Mic className="w-3.5 h-3.5" />
                              Iniciar Gravação de Teste
                            </Button>

                            {audioTesteUrl && (
                              <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border space-y-2 max-w-md">
                                <p className="text-[10px] font-bold text-muted-foreground uppercase">Resultado da Gravação de Teste:</p>
                                <audio src={audioTesteUrl} controls className="w-full h-8 max-w-sm rounded-lg" />
                                <p className="text-[10px] text-emerald-605 dark:text-emerald-400 font-semibold leading-relaxed">
                                  Clique no play acima. Se você conseguir se ouvir, seu microfone e o navegador estão funcionando perfeitamente! Se não ouvir nada, o seu microfone está mutado nas configurações do computador.
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Dicas Rápidas */}
                      <div className="p-5 rounded-2xl bg-emerald-500/5 border border-emerald-500/15 text-emerald-800 dark:text-emerald-300 text-xs flex gap-3.5 leading-relaxed font-medium">
                        <ShieldCheck className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold mb-1">Informação de Segurança & Automações</p>
                          <p className="opacity-80">Este painel operacional utiliza a sessão real do seu dispositivo. As automações de coletas e entregas configuradas no sistema serão enviadas diretamente por este canal pareado.</p>
                        </div>
                      </div>
                    </div>

                    <div className="text-center text-[9px] text-muted-foreground border-t pt-4 font-bold tracking-wide uppercase">
                      ColetaMax &copy; 2026 &bull; Módulo de WhatsApp Real
                    </div>
                  </div>
                ) : (
                  /* === ÁREA DE CHAT ATIVA === */
                  <>
                    {/* Header do Chat */}
                    <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-4 md:px-6 py-3 border-b flex items-center justify-between shrink-0 shadow-sm z-10">
                      <div className="flex items-center gap-2.5 md:gap-4">
                        {/* Botão de Voltar para Mobile */}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setContatoSelecionado(null)}
                          className="h-8 w-8 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 rounded-lg md:hidden shrink-0"
                          title="Voltar para a lista"
                        >
                          <ChevronLeft className="h-5 w-5" />
                        </Button>
                        <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden shadow-sm text-sm font-bold text-slate-600 dark:text-slate-300 border shrink-0">
                          {(() => {
                            const info = whatsappConversas.find((c: any) => c.id === contatoSelecionado);
                            const jid = info ? info.id : (contatoSelecionado.includes('@') ? contatoSelecionado : `${contatoSelecionado}@c.us`);
                            return <ProfilePicture jid={jid} nome={info?.nome || contatoSelecionado} isGroup={info?.isGroup} />;
                          })()}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-850 dark:text-slate-100 leading-tight">
                            {whatsappConversas.find((c: any) => c.id === contatoSelecionado)?.nome || contatoSelecionado}
                          </p>
                          <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold mt-0.5 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Canal Operacional
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 rounded-lg">
                          <Search className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 rounded-lg">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Mensagens (Timeline Estilo WhatsApp Web Oficial) */}
                    <div 
                      className="flex-1 overflow-y-auto px-6 py-4 space-y-2 relative bg-[#efeae2] dark:bg-[#0b141a]"
                      style={{
                        backgroundImage: 'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")',
                        backgroundBlendMode: 'overlay'
                      }}
                    >
                      {carregandoMensagens ? (
                        <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                          <RefreshCw className="w-8 h-8 animate-spin opacity-45 mb-4 text-[#00a884]" />
                          <p className="text-xs font-bold text-slate-650 dark:text-slate-400">Carregando histórico de mensagens...</p>
                        </div>
                      ) : mensagensAtuais.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground/80">
                          <div className="w-14 h-14 rounded-3xl bg-[#00a884]/10 flex items-center justify-center mb-4 border border-[#00a884]/20 shadow-sm">
                            <MessageSquare className="w-6 h-6 text-[#00a884] opacity-60" />
                          </div>
                          <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Nenhuma mensagem registrada na timeline</p>
                          <p className="text-[10px] mt-1 opacity-75 max-w-xs font-medium">
                            Use a barra inferior para disparar fretes operacionais e avisos manuais.
                          </p>
                        </div>
                      ) : (
                        <>
                          {/* Bolhas de mensagem */}
                          {mensagensAtuais.map((item) => {
                            const isOwn = item.fromMe;
                            return (
                              <motion.div
                                key={item.id}
                                initial={{ opacity: 0, scale: 0.98 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className={`flex w-full mb-1 ${isOwn ? 'justify-end' : 'justify-start'}`}
                              >
                                <div 
                                  className={`max-w-[65%] shadow-[0_1px_0.5px_rgba(0,0,0,0.12)] px-3 py-1.5 relative text-slate-900 dark:text-slate-100 ${
                                    isOwn 
                                      ? 'bg-[#d9fdd3] dark:bg-[#005c4b] text-[#111b21] dark:text-[#e9edef]' 
                                      : 'bg-white dark:bg-[#202c33] text-[#111b21] dark:text-[#e9edef]'
                                  }`}
                                  style={{
                                    borderTopRightRadius: isOwn ? '0px' : '8px',
                                    borderTopLeftRadius: !isOwn ? '0px' : '8px',
                                    borderBottomLeftRadius: '8px',
                                    borderBottomRightRadius: '8px'
                                  }}
                                >
                                  {/* Conteúdo com Inovação: Imagem ou Áudio em tempo real */}
                                  {item.hasMedia ? (
                                    <div className="space-y-1">
                                      {item.type === 'image' ? (
                                        <div 
                                          onClick={() => setImagemVisualizar(`/api/whatsapp/media/download?chatId=${encodeURIComponent(item.chatId || contatoSelecionado || '')}&messageId=${encodeURIComponent(item.id)}`)}
                                          className="relative rounded-lg overflow-hidden border border-black/5 dark:border-white/5 group cursor-pointer shadow-sm max-w-[280px] mb-1"
                                        >
                                          {/* eslint-disable-next-line @next/next/no-img-element */}
                                          <img
                                            src={`/api/whatsapp/media/download?chatId=${encodeURIComponent(item.chatId || contatoSelecionado || '')}&messageId=${encodeURIComponent(item.id)}`}
                                            alt="Mídia WhatsApp"
                                            className="w-full h-auto max-h-64 object-contain rounded-lg transition-transform duration-350 hover:scale-[1.01]"
                                            loading="lazy"
                                          />
                                        </div>
                                      ) : item.type === 'ptt' || item.type === 'audio' ? (
                                        <WhatsAppAudioPlayer 
                                          src={`/api/whatsapp/media/download?chatId=${encodeURIComponent(item.chatId || contatoSelecionado || '')}&messageId=${encodeURIComponent(item.id)}`} 
                                        />
                                      ) : (
                                        <div className="text-xs italic flex items-center gap-1.5 opacity-80 font-medium py-1">
                                          <Paperclip className="w-3.5 h-3.5" />
                                          <span>Arquivo Recebido ({item.type})</span>
                                        </div>
                                      )}
                                      
                                      {item.body && (
                                        <p className="text-[14.2px] whitespace-pre-line break-words leading-[19px] py-0.5">
                                          {item.body}
                                        </p>
                                      )}
                                    </div>
                                  ) : (
                                    <p className="text-[14.2px] whitespace-pre-line break-words leading-[19px] py-0.5">
                                      {item.body}
                                    </p>
                                  )}

                                  {/* Hora e Status estilo WhatsApp Web */}
                                  <div className="flex items-center justify-end gap-1 mt-1 text-[9.5px] select-none opacity-60 font-medium">
                                    <span className={isOwn ? 'text-[#111b21]/70 dark:text-[#e9edef]/70' : 'text-slate-500'}>
                                      {new Date(item.timestamp * 1000).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                    {isOwn && <CheckCheck className="w-3.5 h-3.5 text-[#53bdeb] dark:text-[#53bdeb]" />}
                                  </div>
                                </div>
                              </motion.div>
                            );
                          })}
                          <div ref={messagesEndRef} />
                        </>
                      )}
                    </div>

                    {/* Barra de envio de mensagem (estilo WhatsApp) */}
                    <div className="bg-[#f0f2f5] dark:bg-slate-900 px-4 py-3 border-t shrink-0">
                      {/* Input oculto para file picker */}
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/gif"
                        onChange={handleEnviarImagem}
                        className="hidden"
                      />

                      {isGravando ? (
                        <div className="flex items-center justify-between bg-white dark:bg-slate-800 border rounded-2xl px-4 py-3 text-sm text-foreground shadow-lg animate-none w-full transition-all duration-300">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping shrink-0" />
                            <div className="flex items-center gap-1.5 shrink-0">
                              <Mic className="w-4 h-4 text-rose-500 animate-pulse" />
                              <span className="font-bold text-xs text-rose-500 hidden sm:inline">Gravando áudio operacional...</span>
                            </div>
                            
                            {/* Visualizador de Ondas de Áudio Dinâmicas (Equalizador) */}
                            <div className="flex items-center gap-0.5 h-6 px-3 py-1 bg-slate-50 dark:bg-slate-900 rounded-full border border-slate-100 dark:border-slate-800 flex-1 max-w-[200px] justify-center mx-2 overflow-hidden">
                              {[...Array(14)].map((_, i) => {
                                // Fator senoidal para criar uma forma de sino agradável
                                const factor = Math.sin((i / 13) * Math.PI) * 0.85 + 0.15;
                                // Calcula a altura com base no volumeLevel e uma pitada de flutuação dinâmica
                                const height = Math.min(22, Math.max(3, (volumeLevel / 255) * 22 * factor + (volumeLevel > 5 ? Math.random() * 2 : 0)));
                                return (
                                  <div
                                    key={i}
                                    className="w-1 bg-[#00a884] rounded-full transition-all duration-75"
                                    style={{ 
                                      height: `${height}px`,
                                      opacity: volumeLevel > 2 ? 1 : 0.45
                                    }}
                                  />
                                );
                              })}
                            </div>

                            <span className="font-mono text-xs font-extrabold bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 px-2.5 py-0.5 rounded-full shrink-0">
                              {formatarTempo(segundosGravacao)}
                            </span>
                          </div>
                          <div className="flex gap-2 shrink-0">
                            <Button type="button" variant="ghost" size="sm" className="text-rose-550 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-xs h-9 rounded-xl px-3 font-bold" onClick={cancelarGravacao}>
                              <X className="w-3.5 h-3.5 mr-1" /> Descartar
                            </Button>
                            <Button type="button" size="sm" className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs h-9 px-4 rounded-xl shadow-md flex items-center font-bold" onClick={pararGravacao}>
                              <Send className="w-3.5 h-3.5 mr-1" /> Enviar Áudio
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <form onSubmit={handleEnviarTeste} className="flex items-center gap-2">
                          {/* Input de número (só mostra quando não tem contato selecionado) */}
                          {!contatoSelecionado && (
                            <Input
                              type="tel"
                              value={numeroTeste}
                              onChange={(e) => setNumeroTeste(e.target.value)}
                              placeholder="Numero (DDD)..."
                              className="w-36 text-xs h-10 font-mono bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl"
                            />
                          )}

                          {/* Botão de anexo (imagem) */}
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={enviandoMidia}
                            className="h-10 w-10 text-muted-foreground hover:text-[#00a884] shrink-0 rounded-xl"
                            title="Enviar imagem"
                          >
                            <Paperclip className="w-5 h-5" />
                          </Button>
                          
                          {/* Botão Emoji */}
                          <div className="relative">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                              className="h-10 w-10 text-muted-foreground hover:text-[#00a884] shrink-0 rounded-xl"
                              title="Emojis"
                            >
                              <Smile className="w-5 h-5" />
                            </Button>
                            {showEmojiPicker && (
                              <div className="absolute bottom-14 left-0 z-50 shadow-2xl rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
                                <EmojiPicker 
                                  onEmojiClick={(emojiData) => {
                                    setMensagemTeste(prev => prev + emojiData.emoji);
                                    setShowEmojiPicker(false);
                                  }} 
                                />
                              </div>
                            )}
                          </div>
                          
                          {/* Input de mensagem */}
                          <div className="flex-1 relative">
                            <Input
                              value={mensagemTeste}
                              onChange={(e) => setMensagemTeste(e.target.value)}
                              placeholder="Escreva uma mensagem de teste..."
                              className="pr-3 text-sm h-10 bg-white dark:bg-slate-850 border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100"
                            />
                          </div>

                          {/* Botão de áudio ou envio */}
                          {mensagemTeste.trim() ? (
                            <Button
                              type="submit"
                              disabled={enviandoTeste || enviandoMidia || (!contatoSelecionado && !numeroTeste.trim())}
                              className="h-10 w-10 p-0 rounded-full bg-[#00a884] hover:bg-[#00a884]/90 text-white shadow-md shrink-0 flex items-center justify-center"
                            >
                              {enviandoTeste ? (
                                <RefreshCw className="w-4 h-4 animate-spin" />
                              ) : (
                                <Send className="w-4 h-4" />
                              )}
                            </Button>
                          ) : (
                            <Button
                              type="button"
                              onClick={iniciarGravacao}
                              disabled={enviandoMidia}
                              className="h-10 w-10 p-0 rounded-full bg-[#00a884] hover:bg-[#00a884]/90 text-white shadow-md shrink-0 flex items-center justify-center"
                              title="Gravar audio"
                            >
                              <Mic className="w-4 h-4" />
                            </Button>
                          )}
                        </form>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Visualizador de Imagem em Tela Cheia (Modal Premium com Zoom) */}
      {imagemVisualizar && (
        <div 
          className="fixed inset-0 bg-black/95 backdrop-blur-md z-[9999] flex items-center justify-center p-4 overflow-auto"
          onClick={() => { setImagemVisualizar(null); setImagemZoom(false); }}
        >
          {/* Barra Flutuante de Controles */}
          <div className="absolute top-4 right-4 flex items-center gap-2 z-50">
            <button 
              type="button"
              className="text-white hover:text-emerald-400 bg-white/10 hover:bg-white/20 px-3.5 py-2 rounded-xl transition-all font-bold text-xs gap-1.5 flex items-center shadow-md backdrop-blur-sm border border-white/5"
              onClick={(e) => {
                e.stopPropagation();
                setImagemZoom(!imagemZoom);
              }}
            >
              {imagemZoom ? (
                <>
                  <svg className="w-4 h-4 fill-none stroke-current stroke-2" viewBox="0 0 24 24">
                    <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3M8 11h6"/>
                  </svg>
                  Reduzir
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 fill-none stroke-current stroke-2" viewBox="0 0 24 24">
                    <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3M11 8v6M8 11h6"/>
                  </svg>
                  Zoom
                </>
              )}
            </button>
            <button 
              type="button"
              className="text-white hover:text-rose-400 bg-white/10 hover:bg-white/20 p-2 rounded-xl transition-all shadow-md backdrop-blur-sm border border-white/5"
              onClick={() => { setImagemVisualizar(null); setImagemZoom(false); }}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Imagem Ampliável com Transição Suave */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img 
            src={imagemVisualizar} 
            alt="Visualização em tamanho real" 
            className={`max-w-full max-h-[92vh] object-contain rounded-xl shadow-2xl select-none transition-transform duration-300 ease-out origin-center ${
              imagemZoom ? 'scale-[2.0] cursor-zoom-out' : 'scale-[1.0] cursor-zoom-in'
            }`}
            onClick={(e) => {
              e.stopPropagation();
              setImagemZoom(!imagemZoom);
            }}
          />
        </div>
      )}
    </div>
  );
}

