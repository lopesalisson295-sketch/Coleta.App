'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, MessageSquare, User, ChevronLeft, Mic, Play, Pause } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type Contato = {
  id: string;
  nome: string;
  role: 'ADMIN' | 'MOTORISTA' | 'AJUDANTE';
  ultimaMensagem: string | null;
  ultimaDataMsg: string | null;
  naoLidas: number;
};

type Mensagem = {
  id: string;
  conteudo: string;
  tipo: string; // "TEXTO" ou "AUDIO"
  criadoEm: string;
  lida: boolean;
  remetente: { id: string; nome: string };
};

// Player de Áudio Premium e Customizado com Controle de Velocidade
function AudioPlayer({ src, isOwn }: { src: string; isOwn: boolean }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onLoadedMetadata = () => setDuration(audio.duration || 0);
    const onEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('ended', onEnded);
    };
  }, [src]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    const value = parseFloat(e.target.value);
    audio.currentTime = value;
    setCurrentTime(value);
  };

  const changeSpeed = () => {
    const audio = audioRef.current;
    if (!audio) return;

    let nextRate = 1;
    if (playbackRate === 1) nextRate = 1.5;
    else if (playbackRate === 1.5) nextRate = 2;
    else nextRate = 1;

    audio.playbackRate = nextRate;
    setPlaybackRate(nextRate);
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return '0:00';
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className={cn(
      "flex items-center gap-3 py-1 px-1 min-w-[230px] sm:min-w-[270px]",
      isOwn ? "text-primary-foreground" : "text-foreground"
    )}>
      <audio ref={audioRef} src={src} preload="metadata" />
      
      <button
        onClick={togglePlay}
        type="button"
        className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-transform active:scale-95",
          isOwn 
            ? "bg-white/20 hover:bg-white/30 text-white" 
            : "bg-primary/10 hover:bg-primary/20 text-primary"
        )}
      >
        {isPlaying ? (
          <Pause className="w-4 h-4 fill-current" />
        ) : (
          <Play className="w-4 h-4 fill-current ml-0.5" />
        )}
      </button>

      <div className="flex-1 flex flex-col gap-1 min-w-0">
        <input
          type="range"
          min="0"
          max={duration || 100}
          value={currentTime}
          onChange={handleSeek}
          className={cn(
            "w-full h-1 rounded-lg appearance-none cursor-pointer outline-none transition-all",
            isOwn 
              ? "bg-white/30 accent-white [&::-webkit-slider-thumb]:bg-white" 
              : "bg-primary/20 accent-primary [&::-webkit-slider-thumb]:bg-primary"
          )}
        />
        <div className="flex justify-between text-[10px] opacity-80 select-none">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      <button
        onClick={changeSpeed}
        type="button"
        className={cn(
          "px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0 transition-colors",
          isOwn 
            ? "bg-white/10 hover:bg-white/20 text-white" 
            : "bg-muted-foreground/10 hover:bg-muted-foreground/20 text-foreground"
        )}
      >
        {playbackRate}x
      </button>
    </div>
  );
}

