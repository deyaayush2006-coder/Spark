import { ListSkeleton, PageHeaderSkeleton } from '@/components/skeletons'

export default function MatchesLoading() {
  return (
    <div className="min-h-screen bg-background">
      <PageHeaderSkeleton />
      <ListSkeleton rows={7} />
    </div>
  )
}
