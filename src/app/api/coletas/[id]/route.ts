import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { dispararAutomacaoWhatsApp } from '@/lib/whatsapp';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });

    const coleta = await prisma.collection.findUnique({
      where: { id: params.id },
      include: {
        motorista: { select: { id: true, nome: true } },
        ajudante: { select: { id: true, nome: true } },
        veiculo: { select: { id: true, nome: true, placa: true } },
      },
    });

    if (!coleta) return NextResponse.json({ error: 'Coleta não encontrada' }, { status: 404 });

    // Motorista ou Ajudante só podem ver suas próprias coletas
    if (session.user.role !== 'ADMIN' && coleta.motoristaId !== session.user.id && coleta.ajudanteId !== session.user.id) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    return NextResponse.json(coleta);
  } catch {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });

    const body = await req.json();
    const { status, observacao, latitude, longitude, imagemUrl, confirmedAt, motoristaId, ajudanteId, veiculoId, descricaoItens, imagemItensUrl } = body;

    const coleta = await prisma.collection.findUnique({ where: { id: params.id } });
    if (!coleta) return NextResponse.json({ error: 'Coleta não encontrada' }, { status: 404 });

    // Motorista ou Ajudante só podem atualizar status/observacao de coletas atribuídas a eles
    if (session.user.role !== 'ADMIN' && coleta.motoristaId !== session.user.id && coleta.ajudanteId !== session.user.id) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const isAdmin = session.user.role === 'ADMIN';

    const updated = await prisma.collection.update({
      where: { id: params.id },
      data: {
        ...(status !== undefined ? { status } : {}),
        ...(observacao !== undefined ? { observacao } : {}),
        ...(latitude !== undefined ? { latitude } : {}),
        ...(longitude !== undefined ? { longitude } : {}),
        ...(imagemUrl !== undefined ? { imagemUrl } : {}),
        ...(confirmedAt !== undefined ? { confirmedAt: new Date(confirmedAt) } : {}),
        ...(isAdmin && motoristaId !== undefined ? { motoristaId } : {}),
        ...(isAdmin && ajudanteId !== undefined ? { ajudanteId } : {}),
        ...(isAdmin && veiculoId !== undefined ? { veiculoId } : {}),
        ...(descricaoItens !== undefined ? { descricaoItens } : {}),
        ...(imagemItensUrl !== undefined ? { imagemItensUrl } : {}),
      },
    });

    // Se houve alteração de status, disparar notificação via WhatsApp
    if (status && status !== coleta.status) {
      const coletaCompleta = await prisma.collection.findUnique({
        where: { id: params.id },
        include: {
          motorista: true,
          ajudante: true,
          veiculo: true,
        }
      });

      if (coletaCompleta) {
        let tipoGatilho: 'rota_iniciar' | 'conclusao' | 'cancelamento' | null = null;
        if (status === 'EM_ANDAMENTO') {
          tipoGatilho = 'rota_iniciar';
        } else if (status === 'COLETADA') {
          tipoGatilho = 'conclusao';
          
          // Criar notificação para o Admin (com de-duplicação)
          const msgTexto = `O motorista ${coletaCompleta.motorista?.nome || 'Desconhecido'} coletou a carga de ${coletaCompleta.cliente}.${imagemUrl ? ' (Foto enviada)' : ''}`;
          const dezSegundosAtras = new Date(Date.now() - 10000);
          const existeDuplicada = await prisma.notification.findFirst({
            where: {
              titulo: 'Coleta Finalizada',
              mensagem: msgTexto,
              tipo: 'COLETA',
              criadoEm: { gte: dezSegundosAtras }
            }
          });

          if (!existeDuplicada) {
            await prisma.notification.create({
              data: {
                titulo: 'Coleta Finalizada',
                mensagem: msgTexto,
                tipo: 'COLETA',
                link: '/coletas'
              }
            });
          }
        } else if (status === 'CANCELADA' || status === 'NAO_REALIZADA') {
          tipoGatilho = 'cancelamento';
        }

        if (tipoGatilho) {
          await dispararAutomacaoWhatsApp({
            tipo: tipoGatilho,
            cliente: coletaCompleta.cliente,
            endereco: coletaCompleta.endereco,
            telefoneCliente: coletaCompleta.telefone,
            motoristaNome: coletaCompleta.motorista?.nome || '',
            ajudanteNome: coletaCompleta.ajudante?.nome || '',
            veiculoNome: coletaCompleta.veiculo ? `${coletaCompleta.veiculo.nome} (${coletaCompleta.veiculo.placa})` : '',
            observacao: (observacao || coletaCompleta.observacao || '').replace(/\[FALHA\]\s*/g, ''),
          });
        }
      }
    } else if (imagemUrl && !coleta.imagemUrl) {
      // Motorista apenas enviou a foto, avisar Admin
      const coletaCompleta = await prisma.collection.findUnique({
        where: { id: params.id },
        include: { motorista: true, ajudante: true }
      });
      const msgTexto = `A foto da coleta de ${coletaCompleta?.cliente} foi enviada. Aguardando sua aprovação.`;
      const dezSegundosAtras = new Date(Date.now() - 10000);
      const existeDuplicada = await prisma.notification.findFirst({
        where: {
          titulo: 'Foto Recebida - Coleta',
          mensagem: msgTexto,
          tipo: 'COLETA',
          criadoEm: { gte: dezSegundosAtras }
        }
      });

      if (!existeDuplicada) {
        await prisma.notification.create({
          data: {
            titulo: 'Foto Recebida - Coleta',
            mensagem: msgTexto,
            tipo: 'COLETA',
            link: '/coletas'
          }
        });
      }
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Erro ao atualizar coleta:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
    }

    await prisma.collection.delete({ where: { id: params.id } });
    return NextResponse.json({ message: 'Coleta removida com sucesso' });
  } catch {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
