import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
    }

    const { id } = params;
    const body = await req.json();
    const { nome, email, senha, onboardingCompleto } = body;

    const ajudante = await prisma.user.findFirst({
      where: { id, role: 'AJUDANTE' },
    });

    if (!ajudante) {
      return NextResponse.json({ error: 'Ajudante não encontrado' }, { status: 404 });
    }

    // Verificar se o novo e-mail já pertence a outro usuário
    if (email && email !== ajudante.email) {
      const emailExistente = await prisma.user.findUnique({
        where: { email },
      });
      if (emailExistente) {
        return NextResponse.json({ error: 'Este e-mail já está cadastrado' }, { status: 400 });
      }
    }

    const updateData: any = {};
    if (nome) updateData.nome = nome;
    if (email) updateData.email = email;
    if (onboardingCompleto !== undefined) updateData.onboardingCompleto = onboardingCompleto;
    if (senha) {
      updateData.senha = await bcrypt.hash(senha, 10);
    }

    const ajudanteAtualizado = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        nome: true,
        email: true,
        role: true,
        onboardingCompleto: true,
      },
    });

    return NextResponse.json(ajudanteAtualizado);
  } catch (error) {
    console.error('Erro ao atualizar ajudante:', error);
    return NextResponse.json({ error: 'Erro interno ao atualizar ajudante' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
    }

    const { id } = params;

    const ajudante = await prisma.user.findFirst({
      where: { id, role: 'AJUDANTE' },
    });

    if (!ajudante) {
      return NextResponse.json({ error: 'Ajudante não encontrado' }, { status: 404 });
    }

    // Antes de excluir, remover as relações ou atualizar as relações das coletas/entregas
    await prisma.$transaction([
      prisma.collection.updateMany({
        where: { ajudanteId: id },
        data: { ajudanteId: null },
      }),
      prisma.delivery.updateMany({
        where: { ajudanteId: id },
        data: { ajudanteId: null },
      }),
      prisma.user.delete({
        where: { id },
      }),
    ]);

    return NextResponse.json({ message: 'Ajudante excluído com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir ajudante:', error);
    return NextResponse.json({ error: 'Erro interno ao excluir ajudante' }, { status: 500 });
  }
}
