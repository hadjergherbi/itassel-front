import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import useAdminQuery from '../../lib/useAdminQuery'
import { endpoints } from '../../lib/endpoints'
import { extractErrors } from '../../lib/adminApi'
import { message409 } from '../../lib/statuts'
import PageHeader from '../../components/ui/PageHeader'
import Tabs from '../../components/ui/Tabs'
import Button from '../../components/ui/Button'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import Modal from '../../components/admin/Modal'
import Toggle from '../../components/admin/Toggle'
import { FieldError, FieldLabel, SelectInput, TextArea, TextInput } from '../../components/FormFields'
import { useToast } from '../../components/ui/Toast'

const TABS = [
  { id: 'natures', label: 'Natures de communication' },
  { id: 'qualites', label: 'Qualités du demandeur' },
  { id: 'statuts', label: 'Statuts' },
  { id: 'messages', label: 'Messages prédéfinis' },
  { id: 'notifications', label: 'Notifications' },
]

const IDS = {
  natures: 'id_nature',
  qualites: 'id_qualite',
  'modeles-message': 'id_modele',
  statuts: 'id_statut',
}

const FAMILLES = {
  reclamation: 'Réclamation',
  demande: 'Demande',
}

const EVENEMENTS = {
  doleance_deposee: "Dépôt d'une doléance",
  changement_statut: 'Changement de statut',
  complement_demande: 'Demande de complément',
  complement_recu: 'Complément reçu',
  complement_annule: 'Complément annulé',
  reponse_publiee: 'Réponse publiée',
  reaffectation_demandee: 'Réaffectation demandée',
  reaffectation_decidee: 'Décision de réaffectation',
  doleance_reaffectee: 'Doléance réaffectée',
  responsable_designe: 'Responsable désigné',
}

const DESTINATAIRES = {
  demandeur: 'Demandeur',
  responsable: 'Responsable du dossier',
  admins_service: 'Administrateurs du service',
  super_admins: 'Super administrateurs',
  demandeur_reaffectation: 'Auteur de la demande',
  utilisateur_designe: 'Utilisateur désigné',
}

