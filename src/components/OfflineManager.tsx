'use client';

import { useEffect, useState } from 'react';
import { syncOfflineQueue } from '@/lib/offline-sync';
import { WifiOff, RefreshCcw } from 'lucide-react';

export function OfflineManager() {
  const [isOffline, setIsOffline] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    setIsOffline(!navigator.onLine);

    const handleOnline = async () => {
      setIsOffline(false);
      setIsSyncing(true);
      await syncOfflineQueue();
      setIsSyncing(false);
    };

    const handleOffline = () => {
      setIsOffline(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOffline && !isSyncing) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-lg dark:bg-slate-100 dark:text-slate-900 transition-all">
      {isOffline ? (
        <>
          <WifiOff className="h-4 w-4 text-rose-500" />
          <span>Você está offline</span>
        </>
      ) : (
        <>
          <RefreshCcw className="h-4 w-4 animate-spin text-blue-500" />
          <span>Sincronizando dados...</span>
        </>
      )}
    </div>
  );
}
