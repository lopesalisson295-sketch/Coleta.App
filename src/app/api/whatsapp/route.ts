import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { enviarWhatsApp } from '@/lib/whatsapp';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
    }

    const body = await req.json();
    const { para, nome, tipo, dados } = body;

    if (!para || !nome || !tipo) {
      return NextResponse.json({ error: 'Parâmetros obrigatórios faltando' }, { status: 400 });
    }

    const resultado = await enviarWhatsApp({ para, nome, tipo, dados });

    return NextResponse.json(resultado);
  } catch (error) {
    console.error('Erro ao enviar WhatsApp:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
