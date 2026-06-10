'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { useTranslations } from 'next-intl'

interface RelatedEntry {
  mal_id: number
  type: string
  name: string
  url: string
}

interface RelationGroup {
  relation: string
  entry: RelatedEntry[]
}

interface RelatedAnimeProps {
  relations: RelationGroup[] | null
  locale?: string
}

// Localized relation labels
const relationLabels: Record<string, { en: string, pt: string, ja: string }> = {
  prequel: { en: 'Prequel', pt: 'Prequência', ja: '前日譚' },
  sequel: { en: 'Sequel', pt: 'Sequência', ja: '続編' },
  side_story: { en: 'Side Story', pt: 'História Paralela', ja: 'サイドストーリー' },
  spin_off: { en: 'Spin-off', pt: 'Derivado', ja: 'スピンオフ' },
  adaptation: { en: 'Adaptation', pt: 'Adaptação', ja: '適応' },
  summary: { en: 'Summary', pt: 'Resumo', ja: 'まとめ' },
  alternative_version: { en: 'Alternative Version', pt: 'Versão Alternativa', ja: '代替版' },
  alternative_setting: { en: 'Alternative Setting', pt: 'Cenário Alternativo', ja: '別設定' },
  other: { en: 'Related', pt: 'Relacionado', ja: '関連' },
}

function getRelationLabel(relation: string, locale: string): string {
  const normalizedKey = relation.toLowerCase().replace(/\s+/g, '_')
  const labels = relationLabels[normalizedKey]
  if (!labels) return relation
  return labels[locale as keyof typeof labels] || labels.en
}

export function RelatedAnime({ relations, locale = 'pt' }: RelatedAnimeProps) {
  const t = useTranslations('TitlePage')

  if (!relations || relations.length === 0) return null

  // Filter out less interesting relations (like music, commercials, character)
  const allowedRelations = [
    'prequel',
    'sequel',
    'side_story',
    'spin_off',
    'adaptation',
    'summary',
    'alternative_version',
    'alternative_setting',
    'other'
  ]

  const filteredRelations = relations
    .map(g => ({
      ...g,
      normalizedRelation: g.relation.toLowerCase().replace(/\s+/g, '_')
    }))
    .filter(g => allowedRelations.includes(g.normalizedRelation) && g.entry.length > 0)

  if (filteredRelations.length === 0) return null

  return (
    <section className="mt-16 select-none" aria-labelledby="related-heading">
      <div className="flex items-center gap-6 mb-8">
        <h2 id="related-heading" className="text-xl sm:text-3xl font-black text-paper font-heading tracking-tight uppercase italic shrink-0">
          {t('relatedTitle') || 'Relacionados'}
        </h2>
        <div className="h-px w-full bg-gradient-to-r from-white/10 to-transparent" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {filteredRelations.map((group, idx) => (
          <motion.div
            key={group.relation}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: idx * 0.05 }}
            className="bg-surface/40 backdrop-blur-md rounded-2xl p-5 border border-white/5 shadow-lg flex flex-col hover:border-white/10 transition-all duration-300"
          >
            <span className="text-[10px] font-black uppercase tracking-widest text-brand-cherry mb-3 block font-body">
              {getRelationLabel(group.relation, locale)}
            </span>
            <div className="flex flex-wrap gap-2 mt-auto">
              {group.entry.map(entry => {
                // Determine destination URL
                let destination = '#'
                if (entry.type === 'anime') {
                  const malId = entry.url?.match(/\/anime\/(\d+)/)?.[1]
                  if (malId) {
                    // Slug format: malId-slugified-name
                    const cleanName = entry.name
                      .toLowerCase()
                      .replace(/\s+/g, '-')
                      .replace(/[^a-z0-9-]/g, '')
                      .replace(/-+/g, '-')
                    destination = `/title/${malId}-${cleanName}`
                  }
                } else if (entry.type === 'manga') {
                  // Direct to manga search or Jikan link
                  destination = entry.url || '#'
                }

                const isExternal = destination.startsWith('http')

                return (
                  <motion.div
                    key={entry.mal_id}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    <Link
                      href={destination}
                      target={isExternal ? '_blank' : undefined}
                      rel={isExternal ? 'noopener noreferrer' : undefined}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 rounded-xl text-xs text-paper/60 hover:text-paper transition-all font-body duration-200 select-text"
                    >
                      <span className="line-clamp-1">{entry.name}</span>
                      {entry.type === 'manga' && (
                        <span className="px-1 py-0.2 bg-canon/10 text-canon text-[8px] rounded uppercase font-bold tracking-wider shrink-0 font-body">
                          manga
                        </span>
                      )}
                    </Link>
                  </motion.div>
                )
              })}
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  )
}
