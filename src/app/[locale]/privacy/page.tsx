import { useTranslations } from 'next-intl'
import { setRequestLocale } from 'next-intl/server'

export default async function PrivacyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = useTranslations('Privacy')

  return (
    <div className="max-w-3xl mx-auto px-6 pt-32 sm:pt-40 pb-20">
      <div className="glass-panel rounded-3xl p-8 md:p-12 border border-brand-cherry/10">
        <h1 className="font-heading text-4xl font-bold mb-2 text-paper uppercase italic">{t('title')}</h1>
        <p className="text-paper/40 text-sm mb-12 font-body">{t('effectiveDate')}</p>

        <div className="space-y-12 text-paper/75 leading-relaxed text-lg font-body">
          <section>
            <p className="mb-8 italic border-l-4 border-brand-cherry pl-6 py-2 bg-brand-cherry/5 rounded-r-2xl">
              {t('intro')}
            </p>
          </section>

          <section>
            <h2 className="text-paper font-heading text-2xl font-bold mb-4 uppercase italic">{t('sec1Title')}</h2>
            <p>{t('sec1Content')}</p>
          </section>

          <section>
            <h2 className="text-paper font-heading text-2xl font-bold mb-4 uppercase italic">{t('sec2Title')}</h2>
            <p>{t('sec2Content')}</p>
          </section>

          <section>
            <h2 className="text-paper font-heading text-2xl font-bold mb-4 uppercase italic">{t('sec3Title')}</h2>
            <p>{t('sec3Content')}</p>
          </section>

          <section>
            <h2 className="text-paper font-heading text-2xl font-bold mb-4 uppercase italic">{t('sec4Title')}</h2>
            <p>{t('sec4Content')}</p>
          </section>

          <section>
            <h2 className="text-paper font-heading text-2xl font-bold mb-4 uppercase italic">{t('sec5Title')}</h2>
            <p>{t('sec5Content')}</p>
          </section>
        </div>
      </div>
    </div>
  );
}
