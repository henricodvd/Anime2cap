import createMiddleware from 'next-intl/middleware';
import {routing} from './i18n/routing';
 
export default createMiddleware(routing);
 
export const config = {
  // Match all pathnames except for
  // - API routes
  // - static files (e.g. sitemap.xml, robots.txt, ads.txt, favicon.ico)
  // - _next (internal Next.js paths)
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon files (favicon.ico, favicon-16x16.png, favicon-32x32.png)
     * - app icons (android-chrome-*, apple-touch-icon.png)
     * - site.webmanifest, sitemap.xml, robots.txt, ads.txt, og-image.png
     */
    '/((?!api|_next/static|_next/image|favicon.ico|favicon-16x16.png|favicon-32x32.png|android-chrome-192x192.png|android-chrome-512x512.png|apple-touch-icon.png|site.webmanifest|sitemap.xml|robots.txt|ads.txt|og-image.png).*)',
  ],
};
