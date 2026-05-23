/* eslint-disable no-var, @typescript-eslint/no-explicit-any */
import { Client, LocalAuth } from 'whatsapp-web.js';
import QRCode from 'qrcode';
import prisma from './prisma';
import { execFile, execSync } from 'child_process';
import ffmpegPath from 'ffmpeg-static';
import fs from 'fs';
import path from 'path';
import os from 'os';

// Pasta física para cache persistente de mídias (evita expiração e falhas em mensagens enviadas)
const mediaCacheDir = path.join(process.cwd(), '.wwebjs_media_cache');
if (!fs.existsSync(mediaCacheDir)) {
  try {
    fs.mkdirSync(mediaCacheDir, { recursive: true });
  } catch (e) {
    console.error('Erro ao criar diretório de cache de mídias:', e);
  }
}

export function salvarMidiaNoCache(messageId: string, mimetype: string, base64Data: string) {
  try {
    const filename = encodeURIComponent(messageId) + '.json';
    const filePath = path.join(mediaCacheDir, filename);
    fs.writeFileSync(filePath, JSON.stringify({ mimetype, data: base64Data }));
  } catch (err) {
    console.error('Erro ao salvar mídia no cache local:', err);
  }
}

export function obterMidiaDoCache(messageId: string): { mimetype: string; data: string } | null {
  try {
    const filename = encodeURIComponent(messageId) + '.json';
    const filePath = path.join(mediaCacheDir, filename);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(content);
    }
  } catch (err) {
    // Silencia erros
  }
  return null;
}

// Função auxiliar para converter áudio WebM do navegador em OGG/Opus para o WhatsApp Web
export async function converterWebmParaOgg(base64Webm: string): Promise<string> {
  const tempDir = os.tmpdir();
  const inputPath = path.join(tempDir, `audio_in_${Date.now()}_${Math.random().toString(36).substring(7)}.webm`);
  const outputPath = path.join(tempDir, `audio_out_${Date.now()}_${Math.random().toString(36).substring(7)}.ogg`);

  try {
    const buffer = Buffer.from(base64Webm, 'base64');
    await fs.promises.writeFile(inputPath, buffer);

    const finalFfmpegPath = path.resolve(process.cwd(), 'node_modules', 'ffmpeg-static', os.platform() === 'win32' ? 'ffmpeg.exe' : 'ffmpeg');

    if (!fs.existsSync(finalFfmpegPath)) {
      throw new Error(`FFmpeg não encontrado no caminho: ${finalFfmpegPath}`);
    }

    await new Promise<void>((resolve, reject) => {
      execFile(
        finalFfmpegPath,
        ['-y', '-i', inputPath, '-c:a', 'libopus', '-ar', '48000', '-ac', '1', '-b:a', '64k', '-af', 'aresample=async=1:first_pts=0', '-vbr', 'on', '-application', 'voip', '-map_metadata', '-1', '-vn', outputPath],
        (error: any, stdout: any, stderr: any) => {
          if (error) {
            console.error('Erro no FFmpeg:', stderr);
            reject(error);
          } else {
            resolve();
          }
        }
      );
    });

    const oggBuffer = await fs.promises.readFile(outputPath);
    return oggBuffer.toString('base64');
  } finally {
    try {
      if (fs.existsSync(inputPath)) await fs.promises.unlink(inputPath);
      if (fs.existsSync(outputPath)) await fs.promises.unlink(outputPath);
    } catch (e) {
      console.error('Erro ao limpar arquivos temporários de áudio:', e);
    }
  }
}

// Transcodifica áudio OGG/Opus vindo do WhatsApp em MP3 universal para execução fluida em qualquer navegador
export async function converterOggParaMp3(base64Ogg: string): Promise<string> {
  const tempDir = os.tmpdir();
  const inputPath = path.join(tempDir, `audio_ogg_${Date.now()}_${Math.random().toString(36).substring(7)}.ogg`);
  const outputPath = path.join(tempDir, `audio_mp3_${Date.now()}_${Math.random().toString(36).substring(7)}.mp3`);

  try {
    const buffer = Buffer.from(base64Ogg, 'base64');
    await fs.promises.writeFile(inputPath, buffer);

    const finalFfmpegPath = path.resolve(process.cwd(), 'node_modules', 'ffmpeg-static', os.platform() === 'win32' ? 'ffmpeg.exe' : 'ffmpeg');

    if (!fs.existsSync(finalFfmpegPath)) {
      throw new Error(`FFmpeg não encontrado no caminho: ${finalFfmpegPath}`);
    }

    await new Promise<void>((resolve, reject) => {
      execFile(
        finalFfmpegPath,
        ['-y', '-i', inputPath, '-acodec', 'libmp3lame', '-b:a', '64k', outputPath],
        (error: any, stdout: any, stderr: any) => {
          if (error) {
            console.error('Erro no FFmpeg (OGG para MP3):', stderr);
            reject(error);
          } else {
            resolve();
          }
        }
      );
    });

    const mp3Buffer = await fs.promises.readFile(outputPath);
    return mp3Buffer.toString('base64');
  } finally {
    try {
      if (fs.existsSync(inputPath)) await fs.promises.unlink(inputPath);
      if (fs.existsSync(outputPath)) await fs.promises.unlink(outputPath);
    } catch (e) {
      // Ignora erro
    }
  }
}

