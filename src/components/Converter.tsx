'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRightLeft, Loader2, Info } from 'lucide-react'
import { useTranslations } from 'next-intl'

interface ConverterProps {
  titleId: number
}

interface ConversionResult {
  type: 'ep' | 'cap'
  value: number
  isFiller: boolean
  isCanon: boolean
  sourceType: string
}

/**
 * Returns a user-friendly message when chapter data is unavailable,
 * contextual to the anime's source material type.
 */
function getNoChapterMessage(sourceType: string, t: (key: string) => string): string {
  switch (sourceType) {
    case 'game':
    case 'original':
      return t('noChapterOriginal')
    case 'light_novel':
    case 'novel':
    case 'web_novel':
      return t('noChapterNovel')
    default:
      return t('noChapterUnavailable')
  }
}

/**
 * Formats sourceType enum values for display.
 */
function formatSourceType(sourceType: string, tTitle: (key: string) => string): string {
  const map: Record<string, string> = {
    manga: 'Manga',
    light_novel: 'Light Novel',
    original: tTitle('originalWork'),
    game: 'Game',
    visual_novel: 'Visual Novel',
    novel: 'Novel',
    web_manga: 'Web Manga',
    web_novel: 'Web Novel',
    other: 'Other',
    unknown: 'Unknown',
  }
  return map[sourceType] || sourceType.replace('_', ' ')
}

