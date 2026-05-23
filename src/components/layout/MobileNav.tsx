"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { LayoutDashboard, Truck, Package, MessageSquare, Settings, Map } from "lucide-react"
import { useSession } from "next-auth/react"

export function MobileNav() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const role = session?.user?.role

  if (!role) return null

  const routes = [
    {
      href: "/",
      label: "Início",
      icon: LayoutDashboard,
      active: pathname === "/",
      roles: ["ADMIN"]
    },
    {
      href: "/mapa",
      label: "Mapa",
      icon: Map,
      active: pathname.startsWith("/mapa"),
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
      label: "Config.",
      icon: Settings,
      active: pathname.startsWith("/configuracoes"),
      roles: ["ADMIN", "MOTORISTA", "AJUDANTE"]
    }
  ]

  const filteredRoutes = routes.filter(route => route.roles.includes(role as string))

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 flex h-16 border-t bg-card md:hidden pb-safe overflow-x-auto scrollbar-none">
      <div className="flex w-full items-center justify-between px-2 shrink-0">
        {filteredRoutes.map((route) => (
          <Link
            key={route.href}
            href={route.href}
            className={cn(
              "flex flex-col items-center justify-center gap-1 text-muted-foreground transition-colors hover:text-foreground px-3 min-w-[64px]",
              route.active && "text-primary font-semibold"
            )}
          >
            <route.icon className={cn("h-5 w-5", route.active && "text-accent")} />
            <span className="text-[9px] whitespace-nowrap">{route.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  )
}