// Estende a interface global do NodeJS para guardar o estado e o cliente
declare global {
  var whatsappClient: Client | undefined;
  var processedWhatsAppMessageIds: Set<string> | undefined;
  var whatsappState: {
    conectado: boolean;
    status: 'desconectado' | 'conectando' | 'autenticando' | 'conectado' | 'erro';
    qrCode: string | null;
    erro: string | null;
    dispositivo: {
      numero: string;
      nome: string;
      bateria: number;
      sinal: string;
      operadora: string;
      conectadoEm: string | null;
    };
    historico: Array<{
      id: string;
      para: string;
      nome: string;
      tipo: string;
      conteudo: string;
      status: 'ENVIADA' | 'LIDA' | 'FALHA';
      data: string;
    }>;
    eventosRecentes: any[];
    logs: string[];
  } | undefined;
}

// Inicializa os caches globais se não existirem
if (!global.processedWhatsAppMessageIds) {
  global.processedWhatsAppMessageIds = new Set();
}

if (!global.whatsappState) {
  global.whatsappState = {
    conectado: false,
    status: 'desconectado',
    qrCode: null,
    erro: null,
    dispositivo: {
      numero: '+55 (11) 98765-4321',
      nome: 'ColetaMax Corporativo',
      bateria: 100,
      sinal: 'excelente',
      operadora: 'WhatsApp Web',
      conectadoEm: null,
    },
    historico: [
      {
        id: 'msg_init',
        para: '+55 (11) 99999-1111',
        nome: 'Motorista Exemplo',
        tipo: 'coleta_atribuida',
        conteudo: 'Olá! Você tem uma nova coleta pendente no ColetaMax.',
        status: 'ENVIADA',
        data: new Date().toISOString()
      }
    ],
    eventosRecentes: [],
    logs: ['[Sistema] Módulo de WhatsApp Real carregado. Pronto para iniciar conexão.']
  };
}

export const getWhatsAppState = () => {
  return global.whatsappState!;
};

// Cache de fotos em memória com TTL
const profilePicCache = new Map<string, { url: string | null; cachedAt: number }>();
const PHOTO_CACHE_TTL = 30 * 60 * 1000; // 30 minutos

export function getCachedProfilePic(jid: string): string | null | undefined {
  const cached = profilePicCache.get(jid);
  if (cached && Date.now() - cached.cachedAt < PHOTO_CACHE_TTL) {
    return cached.url;
  }
  return undefined; // not in cache
}

export function setCachedProfilePic(jid: string, url: string | null) {
  profilePicCache.set(jid, { url, cachedAt: Date.now() });
}

export const adicionarLog = (mensagem: string) => {
  const time = new Date().toLocaleTimeString('pt-BR');
  const logMsg = `[${time}] ${mensagem}`;
  console.log(`📱 [WhatsApp Real] ${mensagem}`);
  if (global.whatsappState) {
    global.whatsappState.logs = [logMsg, ...global.whatsappState.logs.slice(0, 49)];
  }
};

function killZombieChromeProcesses() {
  if (process.platform === 'win32') {
    try {
      adicionarLog('Limpando processos órfãos do Chrome/Puppeteer no Windows...');
      const cmd = `powershell -Command "Get-CimInstance Win32_Process -Filter \\"name = 'chrome.exe'\\" | Where-Object { $_.CommandLine -like '*coletamax*' -or $_.CommandLine -like '*puppeteer*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }"`;
      execSync(cmd);
      adicionarLog('Processos órfãos do Chrome limpos com sucesso.');
    } catch (err) {
      console.error('Erro ao limpar processos órfãos do Chrome:', err);
    }
  }
}

