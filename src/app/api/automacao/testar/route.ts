import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { dispararAutomacaoWhatsApp } from '@/lib/whatsapp';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
    }

    const body = await req.json();
    const { tipo, cliente, endereco, telefoneCliente, motoristaNome, ajudanteNome, veiculoNome, observacao } = body;

    if (!tipo || !cliente || !endereco || !telefoneCliente) {
      return NextResponse.json({ error: 'Preencha todos os campos obrigatórios (tipo, cliente, endereço, telefone).' }, { status: 400 });
    }

    const resultado = await dispararAutomacaoWhatsApp({
      tipo,
      cliente,
      endereco,
      telefoneCliente,
      motoristaNome: motoristaNome || 'Motorista Teste',
      ajudanteNome: ajudanteNome || 'Ajudante Teste',
      veiculoNome: veiculoNome || 'Fiorino ABC-1234',
      observacao: observacao || '',
    });

    if (resultado.sucesso) {
      return NextResponse.json({
        sucesso: true,
        mensagem: 'Teste de automação disparado com sucesso!',
        log: resultado.log,
      });
    } else {
      return NextResponse.json({
        error: resultado.erro || 'Erro ao disparar automação de teste.',
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Erro no teste de automação:', error);
    return NextResponse.json({ error: 'Erro interno no servidor' }, { status: 500 });
  }
}
