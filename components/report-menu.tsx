'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { MoreVertical, Flag, Ban } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

const REASONS = [
  { value: 'harassment', label: 'Harassment or abusive messages' },
  { value: 'inappropriate_photos', label: 'Inappropriate photos' },
  { value: 'spam_or_scam', label: 'Spam or a scam' },
  { value: 'fake_profile', label: 'Fake profile / impersonation' },
  { value: 'underage', label: 'This person is under 18' },
  { value: 'other', label: 'Something else' },
]

export function ReportMenu({
  reportedId,
  reportedName,
  matchId,
}: {
  reportedId: string
  reportedName: string
  matchId?: string
}) {
  const router = useRouter()
  const [reportOpen, setReportOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [details, setDetails] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const submitReport = async () => {
    if (!reason) {
      toast.error('Please choose a reason')
      return
    }
    setSubmitting(true)

    const res = await fetch('/api/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reportedId, reason, details, matchId, block: true }),
    })

    setSubmitting(false)

    if (!res.ok) {
      toast.error('Could not submit the report. Please try again.')
      return
    }

    setReportOpen(false)
    toast.success(`Report submitted. ${reportedName} has been blocked.`)
    router.push('/matches')
    router.refresh()
  }

  const blockOnly = async () => {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase
      .from('blocks')
      .insert({ blocker_id: user.id, blocked_id: reportedId })

    if (error && error.code !== '23505') {
      toast.error('Could not block this person')
      return
    }

    toast.success(`${reportedName} has been blocked`)
    router.push('/matches')
    router.refresh()
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="More options">
            <MoreVertical className="h-5 w-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setReportOpen(true)}>
            <Flag className="h-4 w-4 mr-2" />
            Report {reportedName}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={blockOnly} className="text-destructive focus:text-destructive">
            <Ban className="h-4 w-4 mr-2" />
            Block {reportedName}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report {reportedName}</DialogTitle>
            <DialogDescription>
              Reports are reviewed by the moderation team. {reportedName} will also be blocked and
              won&apos;t be able to message or call you.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="report-reason">What happened?</Label>
              <Select value={reason} onValueChange={setReason}>
                <SelectTrigger id="report-reason">
                  <SelectValue placeholder="Choose a reason" />
                </SelectTrigger>
                <SelectContent>
                  {REASONS.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="report-details">Anything else? (optional)</Label>
              <Textarea
                id="report-details"
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                maxLength={2000}
                rows={4}
                placeholder="Details help the moderation team act faster."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setReportOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={submitReport} disabled={submitting}>
              {submitting ? 'Submitting…' : 'Submit report'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
