import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getWhatsAppContatos, getWhatsAppGrupos } from '@/lib/whatsapp-client';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
    }

    const [contatos, grupos] = await Promise.all([
      getWhatsAppContatos(),
      getWhatsAppGrupos()
    ]);

    return NextResponse.json({ contatos, grupos });
  } catch (error) {
    console.error('Erro ao buscar contatos do WhatsApp:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
