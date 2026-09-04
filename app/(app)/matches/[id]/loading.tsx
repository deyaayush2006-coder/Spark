import { Shimmer } from '@/components/skeletons'

export default function ChatLoading() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 md:top-20 z-40 bg-background/95 backdrop-blur-md border-b p-4 flex items-center gap-3">
        <Shimmer className="h-9 w-9 rounded-full" />
        <Shimmer className="h-10 w-10 rounded-full" />
        <Shimmer className="h-5 w-28" />
      </header>
      <div className="flex-1 p-4 space-y-4">
        <Shimmer className="h-10 w-2/3 rounded-2xl" />
        <Shimmer className="h-10 w-1/2 rounded-2xl ml-auto" />
        <Shimmer className="h-10 w-3/5 rounded-2xl" />
        <Shimmer className="h-10 w-2/5 rounded-2xl ml-auto" />
      </div>
    </div>
  )
}
