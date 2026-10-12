import { useMemo, useState } from 'react'
import { X } from 'lucide-react'
import { FieldError, TextInput } from '../FormFields'
import { useLanguage } from '../../i18n/LanguageContext'
import { libelleService } from '../../lib/libelles'
import { estTousDomaines } from '../../lib/statuts'

const MAX_SERVICES = 10

function normaliser(texte) {
  return String(texte ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

/**
 * Cases à cocher, recherche et puces. Le principal n'apparaît que s'il y a
 * au moins deux services cochés.
 */
export default function SelecteurServices({
  services,
  ids,
  principal,
  erreurServices,
  erreurPrincipal,
  onChange,
}) {
  const { tf, lang } = useLanguage()
  const [recherche, setRecherche] = useState('')
  const coches = ids.map(String)

  const catalogue = useMemo(
    () => (services ?? []).filter((s) => s?.id_service != null && !estTousDomaines(s)),
    [services],
  )

  const nomDe = (service) => libelleService(service, lang) || String(service?.id_service ?? '')

  const parId = useMemo(() => {
    const map = new Map()
    for (const s of catalogue) map.set(String(s.id_service), s)
    return map
  }, [catalogue])

  const filtre = normaliser(recherche)
  const visibles = catalogue.filter((s) => !filtre || normaliser(nomDe(s)).includes(filtre))

  const choisis = coches.map((id) => parId.get(id)).filter(Boolean)

  const maj = (suite, principalSuivant) => {
    onChange({
      ids_services: suite,
      id_service_principal: suite.length ? String(principalSuivant ?? suite[0]) : '',
    })
  }

  const basculer = (id) => {
    const cle = String(id)
    if (coches.includes(cle)) {
      const suite = coches.filter((x) => x !== cle)
      const suivant = suite.includes(String(principal)) ? principal : suite[0]
      maj(suite, suivant)
      return
    }
    if (coches.length >= MAX_SERVICES) return
    const suite = [...coches, cle]
    maj(suite, principal || cle)
  }

  const erreurListe = [erreurServices].flat().filter(Boolean).join(' ')

  return (
    <fieldset className="space-y-2">
      <legend className="mb-1.5 block text-sm font-medium text-gray-800">
        {tf('admin.utilisateurs.servicesLabel')}
        <span className="ms-0.5 text-red-600" aria-hidden>
          *
        </span>
      </legend>

      <div
        className="flex flex-wrap gap-1.5"
        aria-label={tf('admin.utilisateurs.servicesChoisis')}
      >
        {choisis.map((s) => {
          const nom = nomDe(s)
          return (
            <span
              key={s.id_service}
              className="inline-flex max-w-full items-center gap-1 rounded-full bg-[#e6f6ed] py-0.5 ps-2.5 pe-1 text-xs font-medium text-institutional"
            >
              <span className="truncate">{nom}</span>
              <button
                type="button"
                className="rounded-full p-0.5 hover:bg-white/80"
                aria-label={tf('admin.utilisateurs.retirerService', { nom })}
                onClick={() => basculer(s.id_service)}
              >
                <X className="h-3.5 w-3.5" aria-hidden />
              </button>
            </span>
          )
        })}
      </div>

      <p className="text-xs text-gray-500">
        {tf('admin.utilisateurs.compteurSelection', { n: coches.length })}
      </p>

      <TextInput
        id="u-services-recherche"
        type="search"
        value={recherche}
        onChange={(e) => setRecherche(e.target.value)}
        placeholder={tf('admin.utilisateurs.rechercheServices')}
        aria-label={tf('admin.utilisateurs.rechercheServices')}
      />

      <ul
        id="u-services-liste"
        className="max-h-48 space-y-1 overflow-y-auto rounded-[8px] border border-gray-200 p-2"
        aria-labelledby="u-services-recherche"
      >
        {visibles.length === 0 && (
          <li className="px-1 py-2 text-sm text-gray-500">{tf('admin.utilisateurs.aucunServiceTrouve')}</li>
        )}
        {visibles.map((s) => {
          const cle = String(s.id_service)
          const coche = coches.includes(cle)
          const bloque = !coche && coches.length >= MAX_SERVICES
          const id = `u-service-${cle}`
          return (
            <li key={cle}>
              <label htmlFor={id} className="flex cursor-pointer items-center gap-2 rounded-[6px] px-1.5 py-1 text-sm hover:bg-gray-50">
                <input
                  id={id}
                  type="checkbox"
                  className="h-4 w-4 accent-[#006b3f]"
                  checked={coche}
                  disabled={bloque}
                  onChange={() => basculer(s.id_service)}
                />
                <span>{nomDe(s)}</span>
              </label>
            </li>
          )
        })}
      </ul>

      {coches.length >= 2 && (
        <fieldset className="space-y-1">
          <legend className="text-sm font-medium text-gray-800">
            {tf('admin.utilisateurs.servicePrincipal')}
          </legend>
          {choisis.map((s) => {
            const cle = String(s.id_service)
            const id = `u-principal-${cle}`
            return (
              <label key={cle} htmlFor={id} className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  id={id}
                  type="radio"
                  name="id_service_principal"
                  className="h-4 w-4 accent-[#006b3f]"
                  checked={String(principal) === cle}
                  onChange={() => maj(coches, cle)}
                />
                <span>{nomDe(s)}</span>
              </label>
            )
          })}
          <FieldError message={erreurPrincipal} />
        </fieldset>
      )}

      <FieldError message={erreurListe} />
    </fieldset>
  )
}

export { MAX_SERVICES }
