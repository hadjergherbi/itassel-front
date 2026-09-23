import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import Header from '../components/Header'
import Footer from '../components/Footer'
import AfterSubmitPanel from '../components/AfterSubmitPanel'
import FileDropzone from '../components/FileDropzone'
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

const NAME_RE =
  /^[\p{L}\p{M}][\p{L}\p{M}\s'\u2019-]{0,79}$/u
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_RE = /^(0|\+213|00213)?[\s.-]?[5-7](?:[\s.-]?\d{2}){4}$/

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
      if (!NAME_RE.test(trimmed)) return errorsMap.nameInvalid
      return ''
    case 'email':
      if (!trimmed) return errorsMap.required
      if (!EMAIL_RE.test(trimmed)) return errorsMap.emailInvalid
      return ''
    case 'telephone': {
      if (!trimmed) return errorsMap.required
      const compact = trimmed.replace(/[\s.-]/g, '')
      if (!PHONE_RE.test(trimmed) && !/^(0|\+213|00213)?[5-7]\d{8}$/.test(compact)) {
        return errorsMap.phoneInvalid
      }
      return ''
    }
    case 'wilaya':
    case 'nature':
    case 'qualite':
    case 'domaine':
    case 'objet':
    case 'description':
      if (!trimmed) return errorsMap.required
      return ''
    default:
      return ''
  }
}

export default function DeposerDoleance() {
  const { t, lang, isRtl } = useLanguage()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const Arrow = isRtl ? ArrowLeft : ArrowRight

  const initialDomaine = useMemo(() => {
    const d = searchParams.get('domaine')
    const allowed = ['sport', 'jeunesse', 'rh']
    return allowed.includes(d) ? d : ''
  }, [searchParams])

  const [form, setForm] = useState(() => ({
    ...emptyForm,
    domaine: initialDomaine,
  }))
  const [file, setFile] = useState(null)
  const [fileError, setFileError] = useState(null)
  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const setValue = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }))
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
    return Object.keys(next).length === 0 && !fileError
  }

  const applyLaravelErrors = (apiErrors = {}) => {
    const next = {}
    let nextFileError = null

    Object.entries(apiErrors).forEach(([key, messages]) => {
      const msg = firstError(messages)
      if (!msg) return
      if (key === 'piece_jointe') {
        nextFileError = msg
        return
      }
      const uiKey = API_FIELD_MAP[key] ?? key
      next[uiKey] = msg
    })

    setErrors(next)
    setFileError(nextFileError)
    setTouched((prev) => ({
      ...prev,
      ...Object.keys(next).reduce((acc, key) => {
        acc[key] = true
        return acc
      }, {}),
    }))

    requestAnimationFrame(() => {
      const first = document.querySelector('[aria-invalid="true"]')
      first?.focus()
      first?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (isSubmitting) return
    if (!validateAll()) {
      requestAnimationFrame(() => {
        const first = document.querySelector('[aria-invalid="true"]')
        first?.focus()
        first?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      })
      return
    }

    const body = new FormData()
    body.append('nom', form.nom.trim())
    body.append('prenom', form.prenom.trim())
    body.append('email', form.email.trim())
    body.append('telephone', form.telephone.trim())
    body.append('wilaya', form.wilaya)
    body.append('objet', form.objet.trim())
    body.append('description', form.description.trim())
    body.append('id_service', form.domaine)
    body.append('id_nature', form.nature)
    body.append('id_qualite', form.qualite)
    if (file) {
      body.append('piece_jointe', file)
    }

    setIsSubmitting(true)
    try {
      const response = await api.post('/doleances', body)

      if (response.status === 201) {
        navigate('/confirmation', {
          state: {
            reference: response.data.reference,
            email: form.email.trim(),
            domaine: form.domaine,
            depositedAt: new Date().toISOString(),
          },
        })
      }
    } catch (err) {
      const status = err.response?.status
      if (status === 422) {
        applyLaravelErrors(err.response.data?.errors)
      } else {
        setErrors((prev) => ({
          ...prev,
          description:
            err.response?.data?.message ||
            (lang === 'ar'
              ? 'تعذّر إرسال الطلب. أعيدوا المحاولة.'
              : "Impossible d'envoyer la demande. Réessayez."),
        }))
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    navigate('/')
  }

  return (
    <div className="flex min-h-screen flex-col bg-page">
      <Header />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
        <h1 className="mb-2 text-2xl font-bold text-institutional sm:text-3xl">
          {t.deposit.title}
        </h1>
        <p className="mb-8 max-w-2xl text-sm text-gray-600 sm:text-base">
          {t.deposit.subtitle}
        </p>

        <form onSubmit={handleSubmit} noValidate>
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
                    >
                      <option value="">{t.deposit.request.choose}</option>
                      {t.deposit.request.natures.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
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
                    >
                      <option value="">{t.deposit.request.choose}</option>
                      {t.deposit.request.qualites.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
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
                    >
                      <option value="">{t.deposit.request.choose}</option>
                      {t.deposit.request.domaines.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
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
                    placeholder={t.deposit.request.descriptionPlaceholder}
                    value={form.description}
                    onChange={(e) => setValue('description', e.target.value)}
                    onBlur={() => onBlur('description')}
                    error={errors.description}
                  />
                  <FieldError message={errors.description} />
                </div>

                <div className="mt-4">
                  <FieldLabel htmlFor="attachment">
                    {t.deposit.request.attachment}
                  </FieldLabel>
                  <FileDropzone
                    file={file}
                    onChange={setFile}
                    error={fileError}
                    onError={setFileError}
                  />
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
                    disabled={isSubmitting}
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
