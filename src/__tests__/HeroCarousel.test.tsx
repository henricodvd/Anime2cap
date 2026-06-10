import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock next-intl translations
jest.mock('next-intl', () => {
  const t = (key: string) => key;
  t.rich = (key: string) => key;
  return {
    useTranslations: () => t,
  };
});

// Mock i18n routing to avoid resolving next-intl production routing ESM files
jest.mock('../i18n/routing', () => ({
  routing: { locales: ['en', 'pt', 'ja'], defaultLocale: 'pt' },
  Link: ({ children, href }: any) => <a href={href}>{children}</a>,
  usePathname: () => '/',
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock('@/i18n/routing', () => ({
  routing: { locales: ['en', 'pt', 'ja'], defaultLocale: 'pt' },
  Link: ({ children, href }: any) => <a href={href}>{children}</a>,
  usePathname: () => '/',
  useRouter: () => ({ push: jest.fn() }),
}));

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useSearchParams: () => ({ get: () => null }),
  usePathname: () => '/',
  useRouter: () => ({ push: jest.fn() }),
}));

// Mock framer-motion animations
jest.mock('framer-motion', () => {
  const m = {
    h1: ({ children, ...props }: any) => <h1 {...props}>{children}</h1>,
    div: ({ children, style, className, ...props }: any) => (
      <div style={style} className={className} data-testid="motion-div" {...props}>
        {children}
      </div>
    ),
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

// Import the components (to be implemented)
import { AnimeCard } from '../components/AnimeCard';
import { CarouselColumn } from '../components/CarouselColumn';
import { HeroCarousel } from '../components/HeroCarousel';
import { HomeClient } from '../app/[locale]/HomeClient';

describe('AnimeCard UI and Navigation', () => {
  const mockAnime = {
    malId: 1,
    slug: 'neon-genesis-evangelion',
    imageUrl: 'https://cdn.myanimelist.net/images/anime/1404/139369l.jpg',
    title: 'Neon Genesis Evangelion',
    status: 'finished' as const,
    type: 'tv',
    locale: 'pt'
  };

  it('should render AnimeCard with correct image, title and status badge', () => {
    render(<AnimeCard {...mockAnime} />);
    
    // Check title
    expect(screen.getByText('Neon Genesis Evangelion')).toBeInTheDocument();

    // Check image src and alt
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('src', mockAnime.imageUrl);
    expect(img).toHaveAttribute('alt', mockAnime.title);

    // Check status badge
    expect(screen.getByText('FINISHED')).toBeInTheDocument();
  });

  it('should navigate to the correct URL with slug and locale', () => {
    render(<AnimeCard {...mockAnime} />);
    
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/pt/title/neon-genesis-evangelion');
  });

  it('should apply the correct styling class for ongoing status', () => {
    render(<AnimeCard {...mockAnime} status="ongoing" />);
    
    const badge = screen.getByText('ONGOING');
    expect(badge).toBeInTheDocument();
    // ongoing has bg-[#1a3a1a] text-[#4caf50] (ongoing classes verified in TDD)
    expect(badge).toHaveClass('bg-[#1a3a1a]');
    expect(badge).toHaveClass('text-[#4caf50]');
  });

  it('should apply the correct styling class for finished status', () => {
    render(<AnimeCard {...mockAnime} status="finished" />);
    
    const badge = screen.getByText('FINISHED');
    expect(badge).toBeInTheDocument();
    // finished has bg-[#1a1a3a] text-[#7c9bff] (finished classes verified in TDD)
    expect(badge).toHaveClass('bg-[#1a1a3a]');
    expect(badge).toHaveClass('text-[#7c9bff]');
  });
});

describe('CarouselColumn Scrolling Loop', () => {
  const mockItems = [
    { malId: 1, slug: 'evangelion', imageUrl: 'img1.jpg', title: 'Evangelion', status: 'finished', type: 'tv' },
    { malId: 2, slug: 'bebop', imageUrl: 'img2.jpg', title: 'Cowboy Bebop', status: 'finished', type: 'tv' }
  ];

  it('should duplicate the items received to ensure smooth loop', () => {
    render(<CarouselColumn items={mockItems} direction="up" locale="pt" />);
    
    // There should be 2 copies of each card, meaning 4 links total
    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(4);
    
    // The names should render twice
    const titles = screen.getAllByText('Evangelion');
    expect(titles).toHaveLength(2);
  });

  it('should apply the correct CSS animation class based on direction', () => {
    const { container: containerUp } = render(<CarouselColumn items={mockItems} direction="up" locale="pt" />);
    const animatedContainerUp = containerUp.querySelector('[class*="animate-scroll-up"]');
    expect(animatedContainerUp).toBeInTheDocument();

    const { container: containerDown } = render(<CarouselColumn items={mockItems} direction="down" locale="pt" />);
    const animatedContainerDown = containerDown.querySelector('[class*="animate-scroll-down"]');
    expect(animatedContainerDown).toBeInTheDocument();
  });
});

describe('HeroCarousel Column Distribution and Responsiveness', () => {
  const mockFeatured = [
    { id: 1, name: 'Anime 0', slug: 'anime-0', image: 'img0.jpg', status: 'ongoing', type: 'tv', topRank: 1 },
    { id: 2, name: 'Anime 1', slug: 'anime-1', image: 'img1.jpg', status: 'finished', type: 'tv', topRank: 2 },
    { id: 3, name: 'Anime 2', slug: 'anime-2', image: 'img2.jpg', status: 'ongoing', type: 'tv', topRank: 3 },
    { id: 4, name: 'Anime 3', slug: 'anime-3', image: 'img3.jpg', status: 'finished', type: 'tv', topRank: 4 }
  ];

  it('should distribute items with even index to column 1 and odd index to column 2', () => {
    const { container } = render(<HeroCarousel items={mockFeatured} locale="pt" />);
    
    // Find the two column wraps
    const columns = container.querySelectorAll('[data-testid="carousel-column"]');
    expect(columns).toHaveLength(2);

    // Column 1 (index 0) gets evens: id 1 (index 0) and id 3 (index 2)
    // Column 2 (index 1) gets odds: id 2 (index 1) and id 4 (index 3)
    const col1Text = columns[0].textContent;
    const col2Text = columns[1].textContent;

    expect(col1Text).toContain('Anime 0');
    expect(col1Text).toContain('Anime 2');
    expect(col1Text).not.toContain('Anime 1');

    expect(col2Text).toContain('Anime 1');
    expect(col2Text).toContain('Anime 3');
    expect(col2Text).not.toContain('Anime 0');
  });

  it('should hide the carousel on mobile viewports using hidden class', () => {
    const { container } = render(<HeroCarousel items={mockFeatured} locale="pt" />);
    
    const wrapper = container.querySelector('[class*="hidden md:block"]');
    expect(wrapper).toBeInTheDocument();
  });
});

describe('HomeClient / HeroSection Search Bar Integration', () => {
  beforeAll(() => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ featured: [] }),
    }) as any;
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it('should keep the search bar functional and visible within the Hero Section', async () => {
    render(<HomeClient />);
    
    // Search input should be present in the document
    const searchInput = screen.getByRole('textbox');
    expect(searchInput).toBeInTheDocument();
    expect(searchInput).toHaveAttribute('placeholder', 'searchPlaceholder');
  });
});
