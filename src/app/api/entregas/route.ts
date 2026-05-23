import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { getCoordinates } from '@/lib/geocoding';

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    
    const isAdmin = session.user.role === 'ADMIN';

    const entregas = await prisma.delivery.findMany({
      where: {
        ...(status && status !== 'TODOS' ? 
              (status === 'AGUARDANDO_APROVACAO' ? 
                { status: 'EM_ANDAMENTO', imagemUrl: { not: null } } : 
                { status: status as any }) 
            : {}),
        ...(search ? {
          OR: [
            { destinatario: { contains: search } },
            { endereco: { contains: search } },
          ]
        } : {}),
        ...(!isAdmin ? {
          OR: [
            { motoristaId: session.user.id },
            { ajudanteId: session.user.id }
          ]
        } : {}),
      },
      include: {
        motorista: { select: { id: true, nome: true } },
        ajudante: { select: { id: true, nome: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return NextResponse.json(entregas);
  } catch (error) {
    console.error('Erro ao buscar entregas:', error);
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
    const { endereco, destinatario, telefone, motoristaId, ajudanteId, latitude, longitude, descricaoItens, imagemItensUrl } = body;

    if (!endereco || !destinatario || !telefone) {
      return NextResponse.json({ error: 'Campos obrigatórios faltando' }, { status: 400 });
    }

    let finalLat = latitude || null;
    let finalLon = longitude || null;

    if (!finalLat && endereco) {
      const coords = await getCoordinates(endereco);
      if (coords) {
        finalLat = coords.latitude;
        finalLon = coords.longitude;
      }
    }

    const entrega = await prisma.delivery.create({
      data: {
        endereco,
        destinatario,
        telefone,
        motoristaId: motoristaId || null,
        ajudanteId: ajudanteId || null,
        latitude: finalLat,
        longitude: finalLon,
        descricaoItens: descricaoItens || null,
        imagemItensUrl: imagemItensUrl || null,
      },
    });

    return NextResponse.json(entrega, { status: 201 });
  } catch (error) {
    console.error('Erro ao criar entrega:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
