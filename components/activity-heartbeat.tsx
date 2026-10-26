'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

const BEAT_MS = 5 * 60_000

/**
 * Tells the database this user is around, so Discover can rank active people
 * above ones who left months ago (database/009). The SQL side throttles to one
 * write per 5 minutes, so this is close to free. Renders nothing.
 */
export function ActivityHeartbeat() {
  useEffect(() => {
    const supabase = createClient()
    let last = 0

    const beat = () => {
      if (document.hidden || Date.now() - last < BEAT_MS) return
      last = Date.now()
      // Missing function (009 not run yet) is fine: ranking just has less to go on.
      void supabase.rpc('touch_last_active').then(() => undefined, () => undefined)
    }

    beat()
    const interval = setInterval(beat, BEAT_MS)
    document.addEventListener('visibilitychange', beat)
    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', beat)
    }
  }, [])

  return null
}
