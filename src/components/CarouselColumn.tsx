import React from 'react'
import { AnimeCard } from './AnimeCard'

export interface CarouselColumnProps {
  items: any[]
  direction: 'up' | 'down'
  locale?: string
}

export function CarouselColumn({ items, direction, locale = 'pt' }: CarouselColumnProps) {
  if (!items || items.length === 0) return null

  // Duplicate items array to make the loop infinite and seamless
  const doubledItems = [...items, ...items]
  const animationClass = direction === 'up' ? 'animate-scroll-up' : 'animate-scroll-down'

  return (
    <div
      className="flex flex-col overflow-hidden h-full relative"
      data-testid="carousel-column"
    >
      <div className={`flex flex-col gap-3.5 shrink-0 ${animationClass}`}>
        {doubledItems.map((item, idx) => (
          <AnimeCard
            key={`${item.id || item.malId}-${idx}`}
            malId={item.id || item.malId}
            slug={item.slug}
            imageUrl={item.image || item.imageUrl || '/placeholder.jpg'}
            title={item.name || item.title}
            status={item.status}
            type={item.type}
            locale={locale}
          />
        ))}
      </div>

      <style>{`
        @keyframes scrollUp {
          0% { transform: translateY(0); }
          100% { transform: translateY(-50%); }
        }
        @keyframes scrollDown {
          0% { transform: translateY(-50%); }
          100% { transform: translateY(0); }
        }
        .animate-scroll-up {
          animation: scrollUp 35s linear infinite;
        }
        .animate-scroll-down {
          animation: scrollDown 42s linear infinite;
        }
      `}</style>
    </div>
  )
}
