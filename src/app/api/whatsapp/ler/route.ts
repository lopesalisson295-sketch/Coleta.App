import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { numero } = await req.json();

    if (!numero) {
      return NextResponse.json({ error: 'Número não fornecido' }, { status: 400 });
    }

    if (global.whatsappClient && global.whatsappState?.conectado) {
      try {
        const jid = numero.includes('@') ? numero : `${numero}@c.us`; // Simplificação para garantir formato
        await global.whatsappClient.sendSeen(jid);
        return NextResponse.json({ sucesso: true }, { status: 200 });
      } catch (err) {
        console.error('Erro ao marcar mensagens como lidas no WhatsApp:', err);
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
      }
    } else {
      return NextResponse.json({ error: 'WhatsApp desconectado' }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json({ error: 'Bad Request' }, { status: 400 });
  }
}
