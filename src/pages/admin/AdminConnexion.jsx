import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Lock } from 'lucide-react'
import { FieldError, FieldLabel, TextInput } from '../../components/FormFields'
import { useAdminAuth } from '../../admin/AdminAuthContext'
import { extractErrors } from '../../lib/adminApi'

export default function AdminConnexion() {
  const { status, login } = useAdminAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [email, setEmail] = useState('')
  const [motDePasse, setMotDePasse] = useState('')
  const [voirMdp, setVoirMdp] = useState(false)
  const [erreur, setErreur] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (status === 'authenticated') {
    return <Navigate to="/admin/tableau-de-bord" replace />
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (isSubmitting) return
    if (!email.trim() || !motDePasse) {
      setErreur('Saisissez votre email et votre mot de passe.')
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
      const status = err.response?.status
      if (status === 422) setErreur('Email ou mot de passe incorrect.')
      else setErreur(extractErrors(err).message)
    } finally {
      setIsSubmitting(false)
    }
  }

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
          <h1 className="mb-3 text-3xl font-bold leading-snug">
            Espace de traitement des doléances
          </h1>
          <p className="max-w-md text-sm leading-relaxed text-white/80">
            Réservé aux administrateurs des services et au Super administrateur.
          </p>
        </div>
        <p className="text-xs text-white/60">Accès sécurisé — toutes les connexions sont journalisées.</p>
      </div>

      <div className="flex items-center justify-center px-4 py-10">
        <form
          onSubmit={handleSubmit}
          noValidate
          className="w-full max-w-sm rounded-[8px] border border-gray-200 bg-white p-6 shadow-sm sm:p-8"
        >
          <div className="mb-6 flex items-center gap-2 text-institutional">
            <Lock className="h-5 w-5" aria-hidden />
            <h2 className="text-lg font-bold">Connexion</h2>
          </div>

          {location.state?.flash && (
            <p className="mb-4 rounded-[8px] border border-green-200 bg-success-bg px-3 py-2.5 text-sm text-success-text" role="status">
              {location.state.flash}
            </p>
          )}

          {erreur && (
            <p className="mb-4 rounded-[8px] border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700" role="alert">
              {erreur}
            </p>
          )}

          <div className="mb-4">
            <FieldLabel htmlFor="admin-email" required>
              Email professionnel
            </FieldLabel>
            <TextInput
              id="admin-email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="prenom.nom@itassel.dz"
            />
          </div>

          <div className="mb-6">
            <FieldLabel htmlFor="admin-mdp" required>
              Mot de passe
            </FieldLabel>
            <div className="relative">
              <TextInput
                id="admin-mdp"
                type={voirMdp ? 'text' : 'password'}
                autoComplete="current-password"
                value={motDePasse}
                onChange={(e) => setMotDePasse(e.target.value)}
                className="pe-10"
              />
              <button
                type="button"
                onClick={() => setVoirMdp((v) => !v)}
                className="absolute end-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-gray-500 transition hover:text-gray-800"
                aria-label={voirMdp ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
              >
                {voirMdp ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <FieldError message="" />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            aria-busy={isSubmitting}
            className="w-full rounded-[8px] bg-action px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#008040] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? 'Connexion…' : 'Se connecter'}
          </button>

          <p className="mt-5 text-center text-xs text-gray-500">
            Mot de passe oublié ? Contactez le Super administrateur.
          </p>
          <p className="mt-3 text-center text-xs text-gray-500">
            <Link to="/" className="hover:text-institutional">
              ← Retour au site public
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
