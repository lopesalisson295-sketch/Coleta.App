import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function GET(_req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
    }

    const motoristas = await prisma.user.findMany({
      where: { role: 'MOTORISTA' },
      select: {
        id: true,
        nome: true,
        email: true,
        role: true,
        avatar: true,
        onboardingCompleto: true,
        createdAt: true,
      },
      orderBy: { nome: 'asc' },
    });

    return NextResponse.json(motoristas);
  } catch (error) {
    console.error('Erro ao buscar motoristas:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
    }

    const body = await req.json();
    const { nome, email, senha, onboardingCompleto } = body;

    if (!nome || !email) {
      return NextResponse.json({ error: 'Nome e email são obrigatórios' }, { status: 400 });
    }

    // Verificar se email já existe
    const emailExistente = await prisma.user.findUnique({
      where: { email },
    });

    if (emailExistente) {
      return NextResponse.json({ error: 'Este e-mail já está cadastrado' }, { status: 400 });
    }

    const senhaFinal = senha || 'Mudar123!';
    const hashSenha = await bcrypt.hash(senhaFinal, 10);

    const novoMotorista = await prisma.user.create({
      data: {
        nome,
        email,
        senha: hashSenha,
        role: 'MOTORISTA',
        onboardingCompleto: onboardingCompleto ?? false,
      },
      select: {
        id: true,
        nome: true,
        email: true,
        role: true,
        onboardingCompleto: true,
      },
    });

    return NextResponse.json(novoMotorista, { status: 201 });
  } catch (error) {
    console.error('Erro ao criar motorista:', error);
    return NextResponse.json({ error: 'Erro interno ao criar motorista' }, { status: 500 });
  }
}
