import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return new NextResponse('ID do usuário não fornecido', { status: 400 });
    }

    const user = await prisma.user.findUnique({ 
      where: { id }, 
      select: { avatar: true } 
    });

    if (!user || !user.avatar) {
      return new NextResponse('Avatar não encontrado', { status: 404 });
    }

    // O avatar é guardado como base64 no banco, ex: "data:image/png;base64,iVBORw0KGgo..."
    const match = user.avatar.match(/^data:(image\/\w+);base64,(.+)$/);
    if (!match) {
      // Se por acaso for uma URL normal, redireciona ou retorna a URL como texto
      return new NextResponse(user.avatar); 
    }

    const contentType = match[1];
    const base64Data = match[2];
    const buffer = Buffer.from(base64Data, 'base64');

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        // Cache de 1 dia para melhorar a performance
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=43200',
      },
    });
  } catch (error) {
    console.error('Erro ao buscar avatar:', error);
    return new NextResponse('Erro interno do servidor', { status: 500 });
  }
}
