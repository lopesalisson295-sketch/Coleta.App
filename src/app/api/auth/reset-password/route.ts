import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, codigo, novaSenha } = body;

    if (!email || !codigo || !novaSenha) {
      return NextResponse.json({ error: 'E-mail, código e nova senha são obrigatórios.' }, { status: 400 });
    }

    if (novaSenha.length < 6) {
      return NextResponse.json({ error: 'A nova senha deve ter pelo menos 6 caracteres.' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return NextResponse.json({ error: 'Dados inválidos.' }, { status: 400 });
    }

    // Verifica se o código é válido e não expirou
    if (!user.resetToken || user.resetToken !== codigo) {
      return NextResponse.json({ error: 'Código de recuperação inválido.' }, { status: 400 });
    }

    if (!user.resetTokenExpiry || new Date() > user.resetTokenExpiry) {
      return NextResponse.json({ error: 'Código de recuperação expirado. Solicite um novo.' }, { status: 400 });
    }

    // Atualiza a senha e limpa o token
    const hashedPassword = await bcrypt.hash(novaSenha, 10);

    await prisma.user.update({
      where: { email },
      data: {
        senha: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null,
      },
    });

    return NextResponse.json({ mensagem: 'Senha redefinida com sucesso! Faça login com a nova senha.' });
  } catch (error) {
    console.error('Erro ao redefinir senha:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
