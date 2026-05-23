'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ShieldCheck, KeyRound, Loader2, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

export default function EsqueciSenhaPage() {
  const [passo, setPasso] = useState<1 | 2>(1);
  const [email, setEmail] = useState('');
  const [codigo, setCodigo] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sucesso, setSucesso] = useState(false);

  const handleSolicitarCodigo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (res.ok) {
        setPasso(2);
      } else {
        setError(data.error || 'Erro ao solicitar recuperação.');
      }
    } catch {
      setError('Erro de conexão com o servidor.');
    } finally {
      setLoading(false);
    }
  };

  const handleRedefinirSenha = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!codigo.trim() || !novaSenha.trim()) {
      setError('Preencha todos os campos.');
      return;
    }

    if (novaSenha !== confirmarSenha) {
      setError('As senhas não conferem.');
      return;
    }

    if (novaSenha.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, codigo, novaSenha }),
      });

      const data = await res.json();

      if (res.ok) {
        setSucesso(true);
      } else {
        setError(data.error || 'Erro ao redefinir senha.');
      }
    } catch {
      setError('Erro de conexão com o servidor.');
    } finally {
      setLoading(false);
    }
  };

  if (sucesso) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md border-none shadow-xl">
          <CardContent className="flex flex-col items-center text-center py-12 gap-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-emerald-500" />
            </div>
            <h2 className="text-xl font-bold text-foreground">Senha Redefinida!</h2>
            <p className="text-sm text-muted-foreground max-w-xs">
              Sua senha foi alterada com sucesso. Faça login com sua nova senha.
            </p>
            <Link href="/auth/login">
              <Button className="mt-2 gap-2">
                <ArrowLeft className="w-4 h-4" />
                Voltar ao Login
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md border-none shadow-xl">
        <CardHeader className="space-y-2 text-center pb-6">
          <div className="flex justify-center mb-2">
            <div className="rounded-full bg-accent/10 p-3">
              {passo === 1 ? (
                <KeyRound className="h-8 w-8 text-accent" />
              ) : (
                <ShieldCheck className="h-8 w-8 text-accent" />
              )}
            </div>
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">
            {passo === 1 ? 'Recuperar Senha' : 'Redefinir Senha'}
          </CardTitle>
          <CardDescription>
            {passo === 1
              ? 'Informe seu e-mail para solicitar um codigo de recuperação ao administrador.'
              : 'Digite o codigo de 6 digitos recebido do administrador e defina sua nova senha.'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {passo === 1 ? (
            <form onSubmit={handleSolicitarCodigo} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">E-mail cadastrado</label>
                <Input
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              {error && (
                <div className="text-sm text-destructive font-medium text-center bg-destructive/10 p-2.5 rounded-lg">
                  {error}
                </div>
              )}

              <Button type="submit" className="w-full mt-2" disabled={loading}>
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : null}
                {loading ? 'Solicitando...' : 'Solicitar Codigo'}
              </Button>

              <p className="text-xs text-center text-muted-foreground mt-3">
                O codigo sera gerado pelo administrador do sistema. Após solicitar, entre em contato com o administrador para obter o codigo.
              </p>
            </form>
          ) : (
            <form onSubmit={handleRedefinirSenha} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Codigo de Recuperação</label>
                <Input
                  type="text"
                  placeholder="000000"
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  maxLength={6}
                  className="text-center text-2xl tracking-[0.5em] font-mono"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Nova Senha</label>
                <Input
                  type="password"
                  placeholder="Mínimo 6 caracteres"
                  value={novaSenha}
                  onChange={(e) => setNovaSenha(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Confirmar Nova Senha</label>
                <Input
                  type="password"
                  placeholder="Repita a nova senha"
                  value={confirmarSenha}
                  onChange={(e) => setConfirmarSenha(e.target.value)}
                  required
                />
              </div>

              {error && (
                <div className="text-sm text-destructive font-medium text-center bg-destructive/10 p-2.5 rounded-lg">
                  {error}
                </div>
              )}

              <Button type="submit" className="w-full mt-2" disabled={loading}>
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : null}
                {loading ? 'Redefinindo...' : 'Redefinir Senha'}
              </Button>

              <button
                type="button"
                onClick={() => { setPasso(1); setError(''); }}
                className="text-xs text-primary hover:underline w-full text-center mt-1"
              >
                Voltar para informar e-mail
              </button>
            </form>
          )}
        </CardContent>
        <CardFooter className="flex flex-col items-center justify-center">
          <Link href="/auth/login" className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" />
            Voltar ao Login
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
