import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { dispararAutomacaoWhatsApp } from '@/lib/whatsapp';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });

    const entrega = await prisma.delivery.findUnique({
      where: { id: params.id },
      include: {
        motorista: { select: { id: true, nome: true } },
        ajudante: { select: { id: true, nome: true } },
      },
    });

    if (!entrega) return NextResponse.json({ error: 'Entrega não encontrada' }, { status: 404 });

    // Motorista ou Ajudante só podem ver suas próprias entregas
    if (session.user.role !== 'ADMIN' && entrega.motoristaId !== session.user.id && entrega.ajudanteId !== session.user.id) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    return NextResponse.json(entrega);
  } catch {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });

    const body = await req.json();
    const { status, observacao, latitude, longitude, imagemUrl, confirmedAt, motoristaId, ajudanteId, descricaoItens, imagemItensUrl } = body;

    const entrega = await prisma.delivery.findUnique({ where: { id: params.id } });
    if (!entrega) return NextResponse.json({ error: 'Entrega não encontrada' }, { status: 404 });

    // Motorista ou Ajudante só podem atualizar status/observacao de entregas atribuídas a eles
    if (session.user.role !== 'ADMIN' && entrega.motoristaId !== session.user.id && entrega.ajudanteId !== session.user.id) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const isAdmin = session.user.role === 'ADMIN';

    const updated = await prisma.delivery.update({
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
        ...(descricaoItens !== undefined ? { descricaoItens } : {}),
        ...(imagemItensUrl !== undefined ? { imagemItensUrl } : {}),
      },
    });

    // Se houve alteração de status, disparar notificação via WhatsApp
    if (status && status !== entrega.status) {
      const entregaCompleta = await prisma.delivery.findUnique({
        where: { id: params.id },
        include: {
          motorista: {
            include: {
              veiculos: true
            }
          },
          ajudante: true,
        }
      });

      if (entregaCompleta) {
        let tipoGatilho: 'rota_iniciar' | 'conclusao' | 'cancelamento' | null = null;
        if (status === 'EM_ANDAMENTO') {
          tipoGatilho = 'rota_iniciar';
        } else if (status === 'ENTREGUE') {
          tipoGatilho = 'conclusao';
        } else if (status === 'CANCELADA' || status === 'NAO_REALIZADA') {
          tipoGatilho = 'cancelamento';
        }

        if (tipoGatilho) {
          const veiculoNome = entregaCompleta.motorista?.veiculos?.[0]
            ? `${entregaCompleta.motorista.veiculos[0].nome} (${entregaCompleta.motorista.veiculos[0].placa})`
            : '';

          // Se for concluída, criar notificação para ADMIN (com de-duplicação)
          if (status === 'ENTREGUE') {
            const msgTexto = `O motorista ${entregaCompleta.motorista?.nome || 'Desconhecido'} finalizou a entrega de ${entregaCompleta.destinatario}.${imagemUrl ? ' (Foto enviada)' : ''}`;
            const dezSegundosAtras = new Date(Date.now() - 10000);
            const existeDuplicada = await prisma.notification.findFirst({
              where: {
                titulo: 'Entrega Finalizada',
                mensagem: msgTexto,
                tipo: 'ENTREGA',
                criadoEm: { gte: dezSegundosAtras }
              }
            });

            if (!existeDuplicada) {
              await prisma.notification.create({
                data: {
                  titulo: 'Entrega Finalizada',
                  mensagem: msgTexto,
                  tipo: 'ENTREGA',
                  link: '/entregas'
                }
              });
            }
          }

          await dispararAutomacaoWhatsApp({
            tipo: tipoGatilho,
            cliente: entregaCompleta.destinatario, // Em entregas, o destinatário assume o papel de cliente para templates
            endereco: entregaCompleta.endereco,
            telefoneCliente: entregaCompleta.telefone,
            motoristaNome: entregaCompleta.motorista?.nome || '',
            ajudanteNome: entregaCompleta.ajudante?.nome || '',
            veiculoNome: veiculoNome,
            observacao: (observacao || entregaCompleta.observacao || '').replace(/\[FALHA\]\s*/g, ''),
          });
        }
      }
    } else if (imagemUrl && !entrega.imagemUrl) {
      // Motorista apenas enviou a foto, avisar Admin
      const entregaCompleta = await prisma.delivery.findUnique({
        where: { id: params.id },
        include: { motorista: true, ajudante: true }
      });
      const msgTexto = `A foto da entrega para ${entregaCompleta?.destinatario} foi enviada. Aguardando sua aprovação.`;
      const dezSegundosAtras = new Date(Date.now() - 10000);
      const existeDuplicada = await prisma.notification.findFirst({
        where: {
          titulo: 'Foto Recebida - Entrega',
          mensagem: msgTexto,
          tipo: 'ENTREGA',
          criadoEm: { gte: dezSegundosAtras }
        }
      });

      if (!existeDuplicada) {
        await prisma.notification.create({
          data: {
            titulo: 'Foto Recebida - Entrega',
            mensagem: msgTexto,
            tipo: 'ENTREGA',
            link: '/entregas'
          }
        });
      }
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Erro ao atualizar entrega:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
    }

    await prisma.delivery.delete({ where: { id: params.id } });
    return NextResponse.json({ message: 'Entrega removida com sucesso' });
  } catch {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
