import Link from 'next/link'
import { Heart, ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Shared chrome and typography for the Terms and Privacy pages.
 *
 * These are the two documents a user is most likely to open on a phone, in a
 * hurry, before deciding whether to trust the app. Long unbroken legal prose
 * is what makes people scroll past without reading, so the section helpers
 * below enforce short blocks, real headings and a visible last-updated date.
 */

export function LegalPage({
  title,
  subtitle,
  lastUpdated,
  children,
}: {
  title: string
  subtitle: string
  lastUpdated: string
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b">
        <div className="max-w-3xl mx-auto flex items-center gap-3 p-4">
          <Link
            href="/"
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors press"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <Link href="/" className="flex items-center gap-2">
            <Heart className="h-6 w-6 text-primary fill-primary" />
            <span className="text-xl font-serif font-bold love-gradient-text">Spark</span>
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 md:py-12 animate-fade-in">
        <h1 className="text-3xl md:text-4xl font-serif font-bold mb-3">{title}</h1>
        <p className="text-muted-foreground text-lg mb-2">{subtitle}</p>
        <p className="text-sm text-muted-foreground mb-10">Last updated: {lastUpdated}</p>

        <div className="space-y-10">{children}</div>

        <footer className="mt-16 pt-8 border-t text-sm text-muted-foreground space-y-2">
          <p>
            <Link href="/terms" className="text-primary hover:underline underline-offset-2">
              Terms &amp; Conditions
            </Link>
            {' · '}
            <Link href="/privacy" className="text-primary hover:underline underline-offset-2">
              Privacy Policy
            </Link>
          </p>
          <p>&copy; {new Date().getFullYear()} Spark. All rights reserved.</p>
        </footer>
      </main>
    </div>
  )
}

export function Section({
  id,
  number,
  title,
  children,
}: {
  id: string
  number: number | string
  title: string
  children: React.ReactNode
}) {
  return (
    <section id={id} className="scroll-mt-20">
      <h2 className="text-xl md:text-2xl font-serif font-bold mb-4">
        <span className="text-primary mr-2">{number}.</span>
        {title}
      </h2>
      <div className="space-y-4 leading-relaxed text-foreground/90">{children}</div>
    </section>
  )
}

export function Sub({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h3 className="font-semibold">{title}</h3>
      <div className="space-y-2 leading-relaxed text-foreground/90">{children}</div>
    </div>
  )
}

export function List({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="space-y-2 pl-1">
      {items.map((item, i) => (
        <li key={i} className="flex gap-3">
          <span className="text-primary shrink-0 mt-1.5 w-1.5 h-1.5 rounded-full bg-primary" />
          <span className="flex-1">{item}</span>
        </li>
      ))}
    </ul>
  )
}

/**
 * A callout for the clauses a user genuinely needs to notice — safety, age,
 * liability. Burying these in identical body text is what gets a consent
 * flow treated as unfair in a dispute.
 */
export function Notice({
  tone = 'default',
  children,
}: {
  tone?: 'default' | 'critical'
  children: React.ReactNode
}) {
  return (
    <div
      className={cn(
        'rounded-xl border p-4 leading-relaxed',
        tone === 'critical'
          ? 'border-destructive/40 bg-destructive/5'
          : 'border-primary/30 bg-primary/5',
      )}
    >
      {children}
    </div>
  )
}

/**
 * Marks a value the operator must replace before this document has any legal
 * effect. Rendered visibly so an unfilled placeholder cannot quietly ship.
 */
export function Fill({ children }: { children: React.ReactNode }) {
  return (
    <mark className="bg-yellow-200 dark:bg-yellow-500/30 dark:text-foreground px-1 rounded font-medium">
      {children}
    </mark>
  )
}