export async function inicializarWhatsApp() {
  if (global.whatsappClient) {
    // Verifica se o cliente existente está realmente funcional
    try {
      const state = await global.whatsappClient.getState();
      if (state) {
        adicionarLog('Reutilizando cliente WhatsApp existente.');
        return global.whatsappClient;
      }
    } catch (e) {
      // Cliente existe mas está num estado inconsistente — destruir e recriar
      adicionarLog('Cliente anterior em estado inconsistente. Destruindo para recriar...');
      try {
        await global.whatsappClient.destroy();
      } catch (destroyErr) {
        // Ignora erro na destruição
      }
      global.whatsappClient = undefined;
    }
  }

  // Limpa processos órfãos que possam estar travando arquivos de sessão
  killZombieChromeProcesses();

  adicionarLog('Iniciando nova instância do WhatsApp Web...');
  global.whatsappState!.status = 'conectando';
  global.whatsappState!.erro = null;

  try {
    const client = new Client({
      authStrategy: new LocalAuth({ clientId: 'coletamax' }),
      puppeteer: {
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu'
        ]
      }
    });

    client.on('qr', async (qr) => {
      try {
        // Gera o QR Code localmente como Data URI base64 (PNG) com margem branca ampla
        const qrDataUri = await QRCode.toDataURL(qr, {
          width: 400,
          margin: 6,
          color: {
            dark: '#000000',
            light: '#ffffff'
          },
          errorCorrectionLevel: 'H'
        });
        
        global.whatsappState!.qrCode = qrDataUri;
        // Mantém status como 'conectando' enquanto aguarda escaneamento
        global.whatsappState!.status = 'conectando';
        global.whatsappState!.conectado = false;
        adicionarLog('QR Code gerado localmente com sucesso. Pronto para ser escaneado.');
      } catch (qrError) {
        console.error('Erro ao gerar QR Code localmente:', qrError);
        adicionarLog(`Falha ao gerar QR Code: ${qrError}`);
        global.whatsappState!.status = 'erro';
        global.whatsappState!.erro = 'Falha ao gerar QR Code.';
        global.whatsappState!.conectado = false;
      }
    });

    client.on('authenticated', () => {
      global.whatsappState!.status = 'autenticando';
      adicionarLog('Sessão restaurada! Sincronizando dados com o WhatsApp...');
    });

    client.on('ready', async () => {
      global.whatsappState!.status = 'conectado';
      global.whatsappState!.conectado = true;
      global.whatsappState!.qrCode = null;
      global.whatsappState!.erro = null;
      
      const info = client.info;
      global.whatsappState!.dispositivo = {
        numero: info.wid.user,
        nome: info.pushname || 'ColetaMax Corporativo',
        bateria: 100,
        sinal: 'excelente',
        operadora: 'WhatsApp Web',
        conectadoEm: new Date().toISOString(),
      };

      adicionarLog(`Cliente conectado com sucesso! Aparelho: ${info.pushname || 'Desconhecido'} (${info.wid.user})`);
    });

    client.on('auth_failure', (msg) => {
      global.whatsappState!.status = 'desconectado';
      global.whatsappState!.conectado = false;
      global.whatsappState!.qrCode = null;
      global.whatsappState!.erro = `Falha na autenticação: ${msg}`;
      adicionarLog(`Erro de Autenticação: ${msg}`);
      // Se falhou a autenticação com LocalAuth, o diretório pode estar corrompido,
      // mas o logout já limpa em caso de erro, ou podemos forçar o destroy
      global.whatsappClient = undefined;
    });

    client.on('disconnected', (reason) => {
      global.whatsappState!.status = 'desconectado';
      global.whatsappState!.conectado = false;
      global.whatsappState!.qrCode = null;
      global.whatsappState!.dispositivo.conectadoEm = null;
      adicionarLog(`Desconectado do WhatsApp. Motivo: ${reason}`);
      global.whatsappClient = undefined;
    });

    const handleNewMessage = async (msg: any) => {
      try {
        const messageId = msg.id?._serialized;
        if (messageId) {
          // Se a mensagem já foi processada nesta sessão por qualquer hot-reload ou evento duplicado, ignora!
          if (global.processedWhatsAppMessageIds!.has(messageId)) {
            return;
          }
          
          global.processedWhatsAppMessageIds!.add(messageId);
          
          // Limita o tamanho do cache em RAM a 500 IDs para evitar vazamento de memória
          if (global.processedWhatsAppMessageIds!.size > 500) {
            const firstKey = global.processedWhatsAppMessageIds!.values().next().value;
            if (firstKey) {
              global.processedWhatsAppMessageIds!.delete(firstKey);
            }
          }
        }

        const contact = await msg.getContact();
        const evento = {
          id: msg.id._serialized,
          timestamp: msg.timestamp,
          body: msg.hasMedia ? (msg.caption || '') : msg.body,
          fromMe: msg.fromMe,
          hasMedia: msg.hasMedia,
          type: msg.type,
          from: msg.from,
          to: msg.to,
          chatId: msg.id.remote,
          senderName: contact.name || contact.pushname || contact.number,
          numero: contact.number
        };
        global.whatsappState!.eventosRecentes.push(evento);
        // Limita a fila a 200 eventos na memória
        if (global.whatsappState!.eventosRecentes.length > 200) {
          global.whatsappState!.eventosRecentes.shift();
        }

        // Criar notificação para ADMIN caso não seja enviada por nós
        if (!msg.fromMe && !msg.id?.fromMe && !msg.isStatus && msg.from !== msg.to) {
          const nomeRemetente = contact.name || contact.pushname || contact.number;
          const msgTexto = `${nomeRemetente}: ${msg.hasMedia ? '[Mídia]' : msg.body.substring(0, 50)}${msg.body.length > 50 ? '...' : ''}`;
          
          // De-duplicação no banco de dados: evita criar notificações idênticas nos últimos 10 segundos
          const dezSegundosAtras = new Date(Date.now() - 10000);
          const existeDuplicada = await prisma.notification.findFirst({
            where: {
              titulo: 'Nova Mensagem WhatsApp',
              mensagem: msgTexto,
              tipo: 'WHATSAPP',
              criadoEm: {
                gte: dezSegundosAtras
              }
            }
          });

          if (!existeDuplicada) {
            await prisma.notification.create({
              data: {
                titulo: 'Nova Mensagem WhatsApp',
                mensagem: msgTexto,
                tipo: 'WHATSAPP',
                link: '/whatsapp'
              }
            });
          }
        }
      } catch (err) {
        console.error('Erro ao processar nova mensagem em tempo real', err);
      }
    };

    // Usamos apenas o message_create que captura mensagens enviadas e recebidas
    client.on('message_create', handleNewMessage);
    // ------------------------------------------------

    // Inicia a execução do Puppeteer em segundo plano sem bloquear o servidor
    client.initialize().catch(err => {
      console.error('Erro na inicialização do cliente:', err);
      global.whatsappState!.status = 'erro';
      global.whatsappState!.erro = String(err);
      adicionarLog(`Erro crítico de inicialização: ${err}`);
      global.whatsappClient = undefined;
    });

    global.whatsappClient = client;
    return client;
  } catch (error: any) {
    console.error('Erro ao construir cliente do WhatsApp:', error);
    global.whatsappState!.status = 'erro';
    global.whatsappState!.erro = String(error);
    adicionarLog(`Falha ao instanciar o cliente: ${error.message || error}`);
    return null;
  }
}

