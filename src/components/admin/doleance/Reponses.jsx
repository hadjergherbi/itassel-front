import { formatDate, nomComplet } from '../../../lib/statuts'
import { useLanguage } from '../../../i18n/LanguageContext'
import { Card } from './shared'

export default function Reponses({ reponses }) {
  const { tf } = useLanguage()
  if (!reponses?.length) return null
  return (
    <Card title={tf('admin.reponses.titre')}>
      <ul className="space-y-3">
        {reponses.map((r) => (
          <li key={r.id_reponse} className="rounded-[8px] border border-gray-200 px-4 py-3">
            <p className="mb-1 text-xs text-gray-500">
              <span className="font-semibold text-gray-700">{nomComplet(r.auteur)}</span> —{' '}
              {formatDate(r.date_publication)}
            </p>
            <p className="whitespace-pre-line text-sm text-gray-800">{r.contenu}</p>
          </li>
        ))}
      </ul>
    </Card>
  )
}
