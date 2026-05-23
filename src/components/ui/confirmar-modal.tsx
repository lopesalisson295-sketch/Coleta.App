'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Camera, X, Check, Loader2, AlertCircle, Upload, XCircle, CheckCircle } from 'lucide-react';
import { addOfflineAction } from '@/lib/offline-sync';
import Image from 'next/image';
import { cn } from '@/lib/utils';

interface ConfirmarModalProps {
  titulo: string;
  isOpen: boolean;
  onClose: () => void;
  onConfirmar: (dados: { status: string; observacao: string; imagemUrl?: string }) => Promise<void>;
  onPassar?: (dados: { observacao: string }) => Promise<void>;
  tipo: 'coleta' | 'entrega';
  isAdmin?: boolean;
}

export function ConfirmarModal({ titulo, isOpen, onClose, onConfirmar, onPassar, tipo, isAdmin = false }: ConfirmarModalProps) {
  const [observacao, setObservacao] = useState('');
  const [imagemPreview, setImagemPreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [acao, setAcao] = useState<'confirmar' | 'nao_realizada' | null>(null);
  const [erroFoto, setErroFoto] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const statusSucesso = tipo === 'coleta' ? 'COLETADA' : 'ENTREGUE';

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setImagemPreview(reader.result as string);
      setErroFoto(false);
    };
    reader.readAsDataURL(file);
  };

  const handleConfirmar = async () => {
    if (!imagemPreview) {
      setErroFoto(true);
      return;
    }
    setErroFoto(false);
    setIsLoading(true);
    setAcao('confirmar');
    try {
      if (!navigator.onLine) {
        // Modo offline
        await onConfirmar({
          status: isAdmin ? statusSucesso : 'EM_ANDAMENTO',
          observacao,
          imagemUrl: imagemPreview,
        });
        resetAndClose();
        return;
      }

      let imagemUrl = imagemPreview;
      if (imagemPreview.startsWith('data:image')) {
        const res = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: imagemPreview })
        });
        const data = await res.json();
        if (data.url) imagemUrl = data.url;
      }

      await onConfirmar({
        status: isAdmin ? statusSucesso : 'EM_ANDAMENTO',
        observacao,
        imagemUrl: imagemUrl || undefined,
      });
      resetAndClose();
    } finally {
      setIsLoading(false);
      setAcao(null);
    }
  };

  const handlePassar = async () => {
    if (!observacao.trim()) {
      alert('Informe o motivo para não realizar a ' + (tipo === 'coleta' ? 'coleta' : 'entrega') + '.');
      return;
    }
    if (!isAdmin && !imagemPreview) {
      setErroFoto(true);
      return;
    }
    setErroFoto(false);
    setIsLoading(true);
    setAcao('nao_realizada');
    try {
      if (!navigator.onLine) {
        // Modo offline
        const obsFalha = observacao.startsWith('[FALHA]') ? observacao : `[FALHA] ${observacao}`;
        if (onPassar) {
          await onPassar({ observacao: obsFalha, imagemUrl: imagemPreview } as any);
        } else {
          await onConfirmar({ status: isAdmin ? 'NAO_REALIZADA' : 'EM_ANDAMENTO', observacao: obsFalha, imagemUrl: imagemPreview });
        }
        resetAndClose();
        return;
      }

      let imagemUrl = imagemPreview;
      if (imagemPreview && imagemPreview.startsWith('data:image')) {
        const res = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: imagemPreview })
        });
        const data = await res.json();
        if (data.url) imagemUrl = data.url;
      }

      const obsFalha = observacao.startsWith('[FALHA]') ? observacao : `[FALHA] ${observacao}`;
      if (onPassar) {
        await onPassar({ observacao: obsFalha, imagemUrl: imagemUrl || undefined } as any);
      } else {
        await onConfirmar({ status: isAdmin ? 'NAO_REALIZADA' : 'EM_ANDAMENTO', observacao: obsFalha, imagemUrl: imagemUrl || undefined });
      }
      resetAndClose();
    } finally {
      setIsLoading(false);
      setAcao(null);
    }
  };

  const resetAndClose = () => {
    setObservacao('');
    setImagemPreview(null);
    setErroFoto(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-card rounded-2xl border shadow-2xl w-full max-w-md animate-in slide-in-from-bottom-4 duration-300">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b">
          <div>
            <h2 className="font-semibold text-base">{titulo}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isAdmin 
                ? `Registre a ${tipo === 'coleta' ? 'coleta' : 'entrega'} final ou informe o motivo de não realização`
                : `Envie a foto de comprovação para o administrador aprovar`}
            </p>
          </div>
          <button onClick={resetAndClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* Foto */}
          <div>
            <label className={cn("text-sm font-medium block mb-2", erroFoto && "text-rose-500")}>
              <Camera className="w-4 h-4 inline mr-1" />
              Foto de comprovação (obrigatória) *
            </label>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleImageChange}
            />
            {imagemPreview ? (
              <div className="relative rounded-xl overflow-hidden border h-40">
                <Image src={imagemPreview} alt="Preview" fill className="object-cover" />
                <button
                  onClick={() => setImagemPreview(null)}
                  className="absolute top-2 right-2 bg-black/60 rounded-full p-1 text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileRef.current?.click()}
                className={cn(
                  "w-full h-28 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-colors",
                  erroFoto 
                    ? "border-rose-500 bg-rose-500/5 text-rose-500 hover:bg-rose-500/10 hover:border-rose-600 animate-pulse" 
                    : "border-muted-foreground/30 text-muted-foreground hover:border-primary/50 hover:text-primary"
                )}
              >
                <Upload className="w-6 h-6" />
                <span className="text-xs">Toque para tirar ou selecionar foto</span>
              </button>
            )}
            {erroFoto && (
              <p className="text-xs text-rose-500 mt-1.5 flex items-center gap-1 font-medium">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                A foto de comprovação é obrigatória para confirmar a {tipo === 'coleta' ? 'coleta' : 'entrega'}.
              </p>
            )}
          </div>

          {/* Observação */}
          <div>
            <label className="text-sm font-medium block mb-2">
              <AlertCircle className="w-4 h-4 inline mr-1" />
              Observação
            </label>
            <Textarea
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              placeholder="Adicione uma observação (obrigatória para 'Não Realizada')..."
              rows={3}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-5 border-t">
          <Button
            variant="outline"
            className="flex-1 gap-2 border-rose-500/30 text-rose-500 hover:bg-rose-500/10"
            disabled={isLoading}
            onClick={handlePassar}
          >
            {isLoading && acao === 'nao_realizada' ? (
              <span className="animate-spin rounded-full border-2 border-rose-400 border-t-transparent w-4 h-4" />
            ) : (
              <XCircle className="w-4 h-4" />
            )}
            Não Realizada
          </Button>
          <Button
            className="flex-1 gap-2"
            disabled={isLoading}
            onClick={handleConfirmar}
          >
            {isLoading && acao === 'confirmar' ? (
              <span className="animate-spin rounded-full border-2 border-white border-t-transparent w-4 h-4" />
            ) : (
              <CheckCircle className="w-4 h-4" />
            )}
            {isAdmin ? (tipo === 'coleta' ? 'Confirmar Coleta' : 'Confirmar Entrega') : 'Enviar Foto e Aguardar'}
          </Button>
        </div>
      </div>
    </div>
  );
}