function ReferentielList({ type, titre, sousTitre }) {
  const toast = useToast()
  const { data, loadState, erreur, reload } = useAdminQuery(`/admin/parametres/${type}`, {
    fetcher: () => endpoints.referentiel(type),
  })
  const items = Array.isArray(data) ? data : []
  const champId = IDS[type] ?? 'id'
  const [modal, setModal] = useState(null)
  const [libelle, setLibelle] = useState('')
  const [famille, setFamille] = useState('reclamation')
  const [contenu, setContenu] = useState('')
  const [usage, setUsage] = useState('reponse')
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const [confirm, setConfirm] = useState(null)

  const idDe = (item) => item?.[champId]

  const sauver = async (e) => {
    e.preventDefault()
    if (!libelle.trim()) {
      setErrors({ libelle: 'Obligatoire.', titre: 'Obligatoire.' })
      return
    }
    setBusy(true)
    try {
      const body =
        type === 'modeles-message'
          ? { titre: libelle.trim(), contenu: contenu.trim(), type_usage: usage }
          : type === 'natures'
            ? { libelle: libelle.trim(), famille }
            : { libelle: libelle.trim() }
      if (modal && idDe(modal)) await endpoints.modifierReferentiel(type, idDe(modal), body)
      else await endpoints.creerReferentiel(type, body)
      toast.show('success', 'Enregistré.')
      setModal(null)
      reload()
    } catch (err) {
      const { message, fields } = extractErrors(err)
      setErrors(fields)
      if (!Object.keys(fields).length) toast.show('error', message409(err.response?.data?.code, message))
    } finally {
      setBusy(false)
    }
  }

  const supprimer = async () => {
    setBusy(true)
    try {
      await endpoints.supprimerReferentiel(type, idDe(confirm))
      toast.show('success', 'Supprimé.')
      setConfirm(null)
      reload()
    } catch (err) {
      toast.show('error', message409(err.response?.data?.code, extractErrors(err).message))
    } finally {
      setBusy(false)
    }
  }

  if (loadState === 'error' && !data) {
    return (
      <div>
        <p className="mb-3 text-sm text-red-600">{erreur}</p>
        <Button onClick={reload}>Réessayer</Button>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-gray-900">{titre}</h2>
          <p className="text-sm text-gray-500">{sousTitre}</p>
        </div>
        <Button
          onClick={() => {
            setModal({})
            setLibelle('')
            setFamille('reclamation')
            setContenu('')
            setUsage('reponse')
            setErrors({})
          }}
        >
          <Plus className="h-4 w-4" /> Ajouter
        </Button>
      </div>
      <div className="overflow-hidden rounded-[8px] border border-gray-200 bg-white">
        <ul className="divide-y divide-gray-100">
          {items.map((item) => (
            <li key={idDe(item)} className="flex items-center justify-between gap-3 px-4 py-3">
              <div>
                <p className="font-medium">{item.libelle ?? item.titre}</p>
                {type === 'natures' && item.famille && (
                  <p className="text-xs text-gray-500">{FAMILLES[item.famille] ?? item.famille}</p>
                )}
                {item.type_usage && <p className="text-xs text-gray-500">{item.type_usage}</p>}
              </div>
              <div className="flex gap-1">
                <button
                  type="button"
                  className="rounded p-1.5 hover:bg-gray-100"
                  aria-label="Modifier"
                  onClick={() => {
                    setModal(item)
                    setLibelle(item.libelle ?? item.titre ?? '')
                    setFamille(item.famille ?? 'reclamation')
                    setContenu(item.contenu ?? '')
                    setUsage(item.type_usage ?? 'reponse')
                    setErrors({})
                  }}
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  className="rounded p-1.5 text-danger-text hover:bg-danger-bg"
                  aria-label="Supprimer"
                  onClick={() => setConfirm(item)}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </li>
          ))}
          {items.length === 0 && <li className="px-4 py-8 text-center text-sm text-gray-500">Aucune entrée.</li>}
        </ul>
      </div>
      <Modal
        open={Boolean(modal)}
        onClose={() => setModal(null)}
        busy={busy}
        title={idDe(modal || {}) ? 'Modifier' : 'Ajouter'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModal(null)}>Annuler</Button>
            <Button type="submit" form="form-ref" loading={busy}>Enregistrer</Button>
          </>
        }
      >
        <form id="form-ref" onSubmit={sauver} className="space-y-3">
          <div>
            <FieldLabel required>{type === 'modeles-message' ? 'Titre' : 'Libellé'}</FieldLabel>
            <TextInput value={libelle} onChange={(e) => setLibelle(e.target.value)} error={errors.libelle || errors.titre} />
            <FieldError message={errors.libelle || errors.titre} />
          </div>
          {type === 'natures' && (
            <div>
              <FieldLabel htmlFor="famille" required>Famille</FieldLabel>
              <SelectInput id="famille" value={famille} onChange={(e) => setFamille(e.target.value)} error={errors.famille}>
                <option value="reclamation">Réclamation</option>
                <option value="demande">Demande</option>
              </SelectInput>
              <FieldError message={errors.famille} />
            </div>
          )}
          {type === 'modeles-message' && (
            <>
              <div>
                <FieldLabel>Contenu</FieldLabel>
                <TextArea value={contenu} onChange={(e) => setContenu(e.target.value)} />
              </div>
              <div>
                <FieldLabel>Type d&apos;usage</FieldLabel>
                <SelectInput value={usage} onChange={(e) => setUsage(e.target.value)}>
                  <option value="reponse">Réponse</option>
                  <option value="complement">Complément</option>
                </SelectInput>
              </div>
            </>
          )}
        </form>
      </Modal>
      <ConfirmDialog
        open={Boolean(confirm)}
        title="Supprimer cette valeur ?"
        danger
        busy={busy}
        onClose={() => setConfirm(null)}
        onConfirm={supprimer}
      >
        Si elle est déjà utilisée, le serveur refusera la suppression.
      </ConfirmDialog>
    </div>
  )
}

