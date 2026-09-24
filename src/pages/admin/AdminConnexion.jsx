import { useEffect, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { AlertCircle, CheckCircle2, Eye, EyeOff, Info, Loader2 } from 'lucide-react'
import AuthLayout from '../../components/auth/AuthLayout'
import { FieldLabel, TextInput } from '../../components/FormFields'
import { useAdminAuth } from '../../admin/AdminAuthContext'
import { extractErrors } from '../../lib/adminApi'
import { FLASH_INACTIVITE, FLASH_SESSION_EXPIREE, resetDeconnexionEnCours } from '../../lib/securite'
import { useLanguage } from '../../i18n/LanguageContext'

const FLASH_CLES = {
  [FLASH_SESSION_EXPIREE]: 'admin.connexion.flashSessionExpiree',
  [FLASH_INACTIVITE]: 'admin.connexion.flashInactivite',
  mdp_enregistre: 'admin.connexion.flashMdpEnregistre',
}

export default function AdminConnexion() {
  const { status, login } = useAdminAuth()
  const { tf } = useLanguage()
  const navigate = useNavigate()
  const location = useLocation()

  const [email, setEmail] = useState('')
  const [motDePasse, setMotDePasse] = useState('')
  const [voirMdp, setVoirMdp] = useState(false)
  const [erreur, setErreur] = useState('')
  const [verrou, setVerrou] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const flash = location.state?.flash
  const flashNeutre = flash === FLASH_SESSION_EXPIREE || flash === FLASH_INACTIVITE
  const flashTexte = FLASH_CLES[flash] ? tf(FLASH_CLES[flash]) : flash

  useEffect(() => {
    resetDeconnexionEnCours()
  }, [])

  useEffect(() => {
    if (verrou <= 0) return undefined
    const id = window.setTimeout(() => setVerrou((s) => s - 1), 1000)
    return () => window.clearTimeout(id)
  }, [verrou])

  if (status === 'authenticated') {
    return <Navigate to="/admin/tableau-de-bord" replace />
  }

  const libelleVerrou = (secondes) => {
    if (secondes >= 60) {
      const minutes = Math.ceil(secondes / 60)
      return tf('admin.connexion.minute', { n: minutes })
    }
    return tf('admin.connexion.secondes', { n: secondes })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (isSubmitting || verrou > 0) return
    if (!email.trim() || !motDePasse) {
      setErreur(tf('admin.connexion.requis'))
      return
    }

    setIsSubmitting(true)
    setErreur('')
    try {
      await login(email, motDePasse)
      const destination = location.state?.from?.startsWith('/admin/')
        ? location.state.from
        : '/admin/tableau-de-bord'
      navigate(destination, { replace: true })
    } catch (err) {
      setMotDePasse('')
      const code = err.response?.status
      const secondes = Number(err.response?.data?.reessayer_dans)
      if (code === 429 && secondes > 0) {
        setVerrou(Math.ceil(secondes))
        setErreur('')
      } else if (code === 422) {
        setErreur(tf('admin.connexion.incorrect'))
      } else {
        setErreur(extractErrors(err).message)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthLayout>
      <form onSubmit={handleSubmit} noValidate>
        <h2 className="text-3xl font-bold text-gray-900">{tf('admin.connexion.titre')}</h2>
        <p className="mt-2 text-gray-600">{tf('admin.connexion.sousTitre')}</p>

        {flash && (
          <div
            className={[
              'mt-6 flex items-start gap-3 rounded-[8px] px-4 py-3 text-sm',
              flashNeutre ? 'bg-gray-100 text-gray-800' : 'bg-success-bg text-success-text',
            ].join(' ')}
            role="status"
          >
            {flashNeutre ? (
              <Info className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
            ) : (
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
            )}
            <p>{flashTexte}</p>
          </div>
        )}

        {verrou > 0 && (
          <div
            className="mt-6 flex items-start gap-3 rounded-[8px] border border-warning-border bg-warning-bg px-4 py-3 text-sm text-warning-text"
            role="alert"
            aria-live="polite"
          >
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
            <p>{tf('admin.connexion.tropTentatives', { delai: libelleVerrou(verrou) })}</p>
          </div>
        )}

        {erreur && (
          <div
            className="mt-6 flex items-start gap-3 rounded-[8px] bg-danger-bg px-4 py-3 text-sm text-danger-text"
            role="alert"
          >
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
            <p>{erreur}</p>
          </div>
        )}

        <div className="mt-8">
          <FieldLabel htmlFor="admin-email" required>
            {tf('admin.connexion.email')}
          </FieldLabel>
          <TextInput
            id="admin-email"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="prenom.nom@mjs.gov.dz"
            className="ltr-isolate py-3.5 text-base"
          />
        </div>

        <div className="mt-5">
          <FieldLabel htmlFor="admin-mdp" required>
            {tf('admin.connexion.motDePasse')}
          </FieldLabel>
          <div className="relative">
            <TextInput
              id="admin-mdp"
              type={voirMdp ? 'text' : 'password'}
              autoComplete="current-password"
              value={motDePasse}
              onChange={(e) => setMotDePasse(e.target.value)}
              className="pe-11 py-3.5 text-base"
            />
            <button
              type="button"
              onClick={() => setVoirMdp((v) => !v)}
              className="absolute end-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-gray-500 transition hover:text-gray-800"
              aria-label={voirMdp ? tf('admin.connexion.masquerMdp') : tf('admin.connexion.voirMdp')}
            >
              {voirMdp ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting || verrou > 0}
          aria-busy={isSubmitting}
          className="mt-8 flex w-full items-center justify-center gap-2 rounded-[8px] bg-institutional px-4 py-3.5 text-base font-semibold text-white transition hover:bg-institutional-hover disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
              {tf('admin.connexion.submitting')}
            </>
          ) : (
            tf('admin.connexion.submit')
          )}
        </button>

        <p className="mt-5 text-center">
          <Link
            to="/admin/mot-de-passe-oublie"
            state={{ email }}
            className="text-sm font-semibold text-institutional hover:underline"
          >
            {tf('admin.connexion.oublie')}
          </Link>
        </p>

        <p className="mt-8 text-center text-xs text-gray-400">
          <Link to="/" className="inline-flex items-center gap-1 hover:text-gray-600">
            <span aria-hidden className="rtl:-scale-x-100">←</span>
            {tf('admin.connexion.retourPublic')}
          </Link>
        </p>
      </form>
    </AuthLayout>
  )
}
