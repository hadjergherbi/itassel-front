import { useState } from 'react'
import { KeyRound, Mail, Pencil, Plus, Trash2 } from 'lucide-react'
import useAdminQuery from '../../lib/useAdminQuery'
import { endpoints } from '../../lib/endpoints'
import { extractErrors } from '../../lib/adminApi'
import { message409, nomComplet } from '../../lib/statuts'
import { useAdminAuth } from '../../admin/AdminAuthContext'
import PageHeader from '../../components/ui/PageHeader'
import Button from '../../components/ui/Button'
import Avatar from '../../components/ui/Avatar'
import Card from '../../components/ui/Card'
import Toggle from '../../components/admin/Toggle'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import DesactiverCompteModal from '../../components/admin/DesactiverCompteModal'
import SupprimerCompteModal from '../../components/admin/SupprimerCompteModal'
import DataTable from '../../components/admin/DataTable'
import EmptyState from '../../components/ui/EmptyState'
import Pagination from '../../components/ui/Pagination'
import { FieldError, FieldLabel, SelectInput, TextInput } from '../../components/FormFields'
import { useToast } from '../../components/ui/Toast'

const VIDE = { nom: '', prenom: '', email: '', role: 'admin_service', id_service: '' }

const ETAT_LIBELLES = {
  invitation_en_attente: 'Invitation en attente',
  invitation_expiree: 'Invitation expirée',
  actif: 'Actif',
  desactive: 'Désactivé',
  desactivee: 'Désactivé',
}

function idDe(u) {
  return u?.id_utilisateur ?? u?.id
}

