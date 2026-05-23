import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const mesParam = searchParams.get('mes')
    const anoParam = searchParams.get('ano')
    const dataExata = searchParams.get('data') // YYYY-MM-DD

    const now = new Date()
    
    let startDate: Date;
    let endDate: Date;
    let isDailyView = false;

    if (dataExata) {
      // Filtro de Dia Específico
      const [y, m, d] = dataExata.split('-').map(Number);
      startDate = new Date(y, m - 1, d, 0, 0, 0, 0);
      endDate = new Date(y, m - 1, d, 23, 59, 59, 999);
      isDailyView = true;
    } else {
      // Filtro de Mês
      const mes = mesParam ? parseInt(mesParam, 10) : now.getMonth() + 1
      const ano = anoParam ? parseInt(anoParam, 10) : now.getFullYear()
      startDate = new Date(ano, mes - 1, 1)
      endDate = new Date(ano, mes, 0, 23, 59, 59, 999)
    }

    // Busca todas as coletas
    const coletas = await prisma.collection.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        }
      }
    })

    // Busca todas as entregas
    const entregas = await prisma.delivery.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        }
      }
    })

    // Agrega as métricas gerais
    const totalColetas = coletas.length
    const coletasPendentes = coletas.filter(c => c.status === 'PENDENTE' || c.status === 'EM_ANDAMENTO').length
    const coletasConcluidas = coletas.filter(c => c.status === 'COLETADA').length
    const coletasFalhas = coletas.filter(c => c.status === 'NAO_REALIZADA').length

    const totalEntregas = entregas.length
    const entregasPendentes = entregas.filter(e => e.status === 'PENDENTE' || e.status === 'EM_ANDAMENTO').length
    const entregasConcluidas = entregas.filter(e => e.status === 'ENTREGUE').length
    const entregasFalhas = entregas.filter(e => e.status === 'NAO_REALIZADA').length

    // Montar chartData
    const chartDataColetas = []
    const chartDataEntregas = []

    if (isDailyView) {
      // Visão Diária: Gráfico por Hora (0h às 23h)
      for (let hora = 0; hora <= 23; hora++) {
        const startOfHour = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate(), hora, 0, 0, 0).getTime()
        const endOfHour = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate(), hora, 59, 59, 999).getTime()

        chartDataColetas.push({
          name: `${hora}h`,
          concluidas: coletas.filter(c => c.status === 'COLETADA' && c.createdAt.getTime() >= startOfHour && c.createdAt.getTime() <= endOfHour).length,
          falhas: coletas.filter(c => c.status === 'NAO_REALIZADA' && c.createdAt.getTime() >= startOfHour && c.createdAt.getTime() <= endOfHour).length,
        })

        chartDataEntregas.push({
          name: `${hora}h`,
          concluidas: entregas.filter(e => e.status === 'ENTREGUE' && e.createdAt.getTime() >= startOfHour && e.createdAt.getTime() <= endOfHour).length,
          falhas: entregas.filter(e => e.status === 'NAO_REALIZADA' && e.createdAt.getTime() >= startOfHour && e.createdAt.getTime() <= endOfHour).length,
        })
      }
    } else {
      // Visão Mensal: Gráfico por Dia (1 a 31)
      const diasNoMes = endDate.getDate()
      for (let dia = 1; dia <= diasNoMes; dia++) {
        const startOfDay = new Date(startDate.getFullYear(), startDate.getMonth(), dia, 0, 0, 0, 0).getTime()
        const endOfDay = new Date(startDate.getFullYear(), startDate.getMonth(), dia, 23, 59, 59, 999).getTime()

        chartDataColetas.push({
          name: String(dia).padStart(2, '0'),
          concluidas: coletas.filter(c => c.status === 'COLETADA' && c.createdAt.getTime() >= startOfDay && c.createdAt.getTime() <= endOfDay).length,
          falhas: coletas.filter(c => c.status === 'NAO_REALIZADA' && c.createdAt.getTime() >= startOfDay && c.createdAt.getTime() <= endOfDay).length,
        })

        chartDataEntregas.push({
          name: String(dia).padStart(2, '0'),
          concluidas: entregas.filter(e => e.status === 'ENTREGUE' && e.createdAt.getTime() >= startOfDay && e.createdAt.getTime() <= endOfDay).length,
          falhas: entregas.filter(e => e.status === 'NAO_REALIZADA' && e.createdAt.getTime() >= startOfDay && e.createdAt.getTime() <= endOfDay).length,
        })
      }
    }

    // Últimas atividades (geral, ignorando o mês para não ficar vazio no painel)
    const ultimasColetas = await prisma.collection.findMany({
      orderBy: { updatedAt: 'desc' },
      take: 5,
    })
    const ultimasEntregas = await prisma.delivery.findMany({
      orderBy: { updatedAt: 'desc' },
      take: 5,
    })

    const ultimasAtividades = [...ultimasColetas, ...ultimasEntregas]
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
      .slice(0, 5)

    return NextResponse.json({
      metrics: {
        totalColetas, coletasPendentes, coletasConcluidas, coletasFalhas,
        totalEntregas, entregasPendentes, entregasConcluidas, entregasFalhas,
      },
      chartDataColetas,
      chartDataEntregas,
      ultimasAtividades,
      isDailyView
    })
  } catch (error) {
    console.error("Dashboard error:", error)
    return NextResponse.json({ message: "Erro interno" }, { status: 500 })
  }
}
