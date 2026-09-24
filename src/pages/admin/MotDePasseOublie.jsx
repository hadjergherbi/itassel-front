import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { AlertCircle, ArrowLeft, KeyRound, Loader2, MailCheck } from 'lucide-react'
import AuthLayout from '../../components/auth/AuthLayout'
import { FieldError, FieldLabel, TextInput } from '../../components/FormFields'
import { useAdminAuth } from '../../admin/AdminAuthContext'
import { extractErrors } from '../../lib/adminApi'
import { endpoints } from '../../lib/endpoints'
import { useLanguage } from '../../i18n/LanguageContext'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const DELAI_RENVOI = 60

export default function MotDePasseOublie() {
  const { status } = useAdminAuth()
  const { tf } = useLanguage()
  const location = useLocation()
  const titreSuccesRef = useRef(null)

  const [etat, setEtat] = useState('formulaire')
  const [email, setEmail] = useState(location.state?.email ?? '')
  const [emailConfirme, setEmailConfirme] = useState('')
  const [erreurEmail, setErreurEmail] = useState('')
  const [erreurGlobale, setErreurGlobale] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [compteARebours, setCompteARebours] = useState(0)

  const validerEmail = (valeur) => {
    const v = valeur.trim()
    if (!v) return tf('admin.mdpOublie.emailRequis')
    if (!EMAIL_RE.test(v)) return tf('admin.mdpOublie.emailInvalide')
    return ''
  }

  useEffect(() => {
    if (etat !== 'envoye' || compteARebours <= 0) return undefined
    const timer = setTimeout(() => setCompteARebours((s) => s - 1), 1000)
    return () => clearTimeout(timer)
  }, [etat, compteARebours])

  useEffect(() => {
    if (etat === 'envoye') titreSuccesRef.current?.focus()
  }, [etat])

  if (status === 'authenticated') {
    return <Navigate to="/admin/tableau-de-bord" replace />
  }

  const envoyerLien = async (adresse) => {
    if (isSubmitting) return
    setIsSubmitting(true)
    setErreurGlobale('')
    setErreurEmail('')
    try {
      await endpoints.motDePasseOublie(adresse.trim())
      setEmailConfirme(adresse.trim())
      setEtat('envoye')
      setCompteARebours(DELAI_RENVOI)
    } catch (err) {
      const code = err.response?.status
      if (code === 422) {
        const { fields, message } = extractErrors(err)
        setErreurEmail(fields.email || message)
      } else if (code === 429) {
        setErreurGlobale(tf('admin.mdpOublie.tropTentatives'))
      } else {
        setErreurGlobale(tf('admin.mdpOublie.echec'))
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const erreur = validerEmail(email)
    if (erreur) {
      setErreurEmail(erreur)
      return
    }
    envoyerLien(email)
  }

  const renvoyer = () => {
    if (compteARebours > 0 || isSubmitting) return
    envoyerLien(emailConfirme || email)
  }

  return (
    <AuthLayout sousTitre={tf('admin.mdpOublie.sousTitre')}>
      {etat === 'formulaire' && (
        <form onSubmit={handleSubmit} noValidate>
          <Link
            to="/admin/connexion"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 transition hover:text-institutional"
          >
            <ArrowLeft className="h-4 w-4 rtl:-scale-x-100" aria-hidden />
            {tf('admin.mdpOublie.retour')}
          </Link>

          <div className="mt-8 flex h-12 w-12 items-center justify-center rounded-[8px] bg-success-bg text-institutional">
            <KeyRound className="h-6 w-6" aria-hidden />
          </div>

          <h2 className="mt-5 text-3xl font-bold text-gray-900">{tf('admin.mdpOublie.titre')}</h2>
          <p className="mt-2 text-gray-600">{tf('admin.mdpOublie.intro')}</p>

          {erreurGlobale && (
            <div
              className="mt-6 flex items-start gap-3 rounded-[8px] bg-danger-bg px-4 py-3 text-sm text-danger-text"
              role="alert"
            >
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
              <p>{erreurGlobale}</p>
            </div>
          )}

          <div className="mt-8">
            <FieldLabel htmlFor="mdp-oublie-email" required>
              {tf('admin.mdpOublie.email')}
            </FieldLabel>
            <TextInput
              id="mdp-oublie-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                if (erreurEmail) setErreurEmail('')
              }}
              error={erreurEmail}
              placeholder="prenom.nom@mjs.gov.dz"
              className="ltr-isolate py-3.5 text-base"
            />
            <FieldError message={erreurEmail} />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            aria-busy={isSubmitting}
            className="mt-8 flex w-full items-center justify-center gap-2 rounded-[8px] bg-institutional px-4 py-3.5 text-base font-semibold text-white transition hover:bg-institutional-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
                {tf('admin.mdpOublie.envoi')}
              </>
            ) : (
              tf('admin.mdpOublie.envoyer')
            )}
          </button>
        </form>
      )}

      {etat === 'envoye' && (
        <div>
          <div
            className="flex h-16 w-16 items-center justify-center rounded-full bg-success-bg text-institutional"
            aria-hidden
          >
            <MailCheck className="h-8 w-8" />
          </div>

          <h2
            ref={titreSuccesRef}
            tabIndex={-1}
            className="mt-5 text-3xl font-bold text-gray-900 outline-none"
          >
            {tf('admin.mdpOublie.succesTitre')}
          </h2>

          <p className="mt-3 text-gray-600" role="status" aria-live="polite">
            {tf('admin.mdpOublie.succes', { email: emailConfirme })}
          </p>

          {erreurGlobale && (
            <div
              className="mt-6 flex items-start gap-3 rounded-[8px] bg-danger-bg px-4 py-3 text-sm text-danger-text"
              role="alert"
            >
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
              <p>{erreurGlobale}</p>
            </div>
          )}

          <div className="mt-6 rounded-[8px] border border-gray-200 bg-white px-4 py-3.5 text-sm text-gray-600">
            <ul className="list-disc space-y-1.5 ps-4">
              <li>{tf('admin.mdpOublie.spam')}</li>
              <li>{tf('admin.mdpOublie.uneFois')}</li>
              <li>{tf('admin.mdpOublie.contact')}</li>
            </ul>
          </div>

          <button
            type="button"
            onClick={renvoyer}
            disabled={compteARebours > 0 || isSubmitting}
            aria-busy={isSubmitting}
            className="mt-8 flex w-full items-center justify-center gap-2 rounded-[8px] border border-gray-300 bg-white px-4 py-3.5 text-base font-semibold text-gray-800 transition hover:border-gray-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
                {tf('admin.mdpOublie.envoi')}
              </>
            ) : compteARebours > 0 ? (
              tf('admin.mdpOublie.renvoyerDans', { n: compteARebours })
            ) : (
              tf('admin.mdpOublie.renvoyer')
            )}
          </button>

          <p className="mt-5 text-center">
            <Link to="/admin/connexion" className="text-sm font-semibold text-institutional hover:underline">
              {tf('admin.mdpOublie.retour')}
            </Link>
          </p>
        </div>
      )}
    </AuthLayout>
  )
}
