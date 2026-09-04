import { ListSkeleton, PageHeaderSkeleton, Shimmer } from '@/components/skeletons'

export default function SocialLoading() {
  return (
    <div className="min-h-screen bg-background">
      <PageHeaderSkeleton />
      <div className="flex gap-2 p-4">
        <Shimmer className="h-9 flex-1" />
        <Shimmer className="h-9 flex-1" />
        <Shimmer className="h-9 flex-1" />
      </div>
      <ListSkeleton rows={6} />
    </div>
  )
}
