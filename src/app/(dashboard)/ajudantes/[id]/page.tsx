'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Save, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function EditarAjudantePage() {
  const router = useRouter();
  const { id } = useParams();
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);
  
  const [form, setForm] = useState({
    nome: '',
    email: '',
    senha: '',
    onboardingCompleto: false,
  });

  useEffect(() => {
    if (id) {
      carregarDados();
    }
  }, [id]);

  const carregarDados = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/ajudantes');
      if (res.ok) {
        const ajudantes = await res.json();
        const found = ajudantes.find((a: any) => a.id === id);
        if (found) {
          setForm({
            nome: found.nome,
            email: found.email,
            senha: '',
            onboardingCompleto: found.onboardingCompleto,
          });
        } else {
          setErro('Ajudante não encontrado');
        }
      } else {
        setErro('Erro ao buscar dados do ajudante');
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      setErro('Erro de conexão ao buscar dados');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm(prev => ({ ...prev, [e.target.name]: val }));
    setErro(null);
    setSucesso(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setErro(null);
    setSucesso(false);

    try {
      const res = await fetch(`/api/ajudantes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: form.nome,
          email: form.email,
          senha: form.senha || undefined,
          onboardingCompleto: form.onboardingCompleto,
        }),
      });

      if (res.ok) {
        setSucesso(true);
        setTimeout(() => {
          router.push('/ajudantes');
        }, 1500);
      } else {
        const data = await res.json();
        setErro(data.error || 'Erro ao salvar alterações');
      }
    } catch (error) {
      console.error('Erro ao salvar:', error);
      setErro('Erro de conexão com o servidor');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-3">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
        <p className="text-sm text-muted-foreground">Carregando dados do ajudante...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-8">
      {/* Topo / Voltar */}
      <div className="flex items-center gap-4">
        <Link href="/ajudantes">
          <Button variant="outline" size="sm" className="h-8 w-8 p-0 border-muted-foreground/20 hover:bg-secondary">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Editar Ajudante</h1>
          <p className="text-muted-foreground">Atualize as informações cadastrais e de acesso operacional.</p>
        </div>
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
          <span className="text-sm font-medium">Alterações salvas com sucesso! Redirecionando...</span>
        </div>
      )}

      {/* Card Form */}
      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-medium">Nome Completo *</label>
            <Input
              name="nome"
              required
              value={form.nome}
              onChange={handleChange}
              placeholder="Ex: Pedro Santos"
              className="focus:border-primary/50 transition-colors"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">E-mail *</label>
            <Input
              name="email"
              type="email"
              required
              value={form.email}
              onChange={handleChange}
              placeholder="Ex: pedrosantos@empresa.com"
              className="focus:border-primary/50 transition-colors"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Nova Senha de Acesso</label>
              <span className="text-xs text-muted-foreground">Deixe em branco para manter a atual</span>
            </div>
            <Input
              name="senha"
              type="password"
              value={form.senha}
              onChange={handleChange}
              placeholder="Nova senha (mínimo 6 caracteres)"
              className="focus:border-primary/50 transition-colors"
            />
          </div>

          {/* Onboarding checkbox premium */}
          <div className="flex items-center space-x-3 p-4 rounded-xl border border-secondary bg-secondary/10">
            <input
              id="onboardingCompleto"
              name="onboardingCompleto"
              type="checkbox"
              checked={form.onboardingCompleto}
              onChange={handleChange}
              className="h-4 w-4 rounded border-muted-foreground/30 text-primary focus:ring-primary/50 transition-colors"
            />
            <div className="grid gap-0.5 leading-none">
              <label htmlFor="onboardingCompleto" className="text-sm font-semibold leading-none cursor-pointer">
                Onboarding Concluído
              </label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Marcar se o ajudante já concluiu a configuração operacional do seu app móvel.
              </p>
            </div>
          </div>

          <div className="flex justify-end pt-3 gap-3">
            <Link href="/ajudantes">
              <Button type="button" variant="outline" className="border-muted-foreground/20 hover:bg-secondary">
                Cancelar
              </Button>
            </Link>
            <Button 
              type="submit" 
              disabled={isSaving}
              className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-md transition-all duration-200"
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {isSaving ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
