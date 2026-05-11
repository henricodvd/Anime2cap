import { Suspense } from 'react'
import { HomeClient } from './HomeClient'
import { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Home' });
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.anime2cap.com';

  return {
    title: `${t('tagline')} | Anime2Cap`,
    description: t('description').replace(/<[^>]*>/g, ''), // Strip HTML tags for meta description
    alternates: {
      canonical: `${baseUrl}/${locale}`,
      languages: {
        'pt-BR': `${baseUrl}/pt`,
        'en': `${baseUrl}/en`,
      },
    },
    openGraph: {
      title: "Anime2Cap | The Bridge Between Anime and Manga",
      description: "Find out where to start reading the manga after any anime episode. Accurate mapping and filler lists.",
      url: `${baseUrl}/${locale}`,
      siteName: "Anime2Cap",
      images: [
        {
          url: "/og-image.png",
          width: 1200,
          height: 630,
          alt: "Anime2Cap",
        },
      ],
    },
  }
}

export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="w-12 h-12 rounded-full border-2 border-brand-cherry/20 border-t-brand-cherry animate-spin" /></div>}>
      <HomeClient />
    </Suspense>
  )
}
