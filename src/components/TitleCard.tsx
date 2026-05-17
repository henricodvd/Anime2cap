'use client'

import { motion } from 'framer-motion'
import { Link } from '@/i18n/routing'
import { useTranslations } from 'next-intl'

interface TitleCardProps {
  id: number
  name: string
  slug: string
  image?: string
  status: string
  type: string
  index: number
  hasMappings?: boolean
}

export function TitleCard({ id, name, slug, image, status, type, index, hasMappings }: TitleCardProps) {
  const tTypes = useTranslations('Types')
  const tStatus = useTranslations('Status')
  const tConverter = useTranslations('Converter')

  const getStatusKey = (s: string) => {
    const low = s.toLowerCase()
    if (low.includes('finished')) return 'finished'
    if (low.includes('ongoing') || low.includes('airing')) return 'ongoing'
    return 'upcoming'
  }

  const statusKey = getStatusKey(status)

  return (
    <Link href={`/title/${slug}`}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05, duration: 0.4 }}
        className="group relative rounded-2xl overflow-hidden bg-surface border border-white/5 hover:border-brand-cherry/30 transition-all duration-500 h-full flex flex-col hover:shadow-[0_0_20px_rgba(190,50,82,0.15)]"
      >
        <div className="aspect-[3/4] relative overflow-hidden bg-night">
          {image ? (
            <img 
              src={image} 
              alt={name} 
              className="object-cover w-full h-full group-hover:scale-110 transition-transform duration-1000 ease-out"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white/5 font-heading italic text-2xl font-black">
              A2C
            </div>
          )}
          
          {/* Overlay gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-night via-night/10 to-transparent opacity-90" />
          
          {/* Top-right badge for type */}
          <div className="absolute top-2 right-2 sm:top-3 sm:right-3">
            <span className="text-[8px] sm:text-[10px] font-bold px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full bg-black/60 backdrop-blur-md text-paper/80 uppercase tracking-widest border border-white/10 font-body">
              {tTypes(type?.toLowerCase() || 'anime')}
            </span>
          </div>

          {/* Top-left badge for hasMappings */}
          {hasMappings && (
            <div className="absolute top-2 left-2 sm:top-3 sm:left-3">
              <span className="text-[7px] sm:text-[9px] font-bold px-1.5 py-0.5 sm:px-2 sm:py-0.5 rounded-full bg-canon/20 backdrop-blur-md text-canon uppercase tracking-widest border border-canon/30 font-body flex items-center gap-0.5">
                <svg className="w-2 h-2 sm:w-2.5 sm:h-2.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                {tConverter('hasMappings')}
              </span>
            </div>
          )}
        </div>

        <div className="p-3 sm:p-5 flex-1 flex flex-col bg-surface">
          <h3 className="font-heading font-black text-xs sm:text-base leading-tight text-paper/90 group-hover:text-brand-cherry transition-colors line-clamp-3 mb-1.5 sm:mb-4 tracking-tight uppercase italic min-h-[2.5rem] sm:min-h-0">
            {name}
          </h3>
          <div className="mt-auto">
            <span className={`text-[8px] sm:text-[10px] font-bold px-2 sm:px-3 py-0.5 sm:py-1 rounded-full border uppercase tracking-wider font-body ${
              statusKey === 'finished' ? 'border-canon/30 text-canon bg-canon/5' :
              statusKey === 'ongoing' ? 'border-brand-cherry/30 text-brand-cherry bg-brand-cherry/5' :
              'border-white/10 text-white/40 bg-white/5'
            }`}>
              {tStatus(statusKey)}
            </span>
          </div>
        </div>
      </motion.div>
    </Link>
  )
}

