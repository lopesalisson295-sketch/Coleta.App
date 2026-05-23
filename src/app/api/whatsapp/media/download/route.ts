import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getWhatsAppMedia } from '@/lib/whatsapp-client';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const chatId = searchParams.get('chatId');
    const messageId = searchParams.get('messageId');

    if (!chatId || !messageId) {
      return NextResponse.json({ error: 'Campos chatId e messageId são obrigatórios.' }, { status: 400 });
    }

    const media = await getWhatsAppMedia(chatId, messageId);

    if (!media) {
      return NextResponse.json({ error: 'Mídia não encontrada ou falha ao baixar.' }, { status: 404 });
    }

    // Converte os dados base64 de volta para um buffer binário
    const buffer = Buffer.from(media.data, 'base64');
    const totalLength = buffer.length;

    // Suporte a HTTP Range (Status 206) - Crucial para streaming no iOS Safari / Chrome iOS
    const rangeHeader = req.headers.get('range');
    if (rangeHeader) {
      const parts = rangeHeader.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : totalLength - 1;

      // Garante limites corretos
      const chunkStart = isNaN(start) ? 0 : start;
      const chunkEnd = isNaN(end) ? totalLength - 1 : end;

      if (chunkStart >= totalLength || chunkEnd >= totalLength || chunkStart > chunkEnd) {
        return new Response(null, {
          status: 416,
          headers: {
            'Content-Range': `bytes */${totalLength}`,
          },
        });
      }

      const chunk = buffer.subarray(chunkStart, chunkEnd + 1);
      return new Response(chunk, {
        status: 206,
        headers: {
          'Content-Type': media.mimetype,
          'Content-Range': `bytes ${chunkStart}-${chunkEnd}/${totalLength}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunk.length.toString(),
          'Cache-Control': 'public, max-age=86400, s-maxage=86400',
        },
      });
    }

    // Resposta padrão caso não haja Range header
    return new Response(buffer, {
      headers: {
        'Content-Type': media.mimetype,
        'Content-Length': totalLength.toString(),
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'public, max-age=86400, s-maxage=86400', // Cache por 1 dia
      },
    });
  } catch (error) {
    console.error('Erro no download de mídia do WhatsApp:', error);
    return NextResponse.json({ error: 'Erro interno no servidor' }, { status: 500 });
  }
}
