import { useLanguage } from '../../i18n/LanguageContext'

function libelleMoisLocal(item, locale) {
  const mois = String(item.mois ?? '')
  if (/^\d{4}-\d{2}/.test(mois)) {
    const [y, m] = mois.split('-')
    return new Intl.DateTimeFormat(`${locale}-u-nu-latn`, {
      month: 'short',
      numberingSystem: 'latn',
    }).format(new Date(Number(y), Number(m) - 1, 1))
  }
  return item.libelle
}

function estMoisCourant(item) {
  if (item.courant === true || item.mois_en_cours === true) return true
  const now = new Date()
  const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const mois = String(item.mois ?? '')
  return mois === ym || mois.startsWith(`${ym}-`)
}

export default function BarChart({ items = [], highlightLast = true, legend }) {
  const { locale, tf } = useLanguage()
  if (!items.length) {
    return <p className="py-10 text-center text-sm text-gray-500">{tf('admin.dashboard.aucuneDonnee')}</p>
  }
  const max = Math.max(1, ...items.map((i) => Number(i.total) || 0))
  const aUnCourant = items.some(estMoisCourant)
  return (
    <div>
      <div className="flex items-end gap-3" dir="ltr">
        {items.map((item, index) => {
          const total = Number(item.total) || 0
          const actif = estMoisCourant(item) || (!aUnCourant && highlightLast && index === items.length - 1)
          const hauteur = Math.max(total === 0 ? 4 : (total / max) * 100, 6)
          return (
            <div key={item.mois ?? item.libelle ?? index} className="flex min-w-0 flex-1 flex-col items-center">
              <span className="mb-1 font-mono text-xs font-semibold text-gray-700">{total}</span>
              <div className="flex h-40 w-full max-w-12 items-end">
                <div
                  className={`w-full rounded-t-[6px] ${actif ? 'bg-[#8fcea8]' : 'bg-institutional'}`}
                  style={{ height: `${hauteur}%` }}
                  title={`${item.libelle} : ${total}`}
                />
              </div>
              <span className={`mt-2 text-xs ${actif ? 'font-semibold text-institutional' : 'text-gray-500'}`}>
                {libelleMoisLocal(item, locale)}
              </span>
            </div>
          )
        })}
      </div>
      {legend && (
        <p className="mt-4 flex items-center gap-2 text-xs text-gray-500">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-[#8fcea8]" aria-hidden />
          {tf('admin.dashboard.moisEnCours')}
        </p>
      )}
    </div>
  )
}