export default function ChatPage() {
  const { data: session } = useSession();
  const [contatos, setContatos] = useState<Contato[]>([]);
  const [contatoAtivo, setContatoAtivo] = useState<Contato | null>(null);
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [novaMensagem, setNovaMensagem] = useState('');
  const [isEnviando, setIsEnviando] = useState(false);
  const [mobileVerContato, setMobileVerContato] = useState(false);
  
  // Estados para Gravação de Áudio
  const [isGravando, setIsGravando] = useState(false);
  const [segundosGravacao, setSegundosGravacao] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout>();

  const mensagensRef = useRef<HTMLDivElement>(null);
  const pollingRef = useRef<NodeJS.Timeout>();

  const fetchContatos = useCallback(async () => {
    try {
      const res = await fetch('/api/chat/contatos');
      if (res.ok) setContatos(await res.json());
    } catch {}
  }, []);

  const fetchMensagens = useCallback(async (contatoId: string) => {
    try {
      const res = await fetch(`/api/mensagens?com=${contatoId}`);
      if (res.ok) {
        setMensagens(await res.json());
        // Scroll ao fim
        setTimeout(() => {
          mensagensRef.current?.scrollTo({ top: mensagensRef.current.scrollHeight, behavior: 'smooth' });
        }, 100);
      }
    } catch {}
  }, []);

  // Fetch contatos ao montar
  useEffect(() => {
    fetchContatos();
    const interval = setInterval(fetchContatos, 10000);
    return () => clearInterval(interval);
  }, [fetchContatos]);

  // Polling de mensagens quando há contato ativo
  useEffect(() => {
    if (!contatoAtivo) return;

    fetchMensagens(contatoAtivo.id);

    pollingRef.current = setInterval(() => {
      fetchMensagens(contatoAtivo.id);
    }, 3000);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [contatoAtivo, fetchMensagens]);

  const abrirContato = (contato: Contato) => {
    setContatoAtivo(contato);
    setMobileVerContato(true);
    // Atualiza contato como lido localmente
    setContatos(prev => prev.map(c => c.id === contato.id ? { ...c, naoLidas: 0 } : c));
  };

  const enviarMensagem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novaMensagem.trim() || !contatoAtivo || isEnviando) return;

    const texto = novaMensagem.trim();
    setNovaMensagem('');
    setIsEnviando(true);

    try {
      const res = await fetch('/api/mensagens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ destinatarioId: contatoAtivo.id, conteudo: texto, tipo: 'TEXTO' }),
      });

      if (res.ok) {
        const nova = await res.json();
        setMensagens(prev => [...prev, nova]);
        setTimeout(() => {
          mensagensRef.current?.scrollTo({ top: mensagensRef.current.scrollHeight, behavior: 'smooth' });
        }, 50);
        fetchContatos();
      }
    } finally {
      setIsEnviando(false);
    }
  };

  // Funções de Gravação de Áudio
  const iniciarGravacao = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      
      let options = { mimeType: 'audio/webm' };
      if (!MediaRecorder.isTypeSupported('audio/webm')) {
        options = { mimeType: 'audio/ogg' };
      }
      if (!MediaRecorder.isTypeSupported('audio/ogg')) {
        options = { mimeType: 'audio/mp4' };
      }
      
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType || 'audio/webm' });
        
        // Converter para base64
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64Audio = reader.result as string;
          
          try {
            setIsEnviando(true);
            const activeContact = contatoAtivo;
            if (!activeContact) return;
            const res = await fetch('/api/mensagens', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                destinatarioId: activeContact.id,
                conteudo: base64Audio,
                tipo: 'AUDIO'
              }),
            });
            
            if (res.ok) {
              const nova = await res.json();
              setMensagens(prev => [...prev, nova]);
              setTimeout(() => {
                mensagensRef.current?.scrollTo({ top: mensagensRef.current.scrollHeight, behavior: 'smooth' });
              }, 50);
              fetchContatos();
            }
          } catch (error) {
            console.error("Erro ao enviar áudio:", error);
          } finally {
            setIsEnviando(false);
          }
        };
        
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorder.start();
      setIsGravando(true);
      setSegundosGravacao(0);
      
      timerRef.current = setInterval(() => {
        setSegundosGravacao(prev => prev + 1);
      }, 1000);
      
    } catch (error) {
      console.error('Erro ao acessar microfone:', error);
      alert('Não foi possível acessar o microfone. Verifique as permissões de gravação.');
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
      };
      mediaRecorderRef.current.stop();
      setIsGravando(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const formatarTempo = (segundos: number) => {
    const mins = Math.floor(segundos / 60);
    const secs = segundos % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="h-[calc(100vh-9rem)] flex rounded-xl border overflow-hidden bg-card">
      {/* Sidebar de contatos */}
      <div className={cn(
        'w-full sm:w-80 border-r flex flex-col flex-shrink-0',
        mobileVerContato ? 'hidden sm:flex' : 'flex'
      )}>
        <div className="h-14 px-4 flex items-center border-b">
          <h2 className="font-semibold text-sm">Conversas</h2>
        </div>
        <div className="flex-1 overflow-y-auto">
          {contatos.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground text-sm">
              Nenhum usuário encontrado.
            </div>
          ) : (
            contatos.map((contato) => (
              <button
                key={contato.id}
                onClick={() => abrirContato(contato)}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/50 transition-colors border-b border-border/50',
                  contatoAtivo?.id === contato.id && 'bg-primary/5 border-l-2 border-l-primary'
                )}
              >
                <div className="relative shrink-0">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="w-5 h-5 text-primary" />
                  </div>
                  {contato.naoLidas > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                      {contato.naoLidas > 9 ? '9+' : contato.naoLidas}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-sm truncate">{contato.nome}</p>
                    {contato.ultimaDataMsg && (
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        {formatDistanceToNow(new Date(contato.ultimaDataMsg), { locale: ptBR })}
                      </span>
                    )}
                  </div>
                  <p className={cn(
                    'text-xs truncate mt-0.5',
                    contato.naoLidas > 0 ? 'text-foreground font-medium' : 'text-muted-foreground'
                  )}>
                    {contato.role === 'ADMIN' ? '👑 Admin' : contato.role === 'AJUDANTE' ? '🤝 Ajudante' : '🚗 Motorista'}
                    {contato.ultimaMensagem ? ` · ${contato.ultimaMensagem}` : ' · Iniciar conversa'}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Área de mensagens */}
      <div className={cn(
        'flex-1 flex flex-col min-w-0',
        !mobileVerContato ? 'hidden sm:flex' : 'flex'
      )}>
        {!contatoAtivo ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <MessageSquare className="w-16 h-16 text-muted-foreground/20 mb-4" />
            <p className="font-medium text-muted-foreground">Selecione uma conversa</p>
            <p className="text-sm text-muted-foreground/70 mt-1">Escolha um contato na lista para iniciar.</p>
          </div>
        ) : (
          <>
            {/* Header da conversa */}
            <div className="h-14 px-4 flex items-center gap-3 border-b">
              <button
                onClick={() => setMobileVerContato(false)}
                className="sm:hidden text-muted-foreground"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-sm">{contatoAtivo.nome}</p>
                <p className="text-xs text-muted-foreground">
                  {contatoAtivo.role === 'ADMIN' ? 'Administrador' : contatoAtivo.role === 'AJUDANTE' ? 'Ajudante' : 'Motorista'}
                </p>
              </div>
            </div>

            {/* Mensagens */}
            <div ref={mensagensRef} className="flex-1 overflow-y-auto p-4 space-y-2">
              {mensagens.length === 0 && (
                <p className="text-center text-sm text-muted-foreground py-8">
                  Nenhuma mensagem ainda. Diga olá! 👋
                </p>
              )}
              <AnimatePresence initial={false}>
                {mensagens.map((msg) => {
                  const isOwn = msg.remetente.id === session?.user?.id;
                  const isAudio = msg.tipo === 'AUDIO';
                  return (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={cn('flex', isOwn ? 'justify-end' : 'justify-start')}
                    >
                      <div className={cn(
                        'max-w-[75%] rounded-2xl px-3.5 py-2 text-sm',
                        isOwn
                          ? 'bg-primary text-primary-foreground rounded-br-sm'
                          : 'bg-muted text-foreground rounded-bl-sm',
                        isAudio && 'p-2'
                      )}>
                        {isAudio ? (
                          <AudioPlayer src={msg.conteudo} isOwn={isOwn} />
                        ) : (
                          <p className="leading-snug">{msg.conteudo}</p>
                        )}
                        <p className={cn(
                          'text-[10px] mt-0.5 text-right',
                          isOwn ? 'text-primary-foreground/60' : 'text-muted-foreground'
                        )}>
                          {formatDistanceToNow(new Date(msg.criadoEm), { addSuffix: true, locale: ptBR })}
                        </p>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>

            {/* Input de envio com Gravação de Áudio */}
            <div className="p-4 border-t">
              {isGravando ? (
                <div className="flex items-center justify-between bg-muted/60 border rounded-xl px-4 py-2 text-sm text-foreground">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shrink-0" />
                    <span className="font-medium text-xs sm:text-sm">Gravando áudio...</span>
                    <span className="font-mono text-xs text-muted-foreground ml-1 sm:ml-2">{formatarTempo(segundosGravacao)}</span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-red-500 hover:text-red-600 hover:bg-red-50 text-xs py-1 h-8"
                      onClick={cancelarGravacao}
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      className="bg-primary text-primary-foreground hover:bg-primary/95 text-xs py-1 h-8 px-3"
                      onClick={pararGravacao}
                    >
                      Enviar
                    </Button>
                  </div>
                </div>
              ) : (
                <form onSubmit={enviarMensagem} className="flex gap-2">
                  <Input
                    value={novaMensagem}
                    onChange={(e) => setNovaMensagem(e.target.value)}
                    placeholder="Digite uma mensagem..."
                    disabled={isEnviando}
                    autoComplete="off"
                    className="flex-1"
                  />
                  
                  {/* Se não houver texto no input, exibir o microfone */}
                  {!novaMensagem.trim() ? (
                    <Button
                      type="button"
                      onClick={iniciarGravacao}
                      disabled={isEnviando}
                      size="icon"
                      variant="outline"
                      className="shrink-0 hover:bg-primary/5 hover:text-primary border border-input text-muted-foreground"
                    >
                      <Mic className="w-4 h-4" />
                    </Button>
                  ) : (
                    <Button type="submit" disabled={isEnviando} size="icon" className="shrink-0 bg-primary text-primary-foreground hover:bg-primary/95">
                      {isEnviando ? (
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                    </Button>
                  )}
                </form>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
