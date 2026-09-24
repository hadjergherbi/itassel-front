import { useState } from 'react'
import { Check, Eye, EyeOff, X } from 'lucide-react'
import { FieldError, FieldLabel, TextInput } from '../FormFields'
import { useLanguage } from '../../i18n/LanguageContext'

const REGLES = [
  { id: 'longueur', ok: (mdp) => mdp.length >= 10, cle: 'admin.mdp.regleLongueur' },
  { id: 'majuscule', ok: (mdp) => /[A-Z]/.test(mdp), cle: 'admin.mdp.regleMajuscule' },
  { id: 'minuscule', ok: (mdp) => /[a-z]/.test(mdp), cle: 'admin.mdp.regleMinuscule' },
  { id: 'chiffre', ok: (mdp) => /\d/.test(mdp), cle: 'admin.mdp.regleChiffre' },
  { id: 'identiques', ok: (mdp, confirmation) => Boolean(mdp) && mdp === confirmation, cle: 'admin.mdp.regleIdentiques' },
]

// eslint-disable-next-line react-refresh/only-export-components
export function evaluerReglesMotDePasse(motDePasse, confirmation) {
  return REGLES.map((r) => ({
    id: r.id,
    ok: r.ok(motDePasse, confirmation),
    cle: r.cle,
  }))
}

export function ChampMotDePasse({ id, label, value, onChange, error, autoComplete }) {
  const [voir, setVoir] = useState(false)
  const { tf } = useLanguage()
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
              aria-label={voir ? tf('admin.mdp.masquer') : tf('admin.mdp.voir')}
        >
          {voir ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      <FieldError message={error} />
    </div>
  )
}

export default function ListeReglesMotDePasse({ motDePasse, confirmation, compteur = false }) {
  const { tf } = useLanguage()
  const regles = evaluerReglesMotDePasse(motDePasse, confirmation)
  const ok = regles.filter((r) => r.ok).length
  return (
    <div className="rounded-[8px] bg-gray-50 px-3 py-2.5" aria-live="polite">
      {compteur && (
        <p className="mb-2 text-xs font-medium text-gray-600">
          {tf('admin.mdp.compteur', { n: ok })}
        </p>
      )}
      <ul className={compteur ? 'grid grid-cols-1 gap-1 sm:grid-cols-2' : 'space-y-1'}>
        {regles.map((r) => (
          <li
            key={r.id}
            className={`flex items-center gap-2 text-xs ${r.ok ? 'text-success-text' : 'text-gray-500'}`}
          >
            {r.ok ? <Check className="h-3.5 w-3.5 shrink-0" aria-hidden /> : <X className="h-3.5 w-3.5 shrink-0" aria-hidden />}
            {tf(r.cle)}
          </li>
        ))}
      </ul>
    </div>
  )
}
