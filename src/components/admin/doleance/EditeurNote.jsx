import { useEffect, useId, useRef, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { FieldError, TextArea } from '../../FormFields'
import Button from '../../ui/Button'
import Avatar from '../../ui/Avatar'
import { Checkbox } from './shared'
import adminApi from '../../../lib/adminApi'
import { nomComplet } from '../../../lib/statuts'
import { useFormat, useLanguage } from '../../../i18n/LanguageContext'
import {
  ETIQUETTES,
  LIMITE_NOTE,
  MAX_MENTIONS,
  SEUIL_ORANGE,
  idsMentions,
  insererMention,
  mentionsConservees,
  trouverDeclencheur,
} from './notesHelpers'

function estMac() {
  if (typeof navigator === 'undefined') return false
  return /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent)
}

function ajusterHauteur(el) {
  if (!el) return
  el.style.height = 'auto'
  const styles = window.getComputedStyle(el)
  const line = Number.parseFloat(styles.lineHeight) || 21
  const pad = (Number.parseFloat(styles.paddingTop) || 0) + (Number.parseFloat(styles.paddingBottom) || 0)
  const min = line * 3 + pad
  const max = line * 10 + pad
  el.style.height = `${Math.min(max, Math.max(min, el.scrollHeight))}px`
}

