import { BookOpen, Database, Sparkles } from 'lucide-react'
import { getTranslations, setRequestLocale } from 'next-intl/server'

export default async function AboutPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('About')

  return (
    <div className="max-w-3xl mx-auto px-6 pt-32 sm:pt-40 pb-20">
      <div className="glass-panel rounded-3xl p-8 md:p-12 relative overflow-hidden border border-brand-cherry/10">
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-cherry/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center gap-3 mb-8">
          <div className="bg-brand-cherry/10 p-3 rounded-2xl border border-brand-cherry/20">
            <BookOpen className="w-8 h-8 text-brand-cherry" />
          </div>
          <h1 className="font-heading text-4xl font-bold tracking-tight text-paper uppercase italic">{t('title')}</h1>
        </div>

        <div className="space-y-8 text-paper/75 leading-relaxed text-lg font-body">
          <p>
            {t.rich('question', {
              bold: (chunks) => <strong className="text-paper">{chunks}</strong>
            })}
            <br />
            <span className="italic text-brand-cherry">{t('quote')}</span>
          </p>

          <p>
            {t('description')}
          </p>

          <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent my-8" />

          <h2 className="font-heading text-2xl font-bold text-paper flex items-center gap-2 uppercase italic">
            <Database className="w-5 h-5 text-brand-cherry" />
            {t('howItWorksTitle')}
          </h2>
          
          <ul className="space-y-4">
            <li className="flex gap-4">
              <div className="mt-1.5"><div className="w-2 h-2 rounded-full bg-brand-cherry" /></div>
              <div>
                <strong className="text-paper block text-xl mb-1">{t('searchTitle')}</strong>
                {t('searchDesc')}
              </div>
            </li>
            <li className="flex gap-4">
              <div className="mt-1.5"><div className="w-2 h-2 rounded-full bg-brand-cherry" /></div>
              <div>
                <strong className="text-paper block text-xl mb-1">{t('conversionTitle')}</strong>
                {t.rich('conversionDesc', {
                  canon: (chunks) => <span className="text-canon font-bold">{chunks}</span>,
                  filler: (chunks) => <span className="text-filler font-bold text-[#E8A020]">{chunks}</span>
                })}
              </div>
            </li>
          </ul>

          <div className="mt-12 p-8 bg-brand-cherry/5 border border-brand-cherry/10 rounded-3xl flex items-start gap-5">
            <Sparkles className="w-6 h-6 text-brand-cherry shrink-0 mt-1" />
            <p className="text-sm text-paper/80 leading-relaxed italic">
              {t('footerNote')}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

