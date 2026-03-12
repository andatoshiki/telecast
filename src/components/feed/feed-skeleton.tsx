import { Skeleton } from '@/components/ui/skeleton'

interface FeedListSkeletonProps {
  count?: number
  showPagination?: boolean
}

export function PostCardSkeleton() {
  return (
    <article className="border-b px-4 py-4">
      <div className="mb-3">
        <Skeleton className="h-4 w-32" />
      </div>

      <div className="space-y-2">
        <Skeleton className="h-4 w-[92%]" />
        <Skeleton className="h-4 w-[84%]" />
        <Skeleton className="h-4 w-[62%]" />
      </div>

      <Skeleton className="mt-4 h-52 w-full rounded-xl" />

      <div className="mt-4 flex gap-2">
        <Skeleton className="h-7 w-16 rounded-full" />
        <Skeleton className="h-7 w-14 rounded-full" />
        <Skeleton className="h-7 w-20 rounded-full" />
      </div>
    </article>
  )
}

export function FeedListSkeleton({ count = 4, showPagination = true }: FeedListSkeletonProps) {
  return (
    <div className="border-b">
      {Array.from({ length: count }).map((_, index) => (
        <PostCardSkeleton key={`post-skeleton-${index}`} />
      ))}

      {showPagination
        ? (
            <div className="flex items-center justify-between gap-3 px-4 py-4">
              <Skeleton className="h-10 w-24 rounded-full" />
              <Skeleton className="h-10 w-24 rounded-full" />
            </div>
          )
        : null}
    </div>
  )
}
