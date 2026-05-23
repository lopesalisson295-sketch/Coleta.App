import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json({ error: 'E-mail é obrigatório.' }, { status: 400 });
    }

    // Busca o usuário sem revelar se existe ou não (segurança)
    const user = await prisma.user.findUnique({ where: { email } });

    if (user) {
      const codigo = Math.floor(100000 + Math.random() * 900000).toString();
      const expiracao = new Date(Date.now() + 60 * 60 * 1000);

      await prisma.user.update({
        where: { email },
        data: {
          resetToken: codigo,
          resetTokenExpiry: expiracao,
        },
      });

      // Em produção, enviar o código por e-mail ou WhatsApp
      // Para demonstração, logar no console do servidor
      console.log(`🔐 [Reset de Senha] Código para ${email}: ${codigo}`);
    }

    // Sempre retorna sucesso por segurança (não revela se e-mail existe)
    return NextResponse.json({
      mensagem: 'Se o e-mail estiver cadastrado, um código de recuperação foi gerado. Solicite ao administrador do sistema.',
    });
  } catch (error) {
    console.error('Erro ao solicitar reset de senha:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
