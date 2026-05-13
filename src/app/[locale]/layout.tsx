import { Syne, Plus_Jakarta_Sans, Noto_Sans_JP } from "next/font/google";
import type { Metadata, Viewport } from "next";
import "../globals.css";


import { Footer } from "@/components/ui/footer";
import { Navbar } from "@/components/ui/navbar";
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import { GoogleAnalytics } from '@next/third-parties/google';
import Script from 'next/script';

const syne = Syne({
  subsets: ["latin"],
  variable: "--font-heading",
  weight: ["800"],
});

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "500", "600", "700"],
});

const notoJA = Noto_Sans_JP({
  subsets: ["latin"],
  variable: "--font-ja",
  weight: ["400", "700"],
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export const viewport: Viewport = {
  themeColor: "#0D0D0D",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: {
    template: "%s | Anime2Cap",
    default: "Anime2Cap - Episode to Manga Chapter Converter",
  },
  description: "Find out where to start reading the manga after any anime episode. Accurate mapping, filler lists, and more.",
  keywords: ["anime to manga", "episode to chapter", "manga converter", "anime filler list"],
  authors: [{ name: "Anime2Cap Team" }],
  icons: {
    icon: [
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' }
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  manifest: '/site.webmanifest',
  openGraph: {
    type: "website",
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
  twitter: {
    card: "summary_large_image",
  },
};

export default async function RootLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!routing.locales.includes(locale as any)) {
    notFound();
  }

  setRequestLocale(locale);
  const messages = await getMessages();
  const t = await getTranslations('Footer');

  return (
    <html lang={locale} className="scroll-smooth">
      <body className={`${syne.variable} ${plusJakarta.variable} ${notoJA.variable} antialiased bg-night selection:bg-brand-cherry/35 selection:text-paper`}>
        <NextIntlClientProvider messages={messages}>
          <Navbar />
          <main className="pt-24">
            {children}
          </main>
          
          <Footer
            logo={
              <div className="bg-brand-cherry/10 p-2 rounded-xl border border-brand-cherry/20 flex items-center justify-center">
                <img src="/android-chrome-192x192.png" alt="Anime2Cap Logo" className="w-5 h-5 object-contain" />
              </div>
            }
            brandName={
              <span className="font-heading text-xl font-bold">
                Anime<span className="text-brand-cherry">2</span>Cap
              </span>
            }
            socialLinks={[]}
            mainLinks={[
              { href: "/", label: t('links.converter') },
            ]}
            legalLinks={[
              { href: "/about", label: t('links.about') },
              { href: "/privacy", label: t('links.privacy') },
              { href: "/terms", label: t('links.terms') },
            ]}
            copyright={{
              text: t('copyright'),
              license: t('license'),
            }}
          />
        </NextIntlClientProvider>
        <Script 
          src="https://www.googletagmanager.com/gtag/js?id=G-99VJ022RPE"
          strategy="lazyOnload"
        />
        <Script id="google-analytics" strategy="lazyOnload">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-99VJ022RPE');
          `}
        </Script>
        <Script 
          id="google-ads"
          src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${process.env.NEXT_PUBLIC_ADSENSE_ID}`}
          strategy="lazyOnload"
          crossOrigin="anonymous"
        />
        <Script id="clarity-script" strategy="lazyOnload">
          {`
            (function(c,l,a,r,i,t,y){
              c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
              t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
              y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
            })(window, document, "clarity", "script", "${process.env.NEXT_PUBLIC_CLARITY_ID}");
          `}
        </Script>
      </body>
    </html>
  );
}
