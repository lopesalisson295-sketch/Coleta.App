import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const comUserId = searchParams.get('com');

    if (!comUserId) {
      return NextResponse.json({ error: 'Parâmetro "com" obrigatório' }, { status: 400 });
    }

    // Marcar mensagens como lidas
    await prisma.message.updateMany({
      where: {
        remetenteId: comUserId,
        destinatarioId: session.user.id,
        lida: false,
      },
      data: { lida: true },
    });

    const mensagens = await prisma.message.findMany({
      where: {
        OR: [
          { remetenteId: session.user.id, destinatarioId: comUserId },
          { remetenteId: comUserId, destinatarioId: session.user.id },
        ],
      },
      include: {
        remetente: { select: { id: true, nome: true } },
      },
      orderBy: { criadoEm: 'asc' },
      take: 100,
    });

    return NextResponse.json(mensagens);
  } catch (error) {
    console.error('Erro ao buscar mensagens:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });

    const body = await req.json();
    const { destinatarioId, conteudo, tipo } = body;

    if (!destinatarioId || !conteudo) {
      return NextResponse.json({ error: 'Campos obrigatórios faltando' }, { status: 400 });
    }

    const mensagem = await prisma.message.create({
      data: {
        conteudo: tipo === 'AUDIO' ? conteudo : conteudo.trim(),
        tipo: tipo || 'TEXTO',
        remetenteId: session.user.id,
        destinatarioId,
      },
      include: {
        remetente: { select: { id: true, nome: true } },
      },
    });

    return NextResponse.json(mensagem, { status: 201 });
  } catch (error) {
    console.error('Erro ao enviar mensagem:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