export async function desconectarWhatsApp() {
  if (global.whatsappClient) {
    try {
      adicionarLog('Desconectando sessão do WhatsApp e removendo credenciais...');
      try {
        await global.whatsappClient.logout();
      } catch (logoutErr) {
        console.error('Erro no logout (pode já estar deslogado):', logoutErr);
      }
      await global.whatsappClient.destroy();
    } catch (e) {
      console.error('Erro ao destruir sessão do WhatsApp:', e);
    }
    global.whatsappClient = undefined;
  }
  
  // Limpa processos órfãos que possam estar travando a pasta
  killZombieChromeProcesses();
  
  // Excluir pasta do LocalAuth fisicamente para garantir limpeza completa
  const authPath = path.join(process.cwd(), '.wwebjs_auth', 'session-coletamax');
  if (fs.existsSync(authPath)) {
    try {
      fs.rmSync(authPath, { recursive: true, force: true });
      adicionarLog('Pasta de credenciais .wwebjs_auth/session-coletamax deletada com sucesso.');
    } catch (rmErr) {
      console.error('Erro ao remover pasta de sessão física:', rmErr);
    }
  }
  
  global.whatsappState!.status = 'desconectado';
  global.whatsappState!.conectado = false;
  global.whatsappState!.qrCode = null;
  global.whatsappState!.dispositivo.conectadoEm = null;
  adicionarLog('Sessão encerrada com sucesso pelo administrador.');
}

