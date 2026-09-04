import { PageHeaderSkeleton, Shimmer } from '@/components/skeletons'

export default function DiscoverLoading() {
  return (
    <div className="min-h-screen bg-background">
      <PageHeaderSkeleton />
      <div className="p-4">
        {/* One card-shaped block matching the swipe deck's aspect ratio, so
            the real card doesn't shift the layout when it arrives. */}
        <Shimmer className="w-full aspect-[3/4] rounded-3xl" />
        <div className="flex items-center justify-center gap-6 mt-6">
          <Shimmer className="h-14 w-14 rounded-full" />
          <Shimmer className="h-16 w-16 rounded-full" />
          <Shimmer className="h-14 w-14 rounded-full" />
        </div>
      </div>
    </div>
  )
}
