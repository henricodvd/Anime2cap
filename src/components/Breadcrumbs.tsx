'use client'

import { ChevronRight, Home } from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'

interface BreadcrumbsProps {
  items: {
    label: string
    href?: string
    active?: boolean
  }[]
}

export function Breadcrumbs({ items }: BreadcrumbsProps) {
  const { locale } = useParams()

  return (
    <nav className="flex mb-8" aria-label="Breadcrumb">
      <ol className="inline-flex items-center space-x-1 md:space-x-2">
        <li className="inline-flex items-center">
          <Link
            href={`/${locale}`}
            className="inline-flex items-center text-xs font-bold uppercase tracking-widest text-paper/40 hover:text-brand-cherry transition-colors"
          >
            <Home className="w-3 h-3 mr-2" />
            {locale === 'pt' ? 'Início' : 'Home'}
          </Link>
        </li>
        {items.map((item, index) => (
          <li key={index}>
            <div className="flex items-center">
              <ChevronRight className="w-3 h-3 text-paper/20 mx-1" />
              {item.active ? (
                <span className="text-xs font-bold uppercase tracking-widest text-brand-cherry italic">
                  {item.label}
                </span>
              ) : (
                <Link
                  href={item.href || '#'}
                  className="text-xs font-bold uppercase tracking-widest text-paper/40 hover:text-brand-cherry transition-colors"
                >
                  {item.label}
                </Link>
              )}
            </div>
          </li>
        ))}
      </ol>
    </nav>
  )
}
