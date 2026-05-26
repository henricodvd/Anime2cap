'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import Script from 'next/script'
import { motion, AnimatePresence } from 'framer-motion'
import { Shield } from 'lucide-react'

const CONSENT_KEY = 'cookie-consent-accepted'
const GA_ID = 'G-99VJ022RPE'

export function CookieConsent() {
  const t = useTranslations('CookieConsent')
  // null = not yet checked, true = accepted, false = declined/not yet answered
  const [consent, setConsent] = useState<boolean | null>(null)

  useEffect(() => {
    const stored = localStorage.getItem(CONSENT_KEY)
    if (stored === 'true') {
      setConsent(true)
    } else if (stored === 'false') {
      setConsent(false)
    } else {
      // First visit — show banner (consent stays null → banner visible)
      setConsent(null)
    }
  }, [])

  const handleAccept = () => {
    localStorage.setItem(CONSENT_KEY, 'true')
    setConsent(true)
  }

  const handleDecline = () => {
    localStorage.setItem(CONSENT_KEY, 'false')
    setConsent(false)
  }

  const showBanner = consent === null

  return (
    <>
      {/* ── Tracking Scripts — only injected after explicit consent ── */}
      {consent === true && (
        <>
          {/* Google Analytics */}
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
            strategy="lazyOnload"
          />
          <Script id="google-analytics" strategy="lazyOnload">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${GA_ID}');
            `}
          </Script>

          {/* Google AdSense */}
          <Script
            id="google-ads"
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${process.env.NEXT_PUBLIC_ADSENSE_ID}`}
            strategy="lazyOnload"
            crossOrigin="anonymous"
          />

          {/* Microsoft Clarity */}
          <Script id="clarity-script" strategy="lazyOnload">
            {`
              (function(c,l,a,r,i,t,y){
                c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
                t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
                y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
              })(window, document, "clarity", "script", "${process.env.NEXT_PUBLIC_CLARITY_ID}");
            `}
          </Script>
        </>
      )}

      {/* ── Consent Banner ── */}
      <AnimatePresence>
        {showBanner && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-4 right-4 left-4 sm:left-auto sm:max-w-md z-[9999]"
          >
            <div className="bg-surface/95 backdrop-blur-xl border border-white/10 rounded-2xl p-5 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)]">
              {/* Header */}
              <div className="flex items-center gap-2.5 mb-3">
                <div className="p-1.5 rounded-lg bg-brand-cherry/10 border border-brand-cherry/20">
                  <Shield className="w-4 h-4 text-brand-cherry" />
                </div>
                <h3 className="font-heading text-sm font-bold text-paper uppercase italic tracking-wide">
                  {t('title')}
                </h3>
              </div>

              {/* Description */}
              <p className="text-paper/50 text-xs leading-relaxed font-body mb-4">
                {t('description')}
              </p>

              {/* Actions */}
              <div className="flex gap-2.5">
                <button
                  onClick={handleAccept}
                  className="flex-1 py-2.5 bg-brand-cherry hover:saturate-150 text-white text-xs font-bold rounded-xl transition-all active:scale-[0.97] font-heading uppercase tracking-widest italic"
                >
                  {t('accept')}
                </button>
                <button
                  onClick={handleDecline}
                  className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 text-paper/50 hover:text-paper/70 text-xs font-bold rounded-xl border border-white/5 transition-all active:scale-[0.97] font-heading uppercase tracking-widest italic"
                >
                  {t('decline')}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
