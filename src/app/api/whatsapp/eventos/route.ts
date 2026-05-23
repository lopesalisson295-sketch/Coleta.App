import { NextResponse } from 'next/server';

export async function GET() {
  if (!global.whatsappState || !global.whatsappState.conectado) {
    return NextResponse.json({ eventos: [] }, { status: 200 });
  }

  // Captura os eventos atuais da fila
  const eventos = [...(global.whatsappState.eventosRecentes || [])];
  
  // Limpa a fila após capturar
  if (global.whatsappState.eventosRecentes) {
    global.whatsappState.eventosRecentes = [];
  }

  return NextResponse.json({ eventos }, { status: 200 });
}
