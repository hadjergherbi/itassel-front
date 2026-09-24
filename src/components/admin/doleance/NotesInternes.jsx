import { useEffect, useMemo, useRef, useState } from 'react'
import { Lock, MessageSquare, MoreHorizontal, Pin } from 'lucide-react'
import adminApi, { extractErrors } from '../../../lib/adminApi'
import { nomComplet } from '../../../lib/statuts'
import { useFormat, useLanguage } from '../../../i18n/LanguageContext'
import { useToast } from '../../ui/Toast'
import Avatar from '../../ui/Avatar'
import EditeurNote from './EditeurNote'
import { Card } from './shared'
import {
  ETIQUETTE_STYLE,
  allerALaNote,
  dateNote,
  decouperContenu,
  estModifiable,
  etiquetteKey,
  idsMentions,
  minutesRestantes,
  nomAuteur,
} from './notesHelpers'

function useHorloge(ms = 60000) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), ms)
    return () => window.clearInterval(id)
  }, [ms])
  return now
}

function ContenuNote({ contenu, mentions }) {
  const parts = decouperContenu(contenu, mentions)
  return (
    <p className="whitespace-pre-line text-sm leading-relaxed text-gray-800">
      {parts.map((p, i) =>
        p.type === 'mention' ? (
          <span key={i} className="rounded-[4px] bg-[#e6f6ed] px-0.5 font-medium text-institutional">
            {p.value}
          </span>
        ) : (
          <span key={i}>{p.value}</span>
        ),
      )}
    </p>
  )
}

