"use client"
import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { useOnboardingStore } from "@/stores/useOnboardingStore"
import { Truck, MapPin, CheckCircle } from "lucide-react"

const slides = [
  {
    id: 0,
    title: "Bem-vindo ao ColetaMax",
    description: "A melhor plataforma para gerenciar suas coletas e entregas de forma rápida e eficiente.",
    icon: Truck,
    color: "text-blue-500"
  },
  {
    id: 1,
    title: "Navegação Simplificada",
    description: "Visualize suas rotas no mapa, confirme endereços e envie comprovantes com um único toque.",
    icon: MapPin,
    color: "text-accent"
  },
  {
    id: 2,
    title: "Tudo Pronto!",
    description: "Você está preparado para iniciar suas atividades. Vamos começar?",
    icon: CheckCircle,
    color: "text-warning"
  }
]

export function OnboardingCarousel() {
  const [current, setCurrent] = useState(0)
  const router = useRouter()
  const { setHasSeenOnboarding } = useOnboardingStore()

  const handleNext = () => {
    if (current === slides.length - 1) {
      setHasSeenOnboarding(true)
      router.push("/auth/login")
    } else {
      setCurrent((prev) => prev + 1)
    }
  }

  const handleSkip = () => {
    setHasSeenOnboarding(true)
    router.push("/auth/login")
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-background p-6">
      <div className="absolute right-6 top-6">
        <Button variant="ghost" onClick={handleSkip} className="text-muted-foreground">
          Pular
        </Button>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center w-full max-w-md">
        <AnimatePresence mode="wait">
          <motion.div
            key={current}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col items-center text-center space-y-6"
          >
            <div className="flex h-32 w-32 items-center justify-center rounded-full bg-secondary">
              {(() => {
                const Icon = slides[current].icon
                return <Icon className={`h-16 w-16 ${slides[current].color}`} />
              })()}
            </div>
            
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              {slides[current].title}
            </h1>
            <p className="text-muted-foreground text-lg px-4">
              {slides[current].description}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="w-full max-w-md pb-12 flex flex-col items-center gap-8">
        <div className="flex gap-2">
          {slides.map((_, idx) => (
            <div
              key={idx}
              className={`h-2 rounded-full transition-all duration-300 ${
                idx === current ? "w-8 bg-accent" : "w-2 bg-border"
              }`}
            />
          ))}
        </div>

        <Button className="w-full h-12 text-lg font-semibold" onClick={handleNext}>
          {current === slides.length - 1 ? "Começar Agora" : "Próximo"}
        </Button>
      </div>
    </div>
  )
}
