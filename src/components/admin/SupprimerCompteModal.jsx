import { useEffect, useState } from 'react'
import { Trash2 } from 'lucide-react'
import Modal from './Modal'
import Button from '../ui/Button'
import { endpoints } from '../../lib/endpoints'
import { extractErrors } from '../../lib/adminApi'
import { message409, nomComplet } from '../../lib/statuts'

function idDe(u) {
  return u?.id_utilisateur ?? u?.id
}

function nomService(impact) {
  return impact?.utilisateur?.service?.nom_service ?? impact?.utilisateur?.service?.nom ?? ''
}

function messageAffecte(impact) {
  const service = nomService(impact)
  const n = Number(impact?.dossiers_suivis?.total ?? impact?.dossiers_service?.total ?? 0)
  const parts = []
  if (impact?.est_responsable_service && service) parts.push(`du service ${service}`)
  if (n > 0) parts.push(`de ${n} doléance${n > 1 ? 's' : ''} ouverte${n > 1 ? 's' : ''}`)
  if (!parts.length) {
    return 'Ce compte est encore responsable de dossiers ouverts. Désactivez-le d’abord en désignant un remplaçant.'
  }
  return `Ce compte est encore responsable ${parts.join(' et ')}. Désactivez-le d’abord en désignant un remplaçant.`
}

export default function SupprimerCompteModal({ open, utilisateur, onClose, onDone, onDesactiver }) {
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
        setErreur(extractErrors(err, 'Impossible de charger l’impact de ce compte.').message)
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
      onDone?.('success', 'Compte supprimé.')
      onClose()
    } catch (err) {
      const code = err.response?.data?.code
      setErreur(message409(code, extractErrors(err).message))
      if (err.response?.status === 409) charger()
    } finally {
      setBusy(false)
    }
  }

  const texteBlocage =
    raison === 'dernier_super_admin'
      ? 'Impossible : c’est le dernier Super administrateur actif.'
      : raison === 'soi_meme'
        ? 'Vous ne pouvez pas supprimer votre propre compte.'
        : raison === 'utilisateur_affecte'
          ? messageAffecte(impact)
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
          <span>Supprimer le compte de {nomComplet(u)} ?</span>
        </span>
      }
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Annuler
          </Button>
          {load === 'ready' && possible && (
            <Button variant="danger" loading={busy} onClick={envoyer}>
              <Trash2 className="h-4 w-4" /> Supprimer définitivement
            </Button>
          )}
          {load === 'ready' && !possible && raison === 'utilisateur_affecte' && (
            <Button
              onClick={() => {
                onClose()
                onDesactiver?.(utilisateur)
              }}
            >
              Désactiver plutôt
            </Button>
          )}
        </>
      }
    >
      {load === 'loading' && <p className="text-sm text-gray-500">Chargement…</p>}
      {load === 'error' && (
        <div>
          <p className="mb-3 text-sm text-red-600">{erreur}</p>
          <Button variant="secondary" onClick={charger}>
            Réessayer
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
          <p>Cette action est définitive.</p>
          {impact.a_historique && (
            <p>Ses actions passées restent visibles dans l’historique des doléances, sous son nom.</p>
          )}
          <p>Aucune doléance ne lui est actuellement affectée.</p>
          <p className="text-xs text-gray-500">
            Pour conserver le compte sans permettre la connexion, désactivez-le plutôt.
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
