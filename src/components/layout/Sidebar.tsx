"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { LayoutDashboard, Truck, Package, MessageSquare, Car, LogOut, Users, Smartphone, Map, Settings } from "lucide-react"
import { useSession, signOut } from "next-auth/react"
import { useMemo } from "react"

export function Sidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()

  const role = session?.user?.role
  const hasAvatar = session?.user?.hasAvatar;
  const avatarUrl = hasAvatar ? `/api/users/avatar?id=${session.user.id}&v=${session.user.avatarVersion || 0}` : null;

  const routes = [
    {
      href: "/",
      label: "Dashboard",
      icon: LayoutDashboard,
      active: pathname === "/",
      roles: ["ADMIN"]
    },
    {
      href: "/mapa",
      label: "Mapa Operacional",
      icon: Map,
      active: pathname.startsWith("/mapa"),
      roles: ["ADMIN"]
    },
    {
      href: "/veiculos",
      label: "Veículos",
      icon: Car,
      active: pathname.startsWith("/veiculos"),
      roles: ["ADMIN"]
    },
    {
      href: "/motoristas",
      label: "Motoristas",
      icon: Users,
      active: pathname.startsWith("/motoristas"),
      roles: ["ADMIN"]
    },
    {
      href: "/ajudantes",
      label: "Ajudantes",
      icon: Users,
      active: pathname.startsWith("/ajudantes"),
      roles: ["ADMIN"]
    },
    {
      href: "/automacao",
      label: "Automação",
      icon: Smartphone,
      active: pathname.startsWith("/automacao"),
      roles: ["ADMIN"]
    },
    {
      href: "/whatsapp",
      label: "Conexão WhatsApp",
      icon: Smartphone,
      active: pathname.startsWith("/whatsapp"),
      roles: ["ADMIN"]
    },
    {
      href: "/coletas",
      label: "Coletas",
      icon: Package,
      active: pathname.startsWith("/coletas"),
      roles: ["ADMIN", "MOTORISTA", "AJUDANTE"]
    },
    {
      href: "/entregas",
      label: "Entregas",
      icon: Truck,
      active: pathname.startsWith("/entregas"),
      roles: ["ADMIN", "MOTORISTA", "AJUDANTE"]
    },
    {
      href: "/chat",
      label: "Chat",
      icon: MessageSquare,
      active: pathname.startsWith("/chat"),
      roles: ["ADMIN"]
    },
    {
      href: "/configuracoes",
      label: "Configurações",
      icon: Settings,
      active: pathname.startsWith("/configuracoes"),
      roles: ["ADMIN", "MOTORISTA", "AJUDANTE"]
    }
  ]

  const filteredRoutes = useMemo(() => {
    return routes.filter(route => route.roles.includes(role as string))
  }, [pathname, role])

  return (
    <aside className="hidden w-64 flex-col border-r bg-card md:flex">
      <div className="flex h-16 items-center border-b px-6">
        <Link href="/" className="flex items-center gap-2 font-bold text-xl text-primary">
          <Truck className="h-6 w-6 text-accent" />
          ColetaMax
        </Link>
      </div>

      <div className="flex-1 overflow-auto py-4">
        <nav className="grid items-start px-4 text-sm font-medium gap-1">
          {filteredRoutes.map((route) => (
            <Link
              key={route.href}
              href={route.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-muted-foreground transition-all hover:bg-secondary hover:text-secondary-foreground",
                route.active && "bg-secondary text-primary font-semibold"
              )}
            >
              <route.icon className="h-4 w-4" />
              {route.label}
            </Link>
          ))}
        </nav>
      </div>

      {/* Footer com dados do usuário e avatar */}
      <div className="border-t p-4">
        <Link href="/configuracoes" className="flex items-center gap-3 mb-3 px-1 rounded-lg hover:bg-secondary p-2 -m-1 transition-colors">
          <div className="w-9 h-9 rounded-full overflow-hidden bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <span className="text-xs font-bold text-primary">
                {session?.user?.name?.charAt(0)?.toUpperCase() || 'U'}
              </span>
            )}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{session?.user?.name}</p>
            <p className="text-xs text-muted-foreground">
              {role === 'ADMIN' ? 'Administrador' : role === 'MOTORISTA' ? 'Motorista' : 'Ajudante'}
            </p>
          </div>
        </Link>
        <button
          onClick={() => signOut({ callbackUrl: '/auth/login' })}
          className="flex w-full items-center gap-2 px-3 py-2 rounded-md text-sm text-muted-foreground hover:bg-rose-500/10 hover:text-rose-500 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sair
        </button>
      </div>
    </aside>
  )
}
