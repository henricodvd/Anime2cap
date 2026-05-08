'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { CheckCircle2, AlertCircle } from 'lucide-react'
import { useTranslations } from 'next-intl'

interface Mapping {
  id: string
  episode: number
  chapter: number
  isFiller: boolean
  isCanon: boolean
  sourceType: string
}

interface EpisodeListProps {
  titleId: number
}

export function EpisodeList({ titleId }: EpisodeListProps) {
  const t = useTranslations('EpisodeList')
  const tConverter = useTranslations('Converter')
  const [mappings, setMappings] = useState<Mapping[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchMappings = async () => {
      try {
        const res = await fetch(`/api/title/${titleId}/mappings`)
        if (res.ok) {
          const data = await res.json()
          setMappings(data.mappings || [])
        }
      } catch (e) {
        console.error(e)
      } finally {
        setIsLoading(false)
      }
    }
    fetchMappings()
  }, [titleId])

  if (isLoading) {
    return (
      <div className="w-full bg-surface rounded-2xl overflow-hidden border border-white/5 shadow-xl animate-pulse">
        <div className="p-8 space-y-4">
          <div className="h-4 bg-white/5 rounded w-1/4" />
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex justify-between items-center py-4 border-b border-white/[0.02]">
                <div className="h-4 bg-white/5 rounded w-1/3" />
                <div className="h-3 bg-white/5 rounded w-1/6" />
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (mappings.filter(m => m.isFiller).length === 0) {
    return (
        <div className="bg-surface p-8 rounded-2xl text-center text-paper/40 border border-dashed border-white/10 font-body">
          {t('noFillers')}
        </div>
    )
  }

  return (
    <div className="w-full bg-surface rounded-2xl overflow-hidden border border-white/5 shadow-xl">
      <div className="overflow-x-auto" aria-label="Episodes table container">
        <table className="w-full text-sm text-left" role="grid" aria-label="List of filler episodes">
          <thead className="text-[10px] uppercase bg-white/[0.01] text-paper/30 font-bold tracking-widest border-b border-white/5 font-heading italic">
            <tr>
              <th scope="col" className="px-6 py-5">{t('tableEp')}</th>
              <th scope="col" className="px-6 py-5 text-center">{t('tableCap')}</th>
              <th scope="col" className="px-6 py-5 text-right">{t('tableSource')}</th>
            </tr>
          </thead>
          <tbody className="font-body">
            {mappings
              .filter(m => m.isFiller)
              .map((mapping, idx) => (
              <motion.tr 
                key={mapping.id}
                role="row"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: Math.min(idx * 0.02, 0.5) }}
                className="border-b border-white/[0.02] hover:bg-white/[0.01] transition-colors group"
              >
                <td className="px-6 py-4 font-black text-paper/90 font-heading italic" role="gridcell">EP {mapping.episode}</td>
                <td className="px-6 py-4 text-center font-bold text-brand-cherry/80" role="gridcell">
                  {mapping.chapter ? `CAP ${mapping.chapter}` : '—'}
                </td>
                <td className="px-6 py-4 text-right text-paper/20 group-hover:text-paper/40 transition-colors text-[10px] uppercase tracking-tighter" role="gridcell">
                  {mapping.sourceType.replace('_', ' ')}
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

