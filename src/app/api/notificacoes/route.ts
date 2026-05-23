import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
    }

    const notificacoes = await prisma.notification.findMany({
      where: {
        lida: false,
        OR: [
          { usuarioId: session.user.id },
          { usuarioId: null } // Notificações globais para ADMINs
        ]
      },
      orderBy: { criadoEm: 'desc' },
      take: 20
    });

    return NextResponse.json(notificacoes);
  } catch (error) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
    }

    const { id } = await req.json();

    if (id) {
      await prisma.notification.update({
        where: { id },
        data: { lida: true }
      });
    } else {
      // Marcar todas como lidas
      await prisma.notification.updateMany({
        where: {
          OR: [
            { usuarioId: session.user.id },
            { usuarioId: null }
          ],
          lida: false
        },
        data: { lida: true }
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
