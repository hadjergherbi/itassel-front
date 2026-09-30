import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import Header from '../components/Header'
import Footer from '../components/Footer'
import AfterSubmitPanel from '../components/AfterSubmitPanel'
import {
  FieldError,
  FieldHelp,
  FieldLabel,
  SelectInput,
  TextArea,
  TextInput,
} from '../components/FormFields'
import { useLanguage } from '../i18n/LanguageContext'
import { WILAYAS } from '../data/wilayas'
import api from '../lib/api'
import { endpoints } from '../lib/endpoints'
import { estTousDomaines, estToutesNatures } from '../lib/statuts'
import { libelleNature, libelleQualite, libelleService } from '../lib/libelles'
import { traduireChampsApi, traduireMessageApi } from '../lib/erreursApi'

// Limites alignées sur la base de données (voir migration "doleances") :
// nom/prenom 60, email 120, objet 200. Le formulaire bloque lui-même les
// valeurs trop longues, avec un message traduit, au lieu d'attendre le
// message en anglais renvoyé par Laravel.
const NAME_RE =
  /^[\p{L}\p{M}][\p{L}\p{M}\s'\u2019-]{0,59}$/u
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_RE = /^(\+213|0)([5-7]\d{8}|[2-4]\d{7,8})$/

const emptyForm = {
  nom: '',
  prenom: '',
  email: '',
  telephone: '',
  wilaya: '',
  nature: '',
  qualite: '',
  domaine: '',
  objet: '',
  description: '',
}

const DOMAINE_SLUG_TO_SERVICE = {
  sport: 'Sport',
  jeunesse: 'Jeunesse',
  rh: 'Ressources humaines',
}

/** Mappe les clés d'erreur Laravel vers les champs UI */
const API_FIELD_MAP = {
  nom: 'nom',
  prenom: 'prenom',
  email: 'email',
  telephone: 'telephone',
  wilaya: 'wilaya',
  objet: 'objet',
  description: 'description',
  id_nature: 'nature',
  id_qualite: 'qualite',
  id_service: 'domaine',
}

function firstError(messages) {
  if (!messages) return ''
  return Array.isArray(messages) ? messages[0] ?? '' : String(messages)
}

function validateField(name, value, errorsMap) {
  const trimmed = typeof value === 'string' ? value.trim() : value

  switch (name) {
    case 'nom':
    case 'prenom':
      if (!trimmed) return errorsMap.required
      if (/\d/.test(trimmed)) return errorsMap.nameHasDigits
      if (!NAME_RE.test(trimmed)) return errorsMap.nameInvalid
      return ''
    case 'email':
      if (!trimmed) return errorsMap.required
      if (!EMAIL_RE.test(trimmed)) return errorsMap.emailInvalid
      return ''
    case 'telephone': {
      if (!trimmed) return errorsMap.required
      const compact = String(trimmed).replace(/\s/g, '')
      if (!PHONE_RE.test(compact)) return errorsMap.phoneInvalid
      return ''
    }
    case 'wilaya':
    case 'nature':
    case 'qualite':
    case 'domaine':
    case 'objet':
      if (!trimmed) return errorsMap.required
      return ''
    case 'description':
      if (!trimmed) return errorsMap.required
      if (String(trimmed).length > 5000) return errorsMap.descriptionTropLongue
      return ''
    default:
      return ''
  }
}

function IndicateurEtapes({ etapeActive }) {
  const { t, isRtl } = useLanguage()
  const Arrow = isRtl ? ArrowLeft : ArrowRight
  const etapes = [
    { n: 1, label: t.deposit.steps.informations },
    { n: 2, label: t.deposit.steps.verification },
  ]

  return (
    <nav aria-label={t.deposit.steps.label} className="mb-6">
      <ol className="flex flex-wrap items-center gap-2 text-sm sm:gap-3">
        {etapes.map((etape, index) => {
          const active = etape.n === etapeActive
          const done = etape.n < etapeActive
          return (
            <li key={etape.n} className="flex items-center gap-2 sm:gap-3">
              {index > 0 && (
                <Arrow
                  className="h-3.5 w-3.5 shrink-0 text-gray-300"
                  aria-hidden
                />
              )}
              <span
                className={[
                  'inline-flex items-center gap-2 rounded-[8px] px-2.5 py-1.5',
                  active
                    ? 'bg-institutional/10 font-semibold text-institutional'
                    : done
                      ? 'text-gray-700'
                      : 'text-gray-400',
                ].join(' ')}
                aria-current={active ? 'step' : undefined}
              >
                <span
                  className={[
                    'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                    active
                      ? 'bg-institutional text-white'
                      : done
                        ? 'bg-success-bg text-institutional'
                        : 'bg-gray-100 text-gray-500',
                  ].join(' ')}
                >
                  {etape.n}
                </span>
                <span className="hidden sm:inline">{etape.label}</span>
              </span>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

export default function DeposerDoleance() {
  const { t, tf, lang, isRtl } = useLanguage()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const Arrow = isRtl ? ArrowLeft : ArrowRight

  const initialDomaine = useMemo(() => {
    const d = searchParams.get('domaine')
    const allowed = ['sport', 'jeunesse', 'rh']
    return allowed.includes(d) ? d : ''
  }, [searchParams])

  const [form, setForm] = useState(emptyForm)
  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [referentiels, setReferentiels] = useState({
    services: [],
    natures: [],
    qualites: [],
  })
  const [referentielsLoading, setReferentielsLoading] = useState(true)
  const [referentielsFailed, setReferentielsFailed] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [antiSpam, setAntiSpam] = useState(false)
  const [jetonFormulaire, setJetonFormulaire] = useState('')
  const [siteWeb, setSiteWeb] = useState('')

  useEffect(() => {
    let cancelled = false
    setReferentielsLoading(true)
    setReferentielsFailed(false)

    api
      .get('/referentiels')
      .then((res) => {
        if (cancelled) return
        const data = res.data ?? {}
        const services = (data.services ?? []).filter((s) => !estTousDomaines(s))
        const natures = (data.natures ?? []).filter((n) => !estToutesNatures(n))
        const qualites = data.qualites ?? []
        setReferentiels({ services, natures, qualites })

        if (initialDomaine) {
          const expected = DOMAINE_SLUG_TO_SERVICE[initialDomaine]
          const match = services.find(
            (s) =>
              String(s.nom_service ?? '')
                .trim()
                .toLowerCase() === expected.toLowerCase(),
          )
          if (match) {
            setForm((prev) => ({
              ...prev,
              domaine: String(match.id_service),
            }))
          }
        }
      })
      .catch(() => {
        if (cancelled) return
        setReferentielsFailed(true)
      })
      .finally(() => {
        if (!cancelled) setReferentielsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [initialDomaine])

  const chargerJeton = async () => {
    const res = await endpoints.jetonFormulaire()
    const jeton = res.data?.jeton ?? ''
    setJetonFormulaire(jeton)
    return jeton
  }

  useEffect(() => {
    let cancelled = false
    endpoints
      .jetonFormulaire()
      .then((res) => {
        if (!cancelled) setJetonFormulaire(res.data?.jeton ?? '')
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  const setValue = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }))
    if (submitError) setSubmitError('')
    if (touched[name] || errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: validateField(name, value, t.deposit.errors),
      }))
    }
  }

  const onBlur = (name) => {
    setTouched((prev) => ({ ...prev, [name]: true }))
    setErrors((prev) => ({
      ...prev,
      [name]: validateField(name, form[name], t.deposit.errors),
    }))
  }

  const focusFirstInvalid = () => {
    requestAnimationFrame(() => {
      const first = document.querySelector('[aria-invalid="true"]')
      first?.focus()
      first?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    })
  }

  const reinitialiserFormulaire = () => {
    setForm(emptyForm)
    setErrors({})
    setTouched({})
    setSubmitError('')
    setAntiSpam(false)
    setSiteWeb('')
  }

  const validateAll = () => {
    const next = {}
    Object.keys(emptyForm).forEach((key) => {
      const msg = validateField(key, form[key], t.deposit.errors)
      if (msg) next[key] = msg
    })
    setErrors(next)
    setTouched(
      Object.keys(emptyForm).reduce((acc, key) => {
        acc[key] = true
        return acc
      }, {}),
    )
    if (Object.keys(next).length) {
      focusFirstInvalid()
      return false
    }
    return true
  }

  const applyLaravelErrors = (apiErrors = {}) => {
    const next = {}

    Object.entries(apiErrors).forEach(([key, messages]) => {
      const msg = firstError(messages)
      if (!msg) return
      const uiKey = API_FIELD_MAP[key] ?? key
      next[uiKey] = msg
    })

    setErrors(next)
    setTouched((prev) => ({
      ...prev,
      ...Object.keys(next).reduce((acc, key) => {
        acc[key] = true
        return acc
      }, {}),
    }))

    focusFirstInvalid()
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (isSubmitting || referentielsFailed) return
    setSubmitError('')
    if (!validateAll()) return

    const wilaya = WILAYAS.find((w) => String(w.code) === String(form.wilaya))
    const service = referentiels.services.find(
      (s) => String(s.id_service) === String(form.domaine),
    )

    const formData = new FormData()
    formData.append('nom', form.nom.trim())
    formData.append('prenom', form.prenom.trim())
    formData.append('email', form.email.trim())
    formData.append('telephone', form.telephone.trim())
    formData.append('wilaya', wilaya?.nameFr ?? form.wilaya)
    formData.append('objet', form.objet.trim())
    formData.append('description', form.description.trim())
    formData.append('id_nature', form.nature)
    formData.append('id_qualite', form.qualite)
    formData.append('id_service', form.domaine)

    setIsSubmitting(true)
    setAntiSpam(false)
    try {
      let jeton = jetonFormulaire
      if (!jeton) {
        try {
          jeton = await chargerJeton()
        } catch {
          jeton = ''
        }
      }
      formData.append('jeton_formulaire', jeton)
      formData.append('site_web', siteWeb)

      // axios ne résout la promesse que pour une réponse 2xx :
      // on ne dépend donc pas d'un code 201 précis.
      const response = await api.post('/doleances', formData)
      const reference = response.data?.reference

      if (!reference) {
        setSubmitError(t.deposit.submitFailed)
        return
      }

      navigate('/deposer/confirmation', {
        state: {
          reference,
          email: form.email.trim(),
          domaineLabel: service?.nom_service ?? '',
          depositedAt: new Date().toISOString(),
        },
      })
      reinitialiserFormulaire()
    } catch (err) {
      const status = err.response?.status
      const apiErrors = err.response?.data?.errors
      const messageApi = err.response?.data?.message

      if (status === 422 && apiErrors && Object.keys(apiErrors).length) {
        applyLaravelErrors(traduireChampsApi(apiErrors, lang))
      } else if (status === 422) {
        setAntiSpam(true)
        setSubmitError(
          traduireMessageApi(
            messageApi,
            lang,
            t.deposit.submitFailed,
          ),
        )
      } else {
        setSubmitError(t.deposit.submitFailed)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    reinitialiserFormulaire()
    navigate('/')
  }

  return (
    <div className="flex min-h-screen flex-col bg-page">
      <Header />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
        <h1 className="mb-2 text-2xl font-bold text-institutional sm:text-3xl">
          {t.deposit.title}
        </h1>
        <p className="mb-6 max-w-2xl text-sm text-gray-600 sm:text-base">
          {t.deposit.subtitle}
        </p>

        <IndicateurEtapes etapeActive={1} />

        {referentielsFailed && (
          <p className="mb-6 text-sm text-red-600" role="alert">
            {t.deposit.referentielsError}
          </p>
        )}

        {submitError && (
          <div className="mb-6 rounded-[8px] bg-danger-bg px-4 py-3 text-sm text-danger-text" role="alert">
            <p>{submitError}</p>
            {antiSpam && (
              <button
                type="button"
                onClick={() => {
                  chargerJeton().catch(() => {})
                  setSubmitError('')
                  setAntiSpam(false)
                }}
                className="mt-2 font-semibold underline hover:no-underline"
              >
                Recharger le formulaire
              </button>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="relative">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -left-[10000px] top-auto h-px w-px overflow-hidden"
          >
            <label htmlFor="site_web">Site web</label>
            <input
              id="site_web"
              name="site_web"
              type="text"
              tabIndex={-1}
              autoComplete="off"
              value={siteWeb}
              onChange={(e) => setSiteWeb(e.target.value)}
            />
          </div>
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_280px] xl:grid-cols-[minmax(0,1fr)_300px]">
            <div className="space-y-6">
              {/* Informations personnelles */}
              <section className="rounded-[8px] border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
                <h2 className="mb-5 text-lg font-bold text-gray-900">
                  {t.deposit.personal.title}
                </h2>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <FieldLabel htmlFor="nom" required>
                      {t.deposit.personal.nom}
                    </FieldLabel>
                    <TextInput
                      id="nom"
                      name="nom"
                      autoComplete="family-name"
                      maxLength={60}
                      placeholder={t.deposit.personal.nomPlaceholder}
                      value={form.nom}
                      onChange={(e) => setValue('nom', e.target.value)}
                      onBlur={() => onBlur('nom')}
                      error={errors.nom}
                    />
                    <FieldHelp>{t.deposit.personal.nameHelp}</FieldHelp>
                    <FieldError message={errors.nom} />
                  </div>

                  <div>
                    <FieldLabel htmlFor="prenom" required>
                      {t.deposit.personal.prenom}
                    </FieldLabel>
                    <TextInput
                      id="prenom"
                      name="prenom"
                      autoComplete="given-name"
                      maxLength={60}
                      placeholder={t.deposit.personal.prenomPlaceholder}
                      value={form.prenom}
                      onChange={(e) => setValue('prenom', e.target.value)}
                      onBlur={() => onBlur('prenom')}
                      error={errors.prenom}
                    />
                    <FieldHelp>{t.deposit.personal.nameHelp}</FieldHelp>
                    <FieldError message={errors.prenom} />
                  </div>

                  <div>
                    <FieldLabel htmlFor="email" required>
                      {t.deposit.personal.email}
                    </FieldLabel>
                    <TextInput
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      dir="ltr"
                      maxLength={120}
                      placeholder={t.deposit.personal.emailPlaceholder}
                      value={form.email}
                      onChange={(e) => setValue('email', e.target.value)}
                      onBlur={() => onBlur('email')}
                      error={errors.email}
                    />
                    <FieldError message={errors.email} />
                  </div>

                  <div>
                    <FieldLabel htmlFor="telephone" required>
                      {t.deposit.personal.telephone}
                    </FieldLabel>
                    <TextInput
                      id="telephone"
                      name="telephone"
                      type="tel"
                      autoComplete="tel"
                      dir="ltr"
                      maxLength={20}
                      placeholder={t.deposit.personal.telephonePlaceholder}
                      value={form.telephone}
                      onChange={(e) => setValue('telephone', e.target.value)}
                      onBlur={() => onBlur('telephone')}
                      error={errors.telephone}
                    />
                    <FieldError message={errors.telephone} />
                  </div>

                  <div className="sm:col-span-2">
                    <FieldLabel htmlFor="wilaya" required>
                      {t.deposit.personal.wilaya}
                    </FieldLabel>
                    <SelectInput
                      id="wilaya"
                      name="wilaya"
                      value={form.wilaya}
                      onChange={(e) => setValue('wilaya', e.target.value)}
                      onBlur={() => onBlur('wilaya')}
                      error={errors.wilaya}
                    >
                      <option value="">{t.deposit.personal.wilayaPlaceholder}</option>
                      {WILAYAS.map((w) => (
                        <option key={w.code} value={w.code}>
                          {w.code} — {lang === 'ar' ? w.nameAr : w.nameFr}
                        </option>
                      ))}
                    </SelectInput>
                    <FieldError message={errors.wilaya} />
                  </div>
                </div>
              </section>

              {/* Informations de la demande */}
              <section className="rounded-[8px] border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
                <h2 className="mb-5 text-lg font-bold text-gray-900">
                  {t.deposit.request.title}
                </h2>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <FieldLabel htmlFor="nature" required>
                      {t.deposit.request.nature}
                    </FieldLabel>
                    <SelectInput
                      id="nature"
                      name="nature"
                      value={form.nature}
                      onChange={(e) => setValue('nature', e.target.value)}
                      onBlur={() => onBlur('nature')}
                      error={errors.nature}
                      disabled={referentielsLoading || referentielsFailed}
                    >
                      <option value="">{t.deposit.request.choose}</option>
                      {referentiels.natures
                        .filter((o) => !estToutesNatures(o))
                        .map((o) => (
                          <option key={o.id_nature} value={String(o.id_nature)}>
                            {libelleNature(o, lang)}
                          </option>
                        ))}
                    </SelectInput>
                    <FieldError message={errors.nature} />
                  </div>

                  <div>
                    <FieldLabel htmlFor="qualite" required>
                      {t.deposit.request.qualite}
                    </FieldLabel>
                    <SelectInput
                      id="qualite"
                      name="qualite"
                      value={form.qualite}
                      onChange={(e) => setValue('qualite', e.target.value)}
                      onBlur={() => onBlur('qualite')}
                      error={errors.qualite}
                      disabled={referentielsLoading || referentielsFailed}
                    >
                      <option value="">{t.deposit.request.choose}</option>
                      {referentiels.qualites.map((o) => (
                        <option key={o.id_qualite} value={String(o.id_qualite)}>
                          {libelleQualite(o, lang)}
                        </option>
                      ))}
                    </SelectInput>
                    <FieldError message={errors.qualite} />
                  </div>

                  <div>
                    <FieldLabel htmlFor="domaine" required>
                      {t.deposit.request.domaine}
                    </FieldLabel>
                    <SelectInput
                      id="domaine"
                      name="domaine"
                      value={form.domaine}
                      onChange={(e) => setValue('domaine', e.target.value)}
                      onBlur={() => onBlur('domaine')}
                      error={errors.domaine}
                      disabled={referentielsLoading || referentielsFailed}
                    >
                      <option value="">{t.deposit.request.choose}</option>
                      {referentiels.services
                        .filter((o) => !estTousDomaines(o))
                        .map((o) => (
                          <option key={o.id_service} value={String(o.id_service)}>
                            {libelleService(o, lang)}
                          </option>
                        ))}
                    </SelectInput>
                    <FieldError message={errors.domaine} />
                  </div>
                </div>

                <div className="mt-4">
                  <FieldLabel htmlFor="objet" required>
                    {t.deposit.request.objet}
                  </FieldLabel>
                  <TextInput
                    id="objet"
                    name="objet"
                    maxLength={200}
                    placeholder={t.deposit.request.objetPlaceholder}
                    value={form.objet}
                    onChange={(e) => setValue('objet', e.target.value)}
                    onBlur={() => onBlur('objet')}
                    error={errors.objet}
                  />
                  <FieldError message={errors.objet} />
                </div>

                <div className="mt-4">
                  <FieldLabel htmlFor="description" required>
                    {t.deposit.request.description}
                  </FieldLabel>
                  <TextArea
                    id="description"
                    name="description"
                    rows={5}
                    maxLength={5000}
                    placeholder={t.deposit.request.descriptionPlaceholder}
                    value={form.description}
                    onChange={(e) => setValue('description', e.target.value)}
                    onBlur={() => onBlur('description')}
                    error={errors.description}
                  />
                  <FieldHelp>
                    {tf('deposit.request.descriptionCompteur', {
                      n: form.description.length,
                    })}
                  </FieldHelp>
                  <FieldError message={errors.description} />
                </div>
              </section>

              {/* Actions */}
              <div className="flex flex-wrap items-center gap-3">
                <p className="text-sm text-gray-500">{t.deposit.duration}</p>
                <div className="flex flex-wrap items-center gap-3 sm:ms-auto">
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="inline-flex items-center justify-center rounded-[8px] border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-institutional transition hover:bg-gray-50"
                  >
                    {t.deposit.cancel}
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || referentielsLoading || referentielsFailed}
                    aria-busy={isSubmitting}
                    className="inline-flex items-center justify-center gap-2 rounded-[8px] bg-action px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#008040] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {t.deposit.continue}
                    <Arrow className="h-4 w-4" aria-hidden />
                  </button>
                </div>
              </div>
            </div>

            <AfterSubmitPanel />
          </div>
        </form>
      </main>

      <Footer />
    </div>
  )
}
