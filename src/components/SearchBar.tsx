'use client'

import { Search, Loader2, X } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'

interface SearchBarProps {
  onSearch: (query: string) => void
  isLoading?: boolean
  className?: string
  placeholder?: string
  small?: boolean
}

export function SearchBar({ onSearch, isLoading = false, className = '', placeholder = "Ex: Naruto, One Piece, Bleach...", small = false }: SearchBarProps) {
  const [query, setQuery] = useState('')
  const lastQuery = useRef('')

  useEffect(() => {
    const timer = setTimeout(() => {
      const trimmed = query.trim()
      if (trimmed.length >= 2 && trimmed !== lastQuery.current) {
        lastQuery.current = trimmed
        onSearch(trimmed)
      } else if (trimmed.length === 0 && lastQuery.current !== '') {
        lastQuery.current = ''
        onSearch('')
      }
    }, 600)

    return () => clearTimeout(timer)
  }, [query, onSearch])

  return (
    <div className={`relative w-full mx-auto group ${className}`}>
      <div className={`relative flex items-center bg-surface border border-white/5 rounded-full overflow-hidden transition-all duration-500 focus-within:border-brand-cherry focus-within:shadow-[0_0_20px_rgba(190,50,82,0.15)] ${small ? 'h-12' : 'h-20'}`}>
        <div className="flex items-center justify-center w-14 h-full shrink-0">
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin text-brand-cherry" />
          ) : (
            <Search className={`w-5 h-5 transition-colors duration-300 ${query ? 'text-brand-cherry' : 'text-paper/20'}`} />
          )}
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className={`w-full bg-transparent border-none px-2 text-paper placeholder-paper/10 focus:outline-none focus:ring-0 font-body ${small ? 'text-sm' : 'text-xl'}`}
        />
        {query && (
          <button 
            onClick={() => setQuery('')}
            className="flex items-center justify-center w-12 h-full text-paper/20 hover:text-brand-cherry transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  )
}
