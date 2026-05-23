"use client"
import { useThemeStore } from "@/stores/useThemeStore"
import { Moon, Sun, Settings, LogOut, Bell, Package, Truck, MessageSquare, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { signOut, useSession } from "next-auth/react"
import Link from "next/link"
import { useState, useRef, useEffect, useCallback } from "react"
import useSWR from "swr"
import { toast } from "@/stores/useToastStore"
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const fetcher = (url: string) => fetch(url).then(res => res.json())

function NotificationBell() {
  const { data: session } = useSession()
  const [isOpen, setIsOpen] = useState(false)
  const bellRef = useRef<HTMLDivElement>(null)
  const [animateBell, setAnimateBell] = useState(false)
  const [hasInitialized, setHasInitialized] = useState(false)
  const toastedIds = useRef<Set<string>>(new Set())
  
  const { data: notificacoes, mutate } = useSWR(
    session?.user?.role === 'ADMIN' ? '/api/notificacoes' : null, 
    fetcher, 
    { refreshInterval: 10000 } // SWR de 10s para feedback em tempo real
  )

  useEffect(() => {
    if (notificacoes && notificacoes.length > 0) {
      if (!hasInitialized) {
        // Primeira carga: registra as notificações atuais como já alertadas
        // para que o usuário não seja bombardeado com bipes antigos no login/refresh
        notificacoes.forEach((n: any) => toastedIds.current.add(n.id))
        setHasInitialized(true)
        return
      }

      // Encontra apenas as notificações que ainda não foram exibidas como toast
      const newNotifications = notificacoes.filter((n: any) => !n.lida && !toastedIds.current.has(n.id))

      if (newNotifications.length > 0) {
        // Pega a mais recente para o alerta
        const latest = newNotifications[0]
        
        // Registra todas as novas no Set para não alertar novamente
        newNotifications.forEach((n: any) => toastedIds.current.add(n.id))
        
        // Dispara a animação do sino
        setAnimateBell(true)
        const timer = setTimeout(() => setAnimateBell(false), 800)

        // Toca som de notificação (Web Audio API) - Beep elegante
        try {
          const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
          if (AudioContext) {
            const ctx = new AudioContext();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = 'sine';
            osc.frequency.setValueAtTime(580, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(1160, ctx.currentTime + 0.12);
            gain.gain.setValueAtTime(0, ctx.currentTime);
            gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.18);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.18);
          }
        } catch(e) {}

        toast(latest.titulo, { 
          description: latest.mensagem, 
          type: 'info',
          duration: 5000
        })

        return () => clearTimeout(timer)
      }
    }
  }, [notificacoes, hasInitialized])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (bellRef.current && !bellRef.current.contains(event.target as Node)) setIsOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  if (session?.user?.role !== 'ADMIN') return null

  const unreadCount = notificacoes?.filter((n: any) => !n.lida).length || 0

  const handleMarkAsRead = async (id?: string) => {
    await fetch('/api/notificacoes', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(id ? { id } : {})
    })
    mutate()
  }

  const getIcon = (tipo: string) => {
    if (tipo === 'WHATSAPP') return <MessageSquare className="w-4 h-4 text-emerald-500" />
    if (tipo === 'COLETA') return <Package className="w-4 h-4 text-blue-500" />
    if (tipo === 'ENTREGA') return <Truck className="w-4 h-4 text-indigo-500" />
    return <Bell className="w-4 h-4 text-slate-500" />
  }

  return (
    <div className="relative" ref={bellRef}>
      <Button 
        variant="ghost" 
        size="icon" 
        onClick={() => setIsOpen(!isOpen)} 
        className="relative text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 transition-colors group"
      >
        <Bell className={`h-5 w-5 transition-transform duration-300 ${animateBell ? 'animate-bell-ring' : 'group-hover:animate-bell-ring'}`} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white ring-2 ring-background animate-in zoom-in duration-200">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </Button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-card border rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
            <h3 className="font-semibold text-sm">Notificações</h3>
            {unreadCount > 0 && (
              <button onClick={() => handleMarkAsRead()} className="text-[11px] text-primary hover:underline font-medium">
                Marcar todas como lidas
              </button>
            )}
          </div>
          
          <div className="max-h-[360px] overflow-y-auto">
            {!notificacoes || notificacoes.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground flex flex-col items-center gap-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-500/20" />
                <p>Nenhuma notificação por enquanto</p>
              </div>
            ) : (
              <div className="divide-y">
                {notificacoes.map((n: any) => (
                  <div key={n.id} className={`p-4 hover:bg-muted/50 transition-colors cursor-default ${!n.lida ? 'bg-primary/5 dark:bg-primary/10 border-l-4 border-primary' : 'border-l-4 border-transparent opacity-80'}`}>
                    <div className="flex gap-3">
                      <div className="shrink-0 mt-0.5">
                        <div className={`w-8 h-8 rounded-full bg-background flex items-center justify-center shadow-sm border ${!n.lida ? 'ring-2 ring-primary/20' : ''}`}>
                          {getIcon(n.tipo)}
                        </div>
                      </div>
                      <div className="flex-1 space-y-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className={`text-sm truncate leading-none ${!n.lida ? 'font-bold' : 'font-medium'}`}>{n.titulo}</p>
                          <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                            {formatDistanceToNow(new Date(n.criadoEm), { addSuffix: true, locale: ptBR })}
                          </span>
                        </div>
                        <p className={`text-xs line-clamp-2 leading-relaxed ${!n.lida ? 'text-foreground' : 'text-muted-foreground'}`}>{n.mensagem}</p>
                        <div className="flex items-center justify-between mt-2 pt-1">
                          {n.link ? (
                            <Link href={n.link} onClick={() => { handleMarkAsRead(n.id); setIsOpen(false); }} className="text-[11px] text-primary font-medium hover:underline flex items-center gap-1">
                              Visualizar
                            </Link>
                          ) : <span />}
                          {!n.lida && (
                            <button onClick={() => handleMarkAsRead(n.id)} className="text-[10px] text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:underline">
                              Marcar como lida
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export function Topbar() {
  const { theme, toggleTheme } = useThemeStore()
  const { data: session } = useSession()
  const [showDropdown, setShowDropdown] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const hasAvatar = session?.user?.hasAvatar;
  const avatarUrl = hasAvatar ? `/api/users/avatar?id=${session.user.id}&v=${session.user.avatarVersion || 0}` : null;

  // Fecha dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/80 backdrop-blur-sm px-6 shadow-sm">
      <div className="flex flex-1 items-center gap-4 md:hidden">
        <span className="font-semibold">ColetaMax</span>
      </div>
      
      <div className="flex flex-1 items-center justify-end gap-2 sm:gap-3">
        <NotificationBell />
        
        <Button variant="ghost" size="icon" onClick={toggleTheme} title={theme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}>
          {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </Button>
        
        {session?.user && (
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="flex items-center gap-2.5 rounded-full hover:bg-secondary p-1 pr-3 transition-colors"
            >
              <div className="hidden flex-col items-end sm:flex">
                <span className="text-sm font-medium leading-none">{session.user.name}</span>
                <span className="text-[10px] text-muted-foreground">
                  {session.user.role === 'ADMIN' ? 'Administrador' : session.user.role === 'MOTORISTA' ? 'Motorista' : 'Ajudante'}
                </span>
              </div>
              <div className="w-9 h-9 rounded-full overflow-hidden bg-secondary border border-primary/10 flex items-center justify-center shrink-0">
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xs font-bold text-primary">
                    {session.user.name?.charAt(0)?.toUpperCase() || 'U'}
                  </span>
                )}
              </div>
            </button>

            {/* Dropdown do perfil */}
            {showDropdown && (
              <div className="absolute right-0 mt-2 w-52 bg-card border rounded-xl shadow-xl z-50 py-1.5 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="px-4 py-3 border-b">
                  <p className="text-sm font-semibold text-foreground truncate">{session.user.name}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{session.user.email}</p>
                </div>
                <Link
                  href="/configuracoes"
                  onClick={() => setShowDropdown(false)}
                  className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                >
                  <Settings className="h-4 w-4" />
                  Configurações
                </Link>
                <button
                  onClick={() => { setShowDropdown(false); signOut({ callbackUrl: '/auth/login' }); }}
                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-rose-500 hover:bg-rose-500/10 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  Sair da Conta
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  )
}
