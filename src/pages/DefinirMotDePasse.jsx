import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Check, Eye, EyeOff, Lock, X } from 'lucide-react'
import { FieldError, FieldLabel, TextInput } from '../components/FormFields'
import { endpoints } from '../lib/endpoints'
import { extractErrors } from '../lib/adminApi'

const FLASH = 'Mot de passe enregistré. Vous pouvez vous connecter.'
const LIEN_INVALIDE =
  "Ce lien n'est plus valide. Demandez un nouveau lien à votre Super administrateur."

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

function ChampMotDePasse({ id, label, value, onChange, error, autoComplete }) {
  const [voir, setVoir] = useState(false)
  return (
    <div>
      <FieldLabel htmlFor={id} required>
        {label}
      </FieldLabel>
      <div className="relative">
        <TextInput
          id={id}
          type={voir ? 'text' : 'password'}
          autoComplete={autoComplete}
          value={value}
          onChange={onChange}
          error={error}
          className="pe-10"
        />
        <button
          type="button"
          onClick={() => setVoir((v) => !v)}
          className="absolute end-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-gray-500 transition hover:text-gray-800"
          aria-label={voir ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
        >
          {voir ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      <FieldError message={error} />
    </div>
  )
}

function Regle({ ok, label }) {
  return (
    <li className={`flex items-center gap-2 text-xs ${ok ? 'text-success-text' : 'text-gray-500'}`}>
      {ok ? <Check className="h-3.5 w-3.5" aria-hidden /> : <X className="h-3.5 w-3.5" aria-hidden />}
      {label}
    </li>
  )
}

export default function DefinirMotDePasse() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
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

  const regles = [
    { ok: mdp.length >= 10, label: '10 caractères minimum' },
    { ok: /[A-Z]/.test(mdp), label: 'Une majuscule' },
    { ok: /[a-z]/.test(mdp), label: 'Une minuscule' },
    { ok: /\d/.test(mdp), label: 'Un chiffre' },
    { ok: Boolean(mdp) && mdp === confirmation, label: 'Les deux mots de passe sont identiques' },
  ]

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
      navigate('/admin/connexion', { replace: true, state: { flash: FLASH } })
    } catch (err) {
      const { message, fields } = extractErrors(err)
      setErrors(fields)
      if (!fields.mot_de_passe && !fields.mot_de_passe_confirmation) setErreur(message)
    } finally {
      setBusy(false)
    }
  }

  const invitation = info?.type === 'invitation'
  const titre = invitation ? 'Créer votre mot de passe' : 'Choisir un nouveau mot de passe'

  return (
    <div className="grid min-h-screen bg-page lg:grid-cols-2" dir="ltr" lang="fr">
      <div className="hidden flex-col justify-between bg-gradient-to-br from-[#006b3f] to-[#0b4a31] p-10 text-white lg:flex">
        <div className="flex items-center gap-3">
          <img src="/logo-seal.svg" alt="" className="h-14 w-14" width={56} height={56} />
          <div className="leading-tight">
            <div className="text-xl font-bold tracking-wide">ITASSEL</div>
            <div className="text-sm text-white/80">Ministère des Sports</div>
          </div>
        </div>
        <div>
          <h1 className="mb-3 text-3xl font-bold leading-snug">Espace de traitement des doléances</h1>
          <p className="max-w-md text-sm leading-relaxed text-white/80">
            Définissez le mot de passe de votre compte administrateur.
          </p>
        </div>
        <p className="text-xs text-white/60">Accès sécurisé — toutes les connexions sont journalisées.</p>
      </div>

      <div className="flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-sm rounded-[8px] border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
          {etat === 'chargement' && <p className="text-sm text-gray-500">Vérification du lien…</p>}

          {etat === 'invalide' && (
            <>
              <div className="mb-6 flex items-center gap-2 text-institutional">
                <Lock className="h-5 w-5" aria-hidden />
                <h2 className="text-lg font-bold">Lien invalide</h2>
              </div>
              <p className="mb-6 text-sm leading-relaxed text-gray-700" role="alert">
                {LIEN_INVALIDE}
              </p>
              <Link
                to="/admin/connexion"
                className="inline-flex w-full items-center justify-center rounded-[8px] bg-action px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#008040]"
              >
                Aller à la connexion
              </Link>
            </>
          )}

          {etat === 'valide' && (
            <form onSubmit={envoyer} noValidate className="space-y-4">
              <div className="mb-2 flex items-center gap-2 text-institutional">
                <Lock className="h-5 w-5" aria-hidden />
                <h2 className="text-lg font-bold">{titre}</h2>
              </div>
              {info?.prenom && (
                <p className="text-sm text-gray-800">
                  Bonjour <span className="font-medium">{info.prenom}</span>
                </p>
              )}
              {info?.email && (
                <p className="text-xs text-gray-500">Compte : {masquerEmail(info.email)}</p>
              )}

              {erreur && (
                <p className="rounded-[8px] border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700" role="alert">
                  {erreur}
                </p>
              )}

              <ChampMotDePasse
                id="mdp"
                label="Mot de passe"
                value={mdp}
                onChange={(e) => setMdp(e.target.value)}
                error={errors.mot_de_passe}
                autoComplete="new-password"
              />
              <ChampMotDePasse
                id="mdp-confirm"
                label="Confirmation"
                value={confirmation}
                onChange={(e) => setConfirmation(e.target.value)}
                error={errors.mot_de_passe_confirmation}
                autoComplete="new-password"
              />

              <ul className="space-y-1 rounded-[8px] bg-gray-50 px-3 py-2.5" aria-live="polite">
                {regles.map((r) => (
                  <Regle key={r.label} ok={r.ok} label={r.label} />
                ))}
              </ul>

              <button
                type="submit"
                disabled={busy}
                aria-busy={busy}
                className="w-full rounded-[8px] bg-action px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#008040] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {busy ? 'Enregistrement…' : 'Enregistrer le mot de passe'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
