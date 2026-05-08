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
}

export function TitleCard({ id, name, slug, image, status, type, index }: TitleCardProps) {
  const tTypes = useTranslations('Types')
  const tStatus = useTranslations('Status')

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
          <div className="absolute top-3 right-3">
            <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-paper/80 uppercase tracking-widest border border-white/10 font-body">
              {tTypes(type?.toLowerCase() || 'anime')}
            </span>
          </div>
        </div>

        <div className="p-5 flex-1 flex flex-col bg-surface">
          <h3 className="font-heading font-black text-base leading-tight text-paper/90 group-hover:text-brand-cherry transition-colors line-clamp-2 mb-4 tracking-tight uppercase italic">
            {name}
          </h3>
          <div className="mt-auto">
            <span className={`text-[10px] font-bold px-3 py-1 rounded-full border uppercase tracking-wider font-body ${
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

