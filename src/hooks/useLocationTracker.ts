/**
 * useLocationTracker
 * Watches GPS, sums Haversine distance, applies anti-cheat (>20 km/h = skip point).
 * Uses PermissionsAndroid for runtime permission requests.
 */
import { useState, useRef, useCallback, useEffect } from 'react'
import { PermissionsAndroid, Platform } from 'react-native'
import Geolocation from 'react-native-geolocation-service'
import { processGPSPoint, GPSPoint } from '../utils/gps'

export type TrackerState = {
  distKm:     number
  pct:        number     // 0–100
  cheating:   boolean
  error:      string | null
  isTracking: boolean
  hasPermission: boolean | null   // null = not yet checked
}

export function useLocationTracker(targetKm: number, onComplete: () => void) {
  const [state, setState] = useState<TrackerState>({
    distKm:       0,
    pct:          0,
    cheating:     false,
    error:        null,
    isTracking:   false,
    hasPermission: null,
  })

  const prevPoint  = useRef<GPSPoint | null>(null)
  const watchId    = useRef<number | null>(null)
  const distRef    = useRef(0)
  const doneRef    = useRef(false)
  const completeRef = useRef(onComplete)  // stable ref so callbacks don't re-register

  // Keep completeRef current without re-creating the watch
  useEffect(() => { completeRef.current = onComplete }, [onComplete])

  // ── Permission ─────────────────────────────────────────────────────────────

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (Platform.OS !== 'android') return true
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      {
        title:         'Permissão de Localização',
        message:       'A missão de corrida precisa da tua localização em tempo real.',
        buttonPositive: 'PERMITIR',
        buttonNegative: 'CANCELAR',
      }
    )
    const ok = granted === PermissionsAndroid.RESULTS.GRANTED
    setState(p => ({ ...p, hasPermission: ok }))
    return ok
  }, [])

  // Check permission on mount (non-blocking)
  useEffect(() => {
    PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION)
      .then(ok => setState(p => ({ ...p, hasPermission: ok })))
  }, [])

  // ── Track ──────────────────────────────────────────────────────────────────

  const startTracking = useCallback(async () => {
    const ok = await requestPermission()
    if (!ok) {
      setState(p => ({ ...p, error: 'Permissão GPS negada.' }))
      return
    }

    // Reset
    prevPoint.current = null
    distRef.current   = 0
    doneRef.current   = false
    setState(p => ({ ...p, distKm: 0, pct: 0, cheating: false, error: null, isTracking: true }))

    watchId.current = Geolocation.watchPosition(
      pos => {
        const curr: GPSPoint = {
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          ts:  Date.now(),
        }

        if (prevPoint.current) {
          const { distKm: d, cheating } = processGPSPoint(prevPoint.current, curr)
          setState(p => ({ ...p, cheating }))

          if (!cheating) {
            distRef.current += d
            const km  = distRef.current
            const pct = Math.min((km / targetKm) * 100, 100)
            setState(p => ({ ...p, distKm: km, pct }))

            if (km >= targetKm && !doneRef.current) {
              doneRef.current = true
              stopWatchRef.current()
              completeRef.current()
            }
          }
        }
        prevPoint.current = curr
      },
      err => {
        const messages: Record<number, string> = {
          1: 'Permissão negada.',
          2: 'Posição indisponível. Estás em interior?',
          3: 'GPS timeout. Tenta em espaço aberto.',
        }
        setState(p => ({ ...p, error: messages[err.code] ?? err.message, isTracking: false }))
      },
      {
        accuracy:       { android: 'high' },
        distanceFilter: 5,
        interval:       2000,
        fastestInterval:1000,
        showLocationDialog: true,
      }
    )
  }, [requestPermission, targetKm])

  // Stable stop ref so the position callback can call it without stale closure
  const stopWatchRef = useRef(() => {})

  const stopTracking = useCallback(() => {
    if (watchId.current !== null) {
      Geolocation.clearWatch(watchId.current)
      watchId.current = null
    }
    setState(p => ({ ...p, isTracking: false }))
  }, [])

  useEffect(() => { stopWatchRef.current = stopTracking }, [stopTracking])

  // Cleanup on unmount
  useEffect(() => () => { stopTracking() }, [stopTracking])

  const reset = useCallback(() => {
    stopTracking()
    prevPoint.current = null
    distRef.current   = 0
    doneRef.current   = false
    setState(p => ({ ...p, distKm: 0, pct: 0, cheating: false, error: null }))
  }, [stopTracking])

  return { ...state, startTracking, stopTracking, reset }
}
