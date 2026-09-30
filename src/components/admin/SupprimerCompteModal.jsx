import { useEffect, useState } from 'react'
import { Trash2 } from 'lucide-react'
import Modal from './Modal'
import Button from '../ui/Button'
import { endpoints } from '../../lib/endpoints'
import { extractErrors } from '../../lib/adminApi'
import { message409, nomComplet } from '../../lib/statuts'
import { useLanguage } from '../../i18n/LanguageContext'
import { traduireMessageApi } from '../../lib/erreursApi'

function idDe(u) {
  return u?.id_utilisateur ?? u?.id
}

function nomService(impact) {
  return impact?.utilisateur?.service?.nom_service ?? impact?.utilisateur?.service?.nom ?? ''
}

function messageAffecte(impact, tf) {
  const service = nomService(impact)
  const n = Number(impact?.dossiers_suivis?.total ?? impact?.dossiers_service?.total ?? 0)
  const parts = []
  if (impact?.est_responsable_service && service) {
    parts.push(tf('admin.utilisateurs.supprimer.duService', { service }))
  }
  if (n > 0) parts.push(tf('admin.utilisateurs.supprimer.deDoleances', { n }))
  if (!parts.length) {
    return tf('admin.utilisateurs.supprimer.encoreResponsable')
  }
  return tf('admin.utilisateurs.supprimer.encoreResponsableDe', {
    parts: parts.join(' et '),
  })
}

export default function SupprimerCompteModal({ open, utilisateur, onClose, onDone, onDesactiver }) {
  const { tf, lang } = useLanguage()
  const [impact, setImpact] = useState(null)
  const [load, setLoad] = useState('idle')
  const [erreur, setErreur] = useState('')
  const [busy, setBusy] = useState(false)

  const uid = idDe(utilisateur)

  const charger = () => {
    if (!uid) return
    setLoad('loading')
    setErreur('')
    endpoints
      .impactUtilisateur(uid)
      .then((res) => {
        setImpact(res.data)
        setLoad('ready')
      })
      .catch((err) => {
        setErreur(
          extractErrors(err, tf('admin.utilisateurs.supprimer.chargementEchec'), lang).message,
        )
        setLoad('error')
      })
  }

  useEffect(() => {
    if (!open || !uid) return undefined
    setImpact(null)
    setBusy(false)
    charger()
    return undefined
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, uid])

  const u = impact?.utilisateur ?? utilisateur
  const possible = Boolean(impact?.suppression_possible)
  const raison = impact?.raison_blocage

  const envoyer = async () => {
    if (busy || !uid) return
    setBusy(true)
    setErreur('')
    try {
      await endpoints.supprimerUtilisateur(uid)
      onDone?.('success', tf('admin.utilisateurs.supprimer.compteSupprime'))
      onClose()
    } catch (err) {
      const code = err.response?.data?.code
      setErreur(
        traduireMessageApi(
          message409(code, extractErrors(err, undefined, lang).message),
          lang,
        ),
      )
      if (err.response?.status === 409) charger()
    } finally {
      setBusy(false)
    }
  }

  const texteBlocage =
    raison === 'dernier_super_admin'
      ? tf('admin.utilisateurs.supprimer.dernierSuperAdmin')
      : raison === 'soi_meme'
        ? tf('admin.utilisateurs.supprimer.soiMeme')
        : raison === 'utilisateur_affecte'
          ? messageAffecte(impact, tf)
          : erreur

  return (
    <Modal
      open={open}
      onClose={onClose}
      busy={busy}
      title={
        <span className="flex items-start gap-3">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-danger-bg text-danger-text">
            <Trash2 className="h-5 w-5" aria-hidden />
          </span>
          <span>{tf('admin.utilisateurs.supprimer.titre', { nom: nomComplet(u) })}</span>
        </span>
      }
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            {tf('commun.cancel')}
          </Button>
          {load === 'ready' && possible && (
            <Button variant="danger" loading={busy} onClick={envoyer}>
              <Trash2 className="h-4 w-4" /> {tf('admin.utilisateurs.supprimer.action')}
            </Button>
          )}
          {load === 'ready' && !possible && raison === 'utilisateur_affecte' && (
            <Button
              onClick={() => {
                onClose()
                onDesactiver?.(utilisateur)
              }}
            >
              {tf('admin.utilisateurs.supprimer.desactiverPlutot')}
            </Button>
          )}
        </>
      }
    >
      {load === 'loading' && <p className="text-sm text-gray-500">{tf('commun.loading')}</p>}
      {load === 'error' && (
        <div>
          <p className="mb-3 text-sm text-red-600">{erreur}</p>
          <Button variant="secondary" onClick={charger}>
            {tf('commun.retry')}
          </Button>
        </div>
      )}
      {load === 'ready' && possible && (
        <div className="space-y-3 text-sm text-gray-700">
          {erreur && (
            <p className="rounded-[8px] border border-red-200 bg-red-50 px-3 py-2.5 text-red-700" role="alert">
              {erreur}
            </p>
          )}
          <p>{tf('admin.utilisateurs.supprimer.definitive')}</p>
          {impact.a_historique && (
            <p>{tf('admin.utilisateurs.supprimer.historiqueConserve')}</p>
          )}
          <p>{tf('admin.utilisateurs.supprimer.aucuneAffectee')}</p>
          <p className="text-xs text-gray-500">
            {tf('admin.utilisateurs.supprimer.conseilDesactiver')}
          </p>
        </div>
      )}
      {load === 'ready' && !possible && (
        <div className="space-y-3 text-sm text-gray-700">
          {erreur && raison !== 'utilisateur_affecte' && raison !== 'dernier_super_admin' && raison !== 'soi_meme' && (
            <p className="rounded-[8px] border border-red-200 bg-red-50 px-3 py-2.5 text-red-700" role="alert">
              {erreur}
            </p>
          )}
          <p>{texteBlocage}</p>
        </div>
      )}
    </Modal>
  )
}
