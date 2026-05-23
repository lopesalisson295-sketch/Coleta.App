import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// Lista contatos com última mensagem e count de não lidas
export async function GET(_req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });

    // Busca todos usuários exceto o atual
    const usuarios = await prisma.user.findMany({
      where: { id: { not: session.user.id } },
      select: { id: true, nome: true, role: true },
      orderBy: { nome: 'asc' },
    });

    // Para cada usuário, busca última mensagem e count não lidas
    const contatosComDados = await Promise.all(
      usuarios.map(async (u) => {
        const ultimaMensagem = await prisma.message.findFirst({
          where: {
            OR: [
              { remetenteId: session.user.id, destinatarioId: u.id },
              { remetenteId: u.id, destinatarioId: session.user.id },
            ],
          },
          orderBy: { criadoEm: 'desc' },
        });

        const naoLidas = await prisma.message.count({
          where: {
            remetenteId: u.id,
            destinatarioId: session.user.id,
            lida: false,
          },
        });

        return {
          ...u,
          ultimaMensagem: ultimaMensagem?.conteudo || null,
          ultimaDataMsg: ultimaMensagem?.criadoEm || null,
          naoLidas,
        };
      })
    );

    // Ordena: com mensagens primeiro, depois por data
    contatosComDados.sort((a, b) => {
      if (a.ultimaDataMsg && b.ultimaDataMsg) {
        return new Date(b.ultimaDataMsg).getTime() - new Date(a.ultimaDataMsg).getTime();
      }
      if (a.ultimaDataMsg) return -1;
      if (b.ultimaDataMsg) return 1;
      return a.nome.localeCompare(b.nome);
    });

    return NextResponse.json(contatosComDados);
  } catch (error) {
    console.error('Erro ao buscar contatos:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
