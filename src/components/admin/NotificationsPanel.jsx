import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AtSign, Bell, Check, Inbox, Loader2, Paperclip, X } from 'lucide-react'
import { useAdminAuth } from '../../admin/AdminAuthContext'
import { endpoints } from '../../lib/endpoints'
import { formatRelatif, libelleEvenement } from '../../lib/statuts'
import { useLanguage } from '../../i18n/LanguageContext'

function iconeEvenement(evenement) {
  const e = String(evenement ?? '').toLowerCase()
  if (e === 'mention_note') return { Icon: AtSign, cls: 'bg-success-bg text-institutional' }
  if (/refus/.test(e)) return { Icon: X, cls: 'bg-danger-bg text-danger-text' }
  if (/accept/.test(e)) return { Icon: Check, cls: 'bg-success-bg text-success-text' }
  if (/complement|complément/.test(e)) return { Icon: Paperclip, cls: 'bg-info-demandee-bg text-info-demandee' }
  if (/affect|depos|dépos/.test(e)) return { Icon: Inbox, cls: 'bg-nouvelle-bg text-nouvelle' }
  return { Icon: Bell, cls: 'bg-gray-100 text-gray-500' }
}

function extrairePage(payload) {
  const data = payload?.data ?? []
  return {
    items: Array.isArray(data) ? data : [],
    page: payload?.current_page ?? 1,
    last: payload?.last_page ?? 1,
  }
}

