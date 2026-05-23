import { Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { enviarMensagemReal, inicializarWhatsApp } from '@/lib/whatsapp-client';
import { WhatsAppJobData } from './whatsappQueue';

const connection = new IORedis(process.env.REDIS_URL || 'redis://127.0.0.1:6379', {
  maxRetriesPerRequest: null,
});

// Atraso randômico entre 3 a 8 segundos para simular digitação e evitar bans
const delayAleatorio = () => {
  const min = 3000;
  const max = 8000;
  return new Promise((resolve) => setTimeout(resolve, Math.random() * (max - min) + min));
};

export const whatsappWorker = new Worker(
  'whatsapp-queue',
  async (job: Job<WhatsAppJobData>) => {
    const { para, conteudo } = job.data;
    
    console.log(`[Worker] Iniciando processamento do job ${job.id} para ${para}...`);

    // Assegura que o WhatsApp está inicializado e tenta conectar se não estiver
    // Se o cliente já existir, apenas retorna ele
    await inicializarWhatsApp();
    
    // Simula um delay natural (Anti-ban Meta)
    await delayAleatorio();

    const result = await enviarMensagemReal(para, conteudo);

    if (!result.sucesso) {
      // Jogar erro fará o BullMQ reagendar o job usando backoff exponencial
      throw new Error(`Falha no envio: ${result.erro}`);
    }

    console.log(`[Worker] Job ${job.id} processado com sucesso!`);
    return result;
  },
  {
    connection,
    concurrency: 1, // Limite de concorrência = 1 (1 mensagem por vez na conta do WhatsApp para evitar bloqueio do aparelho)
  }
);

whatsappWorker.on('completed', (job) => {
  console.log(`[Worker] Job ${job.id} concluído com êxito!`);
});

whatsappWorker.on('failed', (job, err) => {
  console.error(`[Worker] Job ${job?.id} falhou: ${err.message}`);
});
