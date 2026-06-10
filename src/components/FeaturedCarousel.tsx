'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { Star, Tv, Sparkles, ChevronLeft, ChevronRight } from 'lucide-react'
import { useTranslations } from 'next-intl'

interface FeaturedTitle {
  id: number
  name: string
  slug: string
  image: string | null
  score: string | null
  type: string
  episodes: number | null
  synopsis: string | null
  status: string
  topRank: number
  source: string | null
}

interface FeaturedCardProps {
  item: FeaturedTitle
  tTypes: any
  tStatus: any
  index: number
}

// Individual Card Component with subtle 3D Tilt perspective effect
function FeaturedCard({ item, tTypes, tStatus, index }: FeaturedCardProps) {
  const [tilt, setTilt] = useState({ x: 0, y: 0 })
  const cardRef = useRef<HTMLAnchorElement>(null)

  const handleMouseMove = (e: React.MouseEvent<HTMLAnchorElement>) => {
    const card = cardRef.current
    if (!card) return

    const rect = card.getBoundingClientRect()
    const x = e.clientX - rect.left 
    const y = e.clientY - rect.top  

    const centerX = rect.width / 2
    const centerY = rect.height / 2

    // Max rotation reduced to 2.0 degrees for a very subtle, high-quality premium feel
    const rotateX = ((centerY - y) / centerY) * 2.0
    const rotateY = ((x - centerX) / centerX) * 2.0

    setTilt({ x: rotateX, y: rotateY })
  }

  const handleMouseLeave = () => {
    setTilt({ x: 0, y: 0 })
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.04 }}
      className="h-full w-full"
    >
      <Link
        ref={cardRef}
        href={`/title/${item.slug}`}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="flex w-full h-[150px] sm:h-[160px] p-3 gap-3 rounded-2xl bg-surface/30 backdrop-blur-md border border-white/5 shadow-lg overflow-hidden transition-all duration-300 ease-out cursor-pointer hover:border-white/10 group select-none"
        style={{
          transform: `perspective(1000px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
          transformStyle: 'preserve-3d',
        }}
      >
        {/* Left: HD Image Poster within Card padding */}
        <div 
          className="relative w-[90px] sm:w-[95px] h-full shrink-0 overflow-hidden rounded-xl bg-surface/50 border border-white/5"
          style={{ transform: 'translateZ(6px)' }}
        >
          {item.image ? (
            <img
              src={item.image}
              alt={item.name}
              className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full bg-surface/80" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        </div>

        {/* Right: Info details */}
        <div 
          className="flex-1 flex flex-col justify-between overflow-hidden text-left min-w-0"
          style={{ transform: 'translateZ(12px)', transformStyle: 'preserve-3d' }}
        >
          {/* Top: Status & Type Info */}
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-1.5 flex-wrap leading-none mb-0.5">
              <span className={`px-2 py-0.5 rounded text-[8px] font-extrabold uppercase tracking-wider leading-none ${
                item.status === 'ongoing' ? 'bg-canon/10 text-canon' :
                item.status === 'upcoming' ? 'bg-filler/15 text-filler' : 'bg-white/5 text-paper/40'
              }`}>
                {tStatus(item.status) || item.status}
              </span>
            </div>
            <span className="text-[9px] text-paper/40 font-bold uppercase tracking-wider font-body leading-none">
              {item.type ? (tTypes(item.type) || item.type) : ''} {item.episodes ? `• ${item.episodes} ep` : ''}
            </span>
          </div>

          {/* Center: Anime Title with protection from italic overflow clipping */}
          <h4 className="text-xs sm:text-[13px] font-black text-paper line-clamp-2 leading-snug tracking-tight my-auto select-text font-heading uppercase italic pr-1.5">
            {item.name}
          </h4>

          {/* Bottom row: Score, Rank badge & Source/Type Tags */}
          <div className="flex flex-col gap-1.5 pt-1.5 border-t border-white/5">
            <div className="flex items-center gap-2 text-[9px] font-body text-paper/40 flex-wrap">
              {item.score && (
                <span className="flex items-center gap-0.5 text-yellow-500 font-bold">
                  <Star className="w-2.5 h-2.5 fill-current shrink-0" /> {item.score}
                </span>
              )}
              {item.topRank && (
                <span className="text-brand-cherry font-black uppercase tracking-wider flex items-center gap-0.5">
                  #{item.topRank} Top
                </span>
              )}
            </div>
            {/* Tags section for source and type */}
            <div className="flex gap-1 flex-wrap">
              {item.source && (
                <span className="px-1.5 py-0.2 rounded bg-white/5 border border-white/5 text-[8px] text-paper/50 font-body capitalize truncate max-w-[80px]">
                  {item.source}
                </span>
              )}
              {item.type && (
                <span className="px-1.5 py-0.2 rounded bg-white/5 border border-white/5 text-[8px] text-paper/50 font-body uppercase">
                  {item.type}
                </span>
              )}
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  )
}


export function FeaturedCarousel() {
  const t = useTranslations('Home')
  const tStatus = useTranslations('Status')
  const tTypes = useTranslations('Types')
  const [featured, setFeatured] = useState<FeaturedTitle[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/api/featured')
      .then(res => res.json())
      .then(data => {
        setFeatured(data.featured || [])
        setIsLoading(false)
      })
      .catch(() => setIsLoading(false))
  }, [])

  // Smooth slide scroll using buttons
  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const { scrollLeft, clientWidth } = scrollRef.current
      // Scroll by 70% of the visible container width for a nice transition
      const scrollAmount = direction === 'left' ? -clientWidth * 0.7 : clientWidth * 0.7
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' })
    }
  }

  if (isLoading || featured.length === 0) return null

  return (
    <section className="w-full mb-12 select-none" aria-label={t('featuredTitle') || 'Trending Anime'}>
      
      {/* Header section with title and manual scroll arrows */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm sm:text-base font-black text-paper font-heading uppercase italic tracking-wider flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-brand-cherry" />
          {t('featuredTitle') || 'Em Destaque'}
        </h3>
        
        {featured.length > 2 && (
          <div className="flex gap-1.5">
            <button
              onClick={() => scroll('left')}
              className="p-1.5 rounded-lg bg-surface/40 hover:bg-surface border border-white/5 hover:border-white/10 text-paper/60 hover:text-paper transition-all duration-200"
              aria-label="Scroll left"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => scroll('right')}
              className="p-1.5 rounded-lg bg-surface/40 hover:bg-surface border border-white/5 hover:border-white/10 text-paper/60 hover:text-paper transition-all duration-200"
              aria-label="Scroll right"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Grid horizontal scroll container (2 rows, flow column, custom scroll-snap) */}
      <div
        ref={scrollRef}
        className="grid grid-rows-2 grid-flow-col auto-cols-[calc((100%-12px)/1.35)] sm:auto-cols-[calc((100%-16px)/2.2)] md:auto-cols-[calc((100%-32px)/2.5)] gap-4 overflow-x-auto scroll-smooth scrollbar-none pb-2 px-0.5"
        style={{ scrollSnapType: 'x mandatory' }}
      >
        {featured.map((item, index) => (
          <div 
            key={item.id} 
            className="w-full h-full"
            style={{ scrollSnapAlign: 'start' }}
          >
            <FeaturedCard 
              item={item} 
              tTypes={tTypes} 
              tStatus={tStatus} 
              index={index} 
            />
          </div>
        ))}
      </div>

      {/* Pure CSS cross-browser scrollbar hider utility */}
      <style>{`
        .scrollbar-none::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-none {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </section>
  )
}
