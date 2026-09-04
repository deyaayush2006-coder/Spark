import { cn } from '@/lib/utils'

/**
 * Shared shapes for the route-level loading.tsx files.
 *
 * These exist for perceived speed, not real speed. Every page in (app) is a
 * dynamic server render behind a Supabase round trip, so a tab tap used to
 * leave the old page frozen on screen until the new one was fully ready —
 * which reads as "the button didn't work". A loading.tsx also gives the
 * router a static shell it can prefetch for an otherwise-dynamic route, so
 * the shell is usually already in the browser by the time the tap happens.
 */
function Shimmer({ className }: { className?: string }) {
  return <div className={cn('shimmer animate-pulse rounded-md bg-muted', className)} />
}

export function PageHeaderSkeleton() {
  return (
    <header className="sticky top-0 md:top-20 z-40 bg-background/95 backdrop-blur-md border-b p-4">
      <Shimmer className="h-8 w-32 mx-auto" />
    </header>
  )
}

export function CardSkeleton() {
  return (
    <div className="flex items-center gap-3 p-4">
      <Shimmer className="h-14 w-14 rounded-full shrink-0" />
      <div className="flex-1 space-y-2">
        <Shimmer className="h-4 w-1/3" />
        <Shimmer className="h-3 w-2/3" />
      </div>
    </div>
  )
}

export function ListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="divide-y">
      {Array.from({ length: rows }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  )
}

export { Shimmer }