function MenuNote({ note, maintenant, onEpingler, onModifier, busy }) {
  const { tf } = useLanguage()
  const [ouvert, setOuvert] = useState(false)
  const rootRef = useRef(null)
  const modifiable = estModifiable(note, maintenant)
  const restant = minutesRestantes(note.modifiable_jusqu_a, maintenant)

  useEffect(() => {
    if (!ouvert) return undefined
    const onDoc = (e) => {
      if (!rootRef.current?.contains(e.target)) setOuvert(false)
    }
    const onKey = (e) => {
      if (e.key === 'Escape') setOuvert(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [ouvert])

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={ouvert}
        aria-label={tf('admin.notes.actions')}
        disabled={busy}
        onClick={() => setOuvert((v) => !v)}
        className="inline-flex h-8 w-8 items-center justify-center rounded-[8px] text-gray-500 opacity-0 transition hover:bg-gray-100 hover:text-gray-800 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-institutional/40 group-hover:opacity-100 group-focus-within:opacity-100"
      >
        <MoreHorizontal className="h-4 w-4" aria-hidden />
      </button>
      {ouvert && (
        <ul
          role="menu"
          className="absolute end-0 z-10 mt-1 min-w-40 overflow-hidden rounded-[8px] border border-gray-200 bg-white py-1 shadow-lg"
        >
          <li role="none">
            <button
              type="button"
              role="menuitem"
              disabled={busy}
              onClick={() => {
                setOuvert(false)
                onEpingler()
              }}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-start text-sm text-gray-700 hover:bg-gray-50"
            >
              <Pin className="h-3.5 w-3.5" aria-hidden />
              {note.epinglee ? tf('admin.notes.desepingler') : tf('admin.notes.epingler')}
            </button>
          </li>
          {modifiable && (
            <li role="none">
              <button
                type="button"
                role="menuitem"
                disabled={busy}
                onClick={() => {
                  setOuvert(false)
                  onModifier()
                }}
                className="flex w-full flex-col items-start px-3 py-1.5 text-start text-sm text-gray-700 hover:bg-gray-50"
              >
                <span>{tf('admin.notes.modifier')}</span>
                {restant > 0 && (
                  <span className="text-xs text-gray-400">{tf('admin.notes.modifiableEncore', { n: restant })}</span>
                )}
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  )
}

function NoteItem({
  note,
  maintenant,
  enEdition,
  miseEnEvidence,
  busy,
  errors,
  reference,
  onEpingler,
  onModifier,
  onAnnulerEdition,
  onEnregistrer,
}) {
  const { tf } = useLanguage()
  const { formatDateHeure, formatRelatif } = useFormat()
  const iso = dateNote(note)
  const etiquette = etiquetteKey(note.etiquette)
  const role = [note.auteur?.libelle_role, note.auteur?.service?.nom_service ?? note.auteur?.service]
    .filter(Boolean)
    .join(' · ')
  const restant = minutesRestantes(note.modifiable_jusqu_a, maintenant)
  const epingleur = note.epinglee_par ? nomComplet(note.epinglee_par) : ''

  return (
    <li
      id={`note-${note.id_note}`}
      className={[
        'group rounded-[8px] border px-4 py-3 transition',
        note.epinglee ? 'border-[#f5c77a]/70 bg-[#fffbf2]' : 'border-gray-100 bg-gray-50/60',
        miseEnEvidence ? 'ring-2 ring-institutional/50' : '',
      ].join(' ')}
    >
      {note.epinglee && epingleur && (
        <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-[#8a5a00]">
          <Pin className="h-3.5 w-3.5" aria-hidden />
          {tf('admin.notes.epingleePar', { nom: epingleur })}
        </p>
      )}

      <div className="flex items-start gap-3">
        <Avatar personne={note.auteur} size="md" />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900">
                {nomAuteur(note.auteur)}
                {note.est_auteur && (
                  <span className="ms-1.5 text-xs font-normal text-gray-400">{tf('admin.notes.vous')}</span>
                )}
              </p>
              {role && <p className="text-xs text-gray-500">{role}</p>}
              <p className="mt-0.5 text-xs text-gray-400">
                <time dateTime={iso || undefined} title={formatDateHeure(iso)}>
                  {formatRelatif(iso)}
                </time>
                {note.modifiee_le && <span className="ms-1">{tf('admin.notes.modifiee')}</span>}
                {etiquette && (
                  <span
                    className={`ms-2 inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${ETIQUETTE_STYLE[etiquette]}`}
                  >
                    {tf(
                      etiquette === 'information'
                        ? 'admin.notes.etiquetteInformation'
                        : etiquette === 'a_verifier'
                          ? 'admin.notes.etiquetteVerifier'
                          : 'admin.notes.etiquetteUrgent',
                    )}
                  </span>
                )}
              </p>
              {estModifiable(note, maintenant) && restant > 0 && !enEdition && (
                <p className="mt-0.5 text-xs text-gray-400">{tf('admin.notes.modifiableEncore', { n: restant })}</p>
              )}
            </div>
            {!enEdition && (
              <MenuNote
                note={note}
                maintenant={maintenant}
                busy={busy}
                onEpingler={onEpingler}
                onModifier={onModifier}
              />
            )}
          </div>

          <div className="mt-2">
            {enEdition ? (
              <EditeurNote
                mode="edit"
                reference={reference}
                initialContenu={note.contenu}
                initialMentions={note.mentions ?? []}
                initialEtiquette={etiquette}
                onSubmit={onEnregistrer}
                onCancel={onAnnulerEdition}
                busy={busy}
                errors={errors}
              />
            ) : (
              <ContenuNote contenu={note.contenu} mentions={note.mentions} />
            )}
          </div>
        </div>
      </div>
    </li>
  )
}

export default function NotesInternes({ dossier, onRefresh }) {
  const { tf } = useLanguage()
  const toast = useToast()
  const maintenant = useHorloge()
  const notes = useMemo(() => dossier.notes_internes ?? [], [dossier.notes_internes])
  const [edition, setEdition] = useState(null)
  const [busyId, setBusyId] = useState(null)
  const [creationBusy, setCreationBusy] = useState(false)
  const [errors, setErrors] = useState({})
  const [banniere, setBanniere] = useState('')
  const [miseEnEvidence, setMiseEnEvidence] = useState(null)
  const [annonce, setAnnonce] = useState('')
  const [cleForm, setCleForm] = useState(0)
  const evidenceTimer = useRef(null)

  const { epinglees, autres } = useMemo(() => {
    const pinned = []
    const rest = []
    notes.forEach((n) => {
      if (n.epinglee) pinned.push(n)
      else rest.push(n)
    })
    rest.sort((a, b) => (Date.parse(dateNote(a)) || 0) - (Date.parse(dateNote(b)) || 0))
    return { epinglees: pinned, autres: rest }
  }, [notes])

  const surligner = (id) => {
    setMiseEnEvidence(String(id))
    if (evidenceTimer.current) window.clearTimeout(evidenceTimer.current)
    evidenceTimer.current = window.setTimeout(() => setMiseEnEvidence(null), 2500)
  }

  useEffect(() => () => {
    if (evidenceTimer.current) window.clearTimeout(evidenceTimer.current)
  }, [])

  useEffect(() => {
    const appliquer = () => {
      const hash = window.location.hash
      if (hash === '#notes-internes') {
        document.getElementById('notes-internes')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        return
      }
      if (hash.startsWith('#note-')) {
        const id = hash.slice(6)
        const el = document.getElementById(`note-${id}`)
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' })
          surligner(id)
        }
      }
    }
    const t = window.setTimeout(appliquer, 80)
    window.addEventListener('hashchange', appliquer)
    return () => {
      window.clearTimeout(t)
      window.removeEventListener('hashchange', appliquer)
    }
  }, [notes])

  const extraireNote = (data) => data?.note ?? data

  const gererErreur = (err, fallback) => {
    const status = err.response?.status
    const { message, fields } = extractErrors(err, fallback)
    if (status === 409) {
      setBanniere(tf('admin.notes.delaiDepasse'))
      setEdition(null)
      setErrors({})
      return
    }
    if (status === 403) {
      setBanniere(message || tf('admin.notes.interdite'))
      setEdition(null)
      return
    }
    if (status === 422) {
      setErrors({ contenu: fields.contenu })
      const extra = fields.mentions || fields.etiquette || fields.epinglage || (!fields.contenu ? message : '')
      setBanniere(extra || '')
      return
    }
    if (!err.response) {
      setBanniere(tf('admin.notes.reseau'))
      return
    }
    setBanniere(message || fallback)
  }

  const ajouter = async ({ contenu, mentions, etiquette, notifier_email }) => {
    if (creationBusy) return
    setBanniere('')
    setErrors({})
    setCreationBusy(true)
    try {
      const res = await adminApi.post(`/admin/doleances/${encodeURIComponent(dossier.reference)}/notes`, {
        contenu,
        mentions: idsMentions(mentions),
        notifier_email,
        etiquette,
      })
      const note = extraireNote(res.data)
      setCleForm((n) => n + 1)
      const nMentions = mentions.length
      const texte =
        nMentions > 0
          ? `${tf('admin.notes.ajoutee')} ${tf('admin.notes.personnesNotifiees', { n: nMentions })}`
          : tf('admin.notes.ajoutee')
      toast.show('success', texte)
      setAnnonce(tf('admin.notes.noteAjouteeLive'))
      if (note?.id_note) {
        surligner(note.id_note)
        requestAnimationFrame(() => allerALaNote(note.id_note))
      }
      onRefresh?.()
    } catch (err) {
      gererErreur(err, tf('admin.notes.erreur'))
    } finally {
      setCreationBusy(false)
    }
  }

  const enregistrer = (note) => async ({ contenu, mentions, etiquette }) => {
    if (busyId) return
    setBanniere('')
    setErrors({})
    setBusyId(note.id_note)
    try {
      await adminApi.put(`/admin/doleances/${encodeURIComponent(dossier.reference)}/notes/${note.id_note}`, {
        contenu,
        mentions: idsMentions(mentions),
        etiquette,
      })
      setEdition(null)
      onRefresh?.()
    } catch (err) {
      gererErreur(err, tf('admin.notes.erreur'))
    } finally {
      setBusyId(null)
    }
  }

  const epingler = async (note) => {
    if (busyId) return
    setBanniere('')
    setBusyId(note.id_note)
    try {
      await adminApi.post(`/admin/doleances/${encodeURIComponent(dossier.reference)}/notes/${note.id_note}/epingler`)
      onRefresh?.()
    } catch (err) {
      const status = err.response?.status
      const { message } = extractErrors(err, tf('admin.notes.epinglageImpossible'))
      setBanniere(status === 422 ? message || tf('admin.notes.epinglageImpossible') : message)
    } finally {
      setBusyId(null)
    }
  }

  const renderNote = (n) => (
    <NoteItem
      key={n.id_note}
      note={n}
      maintenant={maintenant}
      enEdition={edition === n.id_note}
      miseEnEvidence={String(miseEnEvidence) === String(n.id_note)}
      busy={busyId === n.id_note}
      errors={edition === n.id_note ? errors : {}}
      reference={dossier.reference}
      onEpingler={() => epingler(n)}
      onModifier={() => {
        setBanniere('')
        setErrors({})
        setEdition(n.id_note)
      }}
      onAnnulerEdition={() => {
        setEdition(null)
        setErrors({})
      }}
      onEnregistrer={enregistrer(n)}
    />
  )

  return (
    <Card
      id="notes-internes"
      title={
        <>
          {tf('admin.notes.titre')}{' '}
          <span className="font-medium text-gray-500">({notes.length})</span>
        </>
      }
      badge={
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#fff4e5] px-2.5 py-0.5 text-xs font-medium text-[#8a5a00]">
          <Lock className="h-3.5 w-3.5" aria-hidden /> {tf('admin.notes.confidentiel')}
        </span>
      }
    >
      <div className="space-y-4">
        {banniere && (
          <p className="rounded-[8px] border border-red-200 bg-danger-bg px-3 py-2 text-sm text-danger-text" role="alert">
            {banniere}
          </p>
        )}

        {notes.length === 0 && (
          <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
            <MessageSquare className="h-8 w-8 text-gray-300" aria-hidden />
            <p className="max-w-sm text-sm text-gray-500">{tf('admin.notes.vide')}</p>
          </div>
        )}

        {epinglees.length > 0 && (
          <div>
            <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-[#8a5a00]">
              <Pin className="h-3.5 w-3.5" aria-hidden />
              {tf('admin.notes.epinglees')}
            </h3>
            <ul className="space-y-3">{epinglees.map(renderNote)}</ul>
          </div>
        )}

        {autres.length > 0 && <ul className="space-y-3">{autres.map(renderNote)}</ul>}

        <div className="border-t border-gray-100 pt-4">
          <EditeurNote
            key={cleForm}
            mode="create"
            reference={dossier.reference}
            onSubmit={ajouter}
            busy={creationBusy}
            errors={edition ? {} : errors}
          />
        </div>
        <p className="sr-only" aria-live="polite">
          {annonce}
        </p>
      </div>
    </Card>
  )
}
