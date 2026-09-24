import { useCallback, useEffect, useRef, useState } from 'react'
import { useAdminAuth } from './AdminAuthContext'
import {
  AUTH_ACTIVITY_EVENT,
  AVERTISSEMENT_AVANT_MS,
  DELAI_INACTIVITE_MS,
  FLASH_INACTIVITE,
  FLASH_SESSION_EXPIREE,
  THROTTLE_ACTIVITE_MS,
  diffuserAuth,
} from '../lib/securite'

const EVENEMENTS = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart']

export default function useInactivite() {
  const { logout, expireLe, status } = useAdminAuth()
  const [avertissement, setAvertissement] = useState(null)
  const [secondes, setSecondes] = useState(60)
  const lastActivity = useRef(0)
  const lastSignal = useRef(0)
  const timers = useRef({ warn: 0, out: 0 })
  const logoutRef = useRef(logout)
  const modeRef = useRef(null)

  useEffect(() => {
    logoutRef.current = logout
  }, [logout])

  useEffect(() => {
    modeRef.current = avertissement
  }, [avertissement])

  const viderInactivite = useCallback(() => {
    clearTimeout(timers.current.warn)
    clearTimeout(timers.current.out)
    timers.current.warn = 0
    timers.current.out = 0
  }, [])

  const deconnecterInactivite = useCallback(() => {
    setAvertissement(null)
    logoutRef.current({ flash: FLASH_INACTIVITE, reason: 'inactivity' })
  }, [])

  const deconnecterExpiration = useCallback(() => {
    setAvertissement(null)
    logoutRef.current({ flash: FLASH_SESSION_EXPIREE, reason: 'expired' })
  }, [])

  const planifierInactivite = useCallback(() => {
    viderInactivite()
    const ecoule = Date.now() - lastActivity.current
    const restant = DELAI_INACTIVITE_MS - ecoule
    const warnDans = restant - AVERTISSEMENT_AVANT_MS
    if (warnDans > 0) {
      timers.current.warn = window.setTimeout(() => {
        if (modeRef.current === 'expiration') return
        setAvertissement('inactivite')
        setSecondes(Math.ceil(AVERTISSEMENT_AVANT_MS / 1000))
      }, warnDans)
    } else if (restant > 0 && modeRef.current !== 'expiration') {
      setAvertissement('inactivite')
      setSecondes(Math.max(1, Math.ceil(restant / 1000)))
    }
    timers.current.out = window.setTimeout(() => {
      if (modeRef.current === 'expiration') return
      deconnecterInactivite()
    }, Math.max(0, restant))
  }, [deconnecterInactivite, viderInactivite])

  const noterActivite = useCallback(
    (depuisCanal) => {
      const maintenant = Date.now()
      if (!depuisCanal) {
        if (maintenant - lastSignal.current < THROTTLE_ACTIVITE_MS) return
        lastSignal.current = maintenant
        diffuserAuth({ type: 'activity', at: maintenant })
      }
      lastActivity.current = maintenant
      if (modeRef.current === 'inactivite') setAvertissement(null)
      planifierInactivite()
    },
    [planifierInactivite],
  )

  const resterConnecte = useCallback(() => {
    lastSignal.current = 0
    noterActivite(false)
  }, [noterActivite])

  useEffect(() => {
    if (status !== 'authenticated') {
      viderInactivite()
      setAvertissement(null)
      return undefined
    }
    lastActivity.current = lastActivity.current || Date.now()
    planifierInactivite()
    const onAct = () => {
      if (modeRef.current) return
      noterActivite(false)
    }
    EVENEMENTS.forEach((e) => window.addEventListener(e, onAct, { passive: true }))
    const onRemote = (e) => {
      const at = Number(e.detail?.at) || Date.now()
      lastActivity.current = at
      if (modeRef.current === 'inactivite') setAvertissement(null)
      planifierInactivite()
    }
    window.addEventListener(AUTH_ACTIVITY_EVENT, onRemote)
    return () => {
      EVENEMENTS.forEach((e) => window.removeEventListener(e, onAct))
      window.removeEventListener(AUTH_ACTIVITY_EVENT, onRemote)
      viderInactivite()
    }
  }, [status, noterActivite, planifierInactivite, viderInactivite])

  useEffect(() => {
    if (status !== 'authenticated' || !expireLe) return undefined
    const ts = Date.parse(expireLe)
    if (Number.isNaN(ts)) return undefined
    const restant = ts - Date.now()
    if (restant <= 0) {
      deconnecterExpiration()
      return undefined
    }
    const warnDans = restant - AVERTISSEMENT_AVANT_MS
    const warnId = window.setTimeout(() => {
      setAvertissement('expiration')
      setSecondes(Math.max(1, Math.ceil((ts - Date.now()) / 1000)))
    }, Math.max(0, warnDans))
    const outId = window.setTimeout(() => deconnecterExpiration(), restant)
    return () => {
      clearTimeout(warnId)
      clearTimeout(outId)
    }
  }, [expireLe, status, deconnecterExpiration])

  useEffect(() => {
    if (!avertissement) return undefined
    const id = window.setInterval(() => {
      setSecondes((s) => {
        if (s <= 1) {
          window.setTimeout(() => {
            if (modeRef.current === 'expiration') deconnecterExpiration()
            else if (modeRef.current === 'inactivite') deconnecterInactivite()
          }, 0)
          return 0
        }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, [avertissement, deconnecterExpiration, deconnecterInactivite])

  return {
    avertissement,
    secondes,
    resterConnecte,
    seDeconnecter: () => logout({ reason: 'manual' }),
    seReconnecter: deconnecterExpiration,
  }
}
