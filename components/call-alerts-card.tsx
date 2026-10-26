'use client'

import { useEffect, useState } from 'react'
import { BellRing, Share, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { enablePush, getPushState, type PushState } from '@/lib/push/client'
import { toast } from 'sonner'

const DISMISS_KEY = 'spark:call-alerts-dismissed'

/**
 * Asks the user to turn on call notifications. Without them a call can only
 * ring while Spark is open on screen — the #1 reason "the other person never
 * got my call".
 *
 * Hidden once alerts are on, or after the user dismisses it.
 */
export function CallAlertsCard() {
  const [state, setState] = useState<PushState | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let dismissed = false
    try {
      dismissed = localStorage.getItem(DISMISS_KEY) === '1'
    } catch {
      // storage blocked — just show it
    }
    const current = getPushState()
    setState(dismissed && current !== 'ios-needs-install' ? 'granted' : current)
  }, [])

  if (!state || state === 'granted' || state === 'unsupported' || state === 'not-configured') {
    return null
  }

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, '1')
    } catch {
      // ignore
    }
    setState('granted')
  }

  const turnOn = async () => {
    setBusy(true)
    const next = await enablePush()
    setBusy(false)
    setState(next)
    if (next === 'granted') toast.success('Call alerts are on for this device')
    else if (next === 'denied') toast.error('Notifications are blocked. Allow them in your browser’s site settings.')
  }

  return (
    <div className="relative mx-4 mt-4 rounded-2xl border bg-card p-4 shadow-sm animate-fade-in">
      {state !== 'ios-needs-install' && (
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss"
          className="absolute right-2 top-2 rounded-full p-1 text-muted-foreground hover:bg-secondary"
        >
          <X className="h-4 w-4" />
        </button>
      )}
      <div className="flex gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full love-gradient text-primary-foreground">
          <BellRing className="h-5 w-5" />
        </div>
        <div className="space-y-2 pr-4">
          <p className="font-semibold">Don’t miss calls</p>
          {state === 'ios-needs-install' ? (
            <p className="text-sm text-muted-foreground">
              On iPhone, calls can only ring when Spark is on your Home Screen. Tap{' '}
              <Share className="inline h-4 w-4 align-text-bottom" /> <strong>Share</strong> →{' '}
              <strong>Add to Home Screen</strong>, open Spark from there, then turn on call alerts.
            </p>
          ) : state === 'denied' ? (
            <p className="text-sm text-muted-foreground">
              Notifications are blocked for Spark, so calls only ring while the app is open. Allow notifications
              in your browser’s site settings to fix this.
            </p>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                Get a ringing notification when a match calls you, even if Spark is closed.
              </p>
              <Button size="sm" onClick={turnOn} disabled={busy} className="love-gradient border-0 text-primary-foreground">
                {busy ? 'Turning on…' : 'Turn on call alerts'}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
