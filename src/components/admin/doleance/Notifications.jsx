import StatusBadge from '../../StatusBadge'
import { formatDate } from '../../../lib/statuts'
import { Card } from './shared'

const TYPE_NOTIFICATION = {
  depot: 'Confirmation de dépôt',
  code_verification: 'Code de vérification',
  complement_demande: "Demande d'information",
  complement_recu: 'Accusé de réception du complément',
  changement_statut: 'Changement de statut',
  reponse: 'Réponse du service',
}

export default function Notifications({ notifications }) {
  if (!notifications?.length) return null
  return (
    <Card title="Emails envoyés au demandeur">
      <ul className="space-y-2.5">
        {notifications.map((n) => (
          <li key={n.id_notification} className="flex items-start justify-between gap-3 text-sm">
            <div className="min-w-0">
              <p className="font-medium text-gray-800">
                {TYPE_NOTIFICATION[n.type_notification] ?? n.type_notification}
              </p>
              <p className="text-xs text-gray-500">{formatDate(n.date_envoi ?? n.created_at)}</p>
            </div>
            <StatusBadge
              status={n.etat_envoi === 'transmis' ? 'resolue' : 'non_fondee'}
              label={n.etat_envoi === 'transmis' ? 'Transmis' : 'Non transmis'}
            />
          </li>
        ))}
      </ul>
    </Card>
  )
}
