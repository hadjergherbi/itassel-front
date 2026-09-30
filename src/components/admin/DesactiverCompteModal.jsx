import { useEffect, useState } from 'react'
import { Shield } from 'lucide-react'
import Modal from './Modal'
import Button from '../ui/Button'
import { FieldLabel, SelectInput } from '../FormFields'
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
  const { tf, lang } = useLanguage()
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
        setErreur(
          extractErrors(err, tf('admin.utilisateurs.desactiver.chargementEchec'), lang).message,
        )
        setLoad('error')
      })
    return () => {
      annule = true
    }
  }, [open, uid, tf, lang])

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
      setErreur(tf('admin.utilisateurs.desactiver.choisirRemplacant'))
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
      let texte = res.data?.message || tf('admin.utilisateurs.desactiver.compteDesactive')
      if (n > 0 && remplacant) {
        texte += ` ${tf('admin.utilisateurs.desactiver.dossiersTransferes', { n, nom: nomComplet(remplacant) })}`
      } else if (n > 0) {
        texte += ` ${tf('admin.utilisateurs.desactiver.dossiersTransferesRemplacant', { n })}`
      }
      onDone?.('success', texte)
      onClose()
    } catch (err) {
      setErreur(
        traduireMessageApi(
          message409(err.response?.data?.code, extractErrors(err, undefined, lang).message),
          lang,
        ),
      )
    } finally {
      setBusy(false)
    }
  }

  const sousTitre = responsableService
    ? service
      ? tf('admin.utilisateurs.desactiver.responsableDuService', { service })
      : tf('admin.utilisateurs.desactiver.responsableService')
    : [u?.libelle_role, service].filter(Boolean).join(' · ')

  const detailDossiers = () => {
    if (!dossiers) return ''
    const parts = [
      tf('admin.utilisateurs.desactiver.detailNouvelles', { n: dossiers.nouvelles ?? 0 }),
    ]
    parts.push(tf('admin.utilisateurs.desactiver.detailEnCours', { n: dossiers.en_cours ?? 0 }))
    if ((dossiers.information_demandee ?? 0) > 0) {
      parts.push(
        tf('admin.utilisateurs.desactiver.detailInfoDemandee', {
          n: dossiers.information_demandee,
        }),
      )
    }
    return parts.join(', ')
  }

  const encadreVert = () => {
    if (responsableService && mode === 'remplacant' && remplacant) {
      return tf('admin.utilisateurs.desactiver.encadreRemplacantService', {
        nom: nomComplet(remplacant),
        service,
      })
    }
    if (responsableService) {
      return tf('admin.utilisateurs.desactiver.encadreSansResponsable', { service })
    }
    if (remplacant && mode === 'remplacant') {
      return tf('admin.utilisateurs.desactiver.encadreRemplacantSuivi', {
        nom: nomComplet(remplacant),
      })
    }
    return tf('admin.utilisateurs.desactiver.encadreBase')
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      busy={busy}
      title={
        u
          ? tf('admin.utilisateurs.desactiver.titreDe', { nom: nomComplet(u) })
          : tf('admin.utilisateurs.desactiver.titre')
      }
      subtitle={sousTitre}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            {tf('commun.cancel')}
          </Button>
          <Button type="submit" form="form-desactiver-compte" loading={busy} disabled={load !== 'ready'}>
            {tf('admin.utilisateurs.desactiver.action')}
          </Button>
        </>
      }
    >
      {load === 'loading' && <p className="text-sm text-gray-500">{tf('commun.loading')}</p>}
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
                  setErreur(extractErrors(err, undefined, lang).message)
                  setLoad('error')
                })
            }}
          >
            {tf('commun.retry')}
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
              {tf('admin.utilisateurs.desactiver.suitDoleances', {
                total: dossiers.total,
                service,
                detail: detailDossiers(),
              })}
            </div>
          )}

          {!responsableService && (suivis?.total ?? 0) > 0 && (
            <div className="rounded-[8px] bg-warning-bg px-4 py-3 text-sm leading-relaxed text-warning-text">
              {tf('admin.utilisateurs.desactiver.suitEnCours', {
                prenom: u?.prenom,
                n: suivis.total,
              })}
            </div>
          )}

          {responsableService && (
            <div className="space-y-3">
              <p className="text-sm font-medium text-gray-800">
                {tf('admin.utilisateurs.desactiver.quiReprend')}
              </p>
              <CarteRadio
                name="reprise-service"
                value="remplacant"
                checked={mode === 'remplacant'}
                disabled={remplacants.length === 0}
                onChange={setMode}
                titre={tf('admin.utilisateurs.desactiver.designerRemplacant')}
                texte={tf('admin.utilisateurs.desactiver.designerRemplacantTexte')}
                extra={
                  remplacants.length === 0
                    ? tf('admin.utilisateurs.desactiver.aucunAutreAdmin')
                    : null
                }
              />
              <CarteRadio
                name="reprise-service"
                value="sans"
                checked={mode === 'sans'}
                onChange={setMode}
                titre={tf('admin.utilisateurs.desactiver.laisserSans')}
                texte={tf('admin.utilisateurs.desactiver.laisserSansTexte')}
              />
            </div>
          )}

          {((responsableService && mode === 'remplacant' && remplacants.length > 0) ||
            (!responsableService && remplacants.length > 0 && (suivis?.total ?? 0) > 0)) && (
            <div>
              <FieldLabel htmlFor="remplacant">
                {responsableService
                  ? tf('admin.utilisateurs.desactiver.remplacantService', { service })
                  : tf('admin.utilisateurs.desactiver.remplacantFacultatif')}
              </FieldLabel>
              <SelectInput
                id="remplacant"
                value={idRemplacant}
                onChange={(e) => {
                  setIdRemplacant(e.target.value)
                  if (e.target.value) setMode('remplacant')
                }}
              >
                {!responsableService && (
                  <option value="">{tf('admin.utilisateurs.desactiver.aucunRemplacant')}</option>
                )}
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
