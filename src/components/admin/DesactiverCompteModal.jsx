import { useEffect, useState } from 'react'
import { Shield } from 'lucide-react'
import Modal from './Modal'
import Button from '../ui/Button'
import { FieldLabel, SelectInput } from '../FormFields'
import { endpoints } from '../../lib/endpoints'
import { extractErrors } from '../../lib/adminApi'
import { message409, nomComplet } from '../../lib/statuts'

function idDe(u) {
  return u?.id_utilisateur ?? u?.id
}

function nomService(impact) {
  return impact?.utilisateur?.service?.nom_service ?? impact?.utilisateur?.service?.nom ?? ''
}

function CarteRadio({ name, value, checked, disabled, titre, texte, extra, onChange }) {
  return (
    <label
      className={[
        'flex cursor-pointer items-start gap-3 rounded-[8px] border px-4 py-3 text-sm transition',
        checked ? 'border-institutional bg-[#e6f6ed]' : 'border-gray-200 bg-white hover:border-gray-300',
        disabled ? 'cursor-not-allowed opacity-60' : '',
      ].join(' ')}
    >
      <input
        type="radio"
        name={name}
        className="mt-1 h-4 w-4 accent-[#006b3f]"
        checked={checked}
        disabled={disabled}
        onChange={() => onChange(value)}
      />
      <div className="min-w-0">
        <p className="font-medium text-gray-900">{titre}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-gray-500">{texte}</p>
        {extra && <p className="mt-1 text-xs text-warning-text">{extra}</p>}
      </div>
    </label>
  )
}

