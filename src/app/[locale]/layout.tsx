import { Syne, Plus_Jakarta_Sans, Noto_Sans_JP } from "next/font/google";
import "../globals.css";

import { BookOpen } from "lucide-react";
import { Footer } from "@/components/ui/footer";
import { Navbar } from "@/components/ui/navbar";
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';

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
    <html lang={locale}>
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
      </body>
    </html>
  );
}