export async function enviarMensagemReal(numero: string, texto: string) {
  let jid = numero;

  if (!numero.includes('@')) {
    let numeroFormatado = numero.replace(/\D/g, '');
    
    // Adiciona o código do país caso não esteja presente (Padrão Brasil +55)
    if (numeroFormatado.length <= 11) {
      numeroFormatado = '55' + numeroFormatado;
    }
    
    jid = `${numeroFormatado}@c.us`;

    if (global.whatsappClient && global.whatsappState?.conectado) {
      try {
        // Tenta obter o ID real do número no WhatsApp (resolve problemas do 9º dígito no Brasil)
        const numberId = await global.whatsappClient.getNumberId(numeroFormatado);
        if (numberId) {
          jid = numberId._serialized;
        } else {
          adicionarLog(`Número ${numeroFormatado} não encontrado no WhatsApp. Tentando enviar mesmo assim...`);
        }
      } catch (e) {
        console.error('Erro ao buscar ID do número', e);
      }
    }
  }

  const logId = 'msg_' + Math.random().toString(36).substring(2, 9);
  
  if (global.whatsappClient && global.whatsappState?.conectado) {
    try {
      adicionarLog(`Enviando mensagem real para ${numero} (${jid})...`);
      await global.whatsappClient.sendMessage(jid, texto);
      
      const novaMsg = {
        id: logId,
        para: numero,
        nome: 'Envio Direto',
        tipo: 'envio_sistema',
        conteudo: texto,
        status: 'ENVIADA' as const,
        data: new Date().toISOString()
      };
      
      global.whatsappState.historico = [novaMsg, ...global.whatsappState.historico.slice(0, 99)];
      adicionarLog(`Mensagem enviada com sucesso para ${numero}`);
      return { sucesso: true, mensagem: novaMsg };
    } catch (error: any) {
      console.error('Erro ao enviar mensagem via WhatsApp Real:', error);
      adicionarLog(`Erro ao enviar mensagem para ${numero}: ${error.message || error}`);
      
      const msgFalha = {
        id: logId,
        para: numero,
        nome: 'Envio Direto',
        tipo: 'envio_sistema',
        conteudo: texto,
        status: 'FALHA' as const,
        data: new Date().toISOString()
      };
      
      global.whatsappState.historico = [msgFalha, ...global.whatsappState.historico.slice(0, 99)];
      return { sucesso: false, erro: error.message || error };
    }
  } else {
    adicionarLog(`[Modo Simulado] Enviando para ${numero} (WhatsApp Real não está conectado).`);
    const novaMsg = {
      id: logId,
      para: numero,
      nome: 'Envio Simulado',
      tipo: 'envio_sistema',
      conteudo: texto,
      status: 'ENVIADA' as const,
      data: new Date().toISOString()
    };
    if (global.whatsappState) {
      global.whatsappState.historico = [novaMsg, ...global.whatsappState.historico.slice(0, 99)];
    }
    return { sucesso: true, simulado: true, mensagem: novaMsg };
  }
}

// Helper para formatar o JID do WhatsApp
function formatarJid(numero: string): string {
  let limpo = numero.replace(/\D/g, '');
  if (limpo.length <= 11) {
    limpo = '55' + limpo;
  }
  return `${limpo}@c.us`;
}

// Cache para contatos e grupos
let lastContactsCache: any[] = [];
let lastContactsFetchTime = 0;

let lastGroupsCache: any[] = [];
let lastGroupsFetchTime = 0;

// Retorna a lista de contatos salvos no WhatsApp conectado
export async function getWhatsAppContatos(): Promise<Array<{ id: string; nome: string; numero: string; isGroup: false }>> {
  if (!global.whatsappClient || !global.whatsappState?.conectado) {
    return [];
  }

  // Cache de 30 segundos
  if (Date.now() - lastContactsFetchTime < 30000 && lastContactsCache.length > 0) {
    return lastContactsCache;
  }

  try {
    const contacts = await global.whatsappClient.getContacts();
    
    const result = contacts
      .filter((c: any) => c.isMyContact && c.name && !c.isGroup && !c.isMe && c.id?.user)
      .map((c: any) => ({
        id: c.id._serialized,
        nome: c.name || c.pushname || c.id.user,
        numero: c.id.user,
        isGroup: false as const,
      }))
      .sort((a: any, b: any) => a.nome.localeCompare(b.nome));
      
    lastContactsCache = result;
    lastContactsFetchTime = Date.now();
    return result;
  } catch (error) {
    console.error('Erro ao buscar contatos do WhatsApp:', error);
    adicionarLog(`Erro ao carregar contatos: ${error}`);
    return [];
  }
}

// Retorna a lista de grupos do WhatsApp conectado
export async function getWhatsAppGrupos(): Promise<Array<{ id: string; nome: string; participantes: number; isGroup: true }>> {
  if (!global.whatsappClient || !global.whatsappState?.conectado) {
    return [];
  }

  // Cache de 30 segundos
  if (Date.now() - lastGroupsFetchTime < 30000 && lastGroupsCache.length > 0) {
    return lastGroupsCache;
  }

  try {
    const chats = await global.whatsappClient.getChats();
    
    const result = chats
      .filter((c: any) => c.isGroup)
      .map((c: any) => ({
        id: c.id._serialized,
        nome: c.name || 'Grupo sem nome',
        participantes: c.participants?.length || 0,
        isGroup: true as const,
      }))
      .sort((a: any, b: any) => a.nome.localeCompare(b.nome));
      
    lastGroupsCache = result;
    lastGroupsFetchTime = Date.now();
    return result;
  } catch (error) {
    console.error('Erro ao buscar grupos do WhatsApp:', error);
    adicionarLog(`Erro ao carregar grupos: ${error}`);
    return [];
  }
}

