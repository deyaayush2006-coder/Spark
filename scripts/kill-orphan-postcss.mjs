// Sweeps orphaned Turbopack PostCSS workers left behind by a dead `next dev`.
//
// Turbopack runs postcss.config.mjs in child node processes
// (.next/dev/build/postcss.js <id>). On Windows those children are not reaped
// when the dev server crashes or its terminal is closed — they survive as
// orphans holding ~20 MB each. Enough dead runs and the machine has no memory
// left, at which point the *next* `next dev` dies during "Compiling /" with
// "MarkCompactCollector: young object promotion failed", which looks like a
// Next.js bug but is really the OS refusing to hand out any more pages.
//
// A worker counts as orphaned when walking up its parent chain never reaches a
// live `next dev`. Checking only the immediate parent is not enough: the whole
// dev tree is usually orphaned together, so a worker's direct parent is often
// still alive while the `next dev` that gave it purpose is long gone.
import { execFileSync } from 'node:child_process'

if (process.platform !== 'win32') process.exit(0)

const PS = [
  "Get-CimInstance Win32_Process -Filter \"Name='node.exe'\"",
  'ForEach-Object { "$($_.ProcessId)`t$($_.ParentProcessId)`t$($_.CommandLine)" }',
].join(' | ')

let lines
try {
  lines = execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', PS], {
    encoding: 'utf8',
    windowsHide: true,
  })
} catch {
  process.exit(0) // never block `npm run dev` over a failed sweep
}

/** @type {Map<number, {ppid: number, cmd: string}>} */
const procs = new Map()
for (const line of lines.split('\n')) {
  const [pid, ppid, ...rest] = line.trim().split('\t')
  if (!pid || !ppid) continue
  procs.set(Number(pid), { ppid: Number(ppid), cmd: rest.join('\t') })
}

const isWorker = (cmd) => cmd.includes('.next') && cmd.includes('build') && cmd.includes('postcss.js')
const isDevServer = (cmd) => /[\/]next[\/]dist[\/]bin[\/]next\b/.test(cmd) || /\bnext\b.*\bdev\b/.test(cmd)

// A worker is healthy only if some ancestor is a live `next dev`.
function hasLiveDevServerAncestor(pid) {
  const seen = new Set()
  let cur = procs.get(pid)?.ppid
  while (cur && cur > 4 && !seen.has(cur)) {
    seen.add(cur)
    const parent = procs.get(cur)
    if (!parent) return false // chain leaves the node.exe set — no dev server above
    if (isDevServer(parent.cmd)) return true
    cur = parent.ppid
  }
  return false
}

const orphans = [...procs]
  .filter(([pid, p]) => isWorker(p.cmd) && !hasLiveDevServerAncestor(pid))
  .map(([pid]) => pid)

for (const pid of orphans) {
  try {
    process.kill(pid, 'SIGKILL')
  } catch {}
}

if (orphans.length > 0) {
  console.log(`[dev] reaped ${orphans.length} orphaned Turbopack PostCSS worker(s)`)
}
