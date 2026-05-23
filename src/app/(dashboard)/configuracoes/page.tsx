'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from '@/stores/useToastStore';
import { useThemeStore } from '@/stores/useThemeStore';
import {
  Settings, User, Camera, Save, Loader2, ShieldCheck, Eye, EyeOff,
  Sun, Moon, KeyRound, Copy, CheckCircle2
} from 'lucide-react';

export default function ConfiguracoesPage() {
  const { data: session, update: updateSession } = useSession();
  const { theme, setTheme } = useThemeStore();

  // Perfil
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('');
  const [avatar, setAvatar] = useState<string | null>(null);
  const [salvandoPerfil, setSalvandoPerfil] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Senha
  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [salvandoSenha, setSalvandoSenha] = useState(false);
  const [showSenhaAtual, setShowSenhaAtual] = useState(false);
  const [showNovaSenha, setShowNovaSenha] = useState(false);

  // Reset para outros usuários (Admin)
  const [usuarios, setUsuarios] = useState<Array<{ id: string; nome: string; email: string; role: string }>>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [codigoGerado, setCodigoGerado] = useState<string | null>(null);
  const [gerandoCodigo, setGerandoCodigo] = useState(false);

  useEffect(() => {
    carregarPerfil();
    if (session?.user?.role === 'ADMIN') {
      carregarUsuarios();
    }
  }, [session]);

  const carregarPerfil = async () => {
    try {
      const res = await fetch('/api/users/perfil');
      if (res.ok) {
        const data = await res.json();
        setNome(data.nome);
        setEmail(data.email);
        setRole(data.role);
        setAvatar(data.avatar);
      } else if (res.status === 404 || res.status === 401 || res.status === 403) {
        // Usuário não encontrado no banco de dados ou sem sessão
        signOut({ callbackUrl: '/auth/login' });
      }
    } catch (error) {
      console.error('Erro ao carregar perfil:', error);
    }
  };

  const carregarUsuarios = async () => {
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const data = await res.json();
        setUsuarios(data.filter((u: any) => u.id !== session?.user?.id));
      }
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 500000) {
      toast('Imagem muito grande. Use uma imagem de ate 500KB.', { type: 'error' });
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatar(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSalvarPerfil = async (e: React.FormEvent) => {
    e.preventDefault();
    setSalvandoPerfil(true);

    try {
      const res = await fetch('/api/users/perfil', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome, avatar }),
      });

      if (res.ok) {
        toast('Perfil atualizado com sucesso!', { type: 'success' });
        // Atualiza a sessão do NextAuth com os novos dados
        await updateSession({ name: nome, avatar });
      } else if (res.status === 404) {
        toast('Sua sessão expirou ou usuário não existe. Fazendo logout...', { type: 'error' });
        setTimeout(() => signOut({ callbackUrl: '/auth/login' }), 1500);
      } else {
        const data = await res.json();
        toast(data.error || 'Erro ao salvar perfil.', { type: 'error' });
      }
    } catch {
      toast('Erro de conexão com o servidor.', { type: 'error' });
    } finally {
      setSalvandoPerfil(false);
    }
  };

  const handleAlterarSenha = async (e: React.FormEvent) => {
    e.preventDefault();

    if (novaSenha !== confirmarSenha) {
      toast('As senhas não conferem.', { type: 'error' });
      return;
    }

    if (novaSenha.length < 6) {
      toast('A nova senha deve ter pelo menos 6 caracteres.', { type: 'error' });
      return;
    }

    setSalvandoSenha(true);

    try {
      const res = await fetch('/api/users/alterar-senha', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ senhaAtual, novaSenha }),
      });

      const data = await res.json();

      if (res.ok) {
        toast('Senha alterada com sucesso!', { type: 'success' });
        setSenhaAtual('');
        setNovaSenha('');
        setConfirmarSenha('');
      } else {
        toast(data.error || 'Erro ao alterar senha.', { type: 'error' });
      }
    } catch {
      toast('Erro de conexão com o servidor.', { type: 'error' });
    } finally {
      setSalvandoSenha(false);
    }
  };

  const handleGerarCodigo = async () => {
    if (!selectedUserId) {
      toast('Selecione um usuario.', { type: 'error' });
      return;
    }

    setGerandoCodigo(true);
    setCodigoGerado(null);

    try {
      const res = await fetch('/api/users/gerar-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: selectedUserId }),
      });

      const data = await res.json();

      if (res.ok) {
        setCodigoGerado(data.codigo);
        toast(`Codigo gerado para ${data.email}!`, {
          type: 'success',
          description: 'Copie e envie ao usuario. Valido por 1 hora.'
        });
      } else {
        toast(data.error || 'Erro ao gerar codigo.', { type: 'error' });
      }
    } catch {
      toast('Erro de conexão com o servidor.', { type: 'error' });
    } finally {
      setGerandoCodigo(false);
    }
  };

  const copiarCodigo = () => {
    if (codigoGerado) {
      navigator.clipboard.writeText(codigoGerado);
      toast('Codigo copiado!', { type: 'success' });
    }
  };

  const roleLabels: Record<string, string> = {
    ADMIN: 'Administrador',
    MOTORISTA: 'Motorista',
    AJUDANTE: 'Ajudante',
  };

  const temas = [
    { value: 'light', label: 'Claro', icon: Sun },
    { value: 'dark', label: 'Escuro', icon: Moon },
  ];

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Settings className="h-6 w-6 text-accent" />
          Configurações
        </h1>
        <p className="text-muted-foreground mt-0.5">
          Gerencie seu perfil, segurança e preferências do sistema.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna principal */}
        <div className="lg:col-span-2 space-y-6">

          {/* Perfil */}
          <Card className="p-6 space-y-5">
            <h2 className="text-base font-semibold flex items-center gap-2 border-b pb-3">
              <User className="h-5 w-5 text-primary" />
              Perfil do Usuario
            </h2>

            <form onSubmit={handleSalvarPerfil} className="space-y-5">
              {/* Avatar */}
              <div className="flex items-center gap-5">
                <div className="relative group">
                  <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-primary/20 bg-secondary flex items-center justify-center">
                    {avatar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-2xl font-bold text-primary">
                        {nome?.charAt(0)?.toUpperCase() || 'U'}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-accent text-accent-foreground flex items-center justify-center shadow-md hover:bg-accent/90 transition-colors"
                  >
                    <Camera className="w-3.5 h-3.5" />
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png, image/jpeg, image/webp"
                    onChange={handleAvatarChange}
                    className="hidden"
                  />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{nome || 'Seu Nome'}</p>
                  <p className="text-xs text-muted-foreground">{roleLabels[role] || role}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">PNG, JPG ou WebP. Maximo 500KB.</p>
                </div>
              </div>

              {/* Campos */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Nome de Exibição</label>
                  <Input
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Seu nome"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">E-mail</label>
                  <Input value={email} disabled className="opacity-60" />
                </div>
              </div>

              <Button type="submit" disabled={salvandoPerfil} className="gap-2">
                {salvandoPerfil ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {salvandoPerfil ? 'Salvando...' : 'Salvar Perfil'}
              </Button>
            </form>
          </Card>

          {/* Segurança */}
          <Card className="p-6 space-y-5">
            <h2 className="text-base font-semibold flex items-center gap-2 border-b pb-3">
              <ShieldCheck className="h-5 w-5 text-primary" />
              Segurança — Alterar Senha
            </h2>

            <form onSubmit={handleAlterarSenha} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Senha Atual</label>
                <div className="relative">
                  <Input
                    type={showSenhaAtual ? 'text' : 'password'}
                    value={senhaAtual}
                    onChange={(e) => setSenhaAtual(e.target.value)}
                    placeholder="Digite sua senha atual"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowSenhaAtual(!showSenhaAtual)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showSenhaAtual ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Nova Senha</label>
                  <div className="relative">
                    <Input
                      type={showNovaSenha ? 'text' : 'password'}
                      value={novaSenha}
                      onChange={(e) => setNovaSenha(e.target.value)}
                      placeholder="Minimo 6 caracteres"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowNovaSenha(!showNovaSenha)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showNovaSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Confirmar Nova Senha</label>
                  <Input
                    type="password"
                    value={confirmarSenha}
                    onChange={(e) => setConfirmarSenha(e.target.value)}
                    placeholder="Repita a nova senha"
                    required
                  />
                </div>
              </div>

              <Button type="submit" disabled={salvandoSenha} variant="outline" className="gap-2">
                {salvandoSenha ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
                {salvandoSenha ? 'Alterando...' : 'Alterar Senha'}
              </Button>
            </form>
          </Card>
        </div>

        {/* Coluna lateral */}
        <div className="space-y-6">

          {/* Aparência */}
          <Card className="p-5 space-y-4">
            <h3 className="text-sm font-semibold flex items-center gap-2 border-b pb-3 text-primary">
              <Sun className="h-4 w-4 text-accent" />
              Aparência
            </h3>

            <div className="grid grid-cols-2 gap-2">
              {temas.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setTheme(t.value as 'light' | 'dark')}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                    theme === t.value
                      ? 'border-accent bg-accent/10 shadow-sm'
                      : 'border-transparent bg-secondary hover:border-muted-foreground/20'
                  }`}
                >
                  <t.icon className={`w-6 h-6 ${theme === t.value ? 'text-accent' : 'text-muted-foreground'}`} />
                  <span className={`text-xs font-semibold ${theme === t.value ? 'text-accent' : 'text-muted-foreground'}`}>
                    {t.label}
                  </span>
                </button>
              ))}
            </div>
          </Card>

          {/* Admin: Gerar Código de Reset */}
          {session?.user?.role === 'ADMIN' && (
            <Card className="p-5 space-y-4 bg-gradient-to-br from-primary/5 to-accent/5">
              <h3 className="text-sm font-semibold flex items-center gap-2 border-b pb-3 text-primary">
                <KeyRound className="h-4 w-4 text-accent" />
                Recuperação de Senha (Admin)
              </h3>
              <p className="text-xs text-muted-foreground">
                Gere um codigo de recuperação para um usuario que esqueceu a senha.
              </p>

              <div className="space-y-3">
                <select
                  value={selectedUserId}
                  onChange={(e) => { setSelectedUserId(e.target.value); setCodigoGerado(null); }}
                  className="flex h-10 w-full items-center rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Selecione um usuario...</option>
                  {usuarios.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.nome} ({u.email}) — {roleLabels[u.role] || u.role}
                    </option>
                  ))}
                </select>

                <Button
                  type="button"
                  onClick={handleGerarCodigo}
                  disabled={!selectedUserId || gerandoCodigo}
                  className="w-full gap-2 text-xs"
                  variant="outline"
                >
                  {gerandoCodigo ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <KeyRound className="w-3.5 h-3.5" />}
                  {gerandoCodigo ? 'Gerando...' : 'Gerar Codigo de Reset'}
                </Button>

                {codigoGerado && (
                  <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl text-center space-y-2">
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center justify-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Codigo gerado com sucesso!
                    </p>
                    <p className="text-3xl font-mono font-bold tracking-[0.3em] text-foreground">{codigoGerado}</p>
                    <p className="text-[10px] text-muted-foreground">Valido por 1 hora. Envie ao usuario.</p>
                    <Button
                      type="button"
                      onClick={copiarCodigo}
                      variant="ghost"
                      size="sm"
                      className="gap-1.5 text-xs"
                    >
                      <Copy className="w-3 h-3" />
                      Copiar Codigo
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Info do sistema */}
          <Card className="p-5 space-y-3 bg-secondary/50">
            <h3 className="text-sm font-semibold text-muted-foreground">Sobre o Sistema</h3>
            <div className="space-y-1.5 text-xs text-muted-foreground">
              <div className="flex justify-between">
                <span>Versão</span>
                <span className="font-mono font-semibold text-foreground">1.0.0</span>
              </div>
              <div className="flex justify-between">
                <span>Plataforma</span>
                <span className="font-semibold text-foreground">ColetaMax</span>
              </div>
              <div className="flex justify-between">
                <span>Framework</span>
                <span className="font-mono text-foreground">Next.js 14</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
