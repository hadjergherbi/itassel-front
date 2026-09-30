import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import useAdminQuery from '../../lib/useAdminQuery'
import { endpoints } from '../../lib/endpoints'
import { extractErrors } from '../../lib/adminApi'
import { message409 } from '../../lib/statuts'
import { invaliderCacheMessagesPredefinis } from '../../lib/messagesPredefinisCache'
import PageHeader from '../../components/ui/PageHeader'
import Tabs from '../../components/ui/Tabs'
import Button from '../../components/ui/Button'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import Modal from '../../components/admin/Modal'
import Toggle from '../../components/admin/Toggle'
import { FieldError, FieldLabel, SelectInput, TextArea, TextInput } from '../../components/FormFields'
import { useToast } from '../../components/ui/Toast'
import { useLanguage } from '../../i18n/LanguageContext'

const IDS = {
  natures: 'id_nature',
  qualites: 'id_qualite',
  'modeles-message': 'id_modele',
  statuts: 'id_statut',
}

/** Codes d'usage connus — repli si GET /usages indisponible. */
const USAGES_FALLBACK_CODES = [
  'accuse_reception',
  'prise_en_charge',
  'complement',
  'reponse',
  'non_retenue',
  'hors_competence',
  'double',
  'relance',
  'cloture',
  'autre',
]

const USAGE_DEFAULT = 'reponse'

/** Couleurs sobres par type (vert institutionnel pour la réponse finale). */
const USAGE_BADGE = {
  reponse: 'bg-[#e6f6ed] text-[#006b3f]',
  complement: 'bg-info-demandee-bg text-info-demandee',
  accuse_reception: 'bg-gray-100 text-gray-700',
  prise_en_charge: 'bg-blue-50 text-blue-800',
  non_retenue: 'bg-danger-bg text-danger-text',
  hors_competence: 'bg-warning-bg text-warning-text',
  double: 'bg-purple-50 text-purple-800',
  relance: 'bg-amber-50 text-amber-900',
  cloture: 'bg-slate-100 text-slate-700',
  autre: 'bg-gray-100 text-gray-600',
}

function tabsParametres(tf) {
  return [
    { id: 'natures', label: tf('admin.parametres.tabs.natures') },
    { id: 'qualites', label: tf('admin.parametres.tabs.qualites') },
    { id: 'statuts', label: tf('admin.parametres.tabs.statuts') },
    { id: 'messages', label: tf('admin.parametres.tabs.messages') },
    { id: 'notifications', label: tf('admin.parametres.tabs.notifications') },
  ]
}

function familleLibelle(tf, famille) {
  return tf(`admin.parametres.familles.${famille}`) !== `admin.parametres.familles.${famille}`
    ? tf(`admin.parametres.familles.${famille}`)
    : famille
}

function evenementLibelle(tf, code) {
  const cle = `admin.parametres.evenements.${code}`
  const traduit = tf(cle)
  return traduit !== cle ? traduit : code
}

function destinataireLibelle(tf, code) {
  const cle = `admin.parametres.destinataires.${code}`
  const traduit = tf(cle)
  return traduit !== cle ? traduit : code
}

function usageLibelleDepuis(tf, code, usages) {
  if (!code) return ''
  const api = usages.find((u) => u.code === code)
  if (api?.libelle) return api.libelle
  const cle = `admin.parametres.usages.${code}`
  const traduit = tf(cle)
  return traduit !== cle ? traduit : code
}

