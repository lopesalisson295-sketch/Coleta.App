'use client';

import { motion } from 'framer-motion';
import { ShieldCheck, ArrowRight, Mail } from 'lucide-react';
import Link from 'next/link';

export default function VerifySuccessPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Elementos Decorativos de Fundo Premium */}
      <div className="absolute top-0 -left-4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 -right-4 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl" />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-8 text-center shadow-xl shadow-slate-100/40 dark:shadow-none relative z-10"
      >
        {/* Ícone de Sucesso Animado */}
        <div className="relative mx-auto w-24 h-24 mb-6">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.2 }}
            className="w-full h-full rounded-3xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/20"
          >
            <ShieldCheck className="w-12 h-12 text-white" />
          </motion.div>
          {/* Ondas pulsantes de fundo */}
          <span className="absolute -inset-2 rounded-3xl bg-emerald-500/10 animate-ping -z-10" />
        </div>

        {/* Textos */}
        <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight mb-3">
          E-mail Confirmado!
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-6 font-medium">
          Sua conta no <strong className="text-slate-800 dark:text-white font-bold">ColetaMax</strong> foi verificada e ativada com sucesso.
        </p>

        {/* Caixa Informativa sobre e-mail de Boas-Vindas */}
        <div className="bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 rounded-2xl p-4 flex gap-3 text-left mb-8">
          <Mail className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-bold text-emerald-800 dark:text-emerald-300">Instruções enviadas!</p>
            <p className="text-[11px] text-emerald-600/90 dark:text-emerald-400/90 mt-0.5 leading-relaxed font-medium">
              Enviamos um e-mail operacional de boas-vindas com as diretrizes do seu onboarding e próximos passos.
            </p>
          </div>
        </div>

        {/* Botão de Ação CTA */}
        <Link href="/auth/login" className="w-full">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold text-sm shadow-md shadow-emerald-500/10 hover:shadow-lg hover:shadow-emerald-500/20 transition-all flex items-center justify-center gap-2"
          >
            Acessar Minha Conta
            <ArrowRight className="w-4 h-4" />
          </motion.button>
        </Link>
      </motion.div>
    </div>
  );
}
