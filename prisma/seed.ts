import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const hashSenha = await bcrypt.hash('Admin123!', 10)
  const hashMotorista = await bcrypt.hash('Motor123!', 10)

  // Criar Usuários
  const admin = await prisma.user.upsert({
    where: { email: 'admin@coletamax.com' },
    update: {},
    create: {
      nome: 'Administrador',
      email: 'admin@coletamax.com',
      senha: hashSenha,
      role: 'ADMIN',
      onboardingCompleto: true,
    },
  })

  const motorista1 = await prisma.user.upsert({
    where: { email: 'joao@coletamax.com' },
    update: {},
    create: {
      nome: 'João Silva',
      email: 'joao@coletamax.com',
      senha: hashMotorista,
      role: 'MOTORISTA',
      onboardingCompleto: true,
    },
  })

  const motorista2 = await prisma.user.upsert({
    where: { email: 'maria@coletamax.com' },
    update: {},
    create: {
      nome: 'Maria Santos',
      email: 'maria@coletamax.com',
      senha: hashMotorista,
      role: 'MOTORISTA',
      onboardingCompleto: false, // para testar onboarding
    },
  })

  const ajudante1 = await prisma.user.upsert({
    where: { email: 'carlos@coletamax.com' },
    update: {},
    create: {
      nome: 'Ajudante Carlos',
      email: 'carlos@coletamax.com',
      senha: hashMotorista,
      role: 'AJUDANTE',
      onboardingCompleto: true,
    },
  })

  // Criar Veículos
  const v1 = await prisma.vehicle.upsert({
    where: { placa: 'ABC-1234' },
    update: {},
    create: {
      nome: 'Fiorino Branca',
      placa: 'ABC-1234',
      status: 'EM_USO',
      regiao: 'São Paulo - Centro',
      motoristaId: motorista1.id,
    },
  })

  const v2 = await prisma.vehicle.upsert({
    where: { placa: 'DEF-5678' },
    update: {},
    create: {
      nome: 'Sprinter Prata',
      placa: 'DEF-5678',
      status: 'DISPONIVEL',
      regiao: 'São Paulo - Sul',
    },
  })

  const v3 = await prisma.vehicle.upsert({
    where: { placa: 'GHI-9012' },
    update: {},
    create: {
      nome: 'Kombi Azul',
      placa: 'GHI-9012',
      status: 'MANUTENCAO',
      regiao: 'São Paulo - Leste',
    },
  })

  // Criar Coletas
  await prisma.collection.createMany({
    data: [
      {
        endereco: 'Rua Augusta, 1000 - Consolação, São Paulo',
        cliente: 'Empresa A',
        telefone: '11999999999',
        status: 'PENDENTE',
        veiculoId: v1.id,
      },
      {
        endereco: 'Av. Paulista, 1500 - Bela Vista, São Paulo',
        cliente: 'Empresa B',
        telefone: '11988888888',
        status: 'EM_ANDAMENTO',
        motoristaId: motorista1.id,
        ajudanteId: ajudante1.id,
        veiculoId: v1.id,
      },
      {
        endereco: 'Rua da Consolação, 200 - Centro, São Paulo',
        cliente: 'Empresa C',
        telefone: '11977777777',
        status: 'COLETADA',
        motoristaId: motorista1.id,
        veiculoId: v1.id,
        confirmedAt: new Date(),
      },
      {
        endereco: 'Av. Ipiranga, 300 - República, São Paulo',
        cliente: 'Empresa D',
        telefone: '11966666666',
        status: 'CANCELADA',
        observacao: 'Cliente fechado no momento da coleta',
        motoristaId: motorista2.id,
      },
      {
        endereco: 'Rua São Bento, 400 - Centro, São Paulo',
        cliente: 'Empresa E',
        telefone: '11955555555',
        status: 'NAO_REALIZADA',
        observacao: 'Endereço incorreto',
      }
    ]
  })

  // Criar Entregas
  await prisma.delivery.createMany({
    data: [
      {
        endereco: 'Av. Brigadeiro Faria Lima, 1000 - Pinheiros, São Paulo',
        destinatario: 'Cliente X',
        telefone: '11944444444',
        status: 'PENDENTE',
      },
      {
        endereco: 'Rua Oscar Freire, 500 - Cerqueira César, São Paulo',
        destinatario: 'Cliente Y',
        telefone: '11933333333',
        status: 'EM_ANDAMENTO',
        motoristaId: motorista1.id,
        ajudanteId: ajudante1.id,
      },
      {
        endereco: 'Av. Rebouças, 1500 - Pinheiros, São Paulo',
        destinatario: 'Cliente Z',
        telefone: '11922222222',
        status: 'ENTREGUE',
        motoristaId: motorista1.id,
        confirmedAt: new Date(),
      }
    ]
  })

  // Mensagens
  await prisma.message.createMany({
    data: [
      {
        conteudo: 'Bom dia, João! A coleta na Av. Paulista foi confirmada?',
        remetenteId: admin.id,
        destinatarioId: motorista1.id,
      },
      {
        conteudo: 'Sim, já estou a caminho da próxima.',
        remetenteId: motorista1.id,
        destinatarioId: admin.id,
      }
    ]
  })

  // Configurações de Automação
  await prisma.automationSettings.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      rotaIniciarClienteAtivo: true,
      rotaIniciarClienteTemplate: "Olá {cliente}! Sua carga está a caminho no veículo {veiculo} com o motorista {motorista} e ajudante {ajudante}.",
      rotaIniciarGrupoAtivo: true,
      rotaIniciarGrupoTemplate: "🚚 Rota Iniciada: Equipe {motorista} e {ajudante} iniciou a viagem para o cliente {cliente} ({endereco}).",
      
      conclusaoClienteAtivo: true,
      conclusaoClienteTemplate: "Olá {cliente}! Sua carga foi coletada/entregue com sucesso por nossa equipe. Obrigado!",
      conclusaoGrupoAtivo: true,
      conclusaoGrupoTemplate: "✅ Operação Concluída: {motorista} e {ajudante} finalizaram a carga do cliente {cliente} no endereço {endereco}.",
      
      cancelamentoClienteAtivo: true,
      cancelamentoClienteTemplate: "Olá {cliente}, sua carga não pôde ser atendida hoje. Motivo: {observacao}.",
      cancelamentoGrupoAtivo: true,
      cancelamentoGrupoTemplate: "❌ Falha na Rota: O cliente {cliente} não foi atendido. Motivo: {observacao}. Equipe: {motorista}/{ajudante}.",
      
      telefoneGrupo: "11999999999",
    }
  })

  console.log('Seed executado com sucesso!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
