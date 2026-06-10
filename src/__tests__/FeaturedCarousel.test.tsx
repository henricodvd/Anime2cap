// Mock modules before any imports
jest.mock('next-intl', () => {
  const t = (key: string) => key;
  t.rich = (key: string) => key;
  return {
    useTranslations: () => t,
  };
});

jest.mock('framer-motion', () => {
  const m = {
    div: ({ children, style, className, ...props }: any) => (
      <div style={style} className={className} data-testid="motion-div" {...props}>
        {children}
      </div>
    ),
  };
  return {
    motion: m,
  };
});

import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { FeaturedCarousel } from '../components/FeaturedCarousel';
import React from 'react';

describe('FeaturedCarousel UI and Grid Behavior', () => {
  const mockFeaturedData = {
    featured: [
      {
        id: 1,
        name: 'Neon Genesis Evangelion',
        slug: 'neon-genesis-evangelion',
        image: 'https://cdn.myanimelist.net/images/anime/1404/139369l.jpg',
        score: '8.37',
        type: 'tv',
        episodes: 26,
        status: 'finished',
        topRank: 1,
        source: 'Original',
      },
      {
        id: 2,
        name: 'Cowboy Bebop',
        slug: 'cowboy-bebop',
        image: 'https://cdn.myanimelist.net/images/anime/4/19644l.jpg',
        score: '8.75',
        type: 'tv',
        episodes: 26,
        status: 'finished',
        topRank: 2,
        source: 'Manga',
      }
    ]
  };

  beforeAll(() => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => mockFeaturedData,
    }) as any;
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it('should render correct grid structure with columns for "peek" effect', async () => {
    render(<FeaturedCarousel />);

    await waitFor(() => {
      expect(screen.getByText('Neon Genesis Evangelion')).toBeInTheDocument();
    });

    // Check if container has the responsive grid auto-cols setup
    const container = screen.getByText('Neon Genesis Evangelion').closest('.grid');
    expect(container).toBeInTheDocument();
    
    // The classes should match the new responsive calculations
    expect(container).toHaveClass('grid-rows-2');
    expect(container).toHaveClass('grid-flow-col');
    expect(container).toHaveClass('auto-cols-[calc((100%-12px)/1.35)]');
    expect(container).toHaveClass('sm:auto-cols-[calc((100%-16px)/2.2)]');
    expect(container).toHaveClass('md:auto-cols-[calc((100%-32px)/2.5)]');
  });

  it('should render card with correct dimensions, padding, HD image and source tag', async () => {
    render(<FeaturedCarousel />);

    await waitFor(() => {
      expect(screen.getByText('Neon Genesis Evangelion')).toBeInTheDocument();
    });

    // Check link/card layout classes
    const cardLink = screen.getByText('Neon Genesis Evangelion').closest('a');
    expect(cardLink).toBeInTheDocument();
    
    // New design: p-3, gap-3, height should be larger (h-[150px] sm:h-[160px])
    expect(cardLink).toHaveClass('p-3');
    expect(cardLink).toHaveClass('gap-3');
    expect(cardLink).toHaveClass('h-[150px]');
    expect(cardLink).toHaveClass('sm:h-[160px]');

    // HD Image layout
    const imageContainer = cardLink?.querySelector('img')?.parentElement;
    expect(imageContainer).toBeInTheDocument();
    expect(imageContainer).toHaveClass('w-[90px]');
    expect(imageContainer).toHaveClass('sm:w-[95px]');
    expect(imageContainer).toHaveClass('rounded-xl');

    // Source Tag
    expect(screen.getByText('Original')).toBeInTheDocument();
  });

  it('should have a subtle 3D Tilt effect limit (max 2.0 degrees)', async () => {
    render(<FeaturedCarousel />);

    await waitFor(() => {
      expect(screen.getByText('Neon Genesis Evangelion')).toBeInTheDocument();
    });

    const cardLink = screen.getByText('Neon Genesis Evangelion').closest('a');
    expect(cardLink).toBeInTheDocument();

    // Mock mouse move to verify rotation does not exceed 2.0 degrees
    // Simulate rect dimensions: w=300, h=160. Mouse at x=300 (centerX=150, x-centerX=150), y=160 (centerY=80, centerY-y=-80)
    // Formula for rotateX = ((centerY - y) / centerY) * maxRotate = (-80/80) * 2.0 = -2.0
    // Formula for rotateY = ((x - centerX) / centerX) * maxRotate = (150/150) * 2.0 = 2.0
    
    cardLink!.getBoundingClientRect = jest.fn().mockReturnValue({
      left: 0,
      top: 0,
      width: 300,
      height: 160
    });

    fireEvent.mouseMove(cardLink!, { clientX: 300, clientY: 160 });

    // The transform should apply rotateX(-2deg) rotateY(2deg)
    expect(cardLink!.style.transform).toContain('rotateX(-2deg)');
    expect(cardLink!.style.transform).toContain('rotateY(2deg)');
    expect(cardLink!.style.transform).toContain('perspective(1000px)'); // verified perspective increase
  });
});
