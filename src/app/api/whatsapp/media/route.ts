import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { enviarMidiaWhatsApp } from '@/lib/whatsapp-client';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
    }

    const body = await req.json();
    const { para, tipo, conteudo, legenda } = body;

    if (!para || !tipo || !conteudo) {
      return NextResponse.json({ error: 'Campos para, tipo e conteudo são obrigatórios.' }, { status: 400 });
    }

    if (!['imagem', 'audio'].includes(tipo)) {
      return NextResponse.json({ error: 'Tipo deve ser imagem ou audio.' }, { status: 400 });
    }

    const resultado = await enviarMidiaWhatsApp(para, tipo, conteudo, legenda);

    if (resultado.sucesso) {
      return NextResponse.json({
        sucesso: true,
        mensagem: `${tipo === 'imagem' ? 'Imagem' : 'Áudio'} enviado com sucesso!`,
        novaMensagem: resultado.mensagem,
      });
    } else {
      return NextResponse.json({ error: resultado.erro || 'Erro ao enviar mídia.' }, { status: 500 });
    }
  } catch (error) {
    console.error('Erro ao enviar mídia via WhatsApp:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
