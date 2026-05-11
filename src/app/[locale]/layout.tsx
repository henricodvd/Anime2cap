import { Syne, Plus_Jakarta_Sans, Noto_Sans_JP } from "next/font/google";
import type { Metadata, Viewport } from "next";
import "../globals.css";

import { BookOpen } from "lucide-react";
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

const notoJP = Noto_Sans_JP({
  subsets: ["latin"],
  variable: "--font-jp",
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
      <head>
        <Script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1278997205238367"
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
      </head>
      <body className={`${syne.variable} ${plusJakarta.variable} ${notoJP.variable} antialiased bg-night selection:bg-brand-cherry/35 selection:text-paper`}>
        <NextIntlClientProvider messages={messages}>
          <Navbar />
          <main className="pt-24">
            {children}
          </main>
          
          <Footer
            logo={
              <div className="bg-brand-cherry/10 p-2 rounded-xl border border-brand-cherry/20">
                <BookOpen className="w-5 h-5 text-brand-cherry" />
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
        <GoogleAnalytics gaId="G-99VJ022RPE" />
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