export function Converter({ titleId }: ConverterProps) {
  const t = useTranslations('Converter')
  const tTitle = useTranslations('TitlePage')
  const [direction, setDirection] = useState<'ep_to_cap' | 'cap_to_ep'>('ep_to_cap')
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<ConversionResult | null>(null)
  const [error, setError] = useState('')

  const handleConvert = async () => {
    if (!inputValue || isNaN(Number(inputValue))) return

    setIsLoading(true)
    setError('')
    setResult(null)

    const fromType = direction === 'ep_to_cap' ? 'ep' : 'cap'
    
    try {
      const res = await fetch(`/api/convert?type=${fromType}&value=${inputValue}&title_id=${titleId}`)
      const data = await res.json()

      if (!res.ok) {
        if (data.error === 'ExceededMax' && data.maxAvailable) {
          throw new Error(`exceeded_${data.maxAvailable}`)
        }
        throw new Error(data.error || 'Conversion failed')
      }

      setResult(data.converted)
    } catch (err: any) {
      if (err.message && err.message.startsWith('exceeded_')) {
        const max = err.message.split('_')[1]
        if (direction === 'ep_to_cap') {
          setError(t('errorExceededMaxEp', { max }))
        } else {
          setError(t('errorExceededMaxCap', { max }))
        }
      } else {
        setError(t('errorNotFound'))
      }
    } finally {
      setIsLoading(false)
    }
  }

  const swapDirection = () => {
    setDirection(prev => prev === 'ep_to_cap' ? 'cap_to_ep' : 'ep_to_cap')
    setInputValue('')
    setResult(null)
    setError('')
  }

  return (
    <div className="bg-surface rounded-3xl p-6 sm:p-8 w-full max-w-xl mx-auto relative overflow-hidden border border-white/5" role="region" aria-label="Episode Converter">
      <div className="absolute -top-24 -right-24 w-48 h-48 bg-brand-cherry/5 rounded-full blur-3xl pointer-events-none" />

      <h2 className="text-xl sm:text-2xl font-black mb-6 sm:mb-8 flex items-center gap-2 font-heading tracking-tight uppercase italic font-black">
        <ArrowRightLeft className="w-5 h-5 sm:w-6 sm:h-6 text-brand-cherry" />
        {t('title')}
      </h2>

      <div className="flex flex-col sm:flex-row items-center gap-4 mb-6 sm:mb-8">
        <div className="flex-1 w-full relative">
          <label htmlFor="convert-input" className="block text-[10px] uppercase tracking-widest text-paper/40 font-bold mb-3 ml-1 font-body">
            {direction === 'ep_to_cap' ? t('epLabel') : t('capLabel')}
          </label>
          <input
            id="convert-input"
            type="number"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleConvert()}
            placeholder={t('placeholder')}
            aria-label={`Enter ${direction === 'ep_to_cap' ? 'episode' : 'chapter'} number`}
            className="w-full bg-night border border-white/5 rounded-2xl py-4 sm:py-5 px-4 text-2xl sm:text-3xl font-black text-paper placeholder-white/5 focus:outline-none focus:border-brand-cherry/40 focus:ring-1 focus:ring-brand-cherry/40 transition-all text-center font-heading"
          />
        </div>

        <button 
          onClick={swapDirection}
          className="p-3 sm:p-4 rounded-2xl bg-white/5 hover:bg-brand-cherry/10 border border-white/5 text-paper/40 hover:text-brand-cherry transition-all hover:scale-110 active:scale-95 z-10"
          title={t('swapTitle')}
          aria-label="Swap conversion direction"
        >
          <ArrowRightLeft className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>

        <div className="flex-1 w-full relative">
          <label className="block text-[10px] uppercase tracking-widest text-paper/40 font-bold mb-3 ml-1 text-center sm:text-left font-body">
            {direction === 'ep_to_cap' ? t('capLabel') : t('epLabel')}
          </label>
          <div 
            className="w-full bg-night border border-white/5 rounded-2xl py-4 sm:py-5 px-4 text-2xl sm:text-3xl font-black text-paper/10 flex items-center justify-center min-h-[72px] sm:min-h-[82px] font-heading overflow-hidden relative"
            aria-live="polite"
            aria-atomic="true"
          >
            {isLoading ? (
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer" style={{ backgroundSize: '200% 100%' }} />
            ) : result ? (
              <motion.span 
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`${result.value ? 'text-paper text-3xl sm:text-4xl' : 'text-paper/40 text-xs sm:text-sm'}`}
              >
                {result.value || getNoChapterMessage(result.sourceType, t)}
              </motion.span>
            ) : (
              '?'
            )}
          </div>
        </div>
      </div>

      <button
        onClick={handleConvert}
        disabled={isLoading || !inputValue}
        className="w-full py-4 sm:py-5 bg-brand-cherry hover:saturate-150 text-white font-black rounded-2xl shadow-[0_10px_30px_-10px_rgba(190,50,82,0.4)] transition-all disabled:opacity-30 disabled:cursor-not-allowed transform active:scale-[0.98] font-heading uppercase tracking-widest text-xs sm:text-sm italic"
        aria-label={isLoading ? 'Converting' : 'Convert now'}
      >
        {isLoading ? t('converting') : t('convertBtn')}
      </button>

      {/* Result Status Badges & Errors */}
      <div className="min-h-[50px] mt-6 sm:mt-8 flex justify-center items-center" aria-live="polite">
        <AnimatePresence mode="wait">
          {error && (
            <motion.p 
              key="error"
              role="alert"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-filler text-xs sm:text-sm font-bold flex items-center gap-2 bg-filler/10 border border-filler/20 px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl font-body"
            >
              <Info className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> {error}
            </motion.p>
          )}

          {result && (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex gap-2 sm:gap-3 flex-wrap justify-center font-bold"
            >
              <span className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-[9px] sm:text-[10px] uppercase tracking-widest border font-body ${
                result.isFiller 
                  ? 'bg-filler/10 text-filler border-filler/20' 
                  : 'bg-canon/10 text-canon border-canon/20'
              }`}>
                {result.isFiller ? t('fillerLabel') : t('canonLabel')}
              </span>
              <span className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-[9px] sm:text-[10px] uppercase tracking-widest bg-white/5 text-paper/40 border border-white/10 font-body">
                {t('sourceLabel')}: {formatSourceType(result.sourceType, tTitle)}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

    </div>
  )
}

