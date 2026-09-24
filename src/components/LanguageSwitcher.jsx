import { useEffect, useId, useRef, useState } from 'react'
import { Check, Globe } from 'lucide-react'
import { useLanguage } from '../i18n/LanguageContext'
import { LANGUES } from '../i18n/translations'

const META = {
  fr: { label: 'Français', code: 'FR', dir: 'ltr', lang: 'fr' },
  en: { label: 'English', code: 'EN', dir: 'ltr', lang: 'en' },
  ar: { label: 'العربية', code: 'ع', dir: 'rtl', lang: 'ar' },
}

export default function LanguageSwitcher({ variante = 'claire', compact = false }) {
  const { lang, setLang, t } = useLanguage()
  const [ouvert, setOuvert] = useState(false)
  const [actif, setActif] = useState(() => LANGUES.indexOf(lang))
  const rootRef = useRef(null)
  const boutonRef = useRef(null)
  const optionsRef = useRef([])
  const listeId = useId()

  useEffect(() => {
    setActif(LANGUES.indexOf(lang))
  }, [lang, ouvert])

  useEffect(() => {
    if (!ouvert) return undefined
    const onDoc = (e) => {
      if (!rootRef.current?.contains(e.target)) setOuvert(false)
    }
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        setOuvert(false)
        boutonRef.current?.focus()
      }
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [ouvert])

  useEffect(() => {
    if (ouvert) optionsRef.current[actif]?.focus()
  }, [ouvert, actif])

  const styles =
    variante === 'sombre'
      ? {
          bouton:
            'border-white/25 bg-white/10 text-white hover:bg-white/15 focus-visible:outline-white',
          menu: 'border-white/15 bg-[#0b4a31] text-white shadow-lg',
          item: 'hover:bg-white/10 focus-visible:bg-white/10',
          itemActif: 'bg-white/15',
        }
      : {
          bouton:
            'border-gray-200 bg-white text-gray-700 hover:border-institutional hover:text-institutional focus-visible:outline-institutional',
          menu: 'border-gray-200 bg-white text-gray-800 shadow-lg',
          item: 'hover:bg-gray-50 focus-visible:bg-gray-50',
          itemActif: 'bg-success-bg text-institutional',
        }

  const choisir = (code) => {
    setLang(code)
    setOuvert(false)
    boutonRef.current?.focus()
  }

  const onBoutonKey = (e) => {
    if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      setOuvert(true)
    }
  }

  const onListeKey = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActif((i) => (i + 1) % LANGUES.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActif((i) => (i - 1 + LANGUES.length) % LANGUES.length)
    } else if (e.key === 'Home') {
      e.preventDefault()
      setActif(0)
    } else if (e.key === 'End') {
      e.preventDefault()
      setActif(LANGUES.length - 1)
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      choisir(LANGUES[actif])
    }
  }

  const codeCourant = META[lang]?.code ?? lang.toUpperCase()

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={boutonRef}
        type="button"
        className={[
          'inline-flex items-center gap-1.5 rounded-[8px] border text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2',
          compact ? 'px-2 py-1' : 'px-3 py-1.5',
          styles.bouton,
        ].join(' ')}
        aria-haspopup="listbox"
        aria-expanded={ouvert}
        aria-controls={listeId}
        aria-label={t.language?.label ?? 'Langue'}
        onClick={() => setOuvert((v) => !v)}
        onKeyDown={onBoutonKey}
      >
        <Globe className={compact ? 'h-3.5 w-3.5' : 'h-4 w-4'} aria-hidden />
        <span>{codeCourant}</span>
      </button>

      {ouvert && (
        <ul
          id={listeId}
          role="listbox"
          aria-label={t.language?.label ?? 'Langue'}
          className={[
            'absolute end-0 z-50 mt-1 min-w-[11rem] overflow-hidden rounded-[8px] border py-1',
            styles.menu,
          ].join(' ')}
          onKeyDown={onListeKey}
        >
          {LANGUES.map((code, index) => {
            const meta = META[code]
            const selected = code === lang
            return (
              <li key={code} role="none">
                <button
                  ref={(el) => {
                    optionsRef.current[index] = el
                  }}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  lang={meta.lang}
                  dir={meta.dir}
                  tabIndex={index === actif ? 0 : -1}
                  className={[
                    'flex w-full items-center justify-between gap-3 px-3 py-2 text-start text-sm outline-none',
                    styles.item,
                    selected ? styles.itemActif : '',
                  ].join(' ')}
                  onClick={() => choisir(code)}
                  onMouseEnter={() => setActif(index)}
                >
                  <span>{meta.label}</span>
                  {selected && <Check className="h-4 w-4 shrink-0" aria-hidden />}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
