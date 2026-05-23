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

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';

    const vehicles = await prisma.vehicle.findMany({
      where: {
        OR: [
          { nome: { contains: search } },
          { placa: { contains: search } },
        ],
      },
      include: {
        motorista: {
          select: { id: true, nome: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(vehicles);
  } catch (error) {
    console.error('Erro ao buscar veículos:', error);
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
    const { nome, placa, status, regiao, motoristaId } = body;

    if (!nome || !placa || !regiao) {
      return NextResponse.json({ error: 'Campos obrigatórios faltando' }, { status: 400 });
    }

    // Check if placa exists
    const existing = await prisma.vehicle.findUnique({ where: { placa } });
    if (existing) {
      return NextResponse.json({ error: 'Placa já cadastrada' }, { status: 400 });
    }

    const vehicle = await prisma.vehicle.create({
      data: {
        nome,
        placa,
        status: status || 'DISPONIVEL',
        regiao,
        motoristaId: motoristaId || null,
      },
    });

    return NextResponse.json(vehicle, { status: 201 });
  } catch (error) {
    console.error('Erro ao criar veículo:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