// Envia mídia (imagem ou áudio) via WhatsApp
export async function enviarMidiaWhatsApp(
  numero: string, 
  tipo: 'imagem' | 'audio', 
  conteudo: string, 
  legenda?: string
) {
  const logId = 'media_' + Math.random().toString(36).substring(2, 9);
  
  // Determina o JID inicial
  let jid = numero;

  if (global.whatsappClient && global.whatsappState?.conectado) {
    try {
      if (!numero.includes('@')) {
        const numeroFormatado = numero.replace(/\D/g, '');
        const numEnvio = numeroFormatado.length <= 11 ? '55' + numeroFormatado : numeroFormatado;
        const numberId = await global.whatsappClient.getNumberId(numEnvio);
        if (numberId) {
          jid = numberId._serialized;
        } else {
          adicionarLog(`Número ${numEnvio} não encontrado no WhatsApp. Tentando enviar mídia mesmo assim...`);
          jid = formatarJid(numero);
        }
      }

      // Importa MessageMedia dinamicamente (whatsapp-web.js)
      const { MessageMedia } = await import('whatsapp-web.js');
      
      // Remove o prefixo data:xxx;base64, se existir para pegar o base64 puro
      let base64Data = conteudo;
      let mimeType = tipo === 'imagem' ? 'image/png' : 'audio/ogg; codecs=opus';
      
      if (conteudo.includes(';base64,')) {
        const parts = conteudo.split(';base64,');
        if (tipo === 'imagem') {
          mimeType = parts[0].replace('data:', '');
          base64Data = parts[1];
        } else {
          // É áudio. Vamos fazer a conversão de WebM (ou outro) para OGG/Opus!
          const rawBase64 = parts[1];
          adicionarLog('Convertendo áudio WebM para OGG/Opus estaticamente...');
          try {
            base64Data = await converterWebmParaOgg(rawBase64);
            mimeType = 'audio/ogg; codecs=opus';
            adicionarLog('Áudio convertido com sucesso!');
          } catch (convErr: any) {
            console.error('Erro ao converter áudio:', convErr);
            adicionarLog(`Falha na conversão de áudio, tentando enviar original: ${convErr.message}`);
            base64Data = rawBase64;
            mimeType = 'audio/ogg; codecs=opus'; // Fallback
          }
        }
      } else if (tipo === 'audio') {
        adicionarLog('Convertendo áudio WebM bruto para OGG/Opus...');
        try {
          base64Data = await converterWebmParaOgg(conteudo);
          mimeType = 'audio/ogg; codecs=opus';
          adicionarLog('Áudio bruto convertido com sucesso!');
        } catch (convErr: any) {
          console.error('Erro ao converter áudio bruto:', convErr);
          adicionarLog(`Falha na conversão de áudio bruto: ${convErr.message}`);
          mimeType = 'audio/ogg; codecs=opus';
        }
      }

      // Para que celulares iOS e Android recebam como áudio nativo de voz gravado, o arquivo deve ter a extensão '.ogg'
      const media = new MessageMedia(mimeType, base64Data, tipo === 'imagem' ? 'imagem.png' : 'audio.ogg');
      
      const options: any = {};
      if (tipo === 'imagem' && legenda) {
        options.caption = legenda;
      }
      if (tipo === 'audio') {
        options.sendAudioAsVoice = true;
        options.ptt = true;
      }

      adicionarLog(`Enviando ${tipo} para ${numero} (${jid})...`);
      const msgEnviada = await global.whatsappClient.sendMessage(jid, media, options);

      const msgIdReal = msgEnviada?.id?._serialized || logId;

      if (msgEnviada && msgEnviada.id?._serialized) {
        if (tipo === 'audio') {
          try {
            adicionarLog('Transcodificando áudio enviado para MP3 universal...');
            const mp3Base64 = await converterOggParaMp3(base64Data);
            salvarMidiaNoCache(msgEnviada.id._serialized, 'audio/mpeg', mp3Base64);
            adicionarLog('Áudio enviado salvo no cache local como MP3!');
          } catch (transErr) {
            console.error('Erro ao transcodificar áudio enviado para MP3:', transErr);
            salvarMidiaNoCache(msgEnviada.id._serialized, mimeType, base64Data);
          }
        } else {
          salvarMidiaNoCache(msgEnviada.id._serialized, mimeType, base64Data);
        }
      }

      const novaMsg = {
        id: msgIdReal,
        para: numero,
        nome: 'Envio Mídia',
        tipo: `envio_${tipo}`,
        conteudo: tipo === 'imagem' ? `[Imagem] ${legenda || ''}` : '[Mensagem de Áudio]',
        status: 'ENVIADA' as const,
        data: new Date().toISOString()
      };

      global.whatsappState.historico = [novaMsg, ...global.whatsappState.historico.slice(0, 99)];
      adicionarLog(`${tipo === 'imagem' ? 'Imagem' : 'Áudio'} enviado com sucesso para ${numero}`);
      return { sucesso: true, mensagem: novaMsg };
    } catch (error: any) {
      console.error(`Erro ao enviar ${tipo} via WhatsApp:`, error);
      adicionarLog(`Erro ao enviar ${tipo} para ${numero}: ${error.message || error}`);
      return { sucesso: false, erro: error.message || error };
    }
  } else {
    adicionarLog(`[Modo Simulado] ${tipo} para ${numero} (WhatsApp não conectado).`);
    const novaMsg = {
      id: logId,
      para: numero,
      nome: 'Envio Simulado',
      tipo: `envio_${tipo}`,
      conteudo: tipo === 'imagem' ? `[Imagem simulada] ${legenda || ''}` : '[Áudio simulado]',
      status: 'ENVIADA' as const,
      data: new Date().toISOString()
    };
    if (global.whatsappState) {
      global.whatsappState.historico = [novaMsg, ...global.whatsappState.historico.slice(0, 99)];
    }
    return { sucesso: true, simulado: true, mensagem: novaMsg };
  }
}

