import { Converter } from '@/components/Converter'
import { EpisodeList } from '@/components/EpisodeList'
import { notFound } from 'next/navigation'
import { Star, Tv, BookOpen } from 'lucide-react'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { Synopsis } from '@/components/Synopsis'

// Fetch title details on the server side
async function getTitle(slug: string, locale: string) {
  // Use absolute URL since fetch is happening on the server
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const res = await fetch(`${baseUrl}/api/title/${slug}?locale=${locale}`, { next: { revalidate: 3600 } })
  
  if (!res.ok) {
    if (res.status === 404) return null
    return null
  }
  
  const data = await res.json()
  return data.title
}

export default async function TitlePage({ params }: { params: Promise<{ slug: string, locale: string }> }) {
  const { slug, locale } = await params;
  setRequestLocale(locale);
  
  const title = await getTitle(slug, locale)
  const t = await getTranslations('TitlePage')
  const tTypes = await getTranslations('Types')

  if (!title) {
    notFound()
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Background Glow Effect */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-hero-glow rounded-full blur-[120px] opacity-20 pointer-events-none z-[-1]" />


      <div className="max-w-6xl mx-auto px-6 pt-32 sm:pt-40 pb-24">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row gap-8 md:gap-12 mb-16 sm:mb-20 relative" role="article" aria-label={title.name}>
          <div className="w-48 sm:w-56 md:w-72 shrink-0 mx-auto md:mx-0">
            <div className="aspect-[3/4] rounded-2xl sm:rounded-3xl overflow-hidden bg-surface p-2 sm:p-3 border border-white/10 shadow-2xl relative">
              <img 
                src={title.image || '/placeholder.jpg'} 
                alt={title.name}
                className="w-full h-full object-cover rounded-xl sm:rounded-2xl shadow-inner"
                aria-label={`Poster for ${title.name}`}
              />
              <div className="absolute inset-0 rounded-xl sm:rounded-2xl ring-1 ring-inset ring-white/10" />
            </div>
          </div>
          
          <div className="flex-1 flex flex-col justify-center text-center md:text-left">
            {title.nameJapanese && (
              <div className="mb-3 sm:mb-4 animate-fade-in">
                <span className="text-brand-cherry/60 font-jp text-base sm:text-lg tracking-widest" aria-label="Japanese Title">
                  {title.nameJapanese}
                </span>
              </div>
            )}
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-paper mb-6 sm:mb-8 leading-[0.95] font-heading tracking-tighter uppercase italic">
              {title.name}
            </h1>
            
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 sm:gap-2.5 mb-8 sm:mb-10">
              <span className="px-3 sm:px-4 py-1 sm:py-1.5 bg-white/5 border border-white/10 rounded-full text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-paper/40 font-body">
                {tTypes(title.type?.toLowerCase() || 'anime')}
              </span>
              <span className="px-3 sm:px-4 py-1 sm:py-1.5 bg-brand-cherry/10 text-brand-cherry border border-brand-cherry/20 rounded-full text-[9px] sm:text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 sm:gap-2 font-body" aria-label={`${title.episodes || 'Multiple'} episodes`}>
                <Tv className="w-3 sm:w-3.5 h-3 sm:h-3.5" /> {title.episodes ? `${title.episodes} ${t('eps')}` : t('ongoing')}
              </span>
              <span className="px-3 sm:px-4 py-1 sm:py-1.5 bg-filler/10 text-filler border border-filler/20 rounded-full text-[9px] sm:text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 sm:gap-2 font-body" aria-label={`Score: ${title.score || 'N/A'}`}>
                <Star className="w-3 sm:w-3.5 h-3 sm:h-3.5" /> {title.score || 'N/A'}
              </span>
              <span 
                className={`px-3 sm:px-4 py-1 sm:py-1.5 border rounded-full text-[9px] sm:text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 sm:gap-2 font-body ${
                  !title.source || title.source.toLowerCase().includes('original')
                    ? 'bg-brand-cherry/10 text-brand-cherry border-brand-cherry/20'
                    : 'bg-white/5 text-paper/40 border-white/10'
                }`}
                aria-label={`Source: ${title.source || 'Original'}`}
              >
                <BookOpen className="w-3 sm:w-3.5 h-3 sm:h-3.5" /> {t('sourceLabel')}: {title.source && title.source.toLowerCase().includes('original') ? t('originalWork') : title.source || t('originalWork')}
              </span>
            </div>

            <Synopsis text={title.synopsis} noSynopsisText={t('noSynopsis')} />
          </div>
        </div>

        {/* Converter Section */}
        <div className="mb-24">
          <Converter titleId={title.id} />
        </div>

        {/* Mappings Table Section */}
        <div className="space-y-8">
          <div className="flex items-center gap-6">
            <h3 className="text-xl sm:text-3xl font-black text-paper font-heading tracking-tight uppercase italic shrink-0">
              {t('fillerHeader')}
            </h3>
            <div className="h-px w-full bg-gradient-to-r from-white/10 to-transparent" />
          </div>
          <EpisodeList titleId={title.id} />
        </div>
      </div>
    </div>
  )
}

