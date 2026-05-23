import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

export const dynamic = 'force-dynamic';
import { authOptions } from '@/lib/auth';
import { getWhatsAppChatMessages } from '@/lib/whatsapp-client';

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const numero = searchParams.get('numero');

    if (!numero) {
      return NextResponse.json({ error: 'Numero nao fornecido' }, { status: 400 });
    }

    const mensagens = await getWhatsAppChatMessages(numero);

    return NextResponse.json({ mensagens });
  } catch (error) {
    console.error('Erro ao buscar mensagens do WhatsApp:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
