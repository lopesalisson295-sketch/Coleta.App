'use client';

import { useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Users, UserPlus, Search, Edit2, Trash2, 
  CheckCircle2, AlertTriangle, Calendar, Mail, Loader2 
} from 'lucide-react';

interface Motorista {
  id: string;
  nome: string;
  email: string;
  onboardingCompleto: boolean;
  createdAt: string;
}

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function MotoristasPage() {
  const { data: motoristas, error, mutate, isLoading } = useSWR<Motorista[]>('/api/motoristas', fetcher, {
    refreshInterval: 5000
  });
  
  const [filtro, setFiltro] = useState('');
  const [deletandoId, setDeletandoId] = useState<string | null>(null);

  const handleExcluir = async (id: string, nome: string) => {
    if (!confirm(`Tem certeza que deseja excluir o motorista ${nome}? Esta ação removerá também seus vínculos com veículos e coletas.`)) {
      return;
    }
    setDeletandoId(id);
    try {
      const res = await fetch(`/api/motoristas/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        mutate();
      } else {
        const data = await res.json();
        alert(data.error || 'Erro ao excluir motorista');
      }
    } catch (error) {
      console.error('Erro ao excluir:', error);
    } finally {
      setDeletandoId(null);
    }
  };

  const motoristasFiltrados = (motoristas || []).filter(m => 
    m.nome.toLowerCase().includes(filtro.toLowerCase()) ||
    m.email.toLowerCase().includes(filtro.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Users className="h-6 w-6 text-accent" />
            Motoristas
          </h1>
          <p className="text-muted-foreground mt-0.5">
            Gerencie os motoristas cadastrados e o status de seus acessos.
          </p>
        </div>
        <Link href="/motoristas/novo">
          <Button className="gap-2 shrink-0 bg-primary hover:bg-primary/90 text-primary-foreground shadow-md transition-all duration-200">
            <UserPlus className="h-4 w-4" />
            Novo Motorista
          </Button>
        </Link>
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-3 bg-card p-4 rounded-xl border shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisar por nome ou e-mail..."
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            className="pl-9 bg-secondary/50 border-muted-foreground/20 focus:border-primary/50 transition-colors"
          />
        </div>
      </div>

      {/* Grid de Motoristas */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <Loader2 className="h-8 w-8 text-primary animate-spin" />
          <p className="text-sm text-muted-foreground">Carregando motoristas...</p>
        </div>
      ) : motoristasFiltrados.length === 0 ? (
        <Card className="flex flex-col items-center justify-center p-12 border-2 border-dashed bg-card/50">
          <Users className="h-12 w-12 text-muted-foreground/40 mb-3" />
          <h3 className="font-semibold text-lg">Nenhum motorista encontrado</h3>
          <p className="text-sm text-muted-foreground text-center mt-1 max-w-sm">
            {filtro ? 'Ajuste sua pesquisa para encontrar o que procura.' : 'Cadastre seu primeiro motorista para que ele possa operar rotas.'}
          </p>
          {!filtro && (
            <Link href="/motoristas/novo" className="mt-4">
              <Button size="sm">Cadastrar Motorista</Button>
            </Link>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {motoristasFiltrados.map((m) => (
            <Card key={m.id} className="relative overflow-hidden group border hover:border-primary/35 shadow-sm hover:shadow-md transition-all duration-200 bg-card">
              {/* Top background accent */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary/30 to-accent/30" />

              <div className="p-5 space-y-4">
                {/* Info superior */}
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
                    <span className="text-sm font-bold text-primary">
                      {m.nome.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-sm truncate group-hover:text-primary transition-colors">
                      {m.nome}
                    </h3>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5 truncate">
                      <Mail className="h-3 w-3 shrink-0" />
                      {m.email}
                    </p>
                  </div>
                </div>

                {/* Status e Cadastro */}
                <div className="flex items-center justify-between text-xs pt-2 border-t border-secondary">
                  <div className="flex items-center gap-1.5">
                    {m.onboardingCompleto ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 font-medium">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Completo
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 font-medium">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        Pendente
                      </span>
                    )}
                  </div>
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    {new Date(m.createdAt).toLocaleDateString('pt-BR')}
                  </span>
                </div>

                {/* Ações */}
                <div className="flex items-center gap-2 pt-2 justify-end">
                  <Link href={`/motoristas/${m.id}`}>
                    <Button variant="outline" size="sm" className="h-8 gap-1 text-xs border-muted-foreground/20 hover:bg-secondary">
                      <Edit2 className="h-3 w-3" />
                      Editar
                    </Button>
                  </Link>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    disabled={deletandoId === m.id}
                    onClick={() => handleExcluir(m.id, m.nome)}
                    className="h-8 gap-1 text-xs text-rose-500 border-rose-500/20 hover:bg-rose-500/10 hover:text-rose-600"
                  >
                    {deletandoId === m.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Trash2 className="h-3 w-3" />
                    )}
                    Excluir
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
