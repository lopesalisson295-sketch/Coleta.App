'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Save, Loader2, AlertCircle } from 'lucide-react';

export default function NovoMotoristaPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [form, setForm] = useState({
    nome: '',
    email: '',
    senha: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setErro(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErro(null);

    try {
      const res = await fetch('/api/motoristas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: form.nome,
          email: form.email,
          senha: form.senha || undefined,
        }),
      });

      if (res.ok) {
        router.push('/motoristas');
      } else {
        const data = await res.json();
        setErro(data.error || 'Erro ao cadastrar motorista');
      }
    } catch (error) {
      console.error('Erro ao cadastrar:', error);
      setErro('Erro de conexão com o servidor');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-8">
      {/* Topo / Voltar */}
      <div className="flex items-center gap-4">
        <Link href="/motoristas">
          <Button variant="outline" size="sm" className="h-8 w-8 p-0 border-muted-foreground/20 hover:bg-secondary">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Novo Motorista</h1>
          <p className="text-muted-foreground">Adicione um novo motorista à equipe.</p>
        </div>
      </div>

      {erro && (
        <div className="flex items-center gap-2.5 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 animate-in fade-in duration-200">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span className="text-sm font-medium">{erro}</span>
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
              placeholder="Ex: João Silva"
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
              placeholder="Ex: joaosilva@empresa.com"
              className="focus:border-primary/50 transition-colors"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Senha de Acesso</label>
              <span className="text-xs text-muted-foreground">Padrão: Mudar123!</span>
            </div>
            <Input
              name="senha"
              type="password"
              value={form.senha}
              onChange={handleChange}
              placeholder="Defina uma senha ou deixe em branco"
              className="focus:border-primary/50 transition-colors"
            />
          </div>

          <div className="flex justify-end pt-3">
            <Button 
              type="submit" 
              disabled={isLoading}
              className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-md transition-all duration-200"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {isLoading ? 'Cadastrando...' : 'Cadastrar Motorista'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
