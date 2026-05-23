"use client"
import { useToastStore } from "@/stores/useToastStore"
import { motion, AnimatePresence } from "framer-motion"
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from "lucide-react"

const icons = {
  success: <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />,
  error: <AlertCircle className="h-5 w-5 text-rose-500 shrink-0" />,
  info: <Info className="h-5 w-5 text-blue-500 shrink-0" />,
  warning: <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />,
}

const borderColors = {
  success: "border-emerald-500/20 bg-emerald-500/5 dark:bg-emerald-950/10",
  error: "border-rose-500/20 bg-rose-500/5 dark:bg-rose-950/10",
  info: "border-blue-500/20 bg-blue-500/5 dark:bg-blue-950/10",
  warning: "border-amber-500/20 bg-amber-500/5 dark:bg-amber-950/10",
}

export function ToastContainer() {
  const { toasts, removeToast } = useToastStore()

  return (
    <div className="fixed top-4 right-4 z-50 flex w-full max-w-sm flex-col gap-3 pointer-events-none px-4 sm:px-0">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, y: -10 }}
            transition={{ type: "spring", stiffness: 350, damping: 25 }}
            className={`pointer-events-auto flex items-start gap-3 rounded-xl border p-4 shadow-lg backdrop-blur-md transition-all duration-300 ${borderColors[t.type]} bg-card/95 text-foreground`}
          >
            {icons[t.type]}
            <div className="flex-1 space-y-1">
              <h4 className="text-sm font-semibold leading-none">{t.title}</h4>
              {t.description && (
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {t.description}
                </p>
              )}
            </div>
            <button
              onClick={() => removeToast(t.id)}
              className="text-muted-foreground hover:text-foreground shrink-0 rounded-lg p-0.5 transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
