'use client'

import { BookOpen, Search as SearchIcon, Loader2, ChevronDown } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { Link, useRouter, usePathname } from "@/i18n/routing";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations, useLocale } from "next-intl";

interface SearchResult {
  id: number;
  name: string;
  slug: string;
  image?: string;
  type: string;
}

export function Navbar() {
  const t = useTranslations('Navbar');
  const tTypes = useTranslations('Types');
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isLangOpen, setIsLangOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const langRef = useRef<HTMLDivElement>(null);

  const isHome = pathname === "/";

  const handleLanguageChange = (newLocale: 'en' | 'pt' | 'ja') => {
    router.replace(pathname, { locale: newLocale });
    setIsLangOpen(false);
  };

  const handleSearch = async (val: string) => {
    setQuery(val);
    if (val.trim().length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    setIsLoading(true);
    setIsOpen(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(val)}`);
      if (res.ok) {
        const data = await res.json();
        setResults(data.results || []);
      }
    } catch (err) {
      console.error("Search failed", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
      if (langRef.current && !langRef.current.contains(event.target as Node)) {
        setIsLangOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close dropdown on route change
  useEffect(() => {
    setIsOpen(false);
    setQuery("");
  }, [pathname]);

  return (
    <nav className="fixed top-4 sm:top-6 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] sm:w-[calc(100%-3rem)] max-w-6xl z-50 transition-all duration-500">
      <div 
        className="relative rounded-2xl sm:rounded-3xl border border-white/5 bg-night/70 backdrop-blur-3xl shadow-[0_8px_32px_0_rgba(0,0,0,0.4)] px-4 sm:px-8 h-16 sm:h-20 flex items-center justify-between gap-2 sm:gap-8"
        role="navigation"
        aria-label="Main Navigation"
      >
        <Link 
          href="/" 
          className="flex items-center gap-2.5 group shrink-0"
          aria-label="Anime2Cap Home"
        >
          <div className="bg-brand-cherry/10 p-1.5 sm:p-2 rounded-lg sm:rounded-xl border border-brand-cherry/20 group-hover:bg-brand-cherry/20 transition-all duration-500 group-hover:scale-110">
            <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 text-brand-cherry" />
          </div>
          <span className="font-heading text-lg sm:text-2xl font-extrabold tracking-tight text-paper italic">
            Anime<span className="text-brand-cherry drop-shadow-[0_0_8px_rgba(190,50,82,0.5)]">2</span>Cap
          </span>
        </Link>

        {!isHome && (
          <div className="flex-1 max-w-md relative" ref={dropdownRef} role="search">
            <div className="relative group">
              <div className="absolute inset-y-0 left-3 sm:left-4 flex items-center pointer-events-none">
                {isLoading ? (
                  <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 animate-spin text-brand-cherry" />
                ) : (
                  <SearchIcon className="w-3 h-3 sm:w-4 sm:h-4 text-paper/20 group-focus-within:text-brand-cherry transition-colors" />
                )}
              </div>
              <input
                type="text"
                value={query}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder={t('searchPlaceholder')}
                aria-label={t('searchPlaceholder')}
                aria-autocomplete="list"
                aria-controls="search-results"
                className="w-full bg-white/5 border border-white/5 rounded-full py-2 sm:py-2.5 pl-9 sm:pl-11 pr-4 text-xs sm:text-sm text-paper placeholder-paper/10 focus:outline-none focus:border-brand-cherry/40 focus:bg-white/[0.08] transition-all font-body"
              />
            </div>

            {/* Dropdown Results */}
            <AnimatePresence>
              {isOpen && query.length >= 2 && (
                <motion.div
                  id="search-results"
                  role="listbox"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute top-full mt-3 left-1/2 -translate-x-1/2 w-[95vw] sm:w-full bg-[#0A0A0A] border border-white/15 rounded-xl sm:rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] overflow-hidden z-[100] max-h-[70vh] sm:max-h-[400px] overflow-y-auto custom-scrollbar"
                >
                  {results.length > 0 ? (
                    <div className="py-2">
                      {results.map((anime) => (
                        <Link 
                          key={anime.id} 
                          href={`/title/${anime.slug}`}
                          role="option"
                          aria-selected="false"
                          className="flex items-center gap-2 sm:gap-4 px-2 sm:px-4 py-1.5 sm:py-3 hover:bg-white/5 transition-colors group"
                        >
                          <div className="w-8 h-12 sm:w-12 sm:h-16 shrink-0 rounded-lg overflow-hidden border border-white/10">
                            <img src={anime.image} alt={anime.name} className="w-full h-full object-cover" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-xs sm:text-sm font-bold text-paper truncate group-hover:text-brand-cherry transition-colors uppercase italic font-heading">
                              {anime.name}
                            </h4>
                            <span className="text-[9px] sm:text-[10px] text-paper/30 uppercase tracking-widest font-bold">
                              {tTypes(anime.type?.toLowerCase() || 'anime')}
                            </span>
                          </div>
                        </Link>
                      ))}
                    </div>
                  ) : !isLoading && (
                    <div className="p-6 sm:p-8 text-center text-paper/20 text-[10px] sm:text-xs font-body uppercase tracking-widest">
                      {t('noResults')}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
          <div className="relative" ref={langRef}>
            <button
              onClick={() => setIsLangOpen(!isLangOpen)}
              aria-label="Switch Language"
              aria-haspopup="listbox"
              aria-expanded={isLangOpen}
              className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 transition-all text-[10px] sm:text-xs font-bold uppercase tracking-wider text-paper/60 hover:text-paper"
            >
              <span>{locale}</span>
              <motion.div
                animate={{ rotate: isLangOpen ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronDown className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
              </motion.div>
            </button>

            <AnimatePresence>
              {isLangOpen && (
                <motion.div
                  role="listbox"
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute top-full mt-2 right-0 bg-[#0A0A0A]/90 backdrop-blur-2xl border border-white/10 rounded-xl sm:rounded-2xl shadow-2xl overflow-hidden z-[110] min-w-[110px] sm:min-w-[120px]"
                >
                  {(['pt', 'en', 'ja'] as const).map((l) => (
                    <button
                      key={l}
                      role="option"
                      aria-selected={locale === l}
                      onClick={() => handleLanguageChange(l)}
                      className={`w-full px-3 sm:px-4 py-2 sm:py-2.5 text-left text-[10px] sm:text-xs font-bold uppercase tracking-widest transition-colors flex items-center justify-between group ${
                        locale === l ? 'text-brand-cherry bg-brand-cherry/5' : 'text-paper/40 hover:text-paper hover:bg-white/5'
                      }`}
                    >
                      {l === 'pt' ? 'Português' : l === 'en' ? 'English' : '日本語'}
                      {locale === l && <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-brand-cherry shadow-[0_0_8px_rgba(190,50,82,0.8)]" />}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </nav>
  );
}

