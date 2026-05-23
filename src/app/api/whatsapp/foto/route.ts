import { NextResponse } from 'next/server';
import { getCachedProfilePic, setCachedProfilePic } from '@/lib/whatsapp-client';

// Fila global para limitar chamadas simultâneas ao Puppeteer
const queue: (() => Promise<void>)[] = [];
let activeWorkers = 0;
const CONCURRENCY_LIMIT = 10;

async function enqueue<T>(task: () => Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    queue.push(async () => {
      try {
        const res = await task();
        resolve(res);
      } catch (err) {
        reject(err);
      }
    });
    processQueue();
  });
}

async function processQueue() {
  while (queue.length > 0 && activeWorkers < CONCURRENCY_LIMIT) {
    const task = queue.shift();
    if (task) {
      activeWorkers++;
      task().finally(() => {
        activeWorkers--;
        processQueue();
      });
    }
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const jid = searchParams.get('jid');

    if (!jid) {
      return NextResponse.json({ error: 'JID não fornecido' }, { status: 400 });
    }

    if (!global.whatsappClient || !global.whatsappState?.conectado) {
      return NextResponse.json({ error: 'WhatsApp não conectado' }, { status: 400 });
    }

    // Verifica no cache primeiro
    const cachedUrl = getCachedProfilePic(jid);
    if (cachedUrl !== undefined) {
      return NextResponse.json({ url: cachedUrl }, { status: 200 });
    }

    try {
      // Enfileira a busca da foto para não travar o Puppeteer com 40 requests simultâneos
      const url = await enqueue(async () => {
        const contact = await global.whatsappClient!.getContactById(jid);
        if (!contact) return null;
        return await contact.getProfilePicUrl();
      });

      // Salva no cache
      setCachedProfilePic(jid, url || null);

      return NextResponse.json({ url: url || null }, { status: 200 });
    } catch (err) {
      setCachedProfilePic(jid, null);
      return NextResponse.json({ url: null }, { status: 200 });
    }
  } catch (error) {
    return NextResponse.json({ error: 'Bad Request' }, { status: 400 });
  }
}
