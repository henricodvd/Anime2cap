import { Button } from "@/components/ui/button"
import Link from "next/link"

interface FooterProps {
  logo: React.ReactNode
  brandName: React.ReactNode
  socialLinks: Array<{
    icon: React.ReactNode
    href: string
    label: string
  }>
  mainLinks: Array<{
    href: string
    label: string
  }>
  legalLinks: Array<{
    href: string
    label: string
  }>
  copyright: {
    text: string
    license?: string
  }
}

export function Footer({
  logo,
  brandName,
  socialLinks,
  mainLinks,
  legalLinks,
  copyright,
}: FooterProps) {
  return (
    <footer className="py-24 border-t border-white/5" role="contentinfo">
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between mb-12 gap-6">
          <Link
            href="/"
            className="flex items-center gap-x-2 w-fit"
            aria-label="Anime2Cap Home"
          >
            {logo}
            {brandName}
          </Link>
          <ul className="flex list-none space-x-3" aria-label="Social media links">
            {socialLinks.map((link, i) => (
              <li key={i}>
                <Button
                  variant="secondary"
                  size="icon"
                  className="h-10 w-10 rounded-full bg-white/5 hover:bg-white/10 text-paper/70 hover:text-paper border-0"
                  asChild
                >
                  <a href={link.href} target="_blank" aria-label={link.label}>
                    {link.icon}
                  </a>
                </Button>
              </li>
            ))}
          </ul>
        </div>
        <div className="border-t border-white/5 mt-6 pt-12 lg:grid lg:grid-cols-10">
          <nav className="lg:mt-0 lg:col-[4/11]" aria-label="Footer main navigation">
            <ul className="list-none flex flex-wrap -my-1 -mx-2 lg:justify-end">
              {mainLinks.map((link, i) => (
                <li key={i} className="my-1 mx-2 shrink-0">
                  <Link
                    href={link.href}
                    className="text-xs uppercase tracking-widest font-black text-brand-cherry underline-offset-4 hover:underline font-body"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <div className="mt-6 lg:mt-0 lg:col-[4/11]">
            <nav aria-label="Legal navigation">
              <ul className="list-none flex flex-wrap -my-1 -mx-3 lg:justify-end">
                {legalLinks.map((link, i) => (
                  <li key={i} className="my-1 mx-3 shrink-0">
                    <Link
                      href={link.href}
                      className="text-[10px] uppercase tracking-[0.2em] text-paper/30 underline-offset-4 hover:underline hover:text-paper/60 transition-colors font-body"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
          <div className="mt-6 text-sm leading-6 text-paper/40 whitespace-nowrap lg:mt-0 lg:row-[1/3] lg:col-[1/4]">
            <div className="text-xs sm:text-sm">{copyright.text}</div>
            {copyright.license && <div className="text-[10px] text-paper/20 mt-1 uppercase tracking-wider">{copyright.license}</div>}
          </div>
        </div>
      </div>
    </footer>
  )
}