function StatutsTab() {
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
      setErrors({ libelle: 'Obligatoire.' })
      return
    }
    setBusy(true)
    try {
      await endpoints.modifierReferentiel('statuts', modal.id_statut, {
        libelle: libelle.trim(),
        couleur: couleur.trim(),
        message_citoyen: messageCitoyen.trim(),
      })
      toast.show('success', 'Statut mis à jour.')
      setModal(null)
      reload()
    } catch (err) {
      const { message, fields } = extractErrors(err)
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
        <Button onClick={reload}>Réessayer</Button>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-base font-bold text-gray-900">Statuts</h2>
        <p className="text-sm text-gray-500">Libellé, couleur et message au citoyen. Le code n&apos;est pas modifiable.</p>
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
                aria-label="Modifier"
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
          {items.length === 0 && <li className="px-4 py-8 text-center text-sm text-gray-500">Aucun statut.</li>}
        </ul>
      </div>
      <Modal
        open={Boolean(modal)}
        onClose={() => setModal(null)}
        busy={busy}
        title="Modifier le statut"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModal(null)}>Annuler</Button>
            <Button type="submit" form="form-statut" loading={busy}>Enregistrer</Button>
          </>
        }
      >
        <form id="form-statut" onSubmit={sauver} className="space-y-3">
          <p className="text-sm text-gray-500">
            Code : <span className="font-mono">{modal?.code}</span>
          </p>
          <div>
            <FieldLabel required>Libellé</FieldLabel>
            <TextInput value={libelle} onChange={(e) => setLibelle(e.target.value)} error={errors.libelle} />
            <FieldError message={errors.libelle} />
          </div>
          <div>
            <FieldLabel>Couleur</FieldLabel>
            <div className="flex items-center gap-2">
              <input
                type="color"
                className="h-10 w-10 cursor-pointer rounded border border-gray-200"
                value={/^#[0-9a-fA-F]{6}$/.test(couleur) ? couleur : '#006b3f'}
                onChange={(e) => setCouleur(e.target.value)}
                aria-label="Choisir une couleur"
              />
              <TextInput value={couleur} onChange={(e) => setCouleur(e.target.value)} error={errors.couleur} />
            </div>
            <FieldError message={errors.couleur} />
          </div>
          <div>
            <FieldLabel>Message au citoyen</FieldLabel>
            <TextArea value={messageCitoyen} onChange={(e) => setMessageCitoyen(e.target.value)} error={errors.message_citoyen} />
            <FieldError message={errors.message_citoyen} />
          </div>
        </form>
      </Modal>
    </div>
  )
}

function NotificationsTab() {
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
      toast.show('success', 'Notifications enregistrées.')
      reload()
    } catch (err) {
      toast.show('error', message409(err.response?.data?.code, extractErrors(err).message))
    } finally {
      setBusy(false)
    }
  }

  if (loadState === 'error' && !data) {
    return (
      <div>
        <p className="mb-3 text-sm text-red-600">{erreur}</p>
        <Button onClick={reload}>Réessayer</Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-bold text-gray-900">Notifications</h2>
        <p className="text-sm text-gray-500">Canaux par événement et destinataire.</p>
      </div>
      <div className="overflow-x-auto rounded-[8px] border border-gray-200 bg-white">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50 text-xs uppercase text-gray-500">
              <th className="px-4 py-3 text-start font-medium">Destinataire</th>
              <th className="px-4 py-3 text-start font-medium">Email</th>
              <th className="px-4 py-3 text-start font-medium">Application</th>
            </tr>
          </thead>
          <tbody>
            {groupes.map((g) => (
              <FragmentGroup key={g.evenement} groupe={g} maj={maj} />
            ))}
            {lignes.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-gray-500">
                  {loadState === 'loading' ? 'Chargement…' : 'Aucune notification.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <Button onClick={sauver} loading={busy} disabled={!lignes.length}>
        Enregistrer
      </Button>
    </div>
  )
}

function FragmentGroup({ groupe, maj }) {
  return (
    <>
      <tr className="bg-[#f3faf6]">
        <td colSpan={3} className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-institutional">
          {EVENEMENTS[groupe.evenement] ?? groupe.evenement}
        </td>
      </tr>
      {groupe.lignes.map((l) => {
        const obligatoire = l.modifiable === false
        const pasApp = l.destinataire === 'demandeur'
        return (
          <tr key={`${l.evenement}-${l.destinataire}`} className="border-t border-gray-100">
            <td className="px-4 py-3">
              <p>{DESTINATAIRES[l.destinataire] ?? l.destinataire}</p>
              {obligatoire && <p className="text-xs text-gray-400">Obligatoire</p>}
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
  const [params, setParams] = useSearchParams()
  const onglet = params.get('onglet') || 'natures'

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="Paramètres" subtitle="Listes du formulaire, statuts, messages et rappels." />
      <Tabs
        tabs={TABS}
        value={onglet}
        onChange={(id) => {
          const next = new URLSearchParams(params)
          next.set('onglet', id)
          setParams(next)
        }}
      />
      {onglet === 'natures' && (
        <ReferentielList type="natures" titre="Natures de communication" sousTitre="Proposées au citoyen sur le formulaire." />
      )}
      {onglet === 'qualites' && (
        <ReferentielList type="qualites" titre="Qualités du demandeur" sousTitre="Qualité déclarée lors du dépôt." />
      )}
      {onglet === 'statuts' && <StatutsTab />}
      {onglet === 'messages' && (
        <ReferentielList
          type="modeles-message"
          titre="Messages prédéfinis"
          sousTitre="Modèles de réponse et de complément."
        />
      )}
      {onglet === 'notifications' && <NotificationsTab />}
    </div>
  )
}
