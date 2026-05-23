'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Save, Camera, X, Upload } from 'lucide-react';
import Link from 'next/link';

export default function NovaEntregaPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [motoristas, setMotoristas] = useState<{ id: string; nome: string }[]>([]);
  const [ajudantes, setAjudantes] = useState<{ id: string; nome: string }[]>([]);
  const [form, setForm] = useState({
    destinatario: '', endereco: '', telefone: '',
    motoristaId: '', ajudanteId: '', observacao: '',
    descricaoItens: '', imagemItensUrl: '',
  });

  // Carregar rascunho
  useEffect(() => {
    const saved = sessionStorage.getItem('draft_entrega');
    if (saved) {
      try {
        setForm(JSON.parse(saved));
      } catch (e) {}
    }
    
    Promise.all([
      fetch('/api/users?role=MOTORISTA').then(r => r.json()),
      fetch('/api/users?role=AJUDANTE').then(r => r.json()),
    ]).then(([m, a]) => {
      setMotoristas(m);
      setAjudantes(a);
    });
  }, []);

  // Salvar rascunho
  useEffect(() => {
    sessionStorage.setItem('draft_entrega', JSON.stringify(form));
  }, [form]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setForm(prev => ({ ...prev, imagemItensUrl: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      let finalImageUrl = form.imagemItensUrl;
      if (finalImageUrl && finalImageUrl.startsWith('data:image')) {
        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: finalImageUrl })
        });
        const uploadData = await uploadRes.json();
        if (uploadData.url) finalImageUrl = uploadData.url;
      }

      const res = await fetch('/api/entregas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          imagemItensUrl: finalImageUrl,
          motoristaId: form.motoristaId || null,
          ajudanteId: form.ajudanteId || null,
        }),
      });
      if (res.ok) {
        sessionStorage.removeItem('draft_entrega');
        router.push('/entregas');
      } else {
        const data = await res.json();
        alert(data.error || 'Erro ao criar entrega');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/entregas">
          <Button variant="outline" size="sm" className="h-8 w-8 p-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Nova Entrega</h1>
          <p className="text-muted-foreground">Cadastre uma nova entrega na rota.</p>
        </div>
      </div>

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Destinatário *</label>
              <Input name="destinatario" required value={form.destinatario} onChange={handleChange} placeholder="Nome do destinatário" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Telefone *</label>
              <Input name="telefone" required value={form.telefone} onChange={handleChange} placeholder="(11) 9999-9999" />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Endereço *</label>
            <Input name="endereco" required value={form.endereco} onChange={handleChange} placeholder="Rua, número, bairro, cidade" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Motorista Responsável</label>
              <Select name="motoristaId" value={form.motoristaId} onChange={handleChange as any}>
                <option value="">Selecione o motorista</option>
                {motoristas.map(m => (
                  <option key={m.id} value={m.id}>{m.nome}</option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Ajudante</label>
              <Select name="ajudanteId" value={form.ajudanteId} onChange={handleChange as any}>
                <option value="">Selecione o ajudante</option>
                {ajudantes.map(a => (
                  <option key={a.id} value={a.id}>{a.nome}</option>
                ))}
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Observação</label>
            <Textarea name="observacao" value={form.observacao} onChange={handleChange} placeholder="Informações adicionais..." rows={3} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4 mt-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Descrição dos Itens</label>
              <Textarea name="descricaoItens" value={form.descricaoItens} onChange={handleChange} placeholder="O que será transportado? (Ex: 2 Caixas grandes, 1 Geladeira...)" rows={4} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium block">Foto dos Itens</label>
              <input
                id="imagemItensInput"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageChange}
              />
              {form.imagemItensUrl ? (
                <div className="relative rounded-xl overflow-hidden border h-[104px]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={form.imagemItensUrl} alt="Preview" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setForm(prev => ({ ...prev, imagemItensUrl: '' }))}
                    className="absolute top-2 right-2 bg-black/60 rounded-full p-1 text-white hover:bg-black/80"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => document.getElementById('imagemItensInput')?.click()}
                  className="w-full h-[104px] rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-colors border-muted-foreground/30 text-muted-foreground hover:border-primary/50 hover:text-primary"
                >
                  <Upload className="w-6 h-6" />
                  <span className="text-xs">Selecionar foto do produto</span>
                </button>
              )}
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button type="submit" disabled={isLoading} className="gap-2">
              <Save className="w-4 h-4" />
              {isLoading ? 'Salvando...' : 'Criar Entrega'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
