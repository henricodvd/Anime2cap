'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Home, Search, Ghost } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center text-center px-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative mb-12"
      >
        <div className="absolute inset-0 bg-brand-cherry/20 blur-3xl rounded-full" />
        <Ghost className="w-32 h-32 text-brand-cherry relative z-10 animate-bounce" />
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="font-heading text-8xl font-black text-paper mb-6 uppercase italic"
      >
        404
      </motion.h1>
      
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="text-xl text-paper/60 max-w-md mb-12 font-body font-medium"
      >
        Essa página entrou em um arco de filler eterno e não foi encontrada.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="flex flex-wrap gap-4 justify-center"
      >
        <Link 
          href="/"
          className="flex items-center gap-2 px-8 py-4 bg-brand-cherry text-white font-black rounded-full hover:saturate-150 transition-all font-heading uppercase tracking-widest text-sm italic"
        >
          <Home className="w-4 h-4" /> Voltar ao Início
        </Link>
        <Link 
          href="/"
          className="flex items-center gap-2 px-8 py-4 bg-surface text-paper border border-white/10 rounded-full hover:bg-white/10 transition-all font-heading uppercase tracking-widest text-sm italic"
        >
          <Search className="w-4 h-4" /> Buscar Anime
        </Link>
      </motion.div>
    </div>
  )
}
