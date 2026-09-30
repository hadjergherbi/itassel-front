import StatusBadge from '../../StatusBadge'
import { formatDate } from '../../../lib/statuts'
import { useLanguage } from '../../../i18n/LanguageContext'
import { Card } from './shared'

export default function Notifications({ notifications }) {
  const { t, tf } = useLanguage()
  if (!notifications?.length) return null
  return (
    <Card title={tf('admin.notificationsDetail.titre')}>
      <ul className="space-y-2.5">
        {notifications.map((n) => {
          const typeLibelle =
            t.admin?.notificationsDetail?.types?.[n.type_notification] ?? n.type_notification
          return (
            <li key={n.id_notification} className="flex items-start justify-between gap-3 text-sm">
              <div className="min-w-0">
                <p className="font-medium text-gray-800">{typeLibelle}</p>
                <p className="text-xs text-gray-500">{formatDate(n.date_envoi ?? n.created_at)}</p>
              </div>
              <StatusBadge
                status={n.etat_envoi === 'transmis' ? 'resolue' : 'non_fondee'}
                label={
                  n.etat_envoi === 'transmis'
                    ? tf('admin.notificationsDetail.transmis')
                    : tf('admin.notificationsDetail.nonTransmis')
                }
              />
            </li>
          )
        })}
      </ul>
    </Card>
  )
}
