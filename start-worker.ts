import 'dotenv/config';
import { whatsappWorker } from './src/lib/queue/whatsappWorker';

console.log('🚀 Iniciando Worker do WhatsApp (BullMQ)...');
console.log('⏳ Aguardando mensagens na fila...');

// Mantém o processo rodando
process.on('SIGINT', async () => {
  console.log('Encerrando Worker...');
  await whatsappWorker.close();
  process.exit(0);
});
