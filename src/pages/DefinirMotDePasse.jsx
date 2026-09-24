import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { AlertCircle } from 'lucide-react'
import AuthLayout from '../components/auth/AuthLayout'
import ListeReglesMotDePasse, { ChampMotDePasse } from '../components/auth/ReglesMotDePasse'
import { endpoints } from '../lib/endpoints'
import { extractErrors } from '../lib/adminApi'
import { useLanguage } from '../i18n/LanguageContext'

function masquerEmail(email) {
  if (!email) return ''
  if (email.includes('*') || email.includes('•')) return email
  const at = email.indexOf('@')
  if (at < 1) return email
  const local = email.slice(0, at)
  const domaine = email.slice(at + 1)
  const visible = local.slice(0, 1)
  return `${visible}${'•'.repeat(Math.min(6, Math.max(2, local.length - 1)))}@${domaine}`
}

export default function DefinirMotDePasse() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { tf } = useLanguage()
  const jeton = params.get('jeton')?.trim() ?? ''

  const [etat, setEtat] = useState(jeton ? 'chargement' : 'invalide')
  const [info, setInfo] = useState(null)
  const [mdp, setMdp] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [errors, setErrors] = useState({})
  const [erreur, setErreur] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!jeton) {
      setEtat('invalide')
      return undefined
    }
    let annule = false
    endpoints
      .verifierJeton(jeton)
      .then((res) => {
        if (annule) return
        if (res.data?.valide) {
          setInfo(res.data)
          setEtat('valide')
        } else {
          setEtat('invalide')
        }
      })
      .catch(() => {
        if (!annule) setEtat('invalide')
      })
    return () => {
      annule = true
    }
  }, [jeton])

  const envoyer = async (e) => {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    setErreur('')
    setErrors({})
    try {
      await endpoints.definirMotDePasse({
        jeton,
        mot_de_passe: mdp,
        mot_de_passe_confirmation: confirmation,
      })
      navigate('/admin/connexion', { replace: true, state: { flash: 'mdp_enregistre' } })
    } catch (err) {
      const { message, fields } = extractErrors(err)
      setErrors(fields)
      if (!fields.mot_de_passe && !fields.mot_de_passe_confirmation) setErreur(message)
    } finally {
      setBusy(false)
    }
  }

  const invitation = info?.type === 'invitation'
  const titre = invitation ? tf('admin.definirMdp.invitation') : tf('admin.definirMdp.reset')

  return (
    <AuthLayout sousTitre={tf('admin.definirMdp.sousTitre')}>
      {etat === 'chargement' && <p className="text-sm text-gray-500">{tf('admin.definirMdp.verification')}</p>}

      {etat === 'invalide' && (
        <>
          <h2 className="text-3xl font-bold text-gray-900">{tf('admin.definirMdp.invalideTitre')}</h2>
          <p className="mt-3 text-gray-600" role="alert">
            {tf('admin.definirMdp.invalide')}
          </p>
          <Link
            to="/admin/connexion"
            className="mt-8 inline-flex w-full items-center justify-center rounded-[8px] bg-institutional px-4 py-3.5 text-base font-semibold text-white transition hover:bg-institutional-hover"
          >
            {tf('admin.definirMdp.allerConnexion')}
          </Link>
          <Link
            to="/admin/mot-de-passe-oublie"
            className="mt-3 inline-flex w-full items-center justify-center rounded-[8px] border border-gray-300 bg-white px-4 py-3.5 text-base font-semibold text-gray-800 transition hover:border-gray-400"
          >
            {tf('admin.definirMdp.nouveauLien')}
          </Link>
        </>
      )}

      {etat === 'valide' && (
        <form onSubmit={envoyer} noValidate className="space-y-4">
          <h2 className="text-3xl font-bold text-gray-900">{titre}</h2>
          {info?.prenom && (
            <p className="text-sm text-gray-800">{tf('admin.definirMdp.bonjour', { prenom: info.prenom })}</p>
          )}
          {info?.email && (
            <p className="text-xs text-gray-500">
              {tf('admin.definirMdp.compte', { email: masquerEmail(info.email) })}
            </p>
          )}

          {erreur && (
            <div
              className="flex items-start gap-3 rounded-[8px] bg-danger-bg px-4 py-3 text-sm text-danger-text"
              role="alert"
            >
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
              <p>{erreur}</p>
            </div>
          )}

          <ChampMotDePasse
            id="mdp"
            label={tf('admin.definirMdp.motDePasse')}
            value={mdp}
            onChange={(e) => setMdp(e.target.value)}
            error={errors.mot_de_passe}
            autoComplete="new-password"
          />
          <ChampMotDePasse
            id="mdp-confirm"
            label={tf('admin.definirMdp.confirmation')}
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
            error={errors.mot_de_passe_confirmation}
            autoComplete="new-password"
          />

          <ListeReglesMotDePasse motDePasse={mdp} confirmation={confirmation} />

          <button
            type="submit"
            disabled={busy}
            aria-busy={busy}
            className="flex w-full items-center justify-center rounded-[8px] bg-institutional px-4 py-3.5 text-base font-semibold text-white transition hover:bg-institutional-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? tf('admin.definirMdp.enregistrement') : tf('admin.definirMdp.enregistrer')}
          </button>
        </form>
      )}
    </AuthLayout>
  )
}