// Cache local de conversas
let lastChatsCache: any[] = [];
let lastChatsFetchTime = 0;

// Retorna a lista de conversas reais (chats) do WhatsApp
export async function getWhatsAppConversas(): Promise<Array<{ id: string; nome: string; numero: string; isGroup: boolean; ultimaMensagem: string; data: string; lidas: number; profilePicUrl: string | null }>> {
  if (!global.whatsappClient || !global.whatsappState?.conectado) {
    return [];
  }

  // Se faz menos de 20000ms desde a última busca, usa o cache da RAM
  if (Date.now() - lastChatsFetchTime < 20000 && lastChatsCache.length > 0) {
    return lastChatsCache;
  }

  try {
    let rawChats: any[] = [];
    try {
      const page = (global.whatsappClient as any).pupPage;
      if (page) {
        // Otimização nível Elite: filtra e serializa apenas os 35 mais recentes diretamente no navegador,
        // reduzindo drasticamente o overhead de IPC e JSON transfer de centenas de chats
        rawChats = await page.evaluate(async () => {
          if (!(window as any).WWebJS || !(window as any).WWebJS.getChats) {
            return null;
          }
          const chats = await (window as any).WWebJS.getChats();
          if (!chats || !Array.isArray(chats)) {
            return null;
          }
          // Ordena por timestamp decrescente no navegador para pegar os mais recentes
          const sorted = chats.sort((a: any, b: any) => (b.t || b.timestamp || 0) - (a.t || a.timestamp || 0));
          return sorted.slice(0, 35).map((c: any) => ({
            id: c.id ? (c.id._serialized || c.id) : '',
            name: c.name || '',
            unreadCount: c.unreadCount || 0,
            timestamp: c.t || c.timestamp || 0,
            isGroup: c.isGroup || false,
            lastMessage: c.lastMessage ? {
              body: c.lastMessage.body || '',
              hasMedia: c.lastMessage.hasMedia || false
            } : null
          }));
        });
      }
    } catch (evalErr) {
      console.warn('Falha na otimização de busca direta de chats, usando fallback:', evalErr);
    }

    // Fallback caso a otimização falhe ou retorne nulo
    if (!rawChats || rawChats.length === 0) {
      const chats = await global.whatsappClient.getChats();
      rawChats = chats.slice(0, 35).map((c: any) => ({
        id: c.id._serialized,
        name: c.name,
        unreadCount: c.unreadCount,
        timestamp: c.timestamp,
        isGroup: c.isGroup,
        lastMessage: c.lastMessage ? {
          body: c.lastMessage.body,
          hasMedia: c.lastMessage.hasMedia
        } : null
      }));
    }

    const conversas = rawChats.map((c: any) => {
      let ultimaMsgTxt = 'Nova Mensagem';
      let msgData = c.timestamp ? new Date(c.timestamp * 1000).toISOString() : new Date().toISOString();
      let profilePicUrl = null;

      if (c.lastMessage) {
        ultimaMsgTxt = c.lastMessage.hasMedia ? '[Mídia]' : (c.lastMessage.body || ultimaMsgTxt);
      }

      return {
        id: c.id,
        nome: c.name || c.id?.split('@')[0] || 'Desconhecido',
        numero: c.id ? c.id.split('@')[0] : '',
        isGroup: c.isGroup || false,
        ultimaMensagem: ultimaMsgTxt,
        data: msgData,
        lidas: c.unreadCount || 0,
        profilePicUrl
      };
    });

    const result = conversas.sort((a: any, b: any) => new Date(b.data).getTime() - new Date(a.data).getTime());
    lastChatsCache = result;
    lastChatsFetchTime = Date.now();
    return result;
  } catch (error) {
    console.error('Erro ao buscar conversas do WhatsApp:', error);
    // @ts-ignore
    if (typeof adicionarLog === 'function') adicionarLog(`Erro ao carregar conversas: ${error}`);
    return [];
  }
}



