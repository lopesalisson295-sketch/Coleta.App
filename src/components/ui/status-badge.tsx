'use client';

import { cn } from '@/lib/utils';

type StatusColeta = 'PENDENTE' | 'EM_ANDAMENTO' | 'COLETADA' | 'CANCELADA' | 'NAO_REALIZADA';
type StatusEntrega = 'PENDENTE' | 'EM_ANDAMENTO' | 'ENTREGUE' | 'CANCELADA' | 'NAO_REALIZADA';
type Status = StatusColeta | StatusEntrega;

const statusConfig: Record<string, { label: string; color: string }> = {
  PENDENTE: { label: 'Pendente', color: 'bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400' },
  EM_ANDAMENTO: { label: 'Em Andamento', color: 'bg-blue-500/10 text-blue-600 border-blue-500/20 dark:text-blue-400' },
  COLETADA: { label: 'Coletada', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400' },
  ENTREGUE: { label: 'Entregue', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400' },
  CANCELADA: { label: 'Cancelada', color: 'bg-rose-500/10 text-rose-600 border-rose-500/20 dark:text-rose-400' },
  NAO_REALIZADA: { label: 'Não Realizada', color: 'bg-slate-500/10 text-slate-600 border-slate-500/20 dark:text-slate-400' },
};

interface StatusBadgeProps {
  status: Status | string;
  item?: any;
  className?: string;
}

export function StatusBadge({ status, item, className }: StatusBadgeProps) {
  let config = statusConfig[status as string] || { label: status, color: 'bg-gray-200 text-gray-600' };

  if (status === 'EM_ANDAMENTO' && item?.imagemUrl) {
    if (item.observacao && item.observacao.includes('[FALHA]')) {
      config = { label: 'Aguardando Admin (Falha)', color: 'bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400' };
    } else {
      config = { label: 'Aguardando Admin (Sucesso)', color: 'bg-teal-500/10 text-teal-600 border-teal-500/20 dark:text-teal-400' };
    }
  }

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
        config.color,
        className
      )}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5 opacity-70" />
      {config.label}
    </span>
  );
}
