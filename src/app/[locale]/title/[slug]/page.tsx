import { Converter } from '@/components/Converter'
import { EpisodeList } from '@/components/EpisodeList'
import { notFound } from 'next/navigation'
import { Star, Tv, BookOpen } from 'lucide-react'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { Synopsis } from '@/components/Synopsis'
import { Metadata } from 'next'
import { Breadcrumbs } from '@/components/Breadcrumbs'

import { getTitleData } from '@/lib/title-service'

// Fetch title details on the server side
async function getTitle(slug: string, locale: string) {
  try {
    return await getTitleData(slug, locale)
  } catch (error) {
    console.error(`[getTitle] Error loading title data for slug "${slug}":`, error)
    return null
  }
}

// Dynamic Metadata generation for SEO
export async function generateMetadata({ 
  params 
}: { 
  params: Promise<{ slug: string, locale: string }> 
}): Promise<Metadata> {
  const { slug, locale } = await params;
  const title = await getTitle(slug, locale);
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.anime2cap.com';
  
  if (!title) return { title: 'Anime2Cap' };

  const name = title.name;
  const t = await getTranslations({ locale, namespace: 'TitlePage' });

  return {
    title: `${name} — ${t('seoTitleSuffix')}`,
    description: title.synopsis?.slice(0, 160) || t('defaultDescription'),
    alternates: {
      canonical: `${baseUrl}/${locale}/title/${slug}`,
      languages: {
        'pt-BR': `${baseUrl}/pt/title/${slug}`,
        'en': `${baseUrl}/en/title/${slug}`,
        'ja': `${baseUrl}/ja/title/${slug}`,
      },
    },
    openGraph: {
      title: `${name} | Anime2Cap`,
      description: title.synopsis?.slice(0, 160),
      url: `${baseUrl}/${locale}/title/${slug}`,
      images: [
        {
          url: title.image || '/og-image.png',
          width: 1200,
          height: 630,
          alt: name,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${name} | Anime2Cap`,
      description: title.synopsis?.slice(0, 160),
      images: [title.image || '/og-image.png'],
    },
  };
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

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.anime2cap.com';
  const pageUrl = `${baseUrl}/${locale}/title/${slug}`;

  const faqJsonLd = {
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": locale === 'pt' ? `Onde o anime de ${title.name} termina no mangá?` : `Where does ${title.name} anime end in the manga?`,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": locale === 'pt' 
            ? `O anime de ${title.name} termina em um ponto específico da história original. Para saber exatamente onde parar no anime e em qual capítulo do mangá começar a ler sem perder nenhum detalhe importante da obra de ${title.source}, utilize nosso conversor automático de episódios para capítulos acima.`
            : `The ${title.name} anime concludes at a specific point in the original story. To find out exactly where the anime ends and which manga chapter to start reading without missing any crucial details from ${title.source}'s work, use our specialized episode-to-chapter converter above.`
        }
      },
      {
        "@type": "Question",
        "name": locale === 'pt' ? `${title.name} tem episódios fillers?` : `Does ${title.name} have filler episodes?`,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": locale === 'pt'
            ? `Sim, ${title.name} possui episódios mapeados como fillers e cânon. Os episódios fillers são histórias originais do anime que não existem no mangá, enquanto os episódios cânon seguem a história fielmente. Você pode conferir a lista completa de fillers e capítulos correspondentes na tabela de episódios desta página.`
            : `Yes, ${title.name} has episodes identified as both fillers and canon. Filler episodes are original anime stories not found in the manga, whereas canon episodes follow the source material faithfully. You can check the complete list of fillers and their corresponding manga chapters in the episode table on this page.`
        }
      }
    ]
  };

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "TVSeries",
        "name": title.name,
        "alternativeName": title.nameJapanese,
        "image": title.image,
        "description": title.synopsis,
        "url": pageUrl,
        "genre": title.type,
        "numberOfEpisodes": title.episodes,
        "aggregateRating": title.score ? {
          "@type": "AggregateRating",
          "ratingValue": title.score,
          "bestRating": "10",
          "worstRating": "1"
        } : undefined
      },
      faqJsonLd,
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": locale === 'pt' ? 'Início' : 'Home',
            "item": `${baseUrl}/${locale}`
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": title.name,
            "item": pageUrl
          }
        ]
      }
    ]
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Background Glow Effect */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[280px] h-[280px] md:w-[1000px] md:h-[600px] bg-hero-glow rounded-full blur-[60px] md:blur-[120px] opacity-15 md:opacity-20 pointer-events-none z-[-1]" />


      <div className="max-w-6xl mx-auto px-6 pt-32 sm:pt-40 pb-24">
        <Breadcrumbs 
          items={[
            { label: title.name, active: true }
          ]} 
        />
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
                className={`px-3 sm:px-4 py-1 sm:py-1.5 border rounded-full text-[9px] sm:text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 sm:gap-2 font-body ${!title.source || title.source.toLowerCase().includes('original')
                    ? 'bg-brand-cherry/10 text-brand-cherry border-brand-cherry/20'
                    : 'bg-white/5 text-paper/40 border-white/10'
                  }`}
                aria-label={`Source: ${title.source || 'Original'}`}
              >
                <BookOpen className="w-3 sm:w-3.5 h-3 sm:h-3.5" /> {t('sourceLabel')}: {title.source && title.source.toLowerCase().includes('original') ? t('originalWork') : title.source || t('originalWork')}
              </span>
            </div>

            <Synopsis text={title.synopsis || ''} noSynopsisText={t('noSynopsis')} />
          </div>
        </div>

        {/* Converter Section */}
        <section className="mb-24" aria-labelledby="converter-heading">
          <h2 id="converter-heading" className="sr-only">{t('converterTitle') || 'Converter'}</h2>
          <Converter titleId={title.id} />
        </section>

        {/* Mappings Table Section */}
        <section className="space-y-8" aria-labelledby="filler-heading">
          <div className="flex items-center gap-6">
            <h2 id="filler-heading" className="text-xl sm:text-3xl font-black text-paper font-heading tracking-tight uppercase italic shrink-0">
              {t('fillerHeader')}
            </h2>
            <div className="h-px w-full bg-gradient-to-r from-white/10 to-transparent" />
          </div>
          <EpisodeList titleId={title.id} />
        </section>

        {/* FAQ Section for Featured Snippets */}
        <section className="mt-24 pt-24 border-t border-white/5" aria-labelledby="faq-heading">
          <h2 id="faq-heading" className="text-2xl sm:text-4xl font-black text-paper font-heading tracking-tight uppercase italic mb-12">
            {locale === 'pt' ? 'Perguntas Frequentes' : 'Frequently Asked Questions'}
          </h2>
          
          <div className="grid gap-8">
            <div className="glass-panel p-8 rounded-3xl border border-white/5">
              <h3 className="text-lg sm:text-xl font-bold text-paper mb-4 font-heading uppercase italic">
                {locale === 'pt' ? `Onde o anime de ${title.name} termina no mangá?` : `Where does ${title.name} anime end in the manga?`}
              </h3>
              <p className="text-paper/70 leading-relaxed font-body">
                {locale === 'pt' 
                  ? `O anime de ${title.name} encerra sua adaptação em um ponto crucial da obra original. Para descobrir exatamente onde ler o mangá após o anime e qual capítulo corresponde ao último episódio assistido, basta selecionar o número do episódio no nosso conversor automático localizado no topo desta página para obter o capítulo preciso.`
                  : `The ${title.name} anime concludes its adaptation at a crucial point in the original story. To find out exactly where to read the manga after the anime and which chapter corresponds to the last episode you watched, simply select the episode number in our automatic converter at the top of this page.`
                }
              </p>
            </div>

            <div className="glass-panel p-8 rounded-3xl border border-white/5">
              <h3 className="text-lg sm:text-xl font-bold text-paper mb-4 font-heading uppercase italic">
                {locale === 'pt' ? `Quais episódios de ${title.name} são filler?` : `Which episodes of ${title.name} are filler?`}
              </h3>
              <p className="text-paper/70 leading-relaxed font-body">
                {locale === 'pt'
                  ? `${title.name} possui uma mistura de episódios cânon (baseados no mangá) e episódios filler (originais do anime). Nossa tabela de episódios acima detalha o status de cada um, permitindo que você identifique rapidamente quais partes da história são essenciais para acompanhar a trama principal do mangá de ${title.source}.`
                  : `${title.name} features a mix of canon episodes (manga-based) and filler episodes (anime originals). Our episode table above details the status of each, allowing you to quickly identify which parts of the story are essential for following the main manga plot from ${title.source}.`
                }
              </p>
            </div>
          </div>
        </section>
      </div>

      {/* JSON-LD Structured Data */}
      <script
        type="application/ld-json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd)
        }}
      />
    </div>
  )
}