// Retorna as mensagens de uma conversa específica
export async function getWhatsAppChatMessages(numeroOuId: string): Promise<Array<any>> {
  if (!global.whatsappClient || !global.whatsappState?.conectado) {
    return [];
  }

  try {
    const jid = numeroOuId.includes('@') ? numeroOuId : formatarJid(numeroOuId);
    const chat = await global.whatsappClient.getChatById(jid);
    if (!chat) return [];

    const msgs = await chat.fetchMessages({ limit: 50 });
    
    return msgs.map((m: any) => ({
      id: m.id._serialized,
      chatId: m.id.remote,
      body: m.hasMedia ? (m.caption || '') : m.body,
      hasMedia: m.hasMedia,
      type: m.type,
      timestamp: m.timestamp,
      fromMe: m.fromMe,
      author: m.author,
    }));
  } catch (error) {
    console.error(`Erro ao buscar mensagens da conversa ${numeroOuId}:`, error);
    return [];
  }
}

// Encontra uma mensagem pelo ID em um chat e baixa sua mídia
export async function getWhatsAppMedia(chatId: string, messageId: string): Promise<{ mimetype: string; data: string; filename?: string | null } | null> {
  // 1. Tenta recuperar do cache persistente primeiro (altamente eficiente e offline-friendly)
  const cached = obterMidiaDoCache(messageId);
  if (cached) {
    adicionarLog(`Mídia da mensagem ${messageId} recuperada com sucesso do cache local! Tipo: ${cached.mimetype}`);
    return {
      mimetype: cached.mimetype,
      data: cached.data,
      filename: cached.mimetype.includes('audio') ? 'audio.mp3' : null
    };
  }

  if (!global.whatsappClient || !global.whatsappState?.conectado) {
    adicionarLog('Impossível baixar mídia: Cliente desconectado.');
    return null;
  }
  
  try {
    adicionarLog(`Buscando conversa ${chatId} para carregar mídia da mensagem ${messageId}...`);
    const chat = await global.whatsappClient.getChatById(chatId);
    if (!chat) {
      adicionarLog(`Conversa ${chatId} não encontrada.`);
      return null;
    }
    
    // Busca as últimas 50 mensagens do chat local
    const msgs = await chat.fetchMessages({ limit: 50 });
    const msg = msgs.find((m: any) => m.id._serialized === messageId || m.id.id === messageId);
    
    if (!msg) {
      adicionarLog(`Mensagem ${messageId} não encontrada nas últimas 50 mensagens.`);
      return null;
    }
    
    if (!msg.hasMedia) {
      adicionarLog(`Mensagem ${messageId} não contém mídia.`);
      return null;
    }
    
    adicionarLog(`Baixando mídia da mensagem ${messageId}...`);
    const media = await msg.downloadMedia();
    if (!media) {
      adicionarLog(`Falha ao baixar mídia da mensagem ${messageId} (retornou nulo).`);
      return null;
    }
    
    // Se for áudio, transcodifica para MP3 antes de salvar no cache para compatibilidade máxima no navegador
    if (media.mimetype.includes('audio/')) {
      try {
        adicionarLog(`Transcodificando áudio recebido OGG/Opus para MP3 universal...`);
        const mp3Base64 = await converterOggParaMp3(media.data);
        salvarMidiaNoCache(messageId, 'audio/mpeg', mp3Base64);
        adicionarLog(`Mídia de áudio ${messageId} convertida para MP3 e salva no cache!`);
        return {
          mimetype: 'audio/mpeg',
          data: mp3Base64,
          filename: 'audio.mp3'
        };
      } catch (transcodeErr) {
        console.error('Falha ao transcodificar áudio recebido, salvando original:', transcodeErr);
        salvarMidiaNoCache(messageId, media.mimetype, media.data);
      }
    } else {
      // Salva no cache local para carregamentos futuros instantâneos (fotos, etc)
      salvarMidiaNoCache(messageId, media.mimetype, media.data);
    }
    
    adicionarLog(`Mídia da mensagem ${messageId} baixada com sucesso! Tipo: ${media.mimetype}`);
    return {
      mimetype: media.mimetype,
      data: media.data, // base64
      filename: media.filename || null
    };
  } catch (error: any) {
    console.error('Erro ao baixar mídia do WhatsApp:', error);
    adicionarLog(`Erro ao baixar mídia da mensagem ${messageId}: ${error.message || error}`);
    return null;
  }
}