function ReferentielList({ type, titre, sousTitre }) {
  const { tf, lang } = useLanguage()
  const toast = useToast()
  const { data, loadState, erreur, reload } = useAdminQuery(`/admin/parametres/${type}`, {
    fetcher: () => endpoints.referentiel(type),
  })
  const items = Array.isArray(data) ? data : []
  const champId = IDS[type] ?? 'id'
  const estMessages = type === 'modeles-message'
  const [modal, setModal] = useState(null)
  const [libelle, setLibelle] = useState('')
  const [famille, setFamille] = useState('reclamation')
  const [contenu, setContenu] = useState('')
  const [usage, setUsage] = useState(USAGE_DEFAULT)
  const [usages, setUsages] = useState([])
  const [errors, setErrors] = useState({})
  const [erreurFormulaire, setErreurFormulaire] = useState('')
  const [busy, setBusy] = useState(false)
  const [confirm, setConfirm] = useState(null)

  const idDe = (item) => item?.[champId]
  const obligatoire = tf('admin.parametres.obligatoire')

  useEffect(() => {
    if (!estMessages) return
    let cancelled = false
    endpoints
      .messagesPredefinisUsages()
      .then((res) => {
        if (cancelled) return
        const liste = Array.isArray(res.data) ? res.data : res.data?.data
        if (Array.isArray(liste) && liste.length) {
          setUsages(
            liste
              .map((u) => ({
                code: String(u.code ?? u.value ?? '').trim(),
                libelle: String(u.libelle ?? u.label ?? '').trim(),
              }))
              .filter((u) => u.code),
          )
          return
        }
        setUsages(
          USAGES_FALLBACK_CODES.map((code) => ({
            code,
            libelle: usageLibelleDepuis(tf, code, []),
          })),
        )
      })
      .catch(() => {
        if (cancelled) return
        setUsages(
          USAGES_FALLBACK_CODES.map((code) => ({
            code,
            libelle: usageLibelleDepuis(tf, code, []),
          })),
        )
      })
    return () => {
      cancelled = true
    }
    // tf couvre le changement de langue pour les libellés de repli
  }, [estMessages, lang]) // eslint-disable-line react-hooks/exhaustive-deps -- tf dérivé de lang

  const codesUsage = usages.length
    ? usages.map((u) => u.code)
    : USAGES_FALLBACK_CODES

  const normaliserUsage = (valeur) => {
    const code = String(valeur ?? '').trim()
    if (codesUsage.includes(code)) return code
    return codesUsage.includes(USAGE_DEFAULT) ? USAGE_DEFAULT : codesUsage[0] ?? USAGE_DEFAULT
  }

  const ouvrirAjout = () => {
    setModal({})
    setLibelle('')
    setFamille('reclamation')
    setContenu('')
    setUsage(normaliserUsage(USAGE_DEFAULT))
    setErrors({})
    setErreurFormulaire('')
  }

  const sauver = async (e) => {
    e.preventDefault()
    setErreurFormulaire('')
    const next = {}
    if (!libelle.trim()) {
      next.libelle = obligatoire
      next.titre = obligatoire
    }
    if (estMessages && !contenu.trim()) {
      next.contenu = obligatoire
    }
    const typeUsage = estMessages ? normaliserUsage(usage) : usage
    if (estMessages && !typeUsage) {
      next.type_usage = obligatoire
    }
    if (Object.keys(next).length) {
      setErrors(next)
      return
    }
    setBusy(true)
    try {
      const body =
        type === 'modeles-message'
          ? {
              titre: libelle.trim(),
              contenu: contenu.trim(),
              type_usage: typeUsage,
            }
          : type === 'natures'
            ? { libelle: libelle.trim(), famille }
            : { libelle: libelle.trim() }
      if (modal && idDe(modal)) await endpoints.modifierReferentiel(type, idDe(modal), body)
      else await endpoints.creerReferentiel(type, body)
      if (estMessages) invaliderCacheMessagesPredefinis()
      toast.show('success', tf('admin.parametres.enregistre'))
      setModal(null)
      setErrors({})
      setErreurFormulaire('')
      reload()
    } catch (err) {
      const status = err.response?.status
      const { message, fields } = extractErrors(err, undefined, lang)
      setErrors(fields)
      if (Object.keys(fields).length) {
        // 422 : erreurs déjà sous les champs
      } else if (status === 403) {
        setErreurFormulaire(tf('admin.parametres.erreurInterdit'))
        toast.show('error', tf('admin.parametres.erreurInterdit'))
      } else {
        const texte = message409(err.response?.data?.code, message)
        setErreurFormulaire(texte)
        toast.show('error', texte)
      }
    } finally {
      setBusy(false)
    }
  }

  const supprimer = async () => {
    setBusy(true)
    try {
      await endpoints.supprimerReferentiel(type, idDe(confirm))
      if (estMessages) invaliderCacheMessagesPredefinis()
      toast.show('success', tf('admin.parametres.supprime'))
      setConfirm(null)
      reload()
    } catch (err) {
      toast.show('error', message409(err.response?.data?.code, extractErrors(err, undefined, lang).message))
    } finally {
      setBusy(false)
    }
  }

  if (loadState === 'error' && !data) {
    return (
      <div>
        <p className="mb-3 text-sm text-red-600">{erreur}</p>
        <Button onClick={reload}>{tf('commun.retry')}</Button>
      </div>
    )
  }

  const optionsUsage = usages.length
    ? usages
    : USAGES_FALLBACK_CODES.map((code) => ({
        code,
        libelle: usageLibelleDepuis(tf, code, []),
      }))

  return (
    <div>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-gray-900">{titre}</h2>
          <p className="text-sm text-gray-500">{sousTitre}</p>
        </div>
        <Button onClick={ouvrirAjout}>
          <Plus className="h-4 w-4" /> {tf('admin.parametres.ajouter')}
        </Button>
      </div>
      <div className="overflow-hidden rounded-[8px] border border-gray-200 bg-white">
        <ul className="divide-y divide-gray-100">
          {items.map((item) => {
            const codeUsage = item.type_usage ?? item.usage
            const badgeCls = USAGE_BADGE[codeUsage] ?? 'bg-gray-100 text-gray-600'
            return (
              <li key={idDe(item)} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="font-medium">{item.libelle ?? item.titre}</p>
                  {type === 'natures' && item.famille && (
                    <p className="text-xs text-gray-500">{familleLibelle(tf, item.famille)}</p>
                  )}
                  {estMessages && codeUsage && (
                    <span
                      className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${badgeCls}`}
                    >
                      {item.libelle_usage ||
                        item.usage_libelle ||
                        usageLibelleDepuis(tf, codeUsage, usages)}
                    </span>
                  )}
                </div>
                <div className="flex gap-1">
                  <button
                    type="button"
                    className="rounded p-1.5 hover:bg-gray-100"
                    aria-label={tf('admin.parametres.modifier')}
                    onClick={() => {
                      setModal(item)
                      setLibelle(item.libelle ?? item.titre ?? '')
                      setFamille(item.famille ?? 'reclamation')
                      setContenu(item.contenu ?? '')
                      setUsage(normaliserUsage(item.type_usage ?? item.usage))
                      setErrors({})
                      setErreurFormulaire('')
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    className="rounded p-1.5 text-danger-text hover:bg-danger-bg"
                    aria-label={tf('admin.parametres.supprimer')}
                    onClick={() => setConfirm(item)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            )
          })}
          {items.length === 0 && (
            <li className="px-4 py-8 text-center text-sm text-gray-500">{tf('admin.parametres.vide')}</li>
          )}
        </ul>
      </div>
      <Modal
        open={Boolean(modal)}
        onClose={() => setModal(null)}
        busy={busy}
        title={idDe(modal || {}) ? tf('admin.parametres.modifier') : tf('admin.parametres.ajouter')}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModal(null)}>
              {tf('commun.cancel')}
            </Button>
            <Button type="submit" form="form-ref" loading={busy}>
              {tf('commun.save')}
            </Button>
          </>
        }
      >
        <form id="form-ref" onSubmit={sauver} className="space-y-3" noValidate>
          {erreurFormulaire && (
            <p className="rounded-[8px] bg-danger-bg px-3 py-2 text-sm text-danger-text" role="alert">
              {erreurFormulaire}
            </p>
          )}
          <div>
            <FieldLabel htmlFor="ref-titre" required>
              {type === 'modeles-message' ? tf('admin.parametres.titreChamp') : tf('admin.parametres.libelle')}
            </FieldLabel>
            <TextInput
              id="ref-titre"
              value={libelle}
              onChange={(e) => setLibelle(e.target.value)}
              error={errors.libelle || errors.titre}
            />
            <FieldError message={errors.libelle || errors.titre} />
          </div>
          {type === 'natures' && (
            <div>
              <FieldLabel htmlFor="famille" required>
                {tf('admin.parametres.famille')}
              </FieldLabel>
              <SelectInput id="famille" value={famille} onChange={(e) => setFamille(e.target.value)} error={errors.famille}>
                <option value="reclamation">{tf('admin.parametres.familles.reclamation')}</option>
                <option value="demande">{tf('admin.parametres.familles.demande')}</option>
              </SelectInput>
              <FieldError message={errors.famille} />
            </div>
          )}
          {estMessages && (
            <>
              <div>
                <FieldLabel htmlFor="ref-contenu" required>
                  {tf('admin.parametres.contenu')}
                </FieldLabel>
                <TextArea
                  id="ref-contenu"
                  value={contenu}
                  onChange={(e) => setContenu(e.target.value)}
                  error={errors.contenu}
                  rows={4}
                />
                <FieldError message={errors.contenu} />
              </div>
              <div>
                <FieldLabel htmlFor="ref-type-usage" required>
                  {tf('admin.parametres.typeUsage')}
                </FieldLabel>
                <SelectInput
                  id="ref-type-usage"
                  value={normaliserUsage(usage)}
                  onChange={(e) => setUsage(e.target.value)}
                  error={errors.type_usage || errors.usage}
                >
                  {optionsUsage.map((u) => (
                    <option key={u.code} value={u.code}>
                      {u.libelle || usageLibelleDepuis(tf, u.code, [])}
                    </option>
                  ))}
                </SelectInput>
                <FieldError message={errors.type_usage || errors.usage} />
              </div>
            </>
          )}
        </form>
      </Modal>
      <ConfirmDialog
        open={Boolean(confirm)}
        title={tf('admin.parametres.confirmSupprimerTitre')}
        danger
        busy={busy}
        onClose={() => setConfirm(null)}
        onConfirm={supprimer}
      >
        {tf('admin.parametres.confirmSupprimerCorps')}
      </ConfirmDialog>
    </div>
  )
}

function StatutsTab() {
  const { tf, lang } = useLanguage()
  const toast = useToast()
  const { data, loadState, erreur, reload } = useAdminQuery('/admin/parametres/statuts', {
    fetcher: () => endpoints.referentiel('statuts'),
  })
  const items = Array.isArray(data) ? data : []
  const [modal, setModal] = useState(null)
  const [libelle, setLibelle] = useState('')
  const [couleur, setCouleur] = useState('')
  const [messageCitoyen, setMessageCitoyen] = useState('')
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)

  const sauver = async (e) => {
    e.preventDefault()
    if (!libelle.trim()) {
      setErrors({ libelle: tf('admin.parametres.obligatoire') })
      return
    }
    setBusy(true)
    try {
      await endpoints.modifierReferentiel('statuts', modal.id_statut, {
        libelle: libelle.trim(),
        couleur: couleur.trim(),
        message_citoyen: messageCitoyen.trim(),
      })
      toast.show('success', tf('admin.parametres.statutMisAJour'))
      setModal(null)
      reload()
    } catch (err) {
      const { message, fields } = extractErrors(err, undefined, lang)
      setErrors(fields)
      if (!Object.keys(fields).length) toast.show('error', message409(err.response?.data?.code, message))
    } finally {
      setBusy(false)
    }
  }

  if (loadState === 'error' && !data) {
    return (
      <div>
        <p className="mb-3 text-sm text-red-600">{erreur}</p>
        <Button onClick={reload}>{tf('commun.retry')}</Button>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-base font-bold text-gray-900">{tf('admin.parametres.tabs.statuts')}</h2>
        <p className="text-sm text-gray-500">{tf('admin.parametres.statutsSousTitre')}</p>
      </div>
      <div className="overflow-hidden rounded-[8px] border border-gray-200 bg-white">
        <ul className="divide-y divide-gray-100">
          {items.map((item) => (
            <li key={item.id_statut} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className="h-3 w-3 shrink-0 rounded-full border border-gray-200"
                    style={{ background: item.couleur || '#d1d5db' }}
                    aria-hidden
                  />
                  <p className="font-medium">{item.libelle}</p>
                  <span className="font-mono text-[11px] text-gray-400">{item.code}</span>
                </div>
                {item.message_citoyen && (
                  <p className="mt-0.5 truncate text-xs text-gray-500">{item.message_citoyen}</p>
                )}
              </div>
              <button
                type="button"
                className="rounded p-1.5 hover:bg-gray-100"
                aria-label={tf('admin.parametres.modifier')}
                onClick={() => {
                  setModal(item)
                  setLibelle(item.libelle ?? '')
                  setCouleur(item.couleur ?? '')
                  setMessageCitoyen(item.message_citoyen ?? '')
                  setErrors({})
                }}
              >
                <Pencil className="h-4 w-4" />
              </button>
            </li>
          ))}
          {items.length === 0 && (
            <li className="px-4 py-8 text-center text-sm text-gray-500">{tf('admin.parametres.aucunStatut')}</li>
          )}
        </ul>
      </div>
      <Modal
        open={Boolean(modal)}
        onClose={() => setModal(null)}
        busy={busy}
        title={tf('admin.parametres.modifierStatut')}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModal(null)}>
              {tf('commun.cancel')}
            </Button>
            <Button type="submit" form="form-statut" loading={busy}>
              {tf('commun.save')}
            </Button>
          </>
        }
      >
        <form id="form-statut" onSubmit={sauver} className="space-y-3">
          <p className="text-sm text-gray-500">
            {tf('admin.parametres.code')} : <span className="font-mono">{modal?.code}</span>
          </p>
          <div>
            <FieldLabel required>{tf('admin.parametres.libelle')}</FieldLabel>
            <TextInput value={libelle} onChange={(e) => setLibelle(e.target.value)} error={errors.libelle} />
            <FieldError message={errors.libelle} />
          </div>
          <div>
            <FieldLabel>{tf('admin.parametres.couleur')}</FieldLabel>
            <div className="flex items-center gap-2">
              <input
                type="color"
                className="h-10 w-10 cursor-pointer rounded border border-gray-200"
                value={/^#[0-9a-fA-F]{6}$/.test(couleur) ? couleur : '#006b3f'}
                onChange={(e) => setCouleur(e.target.value)}
                aria-label={tf('admin.parametres.choisirCouleur')}
              />
              <TextInput value={couleur} onChange={(e) => setCouleur(e.target.value)} error={errors.couleur} />
            </div>
            <FieldError message={errors.couleur} />
          </div>
          <div>
            <FieldLabel>{tf('admin.parametres.messageCitoyen')}</FieldLabel>
            <TextArea value={messageCitoyen} onChange={(e) => setMessageCitoyen(e.target.value)} error={errors.message_citoyen} />
            <FieldError message={errors.message_citoyen} />
          </div>
        </form>
      </Modal>
    </div>
  )
}

function NotificationsTab() {
  const { tf, lang } = useLanguage()
  const toast = useToast()
  const { data, loadState, erreur, reload } = useAdminQuery('/admin/parametres/notifications', {
    fetcher: () => endpoints.notifications(),
  })
  const [saisi, setSaisi] = useState(null)
  const lignes = saisi ?? (Array.isArray(data) ? data : [])
  const [busy, setBusy] = useState(false)

  const groupes = []
  const vus = new Set()
  lignes.forEach((l) => {
    if (vus.has(l.evenement)) return
    vus.add(l.evenement)
    groupes.push({
      evenement: l.evenement,
      lignes: lignes.filter((x) => x.evenement === l.evenement),
    })
  })

  const maj = (evenement, destinataire, champ, valeur) => {
    setSaisi(
      lignes.map((l) =>
        l.evenement === evenement && l.destinataire === destinataire ? { ...l, [champ]: valeur } : l,
      ),
    )
  }

  const sauver = async () => {
    setBusy(true)
    try {
      await endpoints.sauverNotifications(lignes)
      toast.show('success', tf('admin.parametres.notificationsEnregistrees'))
      reload()
    } catch (err) {
      toast.show('error', message409(err.response?.data?.code, extractErrors(err, undefined, lang).message))
    } finally {
      setBusy(false)
    }
  }

  if (loadState === 'error' && !data) {
    return (
      <div>
        <p className="mb-3 text-sm text-red-600">{erreur}</p>
        <Button onClick={reload}>{tf('commun.retry')}</Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-bold text-gray-900">{tf('admin.parametres.tabs.notifications')}</h2>
        <p className="text-sm text-gray-500">{tf('admin.parametres.notificationsSousTitre')}</p>
      </div>
      <div className="overflow-x-auto rounded-[8px] border border-gray-200 bg-white">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50 text-xs uppercase text-gray-500">
              <th className="px-4 py-3 text-start font-medium">{tf('admin.parametres.colDestinataire')}</th>
              <th className="px-4 py-3 text-start font-medium">{tf('admin.parametres.colEmail')}</th>
              <th className="px-4 py-3 text-start font-medium">{tf('admin.parametres.colApplication')}</th>
            </tr>
          </thead>
          <tbody>
            {groupes.map((g) => (
              <FragmentGroup key={g.evenement} groupe={g} maj={maj} />
            ))}
            {lignes.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-gray-500">
                  {loadState === 'loading' ? tf('commun.loading') : tf('admin.parametres.aucuneNotification')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <Button onClick={sauver} loading={busy} disabled={!lignes.length}>
        {tf('commun.save')}
      </Button>
    </div>
  )
}

function FragmentGroup({ groupe, maj }) {
  const { tf } = useLanguage()
  return (
    <>
      <tr className="bg-[#f3faf6]">
        <td colSpan={3} className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-institutional">
          {evenementLibelle(tf, groupe.evenement)}
        </td>
      </tr>
      {groupe.lignes.map((l) => {
        const obligatoire = l.modifiable === false
        const pasApp = l.destinataire === 'demandeur'
        return (
          <tr key={`${l.evenement}-${l.destinataire}`} className="border-t border-gray-100">
            <td className="px-4 py-3">
              <p>{destinataireLibelle(tf, l.destinataire)}</p>
              {obligatoire && <p className="text-xs text-gray-400">{tf('admin.parametres.obligatoireCourt')}</p>}
            </td>
            <td className="px-4 py-3">
              <Toggle
                id={`email-${l.evenement}-${l.destinataire}`}
                checked={Boolean(l.canal_email)}
                disabled={obligatoire}
                onChange={(v) => maj(l.evenement, l.destinataire, 'canal_email', v)}
              />
            </td>
            <td className="px-4 py-3">
              {pasApp ? (
                <span className="text-xs text-gray-400">—</span>
              ) : (
                <Toggle
                  id={`app-${l.evenement}-${l.destinataire}`}
                  checked={Boolean(l.canal_app)}
                  disabled={obligatoire}
                  onChange={(v) => maj(l.evenement, l.destinataire, 'canal_app', v)}
                />
              )}
            </td>
          </tr>
        )
      })}
    </>
  )
}

export default function AdminParametres() {
  const { tf } = useLanguage()
  const [params, setParams] = useSearchParams()
  const onglet = params.get('onglet') || 'natures'

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title={tf('admin.layout.parametres')} subtitle={tf('admin.parametres.sousTitre')} />
      <Tabs
        tabs={tabsParametres(tf)}
        value={onglet}
        onChange={(id) => {
          const next = new URLSearchParams(params)
          next.set('onglet', id)
          setParams(next)
        }}
      />
      {onglet === 'natures' && (
        <ReferentielList
          type="natures"
          titre={tf('admin.parametres.tabs.natures')}
          sousTitre={tf('admin.parametres.naturesSousTitre')}
        />
      )}
      {onglet === 'qualites' && (
        <ReferentielList
          type="qualites"
          titre={tf('admin.parametres.tabs.qualites')}
          sousTitre={tf('admin.parametres.qualitesSousTitre')}
        />
      )}
      {onglet === 'statuts' && <StatutsTab />}
      {onglet === 'messages' && (
        <ReferentielList
          type="modeles-message"
          titre={tf('admin.parametres.tabs.messages')}
          sousTitre={tf('admin.parametres.messagesSousTitre')}
        />
      )}
      {onglet === 'notifications' && <NotificationsTab />}
    </div>
  )
}
