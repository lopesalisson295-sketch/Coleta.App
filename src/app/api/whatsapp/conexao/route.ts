import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { 
  getWhatsAppState, 
  inicializarWhatsApp, 
  desconectarWhatsApp, 
  enviarMensagemReal 
} from '@/lib/whatsapp-client';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
    }

    const state = getWhatsAppState();

    return NextResponse.json({
      conectado: state.conectado,
      status: state.status,
      qrCode: state.qrCode,
      erro: state.erro,
      dispositivo: state.dispositivo,
      historico: state.historico,
      logs: state.logs || []
    });
  } catch (error) {
    console.error('Erro na API de conexão do WhatsApp:', error);
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
    const { acao, dados } = body;

    const state = getWhatsAppState();

    if (acao === 'conectar') {
      // Inicializa em segundo plano para não dar timeout na requisição HTTP
      inicializarWhatsApp();
      
      return NextResponse.json({
        sucesso: true,
        mensagem: 'Iniciando o WhatsApp Web. Aguarde a geração do QR Code.',
        conectado: false,
        status: 'conectando',
        dispositivo: state.dispositivo,
        logs: state.logs || []
      });
    }

    if (acao === 'desconectar') {
      await desconectarWhatsApp();
      
      return NextResponse.json({
        sucesso: true,
        mensagem: 'WhatsApp desconectado com sucesso!',
        conectado: false,
        status: 'desconectado',
        dispositivo: state.dispositivo,
        logs: state.logs || []
      });
    }

    if (acao === 'enviar_teste') {
      const { para, conteudo } = dados;
      if (!para || !conteudo) {
        return NextResponse.json({ error: 'Parâmetros inválidos' }, { status: 400 });
      }

      const res = await enviarMensagemReal(para, conteudo);

      if (res.sucesso) {
        return NextResponse.json({
          sucesso: true,
          mensagem: res.simulado 
            ? 'Mensagem enviada no modo simulado com sucesso!' 
            : 'Mensagem real enviada com sucesso!',
          novaMensagem: res.mensagem
        });
      } else {
        return NextResponse.json({ 
          error: `Erro ao enviar mensagem: ${res.erro}` 
        }, { status: 500 });
      }
    }

    return NextResponse.json({ error: 'Ação não suportada' }, { status: 400 });
  } catch (error) {
    console.error('Erro ao processar ação de conexão do WhatsApp:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
