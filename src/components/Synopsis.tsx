'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { useTranslations } from 'next-intl'

interface SynopsisProps {
  text: string
  noSynopsisText: string
}

export function Synopsis({ text, noSynopsisText }: SynopsisProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const t = useTranslations('TitlePage')

  if (!text) {
    return (
      <p className="text-paper/40 italic font-body">
        {noSynopsisText}
      </p>
    )
  }

  // Truncate at ~180 characters for mobile if not expanded
  const shouldTruncate = text.length > 180
  const displayText = !isExpanded && shouldTruncate ? `${text.slice(0, 180)}...` : text

  return (
    <div className="relative group">
      <div className="absolute -left-4 sm:-left-5 top-0 bottom-0 w-1 bg-brand-cherry/20 rounded-full group-hover:bg-brand-cherry transition-colors" />
      <div className="pl-2 sm:pl-3">
        <motion.p 
          layout
          className="text-paper/60 leading-relaxed text-base sm:text-lg font-body font-medium"
        >
          {displayText}
        </motion.p>
        
        {shouldTruncate && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="mt-2 flex items-center gap-1.5 text-xs sm:text-sm font-bold uppercase tracking-widest text-brand-cherry hover:text-brand-cherry/80 transition-colors py-1 group/btn"
          >
            {isExpanded ? (
              <>
                {t('showLess')} <ChevronUp className="w-3 h-3 sm:w-4 sm:h-4 group-hover/btn:-translate-y-0.5 transition-transform" />
              </>
            ) : (
              <>
                {t('readMore')} <ChevronDown className="w-3 h-3 sm:w-4 sm:h-4 group-hover/btn:translate-y-0.5 transition-transform" />
              </>
            )}
          </button>
        )}
      </div>
    </div>
  )
}
