import { useEffect, useId, useRef, useState } from 'react'
import { ChevronRight, Loader2, Search } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import StatusBadge from '../StatusBadge'
import { endpoints } from '../../lib/endpoints'
import { lignesDoleances, nomComplet, statutKey } from '../../lib/statuts'
import { useLanguage } from '../../i18n/LanguageContext'

function extraireLignes(payload) {
  return lignesDoleances(payload)
}

export default function RechercheRapide() {
  const { tf } = useLanguage()
  const navigate = useNavigate()
  const listId = useId()
  const boxRef = useRef(null)
  const inputRef = useRef(null)
  const [q, setQ] = useState('')
  const [ouvert, setOuvert] = useState(false)
  const [chargement, setChargement] = useState(false)
  const [lignes, setLignes] = useState([])
  const [actif, setActif] = useState(-1)
  const [rechercheFaite, setRechercheFaite] = useState(false)

  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
        setOuvert(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    const terme = q.trim()
    if (terme.length < 3) {
      setLignes([])
      setRechercheFaite(false)
      setChargement(false)
      return undefined
    }
    setChargement(true)
    const timer = setTimeout(() => {
      endpoints
        .doleances({ q: terme, par_page: 5 })
        .then((res) => {
          setLignes(extraireLignes(res.data))
          setRechercheFaite(true)
          setActif(0)
        })
        .catch(() => {
          setLignes([])
          setRechercheFaite(true)
        })
        .finally(() => setChargement(false))
    }, 300)
    return () => clearTimeout(timer)
  }, [q])

  useEffect(() => {
    const onDoc = (e) => {
      if (!boxRef.current?.contains(e.target)) setOuvert(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const ouvrir = (reference) => {
    if (!reference) return
    setOuvert(false)
    setQ('')
    setLignes([])
    navigate(`/admin/doleances/${encodeURIComponent(reference)}`)
  }

  const correspondanceExacte = lignes.find(
    (d) => String(d.reference ?? '').toLowerCase() === q.trim().toLowerCase(),
  )

  const onKeyDown = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      setQ('')
      setLignes([])
      setOuvert(false)
      inputRef.current?.blur()
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (!lignes.length) return
      setActif((i) => (i + 1) % lignes.length)
      return
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (!lignes.length) return
      setActif((i) => (i <= 0 ? lignes.length - 1 : i - 1))
      return
    }
    if (e.key === 'Enter') {
      e.preventDefault()
      if (correspondanceExacte) {
        ouvrir(correspondanceExacte.reference)
        return
      }
      if (actif >= 0 && lignes[actif]) ouvrir(lignes[actif].reference)
    }
  }

  const afficherListe = ouvert && q.trim().length >= 3

  return (
    <div ref={boxRef} className="relative min-w-0 flex-1 max-w-xl">
      <div className="relative">
        <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          ref={inputRef}
          id="recherche-rapide"
          type="search"
          role="combobox"
          aria-expanded={afficherListe}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={afficherListe && actif >= 0 ? `${listId}-opt-${actif}` : undefined}
          value={q}
          onChange={(e) => {
            setQ(e.target.value)
            setOuvert(true)
          }}
          onFocus={() => setOuvert(true)}
          onKeyDown={onKeyDown}
          placeholder={tf('admin.recherche.placeholder')}
          className="w-full rounded-[8px] border border-gray-300 bg-white py-2 ps-9 pe-16 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-institutional focus:ring-2 focus:ring-institutional/20"
        />
        <kbd className="pointer-events-none absolute end-2.5 top-1/2 hidden -translate-y-1/2 whitespace-nowrap rounded border border-gray-200 bg-gray-50 px-1.5 py-0.5 font-sans text-[10px] font-medium text-gray-500 sm:inline">
          Ctrl K
        </kbd>
      </div>

      {afficherListe && (
        <ul
          id={listId}
          role="listbox"
          className="absolute inset-x-0 top-full z-50 mt-1 max-h-80 overflow-auto rounded-[8px] border border-gray-200 bg-white py-1 shadow-lg"
        >
          {chargement && (
            <li className="flex items-center gap-2 px-3 py-3 text-sm text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              {tf('admin.recherche.recherche')}
            </li>
          )}
          {!chargement && rechercheFaite && lignes.length === 0 && (
            <li className="px-3 py-3 text-sm text-gray-500">{tf('admin.recherche.vide')}</li>
          )}
          {!chargement &&
            lignes.map((d, index) => (
              <li
                key={d.reference ?? index}
                id={`${listId}-opt-${index}`}
                role="option"
                aria-selected={index === actif}
              >
                <button
                  type="button"
                  onMouseEnter={() => setActif(index)}
                  onClick={() => ouvrir(d.reference)}
                  className={[
                    'flex w-full items-center gap-3 px-3 py-2 text-start text-sm transition',
                    index === actif ? 'bg-success-bg' : 'hover:bg-gray-50',
                  ].join(' ')}
                >
                  <span className="min-w-0 flex-1">
                    <span className="ltr-isolate block whitespace-nowrap font-mono text-xs font-semibold text-institutional">
                      {d.reference}
                    </span>
                    <span className="block truncate text-xs text-gray-600">{nomComplet(d)}</span>
                  </span>
                  <StatusBadge status={statutKey(d.statut)} label={d.statut?.libelle ?? d.statut} showDot />
                  <ChevronRight className="h-4 w-4 shrink-0 text-gray-400 rtl:-scale-x-100" aria-hidden />
                </button>
              </li>
            ))}
        </ul>
      )}
    </div>
  )
}
