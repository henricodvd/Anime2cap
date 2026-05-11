// Mock modules before any imports
jest.mock('next-intl', () => {
  const t = (key: string) => key;
  t.rich = (key: string, components: any) => {
    // Basic simulation of rich text rendering
    return key;
  };
  return {
    useTranslations: () => t,
    useSearchParams: () => ({ get: () => null }),
  };
});

jest.mock('next-intl/server', () => ({
  getTranslations: jest.fn().mockResolvedValue((key: string) => {
    if (key === 'title') return 'Title';
    if (key === 'tagline') return 'Tagline';
    if (key === 'description') return 'Description';
    return key;
  }),
  setRequestLocale: jest.fn(),
}));

jest.mock('../i18n/routing', () => ({
  routing: { locales: ['en', 'pt', 'ja'], defaultLocale: 'pt' },
  Link: ({ children }: any) => <a>{children}</a>,
  usePathname: () => '/',
  useRouter: () => ({ push: jest.fn() }),
}));

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useSearchParams: () => ({ get: () => null }),
  usePathname: () => '/',
  useRouter: () => ({ push: jest.fn() }),
}));

// Mock framer-motion to check for blocking props
jest.mock('framer-motion', () => {
  const m = {
    h1: ({ children, initial, ...props }: any) => <h1 data-initial={JSON.stringify(initial)} {...props}>{children}</h1>,
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    p: ({ children, ...props }: any) => <p {...props}>{children}</p>,
    section: ({ children, ...props }: any) => <section {...props}>{children}</section>,
    span: ({ children, ...props }: any) => <span {...props}>{children}</span>,
  };
  return {
    motion: m,
    m: m,
    LazyMotion: ({ children }: any) => <>{children}</>,
    domAnimation: {},
    AnimatePresence: ({ children }: any) => <>{children}</>,
  };
});

import { generateMetadata } from '../app/[locale]/page';
import { render, screen } from '@testing-library/react';
import { HomeClient } from '../app/[locale]/HomeClient';
import React from 'react';

describe('SEO & Performance Requirements', () => {
  describe('Metadata (SEO)', () => {
    it('should use correct hreflang codes (en instead of en-US)', async () => {
      const params = Promise.resolve({ locale: 'pt' });
      const metadata = await generateMetadata({ params });
      
      const languages = metadata.alternates?.languages as Record<string, string>;
      
      // Expected to pass if en-US is replaced by en
      expect(languages).toHaveProperty('en');
      expect(languages).not.toHaveProperty('en-US');
    });
  });

  describe('LCP Performance', () => {
    it('H1 should NOT have initial opacity 0 (LCP optimization)', () => {
      render(<HomeClient />);
      const h1 = screen.getByRole('heading', { level: 1 });
      const initialAttr = h1.getAttribute('data-initial');
      
      // If initial={false}, initialAttr will be "false"
      // If initial={opacity: 0}, initialAttr will be '{"opacity":0}'
      
      if (initialAttr === 'false') {
        expect(true).toBe(true);
      } else {
        const initial = JSON.parse(initialAttr || '{}');
        expect(initial.opacity).not.toBe(0);
      }
    });
  });
});