export default function DesactiverCompteModal({ open, utilisateur, onClose, onDone }) {
  const [impact, setImpact] = useState(null)
  const [load, setLoad] = useState('idle')
  const [erreur, setErreur] = useState('')
  const [mode, setMode] = useState('remplacant')
  const [idRemplacant, setIdRemplacant] = useState('')
  const [busy, setBusy] = useState(false)

  const uid = idDe(utilisateur)

  useEffect(() => {
    if (!open || !uid) return undefined
    let annule = false
    setImpact(null)
    setErreur('')
    setBusy(false)
    setLoad('loading')
    endpoints
      .impactUtilisateur(uid)
      .then((res) => {
        if (annule) return
        const data = res.data
        setImpact(data)
        const liste = data.remplacants_possibles ?? []
        if (data.est_responsable_service) {
          if (liste.length) {
            setMode('remplacant')
            setIdRemplacant(String(idDe(liste[0]) ?? ''))
          } else {
            setMode('sans')
            setIdRemplacant('')
          }
        } else {
          setMode('sans')
          setIdRemplacant('')
        }
        setLoad('ready')
      })
      .catch((err) => {
        if (annule) return
        setErreur(extractErrors(err, 'Impossible de charger l’impact de ce compte.').message)
        setLoad('error')
      })
    return () => {
      annule = true
    }
  }, [open, uid])

  const u = impact?.utilisateur ?? utilisateur
  const service = nomService(impact)
  const remplacants = impact?.remplacants_possibles ?? []
  const remplacant = remplacants.find((c) => String(idDe(c)) === String(idRemplacant))
  const dossiers = impact?.dossiers_service
  const suivis = impact?.dossiers_suivis
  const responsableService = Boolean(impact?.est_responsable_service)

  const envoyer = async (e) => {
    e.preventDefault()
    if (busy || !uid) return
    if (responsableService && mode === 'remplacant' && !idRemplacant) {
      setErreur('Choisissez un remplaçant.')
      return
    }
    setBusy(true)
    setErreur('')
    try {
      const res = await endpoints.desactiverUtilisateur(
        uid,
        mode === 'remplacant' && idRemplacant ? Number(idRemplacant) : null,
      )
      const n = Number(res.data?.dossiers_transferes ?? 0)
      let texte = res.data?.message || 'Compte désactivé.'
      if (n > 0 && remplacant) {
        texte += ` ${n} dossier(s) confiés à ${nomComplet(remplacant)}.`
      } else if (n > 0) {
        texte += ` ${n} dossier(s) confiés au remplaçant.`
      }
      onDone?.('success', texte)
      onClose()
    } catch (err) {
      setErreur(message409(err.response?.data?.code, extractErrors(err).message))
    } finally {
      setBusy(false)
    }
  }

  const sousTitre = responsableService
    ? service
      ? `Responsable du service ${service}`
      : 'Responsable de service'
    : [u?.libelle_role, service].filter(Boolean).join(' · ')

  const detailDossiers = () => {
    if (!dossiers) return ''
    const parts = [`${dossiers.nouvelles ?? 0} nouvelle${(dossiers.nouvelles ?? 0) > 1 ? 's' : ''}`]
    parts.push(`${dossiers.en_cours ?? 0} en cours`)
    if ((dossiers.information_demandee ?? 0) > 0) {
      parts.push(
        `${dossiers.information_demandee} information demandée${dossiers.information_demandee > 1 ? 's' : ''}`,
      )
    }
    return parts.join(', ')
  }

  const encadreVert = () => {
    const suite =
      'Le compte est bloqué immédiatement, y compris s’il est encore connecté. Ses actions passées conservent son nom dans l’historique.'
    if (responsableService && mode === 'remplacant' && remplacant) {
      return `${nomComplet(remplacant)} devient responsable du service ${service}. ${suite.replace('Le compte', 'Son compte')}`
    }
    if (responsableService) {
      return `Le service ${service} n’aura plus de responsable. ${suite}`
    }
    if (remplacant && mode === 'remplacant') {
      return `${nomComplet(remplacant)} reprend le suivi des dossiers. ${suite}`
    }
    return suite
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      busy={busy}
      title={u ? `Désactiver le compte de ${nomComplet(u)}` : 'Désactiver le compte'}
      subtitle={sousTitre}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Annuler
          </Button>
          <Button type="submit" form="form-desactiver-compte" loading={busy} disabled={load !== 'ready'}>
            Désactiver le compte
          </Button>
        </>
      }
    >
      {load === 'loading' && <p className="text-sm text-gray-500">Chargement…</p>}
      {load === 'error' && (
        <div>
          <p className="mb-3 text-sm text-red-600">{erreur}</p>
          <Button
            variant="secondary"
            onClick={() => {
              setLoad('loading')
              endpoints
                .impactUtilisateur(uid)
                .then((res) => {
                  setImpact(res.data)
                  setLoad('ready')
                  setErreur('')
                })
                .catch((err) => {
                  setErreur(extractErrors(err).message)
                  setLoad('error')
                })
            }}
          >
            Réessayer
          </Button>
        </div>
      )}
      {load === 'ready' && impact && (
        <form id="form-desactiver-compte" onSubmit={envoyer} noValidate className="space-y-4">
          {erreur && (
            <p className="rounded-[8px] border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700" role="alert">
              {erreur}
            </p>
          )}

          {responsableService && dossiers && (
            <div className="rounded-[8px] bg-warning-bg px-4 py-3 text-sm leading-relaxed text-warning-text">
              Ce responsable suit <strong>{dossiers.total} doléances</strong> du service {service} (
              {detailDossiers()}). Elles <strong>restent dans le service {service}</strong> : aucun
              transfert automatique vers un autre domaine.
            </div>
          )}

          {!responsableService && (suivis?.total ?? 0) > 0 && (
            <div className="rounded-[8px] bg-warning-bg px-4 py-3 text-sm leading-relaxed text-warning-text">
              {u?.prenom} suit {suivis.total} doléance{suivis.total > 1 ? 's' : ''} en cours ; elles
              restent dans leur service.
            </div>
          )}

          {responsableService && (
            <div className="space-y-3">
              <p className="text-sm font-medium text-gray-800">Qui reprend le service ?</p>
              <CarteRadio
                name="reprise-service"
                value="remplacant"
                checked={mode === 'remplacant'}
                disabled={remplacants.length === 0}
                onChange={setMode}
                titre="Désigner un remplaçant dans ce service"
                texte="Le remplaçant reçoit les nouvelles doléances du service et les notifications."
                extra={remplacants.length === 0 ? 'Aucun autre administrateur actif dans ce service.' : null}
              />
              <CarteRadio
                name="reprise-service"
                value="sans"
                checked={mode === 'sans'}
                onChange={setMode}
                titre="Laisser le service sans responsable"
                texte={'Une alerte s’affiche et le filtre « Service sans responsable » regroupe les dossiers concernés.'}
              />
            </div>
          )}

          {((responsableService && mode === 'remplacant' && remplacants.length > 0) ||
            (!responsableService && remplacants.length > 0 && (suivis?.total ?? 0) > 0)) && (
            <div>
              <FieldLabel htmlFor="remplacant">
                {responsableService
                  ? `Remplaçant (utilisateur actif du service ${service})`
                  : 'Remplaçant (facultatif)'}
              </FieldLabel>
              <SelectInput
                id="remplacant"
                value={idRemplacant}
                onChange={(e) => {
                  setIdRemplacant(e.target.value)
                  if (e.target.value) setMode('remplacant')
                }}
              >
                {!responsableService && <option value="">Aucun remplaçant</option>}
                {remplacants.map((c) => (
                  <option key={idDe(c)} value={idDe(c)}>
                    {nomComplet(c)} · {c.libelle_role}
                  </option>
                ))}
              </SelectInput>
            </div>
          )}

          <div className="flex items-start gap-3 rounded-[8px] bg-success-bg px-4 py-3 text-sm leading-relaxed text-success-text">
            <Shield className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <p>{encadreVert()}</p>
          </div>
        </form>
      )}
    </Modal>
  )
}
