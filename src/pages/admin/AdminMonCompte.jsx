import { useState } from 'react'
import { AlertCircle, CheckCircle2, Lock } from 'lucide-react'
import { useAdminAuth } from '../../admin/AdminAuthContext'
import PageHeader from '../../components/ui/PageHeader'
import Card from '../../components/ui/Card'
import Avatar from '../../components/ui/Avatar'
import Button from '../../components/ui/Button'
import ListeReglesMotDePasse, {
  ChampMotDePasse,
  evaluerReglesMotDePasse,
} from '../../components/auth/ReglesMotDePasse'
import { FieldLabel } from '../../components/FormFields'
import { endpoints } from '../../lib/endpoints'
import { extractErrors } from '../../lib/adminApi'
import { nomService } from '../../lib/statuts'
import { useFormat, useLanguage } from '../../i18n/LanguageContext'

function ChampVerrouille({ id, label, value }) {
  return (
    <div>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <div className="relative">
        <input
          id={id}
          readOnly
          value={value || '—'}
          className="w-full rounded-[8px] border border-gray-200 bg-gray-100 px-3 py-2.5 pe-10 text-sm text-gray-800"
        />
        <Lock className="absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden />
      </div>
    </div>
  )
}

export default function AdminMonCompte() {
  const { utilisateur, rafraichirProfil, estSuperAdmin } = useAdminAuth()
  const { tf } = useLanguage()
  const { formatDateHeure } = useFormat()
  const service = nomService(utilisateur)
  const role = utilisateur?.libelle_role || (estSuperAdmin ? tf('admin.layout.superAdmin') : tf('admin.layout.administrateur'))

  const [actuel, setActuel] = useState('')
  const [mdp, setMdp] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [errors, setErrors] = useState({})
  const [erreur, setErreur] = useState('')
  const [succes, setSucces] = useState(false)
  const [busy, setBusy] = useState(false)

  const reglesOk = evaluerReglesMotDePasse(mdp, confirmation).every((r) => r.ok) && actuel.trim()

  const envoyer = async (e) => {
    e.preventDefault()
    if (busy || !reglesOk) return
    setBusy(true)
    setErreur('')
    setErrors({})
    setSucces(false)
    try {
      await endpoints.changerMotDePasse({
        mot_de_passe_actuel: actuel,
        mot_de_passe: mdp,
        mot_de_passe_confirmation: confirmation,
      })
      setActuel('')
      setMdp('')
      setConfirmation('')
      setSucces(true)
      rafraichirProfil().catch(() => {})
    } catch (err) {
      const { message, fields } = extractErrors(err)
      setErrors(fields)
      if (!fields.mot_de_passe_actuel && !fields.mot_de_passe && !fields.mot_de_passe_confirmation) {
        setErreur(message)
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title={tf('admin.monCompte.titre')}
        subtitle={tf('admin.monCompte.sousTitre')}
      />

      {succes && (
        <div
          className="flex items-start gap-3 rounded-[8px] bg-success-bg px-4 py-3 text-sm text-success-text"
          role="status"
          aria-live="polite"
        >
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
          <p>{tf('admin.monCompte.succes')}</p>
        </div>
      )}

      <Card title={tf('admin.monCompte.infos')}>
        <div className="mb-5 flex items-center gap-3">
          <Avatar personne={utilisateur} size="lg" />
          <div>
            <p className="font-semibold text-gray-900">
              {utilisateur?.prenom} {utilisateur?.nom}
            </p>
            <p className="text-sm text-gray-500">{role}</p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <ChampVerrouille id="compte-nom" label={tf('admin.monCompte.nom')} value={utilisateur?.nom} />
          <ChampVerrouille id="compte-prenom" label={tf('admin.monCompte.prenom')} value={utilisateur?.prenom} />
          <ChampVerrouille id="compte-email" label={tf('admin.monCompte.email')} value={utilisateur?.email} />
          {service ? <ChampVerrouille id="compte-service" label={tf('admin.monCompte.service')} value={service} /> : null}
          <ChampVerrouille id="compte-role" label={tf('admin.monCompte.role')} value={role} />
        </div>
        <p className="mt-4 text-xs text-gray-500">{tf('admin.monCompte.modifierContact')}</p>
      </Card>

      <Card title={tf('admin.monCompte.securite')}>
        <p className="text-sm text-gray-700">
          {tf('admin.monCompte.derniereConnexion')}{' '}
          {utilisateur?.connexion_precedente ? (
            <span className="font-medium">{formatDateHeure(utilisateur.connexion_precedente)}</span>
          ) : (
            <span className="font-medium">{tf('admin.monCompte.premiereConnexion')}</span>
          )}
        </p>
        <p className="mt-1 text-xs text-gray-500">{tf('admin.monCompte.siInconnue')}</p>
      </Card>

      <Card title={tf('admin.monCompte.changer')}>
        <form onSubmit={envoyer} noValidate className="space-y-4">
          {erreur && (
            <div className="flex items-start gap-3 rounded-[8px] bg-danger-bg px-4 py-3 text-sm text-danger-text" role="alert">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
              <p>{erreur}</p>
            </div>
          )}

          <ChampMotDePasse
            id="mdp-actuel"
            label={tf('admin.monCompte.actuel')}
            value={actuel}
            onChange={(e) => setActuel(e.target.value)}
            error={errors.mot_de_passe_actuel}
            autoComplete="current-password"
          />
          <ChampMotDePasse
            id="mdp-nouveau"
            label={tf('admin.monCompte.nouveau')}
            value={mdp}
            onChange={(e) => setMdp(e.target.value)}
            error={errors.mot_de_passe}
            autoComplete="new-password"
          />
          <ChampMotDePasse
            id="mdp-confirm"
            label={tf('admin.monCompte.confirmation')}
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
            error={errors.mot_de_passe_confirmation}
            autoComplete="new-password"
          />

          <ListeReglesMotDePasse motDePasse={mdp} confirmation={confirmation} compteur />

          <Button type="submit" disabled={!reglesOk || busy} loading={busy}>
            {tf('admin.monCompte.mettreAJour')}
          </Button>
          <p className="text-xs text-gray-500">{tf('admin.monCompte.autresSessions')}</p>
        </form>
      </Card>
    </div>
  )
}