function badgeEtat(etat) {
  const label = ETAT_LIBELLES[etat] ?? etat
  const tone =
    etat === 'actif'
      ? 'bg-success-bg text-success-text'
      : etat === 'invitation_en_attente'
        ? 'bg-nouvelle-bg text-nouvelle'
        : etat === 'invitation_expiree'
          ? 'bg-warning-bg text-warning-text'
          : 'bg-gray-100 text-gray-600'
  if (!label) return null
  return <span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${tone}`}>{label}</span>
}

export default function AdminUtilisateurs() {
  const { utilisateur: moi } = useAdminAuth()
  const toast = useToast()
  const [page, setPage] = useState(1)
  const { data, loadState, erreur, reload } = useAdminQuery('/admin/utilisateurs', {
    params: { page },
    fetcher: (p) => endpoints.utilisateurs(p),
  })
  const { data: rolesData } = useAdminQuery('/admin/roles', { fetcher: () => endpoints.roles() })
  const { data: servicesData } = useAdminQuery('/admin/services', { fetcher: () => endpoints.services() })

  const utilisateurs = data?.data ?? []
  const roles = Array.isArray(rolesData) ? rolesData : rolesData?.roles ?? []
  const services = Array.isArray(servicesData) ? servicesData : servicesData?.services ?? []
  const monId = idDe(moi)

  const [form, setForm] = useState(null)
  const [values, setValues] = useState(VIDE)
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const [confirm, setConfirm] = useState(null)
  const [desactiver, setDesactiver] = useState(null)
  const [supprimer, setSupprimer] = useState(null)

  const estSoi = (u) => Number(idDe(u)) === Number(monId)

  const ouvrir = (u) => {
    setForm(u || {})
    setValues(
      u
        ? {
            nom: u.nom ?? '',
            prenom: u.prenom ?? '',
            email: u.email ?? '',
            role: u.role ?? 'admin_service',
            id_service: u.service?.id_service ? String(u.service.id_service) : '',
          }
        : VIDE,
    )
    setErrors({})
  }

  const sauver = async (e) => {
    e.preventDefault()
    const next = {}
    if (!values.nom.trim()) next.nom = 'Obligatoire.'
    if (!values.prenom.trim()) next.prenom = 'Obligatoire.'
    if (!values.email.trim()) next.email = 'Obligatoire.'
    if (!idDe(form) && !values.role) next.role = 'Obligatoire.'
    if (values.role !== 'super_admin' && !values.id_service) next.id_service = 'Obligatoire.'
    setErrors(next)
    if (Object.keys(next).length) return
    setBusy(true)
    try {
      if (idDe(form)) {
        await endpoints.modifierUtilisateur(idDe(form), {
          nom: values.nom.trim(),
          prenom: values.prenom.trim(),
          email: values.email.trim(),
          id_service: values.role === 'super_admin' ? null : Number(values.id_service),
        })
        toast.show('success', 'Utilisateur mis à jour.')
      } else {
        await endpoints.creerUtilisateur({
          nom: values.nom.trim(),
          prenom: values.prenom.trim(),
          email: values.email.trim(),
          role: values.role,
          id_service: values.role === 'super_admin' ? null : Number(values.id_service),
        })
        toast.show('success', 'Compte créé. Une invitation a été envoyée par email.')
      }
      setForm(null)
      reload()
    } catch (err) {
      const { message, fields } = extractErrors(err)
      setErrors(fields)
      if (!Object.keys(fields).length) toast.show('error', message409(err.response?.data?.code, message))
    } finally {
      setBusy(false)
    }
  }

  const basculerActif = (u, actif) => {
    if (estSoi(u)) return
    if (actif) setConfirm({ type: 'reactiver', user: u })
    else setDesactiver(u)
  }

  const executerConfirm = async () => {
    if (!confirm) return
    setBusy(true)
    try {
      if (confirm.type === 'reactiver') {
        await endpoints.activerUtilisateur(idDe(confirm.user))
        toast.show('success', 'Compte réactivé.')
      } else if (confirm.type === 'mdp') {
        await endpoints.reinitialiserMdp(idDe(confirm.user))
        toast.show('success', 'Mot de passe réinitialisé.')
      } else if (confirm.type === 'invitation') {
        await endpoints.renvoyerInvitation(idDe(confirm.user))
        toast.show('success', 'Invitation renvoyée.')
      }
      setConfirm(null)
      reload()
    } catch (err) {
      toast.show('error', message409(err.response?.data?.code, extractErrors(err).message))
    } finally {
      setBusy(false)
    }
  }

  const colonnes = [
    {
      id: 'nom',
      header: 'Utilisateur',
      cell: (u) => (
        <div className="flex items-center gap-3">
          <Avatar personne={u} />
          <div>
            <p className="font-medium">{nomComplet(u)}</p>
            <p className="text-xs text-gray-500">{u.email}</p>
            {badgeEtat(u.etat_compte)}
          </div>
        </div>
      ),
    },
    {
      id: 'role',
      header: 'Rôle',
      cell: (u) => u.libelle_role ?? (u.role === 'super_admin' ? 'Super administrateur' : 'Administrateur de service'),
    },
    {
      id: 'service',
      header: 'Service',
      cell: (u) => (u.role === 'super_admin' ? 'Tous les services' : u.service?.nom_service ?? '—'),
    },
    {
      id: 'actif',
      header: 'Actif',
      cell: (u) => (
        <Toggle
          id={`actif-${idDe(u)}`}
          checked={Boolean(u.actif)}
          disabled={estSoi(u)}
          onChange={(v) => basculerActif(u, v)}
        />
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: (u) => {
        const soi = estSoi(u)
        const invitation =
          u.etat_compte === 'invitation_en_attente' || u.etat_compte === 'invitation_expiree'
        return (
          <div className="flex gap-1">
            <button type="button" className="rounded p-1.5 hover:bg-gray-100" aria-label="Modifier" onClick={() => ouvrir(u)}>
              <Pencil className="h-4 w-4" />
            </button>
            {invitation && (
              <button
                type="button"
                className="rounded p-1.5 hover:bg-gray-100"
                aria-label="Renvoyer l'invitation"
                disabled={soi}
                onClick={() => setConfirm({ type: 'invitation', user: u })}
              >
                <Mail className="h-4 w-4" />
              </button>
            )}
            <button
              type="button"
              className="rounded p-1.5 hover:bg-gray-100"
              aria-label="Réinitialiser le mot de passe"
              disabled={soi}
              onClick={() => setConfirm({ type: 'mdp', user: u })}
            >
              <KeyRound className="h-4 w-4" />
            </button>
            <button
              type="button"
              className="rounded p-1.5 text-danger-text hover:bg-danger-bg"
              aria-label="Supprimer"
              disabled={soi}
              onClick={() => setSupprimer(u)}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        )
      },
    },
  ]

  if (loadState === 'error' && !data) {
    return (
      <div className="max-w-lg rounded-[8px] border bg-white p-6">
        <p className="mb-4 text-sm text-red-600">{erreur}</p>
        <Button onClick={reload}>Réessayer</Button>
      </div>
    )
  }

  const edition = Boolean(form && idDe(form))

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Utilisateurs"
        subtitle="Créez, modifiez, activez ou désactivez les comptes."
        actions={
          <Button onClick={() => ouvrir(null)}>
            <Plus className="h-4 w-4" /> Nouvel utilisateur
          </Button>
        }
      />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="overflow-hidden rounded-[8px] border border-gray-200 bg-white shadow-sm">
          <DataTable
            columns={colonnes}
            rows={utilisateurs}
            rowKey={(u) => idDe(u)}
            loading={loadState === 'loading'}
            emptyState={<EmptyState title="Aucun utilisateur." />}
            pagination={
              data?.last_page > 1 ? (
                <div className="px-4 pb-4">
                  <Pagination paginator={{ ...data, onPage: setPage }} />
                </div>
              ) : null
            }
          />
        </div>
        {form && (
          <Card title={edition ? 'Modifier l’utilisateur' : 'Nouvel utilisateur'}>
            <form onSubmit={sauver} className="space-y-3">
              <div>
                <FieldLabel htmlFor="u-nom" required>Nom</FieldLabel>
                <TextInput id="u-nom" value={values.nom} onChange={(e) => setValues({ ...values, nom: e.target.value })} error={errors.nom} />
                <FieldError message={errors.nom} />
              </div>
              <div>
                <FieldLabel htmlFor="u-prenom" required>Prénom</FieldLabel>
                <TextInput id="u-prenom" value={values.prenom} onChange={(e) => setValues({ ...values, prenom: e.target.value })} error={errors.prenom} />
                <FieldError message={errors.prenom} />
              </div>
              <div>
                <FieldLabel htmlFor="u-email" required>Email</FieldLabel>
                <TextInput id="u-email" type="email" value={values.email} onChange={(e) => setValues({ ...values, email: e.target.value })} error={errors.email} />
                <FieldError message={errors.email} />
              </div>
              <div>
                <FieldLabel htmlFor="u-role" required>Rôle</FieldLabel>
                <SelectInput
                  id="u-role"
                  value={values.role}
                  disabled={edition}
                  onChange={(e) => setValues({ ...values, role: e.target.value })}
                >
                  {(roles.length ? roles : [
                    { code: 'admin_service', libelle: 'Administrateur de service' },
                    { code: 'super_admin', libelle: 'Super administrateur' },
                  ]).map((r) => (
                    <option key={r.code ?? r.id_role} value={r.code}>
                      {r.libelle}
                    </option>
                  ))}
                </SelectInput>
              </div>
              {values.role === 'super_admin' ? (
                <p className="text-sm text-gray-500">Tous les services</p>
              ) : (
                <div>
                  <FieldLabel htmlFor="u-service" required>Service</FieldLabel>
                  <SelectInput id="u-service" value={values.id_service} onChange={(e) => setValues({ ...values, id_service: e.target.value })} error={errors.id_service}>
                    <option value="">Choisir…</option>
                    {services.map((s) => (
                      <option key={s.id_service} value={s.id_service}>{s.nom_service ?? s.nom}</option>
                    ))}
                  </SelectInput>
                  <FieldError message={errors.id_service} />
                </div>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="secondary" onClick={() => setForm(null)}>Annuler</Button>
                <Button type="submit" loading={busy}>{edition ? 'Enregistrer' : 'Créer le compte'}</Button>
              </div>
            </form>
          </Card>
        )}
      </div>

      <ConfirmDialog
        open={Boolean(confirm)}
        title={
          confirm?.type === 'mdp'
            ? 'Réinitialiser le mot de passe ?'
            : confirm?.type === 'invitation'
              ? "Renvoyer l'invitation ?"
              : 'Réactiver ce compte ?'
        }
        busy={busy}
        onClose={() => setConfirm(null)}
        onConfirm={executerConfirm}
      >
        {confirm?.type === 'reactiver' && (
          <p>Le compte de {nomComplet(confirm.user)} pourra de nouveau se connecter.</p>
        )}
        {confirm && confirm.type !== 'reactiver' && <p>Action sur {nomComplet(confirm.user)}.</p>}
      </ConfirmDialog>

      <DesactiverCompteModal
        open={Boolean(desactiver)}
        utilisateur={desactiver}
        onClose={() => setDesactiver(null)}
        onDone={(_type, texte) => {
          toast.show('success', texte)
          reload()
        }}
      />
      <SupprimerCompteModal
        open={Boolean(supprimer)}
        utilisateur={supprimer}
        onClose={() => setSupprimer(null)}
        onDone={(_type, texte) => {
          toast.show('success', texte)
          reload()
        }}
        onDesactiver={(u) => {
          setSupprimer(null)
          setDesactiver(u)
        }}
      />
    </div>
  )
}
