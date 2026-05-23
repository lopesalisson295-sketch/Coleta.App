import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });

    const body = await req.json();
    const { senhaAtual, novaSenha } = body;

    if (!senhaAtual || !novaSenha) {
      return NextResponse.json({ error: 'Senha atual e nova senha são obrigatórios.' }, { status: 400 });
    }

    if (novaSenha.length < 6) {
      return NextResponse.json({ error: 'A nova senha deve ter pelo menos 6 caracteres.' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user) return NextResponse.json({ error: 'Usuário não encontrado.' }, { status: 404 });

    const isValid = await bcrypt.compare(senhaAtual, user.senha);
    if (!isValid) {
      return NextResponse.json({ error: 'Senha atual incorreta.' }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(novaSenha, 10);

    await prisma.user.update({
      where: { id: session.user.id },
      data: { senha: hashedPassword },
    });

    return NextResponse.json({ mensagem: 'Senha alterada com sucesso!' });
  } catch (error) {
    console.error('Erro ao alterar senha:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