export default function NotificationsPanel() {
  const { t, tf } = useLanguage()
  const { utilisateur, majProfil } = useAdminAuth()
  const navigate = useNavigate()
  const rootRef = useRef(null)
  const [ouvert, setOuvert] = useState(false)
  const [onglet, setOnglet] = useState('toutes')
  const [items, setItems] = useState([])
  const [page, setPage] = useState(1)
  const [lastPage, setLastPage] = useState(1)
  const [chargement, setChargement] = useState(false)
  const [nonLues, setNonLues] = useState(() => Number(utilisateur?.notifications_non_lues) || 0)

  useEffect(() => {
    setNonLues(Number(utilisateur?.notifications_non_lues) || 0)
  }, [utilisateur?.notifications_non_lues])

  const appliquerCompteur = useCallback(
    (n) => {
      const valeur = Number(n) || 0
      setNonLues(valeur)
      majProfil?.({ notifications_non_lues: valeur })
    },
    [majProfil],
  )

  useEffect(() => {
    const poll = () => {
      if (document.hidden) return
      endpoints
        .compteurNotifications()
        .then((res) => appliquerCompteur(res.data?.non_lues))
        .catch(() => {})
    }
    const id = setInterval(poll, 60000)
    const onVis = () => {
      if (!document.hidden) poll()
    }
    document.addEventListener('visibilitychange', onVis)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [appliquerCompteur])

  const charger = useCallback((cible, pageCible, append) => {
    setChargement(true)
    const params = { par_page: 10, page: pageCible }
    if (cible === 'non_lues') params.non_lues = 1
    endpoints
      .mesNotifications(params)
      .then((res) => {
        const { items: recus, page: p, last } = extrairePage(res.data)
        setItems((prev) => (append ? [...prev, ...recus] : recus))
        setPage(p)
        setLastPage(last)
      })
      .catch(() => {
        if (!append) setItems([])
      })
      .finally(() => setChargement(false))
  }, [])

  useEffect(() => {
    if (!ouvert) return undefined
    charger(onglet, 1, false)
    return undefined
  }, [ouvert, onglet, charger])

  useEffect(() => {
    if (!ouvert) return undefined
    const onDoc = (e) => {
      if (!rootRef.current?.contains(e.target)) setOuvert(false)
    }
    const onKey = (e) => {
      if (e.key === 'Escape') setOuvert(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [ouvert])

  const ouvrirNotif = async (n) => {
    if (!n.lue_le) {
      try {
        await endpoints.lireNotification(n.id_notification_app)
        setItems((prev) =>
          prev.map((it) =>
            it.id_notification_app === n.id_notification_app ? { ...it, lue_le: new Date().toISOString() } : it,
          ),
        )
        appliquerCompteur(Math.max(0, nonLues - 1))
      } catch {
        // navigation quand même
      }
    }
    const reference = n.doleance?.reference
    setOuvert(false)
    if (!reference) return
    const evenement = String(n.evenement ?? '').toLowerCase()
    const hash = evenement === 'mention_note' ? 'notes-internes' : undefined
    navigate({
      pathname: `/admin/doleances/${encodeURIComponent(reference)}`,
      hash,
    })
  }

  const toutLire = async () => {
    try {
      await endpoints.lireToutesNotifications()
      setItems((prev) => prev.map((it) => ({ ...it, lue_le: it.lue_le || new Date().toISOString() })))
      appliquerCompteur(0)
      if (onglet === 'non_lues') charger('non_lues', 1, false)
    } catch {
      // silencieux
    }
  }

  const voirToutes = () => {
    if (onglet !== 'toutes') {
      setOnglet('toutes')
      return
    }
    if (page < lastPage && !chargement) charger('toutes', page + 1, true)
  }

  const badge = nonLues > 99 ? '99+' : nonLues

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOuvert((v) => !v)}
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-[8px] text-gray-500 hover:bg-gray-100"
        aria-label={tf('admin.notifications.aria')}
        aria-expanded={ouvert}
        aria-haspopup="dialog"
      >
        <Bell className="h-4 w-4" />
        {nonLues > 0 && (
          <span className="absolute -end-0.5 -top-0.5 inline-flex min-w-4 items-center justify-center rounded-full bg-[#b42318] px-1 text-[10px] font-bold leading-4 text-white">
            {badge}
          </span>
        )}
      </button>

      {ouvert && (
        <div
          role="dialog"
          aria-label={tf('admin.notifications.aria')}
          className="absolute end-0 top-full z-50 mt-2 flex w-[min(380px,calc(100vw-2rem))] flex-col overflow-hidden rounded-[8px] border border-gray-200 bg-white shadow-xl"
        >
          <div className="flex items-center justify-between gap-2 border-b border-gray-100 px-4 py-3">
            <h2 className="text-sm font-bold text-gray-900">{tf('admin.notifications.titre')}</h2>
            <button
              type="button"
              onClick={toutLire}
              disabled={nonLues === 0}
              className="whitespace-nowrap text-xs font-semibold text-institutional hover:underline disabled:text-gray-400 disabled:no-underline"
            >
              {tf('admin.notifications.toutLire')}
            </button>
          </div>

          <div className="flex gap-1 border-b border-gray-100 px-3 pt-2">
            {[
              { id: 'toutes', label: tf('admin.notifications.toutes') },
              { id: 'non_lues', label: tf('admin.notifications.nonLues', { n: nonLues }) },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setOnglet(t.id)}
                className={[
                  'whitespace-nowrap border-b-2 px-2.5 py-1.5 text-xs font-medium',
                  onglet === t.id
                    ? 'border-institutional text-institutional'
                    : 'border-transparent text-gray-500 hover:text-gray-800',
                ].join(' ')}
              >
                {t.label}
              </button>
            ))}
          </div>

          <ul className="max-h-80 overflow-y-auto">
            {chargement && items.length === 0 && (
              <li className="flex items-center justify-center gap-2 px-4 py-8 text-sm text-gray-500">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                {tf('admin.notifications.chargement')}
              </li>
            )}
            {!chargement && items.length === 0 && (
              <li className="px-4 py-8 text-center text-sm text-gray-500">{tf('admin.notifications.vide')}</li>
            )}
            {items.map((n) => {
              const { Icon, cls } = iconeEvenement(n.evenement)
              const nonLue = !n.lue_le
              const reference = n.doleance?.reference
              return (
                <li key={n.id_notification_app}>
                  <button
                    type="button"
                    onClick={() => ouvrirNotif(n)}
                    className={[
                      'flex w-full gap-3 px-4 py-3 text-start transition hover:bg-gray-50',
                      nonLue ? 'bg-success-bg/70' : 'bg-white',
                    ].join(' ')}
                  >
                    <span className={`mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${cls}`}>
                      <Icon className="h-4 w-4" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-start justify-between gap-2">
                        <span className="text-sm font-medium text-gray-900">
                          {libelleEvenement(n.evenement, t, n.titre)}
                        </span>
                        {nonLue && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-institutional" aria-label={tf('admin.notifications.nonLue')} />}
                      </span>
                      {reference && (
                        <span className="ltr-isolate mt-0.5 block whitespace-nowrap font-mono text-xs font-semibold text-institutional">
                          {reference}
                        </span>
                      )}
                      <span className="mt-0.5 block text-xs text-gray-500">{formatRelatif(n.created_at)}</span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>

          <div className="border-t border-gray-100 px-4 py-2.5">
            <button
              type="button"
              onClick={voirToutes}
              className="w-full text-center text-xs font-semibold text-institutional hover:underline"
            >
              {tf('admin.notifications.voirToutes')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
