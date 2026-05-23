// Serviço mock de notificações via WhatsApp
// Em produção, substituir pela API oficial do WhatsApp Business ou biblioteca twilio/wapi

import prisma from '@/lib/prisma';
import { enviarMensagemReal } from '@/lib/whatsapp-client';

export interface WhatsAppMessage {
  para: string;   // número de telefone
  nome: string;   // nome do destinatário
  tipo: 'coleta_atribuida' | 'entrega_atribuida' | 'coleta_confirmada' | 'entrega_confirmada' | 'nao_realizada';
  dados?: Record<string, string>;
}

function formatarMensagem(msg: WhatsAppMessage): string {
  const { nome, tipo, dados } = msg;

  switch (tipo) {
    case 'coleta_atribuida':
      return `Olá ${nome}! 🚗\n\nVocê recebeu uma nova coleta:\n📍 *${dados?.endereco || ''}*\n👤 Cliente: ${dados?.cliente || ''}\n📞 Tel: ${dados?.telefone || ''}\n\nAcesse o ColetaMax para mais detalhes.`;

    case 'entrega_atribuida':
      return `Olá ${nome}! 🚚\n\nVocê recebeu uma nova entrega:\n📍 *${dados?.endereco || ''}*\n👤 Destinatário: ${dados?.destinatario || ''}\n📞 Tel: ${dados?.telefone || ''}\n\nAcesse o ColetaMax para mais detalhes.`;

    case 'coleta_confirmada':
      return `✅ *Coleta Confirmada!*\n\nOlá ${nome}, sua coleta em *${dados?.endereco || ''}* foi confirmada com sucesso!\n\n🕐 ${new Date().toLocaleString('pt-BR')}`;

    case 'entrega_confirmada':
      return `✅ *Entrega Realizada!*\n\nOlá ${nome}, sua entrega em *${dados?.endereco || ''}* foi confirmada com sucesso!\n\n🕐 ${new Date().toLocaleString('pt-BR')}`;

    case 'nao_realizada':
      return `⚠️ *Pendência registrada*\n\nOlá ${nome}, a operação em *${dados?.endereco || ''}* foi marcada como não realizada.\n\n📝 Motivo: ${dados?.observacao || 'Não informado'}\n\nContate o suporte para mais informações.`;

    default:
      return `Notificação do ColetaMax para ${nome}.`;
  }
}

export async function enviarWhatsApp(msg: WhatsAppMessage): Promise<{ sucesso: boolean; mensagem: string; simulado: boolean }> {
  const texto = formatarMensagem(msg);
  
  try {
    // Removemos a fila do BullMQ porque ela roda num Worker que não possui a sessão atual do WhatsApp logada (que fica no processo Next.js).
    // Agora o envio ocorre diretamente e localmente.
    const resultado = await enviarMensagemReal(msg.para, texto);
    
    return {
      sucesso: resultado?.sucesso || false,
      mensagem: texto,
      simulado: false,
    };
  } catch (error) {
    console.error('Erro ao enviar mensagem no WhatsApp:', error);
    return {
      sucesso: false,
      mensagem: texto,
      simulado: true, 
    };
  }
}

// Helper para disparar notificação ao atribuir coleta
export async function notificarAtribuicaoColeta(params: {
  motoristaNome: string;
  motoristaTelefone: string;
  endereco: string;
  cliente: string;
  telefone: string;
}) {
  return enviarWhatsApp({
    para: params.motoristaTelefone,
    nome: params.motoristaNome,
    tipo: 'coleta_atribuida',
    dados: {
      endereco: params.endereco,
      cliente: params.cliente,
      telefone: params.telefone,
    },
  });
}

// Helper para disparar notificação ao atribuir entrega
export async function notificarAtribuicaoEntrega(params: {
  motoristaNome: string;
  motoristaTelefone: string;
  endereco: string;
  destinatario: string;
  telefone: string;
}) {
  return enviarWhatsApp({
    para: params.motoristaTelefone,
    nome: params.motoristaNome,
    tipo: 'entrega_atribuida',
    dados: {
      endereco: params.endereco,
      destinatario: params.destinatario,
      telefone: params.telefone,
    },
  });
}

