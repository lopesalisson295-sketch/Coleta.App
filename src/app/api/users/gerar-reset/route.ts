import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
    }

    const body = await req.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json({ error: 'ID do usuário é obrigatório.' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return NextResponse.json({ error: 'Usuário não encontrado.' }, { status: 404 });

    // Gera código de 6 dígitos e define expiração em 1 hora
    const codigo = Math.floor(100000 + Math.random() * 900000).toString();
    const expiracao = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

    await prisma.user.update({
      where: { id: userId },
      data: {
        resetToken: codigo,
        resetTokenExpiry: expiracao,
      },
    });

    return NextResponse.json({
      mensagem: `Código de recuperação gerado com sucesso para ${user.nome}.`,
      codigo,
      email: user.email,
      expiraEm: expiracao.toISOString(),
    });
  } catch (error) {
    console.error('Erro ao gerar código de reset:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
