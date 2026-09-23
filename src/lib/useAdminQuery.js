import { useCallback, useEffect, useRef, useState } from 'react'
import adminApi, { extractErrors } from './adminApi'

export default function useAdminQuery(url, { params, enabled = true, fallback, fetcher } = {}) {
  const [data, setData] = useState(null)
  const [loadState, setLoadState] = useState(enabled ? 'loading' : 'idle')
  const [erreur, setErreur] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const paramsKey = JSON.stringify(params ?? {})
  const paramsRef = useRef(params)
  const fetcherRef = useRef(fetcher)

  useEffect(() => {
    paramsRef.current = params
    fetcherRef.current = fetcher
  })

  const reload = useCallback(() => {
    setLoadState('loading')
    setReloadKey((k) => k + 1)
  }, [])

  useEffect(() => {
    if (!enabled || !url) return undefined
    let cancelled = false
    const req = fetcherRef.current
      ? fetcherRef.current(paramsRef.current)
      : adminApi.get(url, { params: paramsRef.current })
    req
      .then((res) => {
        if (cancelled) return
        setData(res.data)
        setErreur('')
        setLoadState('ready')
      })
      .catch((err) => {
        if (cancelled) return
        setErreur(extractErrors(err, fallback || 'Impossible de charger les données.').message)
        setLoadState('error')
      })
    return () => {
      cancelled = true
    }
  }, [url, paramsKey, enabled, reloadKey, fallback])

  return { data, setData, loadState, erreur, reload }
}
