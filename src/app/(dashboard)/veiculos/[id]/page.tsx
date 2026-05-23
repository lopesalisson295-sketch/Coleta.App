'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { ArrowLeft, Save } from 'lucide-react';
import Link from 'next/link';

export default function VehicleFormPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const isNew = params.id === 'new';

  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(!isNew);
  const [motoristas, setMotoristas] = useState<{id: string, nome: string}[]>([]);

  const [formData, setFormData] = useState({
    nome: '',
    placa: '',
    status: 'DISPONIVEL',
    regiao: '',
    motoristaId: '',
  });

  useEffect(() => {
    // Fetch Motoristas
    const fetchMotoristas = async () => {
      try {
        const res = await fetch('/api/users?role=MOTORISTA');
        if (res.ok) {
          const data = await res.json();
          setMotoristas(data);
        }
      } catch (error) {
        console.error('Erro ao buscar motoristas:', error);
      }
    };

    fetchMotoristas();

    if (!isNew) {
      const fetchVehicle = async () => {
        try {
          const res = await fetch(`/api/veiculos/${params.id}`);
          if (res.ok) {
            const data = await res.json();
            setFormData({
              nome: data.nome,
              placa: data.placa,
              status: data.status,
              regiao: data.regiao,
              motoristaId: data.motoristaId || '',
            });
          } else {
            alert('Veículo não encontrado');
            router.push('/veiculos');
          }
        } catch (error) {
          console.error('Erro ao buscar veículo:', error);
        } finally {
          setIsFetching(false);
        }
      };
      fetchVehicle();
    }
  }, [params.id, isNew, router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const url = isNew ? '/api/veiculos' : `/api/veiculos/${params.id}`;
      const method = isNew ? 'POST' : 'PUT';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          motoristaId: formData.motoristaId === '' ? null : formData.motoristaId
        }),
      });

      const data = await res.json();

      if (res.ok) {
        router.push('/veiculos');
        router.refresh();
      } else {
        alert(data.error || 'Erro ao salvar veículo');
      }
    } catch (error) {
      console.error('Erro ao salvar:', error);
      alert('Erro inesperado ao salvar');
    } finally {
      setIsLoading(false);
    }
  };

  if (isFetching) {
    return <div className="p-8 text-center text-muted-foreground">Carregando dados...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/veiculos">
          <Button variant="outline" size="sm" className="h-8 w-8 p-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {isNew ? 'Novo Veículo' : 'Editar Veículo'}
          </h1>
          <p className="text-muted-foreground">
            {isNew ? 'Cadastre um novo veículo na frota.' : 'Atualize os dados do veículo.'}
          </p>
        </div>
      </div>

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nome / Modelo</label>
              <Input
                name="nome"
                required
                value={formData.nome}
                onChange={handleChange}
                placeholder="Ex: Fiat Fiorino"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Placa</label>
              <Input
                name="placa"
                required
                value={formData.placa}
                onChange={handleChange}
                placeholder="ABC-1234"
                className="uppercase"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select
                name="status"
                value={formData.status}
                onChange={handleChange as any}
              >
                <option value="DISPONIVEL">Disponível</option>
                <option value="EM_USO">Em Uso</option>
                <option value="MANUTENCAO">Manutenção</option>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Região de Atuação</label>
              <Input
                name="regiao"
                required
                value={formData.regiao}
                onChange={handleChange}
                placeholder="Ex: Zona Sul"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Motorista Responsável (Opcional)</label>
            <Select
              name="motoristaId"
              value={formData.motoristaId}
              onChange={handleChange as any}
            >
              <option value="">Nenhum motorista atribuído</option>
              {motoristas.map(m => (
                <option key={m.id} value={m.id}>{m.nome}</option>
              ))}
            </Select>
          </div>

          <div className="flex justify-end pt-4">
            <Button type="submit" disabled={isLoading} className="flex items-center gap-2">
              <Save className="w-4 h-4" />
              <span>{isLoading ? 'Salvando...' : 'Salvar Veículo'}</span>
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
