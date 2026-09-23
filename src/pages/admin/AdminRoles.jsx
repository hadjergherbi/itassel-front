import { Fragment, useState } from 'react'
import useAdminQuery from '../../lib/useAdminQuery'
import { endpoints } from '../../lib/endpoints'
import { extractErrors } from '../../lib/adminApi'
import { message409 } from '../../lib/statuts'
import PageHeader from '../../components/ui/PageHeader'
import Button from '../../components/ui/Button'
import { useToast } from '../../components/ui/Toast'

export default function AdminRoles() {
  const toast = useToast()
  const { data, loadState, erreur, reload } = useAdminQuery('/admin/roles', {
    fetcher: () => endpoints.roles(),
  })
  const { data: groupesData } = useAdminQuery('/admin/permissions', {
    fetcher: () => endpoints.permissions(),
  })
  const roles = Array.isArray(data) ? data : []
  const groupes = Array.isArray(groupesData) ? groupesData : []

  const [brouillon, setBrouillon] = useState({})
  const [busyRole, setBusyRole] = useState(null)

  const codesDe = (role) => brouillon[role.code] ?? role.permissions ?? []

  const estCochee = (role, perm) => {
    if (role.code === 'super_admin' && perm.verrouillee) return true
    return codesDe(role).includes(perm.code)
  }

  const basculer = (role, perm) => {
    if (role.code === 'super_admin' && perm.verrouillee) return
    setBrouillon((prev) => {
      const actuel = new Set(prev[role.code] ?? role.permissions ?? [])
      if (actuel.has(perm.code)) actuel.delete(perm.code)
      else actuel.add(perm.code)
      return { ...prev, [role.code]: [...actuel] }
    })
  }

  const enregistrer = async (role) => {
    setBusyRole(role.code)
    try {
      const codes = new Set(codesDe(role))
      if (role.code === 'super_admin') {
        groupes.forEach((g) => {
          ;(g.permissions ?? []).forEach((p) => {
            if (p.verrouillee) codes.add(p.code)
          })
        })
      }
      await endpoints.majPermissionsRole(role.code, [...codes])
      toast.show('success', `Permissions de « ${role.libelle} » enregistrées.`)
      reload()
    } catch (err) {
      toast.show('error', message409(err.response?.data?.code, extractErrors(err).message))
    } finally {
      setBusyRole(null)
    }
  }

  if (loadState === 'error' && !data) {
    return (
      <div className="max-w-lg rounded-[8px] border bg-white p-6">
        <p className="mb-4 text-sm text-red-600">{erreur}</p>
        <Button onClick={reload}>Réessayer</Button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="Gestion des rôles" subtitle="Permissions par rôle. Enregistrez chaque colonne séparément." />
      {loadState === 'loading' && !data ? (
        <p className="text-sm text-gray-500">Chargement…</p>
      ) : (
        <div className="overflow-x-auto rounded-[8px] border border-gray-200 bg-white">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-xs uppercase text-gray-500">
                <th className="px-4 py-3 text-start font-medium">Permission</th>
                {roles.map((r) => (
                  <th key={r.code} className="px-3 py-3 text-center font-medium">
                    <p>{r.libelle}</p>
                    <p className="mt-0.5 font-normal normal-case text-gray-400">
                      {r.utilisateurs ?? 0} utilisateur{(r.utilisateurs ?? 0) === 1 ? '' : 's'}
                    </p>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {groupes.map((groupe) => (
                <Fragment key={groupe.groupe}>
                  <tr className="bg-[#f3faf6]">
                    <td colSpan={1 + roles.length} className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-institutional">
                      {groupe.groupe}
                    </td>
                  </tr>
                  {(groupe.permissions ?? []).map((perm) => (
                    <tr key={perm.code} className="border-t border-gray-100">
                      <td className="px-4 py-2.5 text-gray-800">{perm.libelle}</td>
                      {roles.map((r) => {
                        const verrou = r.code === 'super_admin' && perm.verrouillee
                        return (
                          <td key={`${r.code}-${perm.code}`} className="px-3 py-2.5 text-center">
                            <input
                              type="checkbox"
                              className="h-4 w-4 accent-[#006b3f]"
                              checked={estCochee(r, perm)}
                              disabled={verrou}
                              onChange={() => basculer(r, perm)}
                              aria-label={`${perm.libelle} — ${r.libelle}`}
                            />
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-gray-200">
                <td className="px-4 py-3" />
                {roles.map((r) => (
                  <td key={`save-${r.code}`} className="px-3 py-3 text-center">
                    <Button size="sm" loading={busyRole === r.code} onClick={() => enregistrer(r)}>
                      Enregistrer
                    </Button>
                  </td>
                ))}
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  )
}
