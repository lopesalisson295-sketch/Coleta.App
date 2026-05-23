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

    const motorista = await prisma.user.findFirst({
      where: { id, role: 'MOTORISTA' },
    });

    if (!motorista) {
      return NextResponse.json({ error: 'Motorista não encontrado' }, { status: 404 });
    }

    // Verificar se o novo e-mail já pertence a outro usuário
    if (email && email !== motorista.email) {
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

    const motoristaAtualizado = await prisma.user.update({
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

    return NextResponse.json(motoristaAtualizado);
  } catch (error) {
    console.error('Erro ao atualizar motorista:', error);
    return NextResponse.json({ error: 'Erro interno ao atualizar motorista' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
    }

    const { id } = params;

    const motorista = await prisma.user.findFirst({
      where: { id, role: 'MOTORISTA' },
    });

    if (!motorista) {
      return NextResponse.json({ error: 'Motorista não encontrado' }, { status: 404 });
    }

    // Antes de excluir, remover as relações ou atualizar as relações das coletas/entregas/veículos
    await prisma.$transaction([
      prisma.vehicle.updateMany({
        where: { motoristaId: id },
        data: { motoristaId: null },
      }),
      prisma.collection.updateMany({
        where: { motoristaId: id },
        data: { motoristaId: null },
      }),
      prisma.delivery.updateMany({
        where: { motoristaId: id },
        data: { motoristaId: null },
      }),
      prisma.user.delete({
        where: { id },
      }),
    ]);

    return NextResponse.json({ message: 'Motorista excluído com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir motorista:', error);
    return NextResponse.json({ error: 'Erro interno ao excluir motorista' }, { status: 500 });
  }
}
