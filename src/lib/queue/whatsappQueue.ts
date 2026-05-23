import { Queue } from 'bullmq';
import IORedis from 'ioredis';

// Singleton de conexão Redis para reaproveitamento
const connection = new IORedis(process.env.REDIS_URL || 'redis://127.0.0.1:6379', {
  maxRetriesPerRequest: null,
});

export const whatsappQueue = new Queue('whatsapp-queue', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000, // delay de 5s inicial após falha
    },
    removeOnComplete: true, // Limpa o job após sucesso para não pesar o Redis
    removeOnFail: 100, // Guarda os últimos 100 jobs falhos para análise
  },
});

export interface WhatsAppJobData {
  para: string;
  conteudo: string;
  idInterno?: string; // ID da mensagem no banco caso precise atualizar status
}

// Helper para adicionar na fila
export async function enqueueWhatsAppMessage(data: WhatsAppJobData) {
  // Gera um ID único e legível
  const jobId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  
  return whatsappQueue.add('send-message', data, {
    jobId,
  });
}