// Disparador dinâmico de automação com templates
export async function dispararAutomacaoWhatsApp(params: {
  tipo: 'rota_iniciar' | 'conclusao' | 'cancelamento';
  cliente: string;
  endereco: string;
  telefoneCliente: string;
  motoristaNome: string;
  ajudanteNome: string;
  veiculoNome: string;
  observacao: string;
}) {
  try {
    const settings = await prisma.automationSettings.upsert({
      where: { id: 'default' },
      update: {},
      create: {
        id: 'default',
        rotaIniciarClienteAtivo: true,
        rotaIniciarClienteTemplate: 'Olá {cliente}! 🚗 O motorista {motorista} está a caminho do endereço: {endereco}.',
        conclusaoClienteAtivo: true,
        conclusaoClienteTemplate: '✅ Olá {cliente}, informamos que o serviço no endereço {endereco} foi finalizado com sucesso!',
      }
    });

    if (!settings) {
      console.log('Nenhuma configuração de automação encontrada no banco.');
      return { sucesso: false, erro: 'Configurações de automação não encontradas.' };
    }

    const {
      rotaIniciarClienteAtivo,
      rotaIniciarClienteTemplate,
      rotaIniciarGrupoAtivo,
      rotaIniciarGrupoTemplate,
      conclusaoClienteAtivo,
      conclusaoClienteTemplate,
      conclusaoGrupoAtivo,
      conclusaoGrupoTemplate,
      cancelamentoClienteAtivo,
      cancelamentoClienteTemplate,
      cancelamentoGrupoAtivo,
      cancelamentoGrupoTemplate,
      telefoneGrupo
    } = settings;

    let clienteAtivo = false;
    let clienteTemplate = '';
    let grupoAtivo = false;
    let grupoTemplate = '';

    if (params.tipo === 'rota_iniciar') {
      clienteAtivo = rotaIniciarClienteAtivo;
      clienteTemplate = rotaIniciarClienteTemplate;
      grupoAtivo = rotaIniciarGrupoAtivo;
      grupoTemplate = rotaIniciarGrupoTemplate;
    } else if (params.tipo === 'conclusao') {
      clienteAtivo = conclusaoClienteAtivo;
      clienteTemplate = conclusaoClienteTemplate;
      grupoAtivo = conclusaoGrupoAtivo;
      grupoTemplate = conclusaoGrupoTemplate;
    } else if (params.tipo === 'cancelamento') {
      clienteAtivo = cancelamentoClienteAtivo;
      clienteTemplate = cancelamentoClienteTemplate;
      grupoAtivo = cancelamentoGrupoAtivo;
      grupoTemplate = cancelamentoGrupoTemplate;
    }

    const substituirTags = (template: string) => {
      return template
        .replace(/{cliente}/g, params.cliente || '')
        .replace(/{endereco}/g, params.endereco || '')
        .replace(/{motorista}/g, params.motoristaNome || 'Nenhum')
        .replace(/{ajudante}/g, params.ajudanteNome || 'Nenhum')
        .replace(/{veiculo}/g, params.veiculoNome || 'Nenhum')
        .replace(/{observacao}/g, params.observacao || 'Nenhuma');
    };

    let logMensagens = '';
    
    // Disparar para o cliente se estiver ativo
    if (clienteAtivo && params.telefoneCliente) {
      const telClienteLimpo = params.telefoneCliente.replace(/\D/g, '');
      if (telClienteLimpo.length < 8) {
        logMensagens += `[IGNORADO] Telefone do cliente inválido: ${params.telefoneCliente}\n`;
      } else {
        const textoCliente = substituirTags(clienteTemplate);
        await enviarMensagemReal(params.telefoneCliente, textoCliente);
        logMensagens += `[Cliente: ${params.telefoneCliente}] ${textoCliente}\n`;
      }
    }

    // Disparar para o grupo se estiver ativo
    if (grupoAtivo && telefoneGrupo) {
      const telGrupoLimpo = telefoneGrupo.replace(/\D/g, '');
      const telClienteLimpo = (params.telefoneCliente || '').replace(/\D/g, '');
      
      if (telGrupoLimpo === telClienteLimpo) {
        logMensagens += `[Grupo Ignorado: ${telefoneGrupo}] Mesmo número do cliente, evitando duplicata.\n`;
      } else {
        const textoGrupo = substituirTags(grupoTemplate);
        await enviarMensagemReal(telefoneGrupo, textoGrupo);
        logMensagens += `[Grupo: ${telefoneGrupo}] ${textoGrupo}\n`;
      }
    }

    return { sucesso: true, log: logMensagens };

  } catch (error) {
    console.error('Erro ao disparar automação de WhatsApp:', error);
    return { sucesso: false, erro: error };
  }
}
