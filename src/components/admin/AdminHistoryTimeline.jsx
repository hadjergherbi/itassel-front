import { useMemo, useState } from 'react'
import { StickyNote } from 'lucide-react'
import { statutKey, formatDate, nomComplet } from '../../lib/statuts'
import adminApi, { extractErrors } from '../../lib/adminApi'
import { useLanguage } from '../../i18n/LanguageContext'
import { allerALaNote, dateNote } from './doleance/notesHelpers'

const DOT = {
  nouvelle: 'bg-[#1a5f9e]',
  en_cours: 'bg-[#d97706]',
  information_demandee: 'bg-[#7c3aed]',
  resolue: 'bg-institutional',
  deposee: 'bg-institutional',
  cloturee: 'bg-gray-500',
  non_fondee: 'bg-[#b42318]',
  double: 'bg-[#0d9488]',
  default: 'bg-gray-400',
}

const TITRES = {
  depot: 'Nouvelle doléance',
  complement_demande: 'Information demandée',
  complement_recu: 'Complément reçu',
  complement_examine: 'Complément examiné',
  complement_annule: 'Demande de complément annulée',
  complement_annule_motif: "Motif de l'annulation",
  reponse: 'Réponse publiée',
  reaffectation_demande: 'Demande de réaffectation · En attente',
  reaffectation_annulee: 'Réaffectation annulée',
  reaffectation_refusee: 'Réaffectation refusée',
  reaffectation: 'Dossier réaffecté',
  reaffectation_sans_suite: 'Réaffectation sans suite',
  affectation: 'Dossier affecté',
}

const CIBLE = {
  demandeur: 'au demandeur',
  super_admin: 'au Super Admin',
  responsable: 'au responsable',
}

function titreEvenement(h) {
  if (h.type_evenement === 'changement_statut') {
    const avant = h.statut_avant?.libelle
    const apres = h.statut_apres?.libelle
    if (avant && apres) return `${avant} → ${apres}`
    return apres || 'Changement de statut'
  }
  if (h.type_evenement === 'reaffectation_demande') {
    const service = h.service_propose?.nom_service
    return service
      ? `Demande de réaffectation → ${service} · En attente`
      : TITRES.reaffectation_demande
  }
  if (h.type_evenement === 'reaffectation') {
    const titre = String(h.detail ?? '').split('\n')[0]?.trim()
    if (titre) return titre
    const service = h.service_destination?.nom_service
    return service ? `Réaffectation → ${service}` : TITRES.reaffectation
  }
  return TITRES[h.type_evenement] ?? h.type_evenement
}

function lignesReaffectation(detail) {
  const lignes = String(detail ?? '').split('\n')
  return {
    motif: lignes.length > 1 ? lignes[1].trim() : '',
    extra: lignes.length > 2 ? lignes.slice(2).join('\n').trim() : '',
  }
}

function nomServiceNotif(notification, evenement) {
  const s = notification.service
  if (typeof s === 'string' && s) return s
  return (
    s?.nom_service ??
    notification.nom_service ??
    evenement?.service_destination?.nom_service ??
    ''
  )
}

function couleurPoint(h) {
  const key = statutKey(h.statut_apres)
  if (key !== 'default') return key
  if (h.type_evenement === 'depot') return 'nouvelle'
  if (h.type_evenement === 'complement_demande') return 'information_demandee'
  if (h.type_evenement === 'complement_recu' || h.type_evenement === 'complement') return 'en_cours'
  if (h.type_evenement === 'complement_annule') return 'information_demandee'
  if (h.type_evenement === 'reponse' || h.type_evenement === 'complement_examine') return 'resolue'
  return 'default'
}

function auteurEvenement(h, demandeur) {
  if (h.type_evenement === 'depot' || h.type_evenement === 'complement_recu') {
    const nom = nomComplet(demandeur)
    return nom !== '—' ? `${nom} (demandeur)` : 'Demandeur'
  }
  if (h.utilisateur) return nomComplet(h.utilisateur)
  return 'Système'
}

function LigneNotification({ notification, typeEvenement, serviceResponsable, onRenvoi }) {
  const [busy, setBusy] = useState(false)
  const cible =
    notification.destinataire_type === 'responsable'
      ? serviceResponsable
        ? `au responsable ${serviceResponsable}`
        : 'au responsable'
      : CIBLE[notification.destinataire_type] ?? ''

  if (notification.etat_envoi === 'transmis') {
    return (
      <p className="text-xs font-medium text-institutional">
        Email transmis {cible}
      </p>
    )
  }

  const renvoyer = async () => {
    if (busy) return
    setBusy(true)
    try {
      await onRenvoi(notification)
    } finally {
      setBusy(false)
    }
  }

  const prefixe =
    typeEvenement === 'changement_statut'
      ? 'Statut enregistré, email non transmis'
      : 'Email non transmis'

  return (
    <p className="text-xs font-medium text-[#b42318]">
      {prefixe}
      {' · '}
      <button
        type="button"
        onClick={renvoyer}
        disabled={busy}
        className="underline underline-offset-2 disabled:opacity-60"
      >
        {busy ? 'Envoi…' : 'Renvoyer'}
      </button>
    </p>
  )
}

