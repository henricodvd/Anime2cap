import { MetadataRoute } from 'next';
import { db } from '@/lib/db';
import { titles } from '@/db/schema';
import { routing } from '@/i18n/routing';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://anime2cap.com';
  
  // 1. Fetch all anime slugs from database
  const allAnimes = await db.select({ 
    slug: titles.slug,
    updatedAt: titles.updatedAt 
  }).from(titles);

  const locales = routing.locales;
  const staticPages = ['', '/about', '/privacy', '/terms'];

  // 2. Generate static entries for each locale
  const staticEntries = locales.flatMap((locale) =>
    staticPages.map((page) => ({
      url: `${baseUrl}/${locale}${page}`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: page === '' ? 1.0 : 0.5,
    }))
  );

  // 3. Generate dynamic entries for each anime in each locale
  const animeEntries = allAnimes.flatMap((anime) =>
    locales.map((locale) => ({
      url: `${baseUrl}/${locale}/title/${anime.slug}`,
      lastModified: anime.updatedAt || new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    }))
  );

  return [...staticEntries, ...animeEntries];
}
