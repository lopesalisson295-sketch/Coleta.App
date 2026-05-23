import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
    }

    const vehicle = await prisma.vehicle.findUnique({
      where: { id: params.id },
      include: {
        motorista: { select: { id: true, nome: true } }
      }
    });

    if (!vehicle) {
      return NextResponse.json({ error: 'Veículo não encontrado' }, { status: 404 });
    }

    return NextResponse.json(vehicle);
  } catch (error) {
    console.error('Erro ao buscar veículo:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
    }

    const body = await req.json();
    const { nome, placa, status, regiao, motoristaId } = body;

    if (!nome || !placa || !regiao) {
      return NextResponse.json({ error: 'Campos obrigatórios faltando' }, { status: 400 });
    }

    // Check if placa exists and belongs to another vehicle
    const existing = await prisma.vehicle.findUnique({ where: { placa } });
    if (existing && existing.id !== params.id) {
      return NextResponse.json({ error: 'Placa já cadastrada em outro veículo' }, { status: 400 });
    }

    const vehicle = await prisma.vehicle.update({
      where: { id: params.id },
      data: {
        nome,
        placa,
        status,
        regiao,
        motoristaId: motoristaId || null,
      },
    });

    return NextResponse.json(vehicle);
  } catch (error) {
    console.error('Erro ao atualizar veículo:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
    }

    await prisma.vehicle.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ message: 'Veículo removido com sucesso' });
  } catch (error) {
    console.error('Erro ao remover veículo:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
