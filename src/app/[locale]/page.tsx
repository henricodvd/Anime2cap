'use client'

import { useState, useEffect, Suspense, useCallback } from 'react'
import { SearchBar } from '@/components/SearchBar'
import { TitleCard } from '@/components/TitleCard'
import { motion } from 'framer-motion'
import { useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'

interface SearchResult {
  id: number
  name: string
  slug: string
  image?: string
  status: string
  type: string
}

function HomeContent() {
  const t = useTranslations('Home')
  const [results, setResults] = useState<SearchResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [error, setError] = useState('')
  const searchParams = useSearchParams()
  const q = searchParams.get('q')

  const handleSearch = useCallback(async (query: string) => {
    if (!query) {
      setResults([])
      setHasSearched(false)
      return
    }
    setIsLoading(true)
    setError('')
    setHasSearched(true)
    
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`)
      if (!res.ok) throw new Error('Search failed')
      
      const data = await res.json()
      setResults(data.results || [])
    } catch (err) {
      setError(t('errorSearch') || 'Falha ao buscar resultados. Tente novamente.')
      setResults([])
    } finally {
      setIsLoading(false)
    }
  }, [t])

  useEffect(() => {
    if (q) {
      handleSearch(q)
    }
  }, [q, handleSearch])

  return (
    <main className="min-h-screen bg-night" role="main">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-32 sm:pt-40 pb-12 sm:pb-20 px-6 flex flex-col items-center justify-center text-center">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[280px] h-[280px] md:w-[620px] md:h-[620px] bg-hero-glow rounded-full blur-[40px] md:blur-[90px] opacity-35 md:opacity-60 pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="px-5 py-2 rounded-full border border-brand-cherry/10 bg-brand-cherry/5 backdrop-blur-md text-[10px] font-bold uppercase tracking-[0.3em] text-brand-cherry mb-10 z-10 font-body italic"
        >
          {t('tagline')}
        </motion.div>
        
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="font-heading text-4xl md:text-8xl font-black tracking-tighter mb-8 text-balance z-10 leading-[0.9] uppercase italic"
        >
          {t.rich('title', {
            br: () => <br/>,
            span: (chunks) => (
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-cherry to-brand-cherry/40">
                {chunks}
              </span>
            )
          })}
        </motion.h1>
        
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-lg md:text-2xl text-paper/70 max-w-2xl mb-12 text-balance z-10 leading-relaxed font-body font-medium"
        >
          {t.rich('description', {
            canon: (chunks) => <span className="text-canon font-bold">{chunks}</span>,
            filler: (chunks) => <span className="text-filler font-bold text-[#E8A020]">{chunks}</span>
          })}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.25 }}
          className="z-10 mb-16 flex flex-wrap items-center justify-center gap-3 text-[10px] font-black uppercase tracking-widest font-body"
        >
          <span className="inline-flex items-center rounded-full border border-canon/10 bg-canon/5 px-6 py-2.5 text-canon/70 backdrop-blur-md">
            {t('features.mapping')}
          </span>
          <span className="inline-flex items-center rounded-full border border-filler/10 bg-filler/5 px-6 py-2.5 text-filler/70 backdrop-blur-md">
            {t('features.filler')}
          </span>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="w-full z-10 max-w-2xl mx-auto"
          role="search"
          aria-label="Search anime"
        >
          <SearchBar 
            onSearch={handleSearch} 
            isLoading={isLoading} 
            placeholder={t('searchPlaceholder')}
          />
        </motion.div>
      </section>

      {/* Results Section */}
      <section className="max-w-6xl mx-auto px-6 pb-24">
        {error && (
          <div className="text-center text-filler p-8 bg-surface rounded-3xl max-w-md mx-auto border border-white/5 shadow-2xl">
            <p className="font-heading font-black uppercase italic mb-2">Ops! Algo deu errado.</p>
            <p className="text-sm opacity-80 font-body">{error}</p>
          </div>
        )}

        {hasSearched && !isLoading && !error && results.length === 0 && (
          <div className="text-center text-paper/40 py-16 animate-fade-in font-body">
            {t('noResults')}
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {results.map((anime, idx) => (
            <TitleCard key={anime.id} index={idx} {...anime} />
          ))}
        </div>
      </section>
    </main>
  )
}

export default function Home() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="w-12 h-12 rounded-full border-2 border-brand-cherry/20 border-t-brand-cherry animate-spin" /></div>}>
      <HomeContent />
    </Suspense>
  )
}