export default function AdminHistoryTimeline({ historique = [], notesInternes = [], demandeur, onDone }) {
  const { tf } = useLanguage()
  const [afficherNotes, setAfficherNotes] = useState(false)

  const items = useMemo(() => {
    const evts = [...historique]
    if (afficherNotes) {
      notesInternes.forEach((n) => {
        evts.push({
          type_evenement: 'note_interne',
          id_evenement: `note-${n.id_note}`,
          date_evenement: dateNote(n),
          note: n,
          visible_demandeur: false,
        })
      })
    }
    return evts.sort((a, b) => (Date.parse(b.date_evenement) || 0) - (Date.parse(a.date_evenement) || 0))
  }, [historique, notesInternes, afficherNotes])

  const renvoyer = async (notification) => {
    try {
      const res = await adminApi.post(`/admin/notifications/${notification.id_notification}/renvoyer`)
      onDone('success', res.data?.message || 'Email renvoyé.')
    } catch (err) {
      const code = err.response?.data?.code
      const { message } = extractErrors(err, "Le renvoi de l'email a échoué.")
      onDone(
        'error',
        code === 'deja_transmis' ? message || 'Cet email a déjà été transmis.' : message,
      )
    }
  }

  return (
    <aside className="rounded-[8px] border border-gray-200 bg-white p-5 shadow-sm lg:sticky lg:top-24">
      <h2 className="mb-4 text-base font-bold text-gray-900">Historique</h2>
      <div className="mb-5 flex items-center justify-between gap-3">
        <label htmlFor="afficher-notes-internes" className="text-sm text-gray-700">
          {tf('admin.notes.afficherDansHistorique')}
        </label>
        <button
          id="afficher-notes-internes"
          type="button"
          role="switch"
          aria-checked={afficherNotes}
          onClick={() => setAfficherNotes((v) => !v)}
          className={[
            'relative h-6 w-11 shrink-0 rounded-full transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-institutional/40',
            afficherNotes ? 'bg-action' : 'bg-gray-300',
          ].join(' ')}
        >
          <span
            className={[
              'absolute top-0.5 start-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform',
              afficherNotes ? 'ltr:translate-x-5 rtl:-translate-x-5' : 'translate-x-0',
            ].join(' ')}
            aria-hidden
          />
        </button>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-gray-500">Aucun événement pour le moment.</p>
      ) : (
        <ol className="relative space-y-5 border-s border-gray-200 ps-5">
          {items.map((h) => {
            if (h.type_evenement === 'note_interne') {
              const note = h.note
              return (
                <li key={h.id_evenement} className="relative">
                  <span
                    className="absolute -start-[1.65rem] top-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#fff4e5] text-[#b45309] ring-4 ring-white"
                    aria-hidden
                  >
                    <StickyNote className="h-3 w-3" />
                  </span>
                  <p className="text-sm font-semibold text-gray-900">
                    {tf('admin.notes.noteDe', { nom: nomComplet(note?.auteur) })}
                  </p>
                  {note?.contenu && (
                    <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-gray-600">{note.contenu}</p>
                  )}
                  <button
                    type="button"
                    onClick={() => allerALaNote(note?.id_note)}
                    className="mt-1 text-xs font-medium text-institutional underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-institutional/40"
                  >
                    {tf('admin.notes.voirNote')}
                  </button>
                  <p className="mt-1 text-xs text-gray-400">{formatDate(h.date_evenement)}</p>
                </li>
              )
            }
            const dot = DOT[couleurPoint(h)] ?? DOT.default
            const notifs = h.notifications ?? []
            const reaff = h.type_evenement === 'reaffectation' ? lignesReaffectation(h.detail) : null
            return (
              <li key={h.id_evenement ?? `${h.type_evenement}-${h.date_evenement}`} className="relative">
                <span
                  className={`absolute -start-[1.4rem] top-1.5 h-2.5 w-2.5 rounded-full ring-4 ring-white ${dot}`}
                  aria-hidden
                />
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-gray-900">{titreEvenement(h)}</p>
                  {h.visible_demandeur ? (
                    <span className="inline-flex rounded-full bg-[#e6f6ed] px-2 py-0.5 text-[10px] font-medium text-institutional">
                      Visible du demandeur
                    </span>
                  ) : (
                    <span className="inline-flex rounded-full bg-[#fff4e5] px-2 py-0.5 text-[10px] font-medium text-[#8a5a00]">
                      Interne
                    </span>
                  )}
                </div>
                {reaff ? (
                  <>
                    {reaff.motif ? (
                      <p className="text-xs leading-relaxed text-gray-600">« {reaff.motif} »</p>
                    ) : null}
                    {reaff.extra ? (
                      <p className="mt-0.5 text-xs leading-relaxed text-gray-600">{reaff.extra}</p>
                    ) : null}
                  </>
                ) : h.detail ? (
                  <p className="text-xs leading-relaxed text-gray-600">« {h.detail} »</p>
                ) : null}
                <p className="mt-1 text-xs text-gray-400">
                  {auteurEvenement(h, demandeur)} · {formatDate(h.date_evenement)}
                </p>
                <div className="mt-1.5 space-y-0.5">
                  {notifs.length === 0 ? (
                    <p className="text-xs text-gray-400">Aucune notification</p>
                  ) : (
                    notifs.map((n) => (
                      <LigneNotification
                        key={n.id_notification}
                        notification={n}
                        typeEvenement={h.type_evenement}
                        serviceResponsable={nomServiceNotif(n, h)}
                        onRenvoi={renvoyer}
                      />
                    ))
                  )}
                </div>
              </li>
            )
          })}
        </ol>
      )}
    </aside>
  )
}
