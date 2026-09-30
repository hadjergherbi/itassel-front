import { useMemo, useState } from 'react'
import { FieldHelp, FieldLabel, SelectInput, TextInput } from '../FormFields'
import Button from '../ui/Button'
import { useLanguage } from '../../i18n/LanguageContext'

/**
 * Sélecteur de modèle prédéfini : chargement / erreur / vide / recherche (>8) /
 * confirmation avant d'écraser un texte déjà saisi.
 */
export default function ModeleMessageSelect({
  id = 'modele-message',
  label,
  modeles = [],
  loadState = 'ready',
  onRetry,
  valeurActuelle = '',
  onAppliquer,
  disabled = false,
}) {
  const { tf } = useLanguage()
  const [choix, setChoix] = useState('')
  const [recherche, setRecherche] = useState('')

  const afficherRecherche = modeles.length > 8
  const filtrés = useMemo(() => {
    const q = recherche.trim().toLowerCase()
    if (!q) return modeles
    return modeles.filter(
      (m) =>
        String(m.titre).toLowerCase().includes(q) ||
        String(m.contenu).toLowerCase().includes(q),
    )
  }, [modeles, recherche])

  const appliquer = (idModele) => {
    setChoix(idModele)
    if (!idModele) return
    const m = modeles.find((x) => String(x.id) === String(idModele))
    if (!m) return
    const dejaSaisi = String(valeurActuelle ?? '').trim().length > 0
    if (dejaSaisi && !window.confirm(tf('admin.modelesSelect.confirmerRemplacement'))) {
      setChoix('')
      return
    }
    onAppliquer?.(m.contenu ?? '')
    setChoix('')
  }

  return (
    <div className="space-y-2">
      {label && (
        <FieldLabel htmlFor={id}>{label}</FieldLabel>
      )}

      {loadState === 'loading' && (
        <p className="text-sm text-gray-500">{tf('commun.loading')}</p>
      )}

      {loadState === 'error' && (
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm text-danger-text">{tf('admin.modelesSelect.erreur')}</p>
          {onRetry && (
            <Button type="button" variant="secondary" size="sm" onClick={onRetry}>
              {tf('commun.retry')}
            </Button>
          )}
        </div>
      )}

      {loadState === 'ready' && modeles.length === 0 && (
        <FieldHelp>{tf('admin.modelesSelect.aucun')}</FieldHelp>
      )}

      {loadState === 'ready' && modeles.length > 0 && (
        <>
          {afficherRecherche && (
            <TextInput
              id={`${id}-recherche`}
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
              placeholder={tf('admin.modelesSelect.recherche')}
              aria-label={tf('admin.modelesSelect.recherche')}
              disabled={disabled}
            />
          )}
          <SelectInput
            id={id}
            value={choix}
            disabled={disabled}
            aria-label={label || tf('admin.modelesSelect.choisir')}
            onChange={(e) => appliquer(e.target.value)}
          >
            <option value="">{tf('admin.modelesSelect.choisir')}</option>
            {filtrés.map((m) => (
              <option key={String(m.id)} value={String(m.id)}>
                {m.titre}
              </option>
            ))}
          </SelectInput>
          {afficherRecherche && filtrés.length === 0 && (
            <FieldHelp>{tf('admin.modelesSelect.aucunResultat')}</FieldHelp>
          )}
        </>
      )}
    </div>
  )
}
