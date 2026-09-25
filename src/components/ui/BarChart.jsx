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

function estJourCourant(item) {
  if (item.courant === true || item.jour_en_cours === true) return true
  if (!item.jour) return false
  const now = new Date()
  const ymd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  return String(item.jour) === ymd || String(item.jour).startsWith(`${ymd}`)
}

function indicesLibelles(n, max = 5) {
  if (n <= max) return new Set(Array.from({ length: n }, (_, i) => i))
  const set = new Set()
  for (let i = 0; i < max; i += 1) {
    set.add(Math.round((i * (n - 1)) / (max - 1)))
  }
  return set
}

export default function BarChart({
  items = [],
  highlightLast = true,
  legend,
  legendLabel,
  zeroAsLine = false,
  dense = false,
  maxLibelles,
  onBarClick,
}) {
  const { locale, tf } = useLanguage()
  if (!items.length) {
    return <p className="py-10 text-center text-sm text-gray-500">{tf('admin.dashboard.aucuneDonnee')}</p>
  }
  const max = Math.max(1, ...items.map((i) => Number(i.total) || 0))
  const modeJour = items.some((i) => i.jour)
  const aUnCourant = items.some((i) => (modeJour ? estJourCourant(i) : estMoisCourant(i)))
  const visibles = maxLibelles ? indicesLibelles(items.length, maxLibelles) : null

  return (
    <div>
      <div className={`flex items-end ${dense ? 'gap-1' : 'gap-3'}`} dir="ltr">
        {items.map((item, index) => {
          const total = Number(item.total) || 0
          const courant = modeJour ? estJourCourant(item) : estMoisCourant(item)
          const actif = courant || (!aUnCourant && highlightLast && index === items.length - 1)
          const ligneZero = zeroAsLine && total === 0
          const hauteur = Math.max(total === 0 ? 4 : (total / max) * 100, 6)
          const libelle = modeJour ? item.libelle : libelleMoisLocal(item, locale)
          const titre = `${libelle} : ${total}`
          const afficherLibelle = !visibles || visibles.has(index)
          const barre = (
            <div
              className={`w-full ${
                ligneZero
                  ? 'bg-gray-200'
                  : `rounded-t-[6px] ${actif ? 'bg-[#8fcea8]' : 'bg-institutional'}`
              }`}
              style={{ height: ligneZero ? 2 : `${hauteur}%` }}
              title={titre}
            />
          )
          return (
            <div key={item.jour ?? item.mois ?? item.libelle ?? index} className="flex min-w-0 flex-1 flex-col items-center">
              <span className="mb-1 h-4 font-mono text-xs font-semibold text-gray-700">
                {total > 0 || !zeroAsLine ? total : ''}
              </span>
              <div className={`flex h-40 w-full items-end ${dense ? 'max-w-6' : 'max-w-12'}`}>
                {onBarClick ? (
                  <button
                    type="button"
                    onClick={() => onBarClick(item)}
                    title={titre}
                    className="flex h-full w-full items-end focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-institutional/40"
                  >
                    {barre}
                  </button>
                ) : (
                  barre
                )}
              </div>
              <span
                className={`mt-2 text-xs ${afficherLibelle ? '' : 'invisible'} ${
                  actif ? 'font-semibold text-institutional' : 'text-gray-500'
                }`}
              >
                {afficherLibelle ? libelle : '·'}
              </span>
            </div>
          )
        })}
      </div>
      {legend && (
        <p className="mt-4 flex items-center gap-2 text-xs text-gray-500">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-[#8fcea8]" aria-hidden />
          {legendLabel || tf('admin.dashboard.moisEnCours')}
        </p>
      )}
    </div>
  )
}
