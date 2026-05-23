import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// GET — Retorna dados do perfil do usuário logado
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        nome: true,
        email: true,
        role: true,
        avatar: true,
        createdAt: true,
      },
    });

    if (!user) return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });

    return NextResponse.json(user);
  } catch (error) {
    console.error('Erro ao buscar perfil:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

// PUT — Atualiza nome e/ou avatar do usuário logado
export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });

    let body;
    try {
      body = await req.json();
    } catch (err) {
      return NextResponse.json({ error: 'Corpo da requisição inválido ou muito grande.' }, { status: 400 });
    }
    
    const { nome, avatar } = body;

    // Validação de tamanho do avatar (máx ~500KB em base64)
    if (avatar && avatar.length > 700000) {
      return NextResponse.json({ error: 'Imagem muito grande. Use uma imagem de até 500KB.' }, { status: 400 });
    }

    const updateData: Record<string, string> = {};
    if (nome && nome.trim()) updateData.nome = nome.trim();
    if (avatar !== undefined) updateData.avatar = avatar;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'Nenhum dado para atualizar.' }, { status: 400 });
    }

    const updated = await prisma.user.update({
      where: { id: session.user.id },
      data: updateData,
      select: {
        id: true,
        nome: true,
        email: true,
        role: true,
        avatar: true,
      },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    if (error?.code === 'P2025') {
      return NextResponse.json({ error: 'Usuário não encontrado no banco de dados. Por favor, faça login novamente.' }, { status: 404 });
    }
    console.error('Erro ao atualizar perfil:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
