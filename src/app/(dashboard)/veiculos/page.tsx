'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, Edit, Trash2, Car, MapPin } from 'lucide-react';
import Link from 'next/link';

type Vehicle = {
  id: string;
  nome: string;
  placa: string;
  status: 'DISPONIVEL' | 'EM_USO' | 'MANUTENCAO';
  regiao: string;
  qtdColetas: number;
  motorista: { nome: string } | null;
};

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const fetchVehicles = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/veiculos?search=${search}`);
      const data = await res.json();
      setVehicles(data);
    } catch (error) {
      console.error('Erro ao buscar veículos:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchVehicles();
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [search]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DISPONIVEL':
        return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
      case 'EM_USO':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'MANUTENCAO':
        return 'bg-rose-500/10 text-rose-500 border-rose-500/20';
      default:
        return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este veículo?')) return;
    
    try {
      const res = await fetch(`/api/veiculos/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        fetchVehicles();
      } else {
        alert('Erro ao excluir veículo');
      }
    } catch (error) {
      console.error('Erro ao excluir veículo:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Frota</h1>
          <p className="text-muted-foreground">Gerencie os veículos da operação.</p>
        </div>
        <Link href="/veiculos/new">
          <Button className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            <span>Novo Veículo</span>
          </Button>
        </Link>
      </div>

      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou placa..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <div className="rounded-md border overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Veículo</th>
                <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Placa</th>
                <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Status</th>
                <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Região</th>
                <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Motorista</th>
                <th className="h-12 px-4 align-middle font-medium text-muted-foreground text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="p-4 text-center text-muted-foreground">
                    Carregando veículos...
                  </td>
                </tr>
              ) : vehicles.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-4 text-center text-muted-foreground">
                    Nenhum veículo encontrado.
                  </td>
                </tr>
              ) : (
                vehicles.map((v) => (
                  <tr key={v.id} className="border-b transition-colors hover:bg-muted/50">
                    <td className="p-4 font-medium flex items-center gap-2">
                      <Car className="w-4 h-4 text-primary" />
                      {v.nome}
                    </td>
                    <td className="p-4 uppercase font-mono text-muted-foreground">{v.placa}</td>
                    <td className="p-4">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(v.status)}`}>
                        {v.status === 'DISPONIVEL' ? 'Disponível' : v.status === 'EM_USO' ? 'Em Uso' : v.status === 'MANUTENCAO' ? 'Manutenção' : v.status}
                      </span>
                    </td>
                    <td className="p-4 flex items-center gap-1 text-muted-foreground">
                      <MapPin className="w-3 h-3" />
                      {v.regiao}
                    </td>
                    <td className="p-4 text-muted-foreground">
                      {v.motorista?.nome || 'Não atribuído'}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-2">
                        <Link href={`/veiculos/${v.id}`}>
                          <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                            <Edit className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </Link>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-8 w-8 p-0 border-rose-500/20 hover:bg-rose-500/10"
                          onClick={() => handleDelete(v.id)}
                        >
                          <Trash2 className="h-4 w-4 text-rose-500" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
