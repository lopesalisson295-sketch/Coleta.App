import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(_req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
    }

    const settings = await prisma.automationSettings.findUnique({
      where: { id: 'default' },
    });

    if (!settings) {
      // Cria configurações padrão se não existirem
      const defaultSettings = await prisma.automationSettings.create({
        data: {
          id: 'default',
        },
      });
      return NextResponse.json(defaultSettings);
    }

    return NextResponse.json(settings);
  } catch (error) {
    console.error('Erro ao buscar configurações de automação:', error);
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

    const settings = await prisma.automationSettings.upsert({
      where: { id: 'default' },
      update: {
        rotaIniciarClienteAtivo: body.rotaIniciarClienteAtivo,
        rotaIniciarClienteTemplate: body.rotaIniciarClienteTemplate,
        rotaIniciarGrupoAtivo: body.rotaIniciarGrupoAtivo,
        rotaIniciarGrupoTemplate: body.rotaIniciarGrupoTemplate,
        
        conclusaoClienteAtivo: body.conclusaoClienteAtivo,
        conclusaoClienteTemplate: body.conclusaoClienteTemplate,
        conclusaoGrupoAtivo: body.conclusaoGrupoAtivo,
        conclusaoGrupoTemplate: body.conclusaoGrupoTemplate,
        
        cancelamentoClienteAtivo: body.cancelamentoClienteAtivo,
        cancelamentoClienteTemplate: body.cancelamentoClienteTemplate,
        cancelamentoGrupoAtivo: body.cancelamentoGrupoAtivo,
        cancelamentoGrupoTemplate: body.cancelamentoGrupoTemplate,
        
        telefoneGrupo: body.telefoneGrupo,
      },
      create: {
        id: 'default',
        rotaIniciarClienteAtivo: body.rotaIniciarClienteAtivo ?? true,
        rotaIniciarClienteTemplate: body.rotaIniciarClienteTemplate,
        rotaIniciarGrupoAtivo: body.rotaIniciarGrupoAtivo ?? true,
        rotaIniciarGrupoTemplate: body.rotaIniciarGrupoTemplate,
        
        conclusaoClienteAtivo: body.conclusaoClienteAtivo ?? true,
        conclusaoClienteTemplate: body.conclusaoClienteTemplate,
        conclusaoGrupoAtivo: body.conclusaoGrupoAtivo ?? true,
        conclusaoGrupoTemplate: body.conclusaoGrupoTemplate,
        
        cancelamentoClienteAtivo: body.cancelamentoClienteAtivo ?? true,
        cancelamentoClienteTemplate: body.cancelamentoClienteTemplate,
        cancelamentoGrupoAtivo: body.cancelamentoGrupoAtivo ?? true,
        cancelamentoGrupoTemplate: body.cancelamentoGrupoTemplate,
        
        telefoneGrupo: body.telefoneGrupo ?? '11999999999',
      },
    });

    return NextResponse.json(settings);
  } catch (error) {
    console.error('Erro ao atualizar configurações de automação:', error);
    return NextResponse.json({ error: 'Erro interno ao salvar configurações' }, { status: 500 });
  }
}
