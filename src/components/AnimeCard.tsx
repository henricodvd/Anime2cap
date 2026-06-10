import React from 'react'
import Link from 'next/link'

export interface AnimeCardProps {
  malId: number
  slug: string
  imageUrl: string
  title: string
  status: 'ongoing' | 'finished'
  type: string
  locale?: string
}

export function AnimeCard({
  malId,
  slug,
  imageUrl,
  title,
  status,
  type,
  locale = 'pt'
}: AnimeCardProps) {
  const isOngoing = status === 'ongoing'

  return (
    <Link
      href={`/${locale}/title/${slug}`}
      className="relative block w-[135px] rounded-[10px] overflow-hidden group transition-transform duration-200 ease-out cursor-pointer hover:scale-[1.03] shrink-0 select-none shadow-lg border border-white/5"
    >
      {/* Anime Cover Image */}
      <img
        src={imageUrl}
        alt={title}
        className="w-full h-[185px] object-cover"
        loading="lazy"
      />

      {/* Info Overlay at the bottom */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/30 to-transparent flex flex-col justify-end p-2.5">
        {/* Status Badge */}
        <span
          className={`self-start px-1.5 py-0.5 rounded text-[8px] font-extrabold uppercase tracking-wider mb-1 leading-none ${
            isOngoing
              ? 'bg-[#1a3a1a] text-[#4caf50]'
              : 'bg-[#1a1a3a] text-[#7c9bff]'
          }`}
        >
          {isOngoing ? 'ONGOING' : 'FINISHED'}
        </span>

        {/* Title */}
        <h4 className="text-white text-[9px] font-black font-body leading-[1.3] line-clamp-2 select-text uppercase tracking-tight">
          {title}
        </h4>
      </div>
    </Link>
  )
}