export default function EditeurNote({
  reference,
  mode = 'create',
  initialContenu = '',
  initialMentions = [],
  initialEtiquette = '',
  onSubmit,
  onCancel,
  busy = false,
  errors = {},
}) {
  const { tf } = useLanguage()
  const { formatNombre } = useFormat()
  const listboxId = useId()
  const champId = useId()
  const champRef = useRef(null)
  const [contenu, setContenu] = useState(initialContenu)
  const [mentions, setMentions] = useState(initialMentions)
  const [etiquette, setEtiquette] = useState(initialEtiquette || '')
  const [notifierEmail, setNotifierEmail] = useState(false)
  const [curseur, setCurseur] = useState(initialContenu.length)
  const [declencheur, setDeclencheur] = useState(null)
  const [suggestions, setSuggestions] = useState([])
  const [chargementListe, setChargementListe] = useState(false)
  const [actif, setActif] = useState(0)
  const [limiteMentions, setLimiteMentions] = useState('')

  useEffect(() => {
    ajusterHauteur(champRef.current)
  }, [contenu])

  useEffect(() => {
    const decl = trouverDeclencheur(contenu, curseur)
    setDeclencheur(decl)
    if (!decl) {
      setSuggestions([])
      setActif(0)
    }
  }, [contenu, curseur])

  useEffect(() => {
    if (!declencheur || !reference) {
      setChargementListe(false)
      return undefined
    }
    const q = declencheur.query
    setChargementListe(true)
    const handle = window.setTimeout(() => {
      adminApi
        .get(`/admin/doleances/${encodeURIComponent(reference)}/mentionnables`, { params: { q } })
        .then((res) => {
          const recus = Array.isArray(res.data) ? res.data : (res.data?.data ?? [])
          const deja = new Set(idsMentions(mentions))
          const filtre = String(q).toLowerCase()
          setSuggestions(
            recus.filter((u) => {
              if (deja.has(u.id_utilisateur)) return false
              if (!filtre) return true
              const nom = nomComplet(u).toLowerCase()
              const role = String(u.libelle_role ?? '').toLowerCase()
              return nom.includes(filtre) || role.includes(filtre)
            }),
          )
          setActif(0)
        })
        .catch(() => setSuggestions([]))
        .finally(() => setChargementListe(false))
    }, 200)
    return () => window.clearTimeout(handle)
  }, [declencheur, reference, mentions])

  const listeOuverte = Boolean(declencheur)

  const appliquerContenu = (valeur, position) => {
    setContenu(valeur)
    setMentions((prev) => mentionsConservees(valeur, prev))
    setLimiteMentions('')
    const pos = position ?? valeur.length
    setCurseur(pos)
    requestAnimationFrame(() => {
      const el = champRef.current
      if (!el) return
      el.focus()
      el.setSelectionRange(pos, pos)
    })
  }

  const choisir = (personne) => {
    if (!personne) return
    if (mentions.length >= MAX_MENTIONS) {
      setLimiteMentions(tf('admin.notes.maxMentions'))
      setDeclencheur(null)
      return
    }
    if (idsMentions(mentions).includes(personne.id_utilisateur)) return
    const { texte, curseur: pos } = insererMention(contenu, curseur, personne)
    setMentions((prev) => mentionsConservees(texte, [...prev, personne]))
    setContenu(texte)
    setDeclencheur(null)
    setSuggestions([])
    setLimiteMentions('')
    setCurseur(pos)
    requestAnimationFrame(() => {
      const el = champRef.current
      if (!el) return
      el.focus()
      el.setSelectionRange(pos, pos)
    })
  }

  const longueur = [...contenu].length
  const vide = !contenu.trim()
  const tropLong = longueur > LIMITE_NOTE
  const peutEnvoyer = !vide && !tropLong && !busy

  const envoyer = () => {
    if (!peutEnvoyer) return
    onSubmit?.({
      contenu: contenu.trim(),
      mentions,
      etiquette: etiquette || null,
      notifier_email: mentions.length > 0 && notifierEmail,
    })
  }

  const onKeyDown = (e) => {
    if (listeOuverte && suggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setActif((i) => (i + 1) % suggestions.length)
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setActif((i) => (i - 1 + suggestions.length) % suggestions.length)
        return
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault()
        choisir(suggestions[actif])
        return
      }
      if (e.key === 'Escape') {
        e.preventDefault()
        setDeclencheur(null)
        setSuggestions([])
        return
      }
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault()
      envoyer()
    }
  }

  const compteurCls =
    longueur > LIMITE_NOTE ? 'text-danger-text font-semibold' : longueur >= SEUIL_ORANGE ? 'text-[#b45309] font-medium' : 'text-gray-400'

  const optionActive = listeOuverte && suggestions[actif] ? `mention-opt-${suggestions[actif].id_utilisateur}` : undefined

  return (
    <div className="space-y-3">
      <div className="relative">
        <TextArea
          ref={champRef}
          id={champId}
          autoSize
          rows={3}
          value={contenu}
          onChange={(e) => appliquerContenu(e.target.value, e.target.selectionStart)}
          onClick={(e) => setCurseur(e.target.selectionStart ?? 0)}
          onKeyUp={(e) => setCurseur(e.target.selectionStart ?? 0)}
          onKeyDown={onKeyDown}
          onBlur={() => {
            window.setTimeout(() => {
              setDeclencheur(null)
              setSuggestions([])
            }, 150)
          }}
          placeholder={tf('admin.notes.placeholder')}
          error={errors.contenu}
          role="combobox"
          aria-expanded={listeOuverte}
          aria-autocomplete="list"
          aria-controls={listeOuverte ? listboxId : undefined}
          aria-activedescendant={optionActive}
          className="min-h-[4.5rem]"
        />
        {listeOuverte && (
          <ul
            id={listboxId}
            role="listbox"
            className="absolute inset-x-0 top-full z-20 mt-1 max-h-56 overflow-auto rounded-[8px] border border-gray-200 bg-white py-1 shadow-lg"
          >
            {chargementListe && suggestions.length === 0 && (
              <li className="flex items-center gap-2 px-3 py-2 text-sm text-gray-500">
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
              </li>
            )}
            {!chargementListe && suggestions.length === 0 && (
              <li className="px-3 py-2 text-sm text-gray-500">{tf('admin.notes.aucunCollege')}</li>
            )}
            {suggestions.map((u, i) => {
              const role = [u.libelle_role, u.service?.nom_service ?? u.service].filter(Boolean).join(' · ')
              return (
                <li
                  key={u.id_utilisateur}
                  id={`mention-opt-${u.id_utilisateur}`}
                  role="option"
                  aria-selected={i === actif}
                  onMouseDown={(e) => e.preventDefault()}
                  onMouseEnter={() => setActif(i)}
                  onClick={() => choisir(u)}
                  className={[
                    'flex cursor-pointer items-center gap-2.5 px-3 py-2 text-sm',
                    i === actif ? 'bg-success-bg text-institutional' : 'text-gray-800 hover:bg-gray-50',
                  ].join(' ')}
                >
                  <Avatar personne={u} size="sm" />
                  <span className="min-w-0">
                    <span className="block font-medium">{nomComplet(u)}</span>
                    {role && <span className="block text-xs text-gray-500">{role}</span>}
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </div>
      <FieldError message={errors.contenu} />
      {limiteMentions && (
        <p className="text-xs text-[#b45309]" role="alert">
          {limiteMentions}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <p className="text-gray-500">{tf('admin.notes.aideMention')}</p>
        <p className={compteurCls}>
          {tf('admin.notes.compteur', { n: formatNombre(longueur), max: formatNombre(LIMITE_NOTE) })}
        </p>
      </div>

      <div role="group" aria-label={tf('admin.notes.etiquette')} className="flex flex-wrap gap-1">
        {ETIQUETTES.map((opt) => {
          const actifOpt = etiquette === opt.id
          return (
            <button
              key={opt.id || 'aucune'}
              type="button"
              onClick={() => setEtiquette(opt.id)}
              className={[
                'rounded-[8px] px-2.5 py-1 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-institutional/40',
                actifOpt
                  ? 'bg-institutional text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
              ].join(' ')}
            >
              {tf(`admin.notes.${opt.key}`)}
            </button>
          )
        })}
      </div>

      {mode === 'create' && mentions.length > 0 && (
        <Checkbox id={`${champId}-email`} checked={notifierEmail} onChange={setNotifierEmail}>
          {tf('admin.notes.notifierEmail')}
        </Checkbox>
      )}

      <div className="flex flex-wrap items-center gap-3">
        {mode === 'edit' ? (
          <>
            <Button type="button" onClick={envoyer} disabled={!peutEnvoyer}>
              {busy ? tf('admin.notes.enregistrement') : tf('admin.notes.enregistrer')}
            </Button>
            <Button type="button" variant="secondary" onClick={onCancel} disabled={busy}>
              {tf('admin.notes.annuler')}
            </Button>
          </>
        ) : (
          <Button type="button" onClick={envoyer} disabled={!peutEnvoyer}>
            {busy ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                {tf('admin.notes.ajoutEnCours')}
              </>
            ) : (
              tf('admin.notes.ajout')
            )}
          </Button>
        )}
        <span className="text-xs text-gray-400">{estMac() ? tf('admin.notes.raccourciMac') : tf('admin.notes.raccourci')}</span>
      </div>
    </div>
  )
}
