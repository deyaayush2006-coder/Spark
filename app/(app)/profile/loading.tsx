import { Shimmer } from '@/components/skeletons'

export default function ProfileLoading() {
  return (
    <div className="min-h-screen bg-background">
      <Shimmer className="w-full h-64 rounded-none" />
      <div className="p-4 space-y-4">
        <Shimmer className="h-7 w-40" />
        <div className="flex gap-8">
          <Shimmer className="h-12 w-16" />
          <Shimmer className="h-12 w-16" />
          <Shimmer className="h-12 w-16" />
        </div>
        <Shimmer className="h-4 w-full" />
        <Shimmer className="h-4 w-5/6" />
      </div>
    </div>
  )
}
