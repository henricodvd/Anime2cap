import React from 'react'
import { CarouselColumn } from './CarouselColumn'

export interface HeroCarouselProps {
  items: any[]
  locale?: string
}

export function HeroCarousel({ items, locale = 'pt' }: HeroCarouselProps) {
  if (!items || items.length === 0) return null

  // Distribute items: evens to column 1 (left), odds to column 2 (right)
  const evenItems = items.filter((_, idx) => idx % 2 === 0)
  const oddItems = items.filter((_, idx) => idx % 2 !== 0)

  return (
    <div 
      className="hidden md:block relative shrink-0 flex-shrink-0 w-[220px] lg:w-[290px] min-w-[290px] hero-carousel-container select-none"
      aria-hidden="true"
    >
      {/* Horizontal and Vertical Fades for Smooth Transition */}
      <div className="absolute top-0 left-0 right-0 h-[70px] bg-gradient-to-b from-[#0d0d0d] to-transparent pointer-events-none z-10" />
      <div className="absolute bottom-0 left-0 right-0 h-[70px] bg-gradient-to-t from-[#0d0d0d] to-transparent pointer-events-none z-10" />
      <div className="absolute top-0 bottom-0 left-0 w-[40px] bg-gradient-to-r from-[#0d0d0d] to-transparent pointer-events-none z-10" />

      {/* Two columns animated with different directions and speeds */}
      <div className="flex gap-3.5 h-full w-full justify-between shrink-0 flex-shrink-0">
        <div className="min-w-[135px] w-[135px] h-full shrink-0 flex-shrink-0">
          <CarouselColumn items={evenItems} direction="up" locale={locale} />
        </div>
        <div className="min-w-[135px] w-[135px] h-full shrink-0 flex-shrink-0">
          <CarouselColumn items={oddItems} direction="down" locale={locale} />
        </div>
      </div>

      <style>{`
        .hero-carousel-container {
          display: none;
          height: 480px;
          overflow: hidden;
          position: relative;
          transform-origin: right center;
        }
        @media (min-width: 768px) {
          .hero-carousel-container {
            display: block;
            width: 220px;
            transform: rotate(-8deg) translateX(20px);
          }
        }
        @media (min-width: 1024px) {
          .hero-carousel-container {
            width: 290px;
            transform: rotate(-8deg) translateX(40px);
          }
        }
      `}</style>
    </div>
  )
}
