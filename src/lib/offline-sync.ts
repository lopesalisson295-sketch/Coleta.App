import localforage from 'localforage';

localforage.config({
  name: 'ColetaApp',
  storeName: 'offline_queue'
});

export type OfflineAction = {
  id: string;
  url: string;
  method: string;
  body: any;
  timestamp: number;
};

export async function addOfflineAction(action: Omit<OfflineAction, 'id' | 'timestamp'>) {
  const id = Math.random().toString(36).substring(2, 9);
  const fullAction: OfflineAction = {
    ...action,
    id,
    timestamp: Date.now(),
  };
  
  const currentQueue: OfflineAction[] = await localforage.getItem('sync_queue') || [];
  currentQueue.push(fullAction);
  await localforage.setItem('sync_queue', currentQueue);
  return id;
}

export async function getOfflineQueue(): Promise<OfflineAction[]> {
  return await localforage.getItem('sync_queue') || [];
}

export async function clearOfflineQueue() {
  await localforage.removeItem('sync_queue');
}

export async function syncOfflineQueue() {
  if (typeof window === 'undefined' || !navigator.onLine) return;

  const queue = await getOfflineQueue();
  if (queue.length === 0) return;

  console.log(`[Offline Sync] Iniciando sincronização de ${queue.length} ações...`);
  
  const failedActions: OfflineAction[] = [];

  for (const action of queue) {
    try {
      const res = await fetch(action.url, {
        method: action.method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(action.body),
      });

      if (!res.ok) {
        throw new Error(`Falha ao sincronizar: ${res.statusText}`);
      }
    } catch (error) {
      console.error('[Offline Sync] Erro na ação', action.id, error);
      failedActions.push(action);
    }
  }

  // Atualiza a fila apenas com as que falharam
  await localforage.setItem('sync_queue', failedActions);
  
  if (failedActions.length === 0) {
    console.log('[Offline Sync] Sincronização concluída com sucesso!');
  } else {
    console.log(`[Offline Sync] ${failedActions.length} ações falharam e continuarão na fila.`);
  }
}
