interface SkeletonProps {
  className?: string;
  height?: string;
  width?: string;
  rows?: number;
}

export function Skeleton({ className = "", height = "h-4", width = "w-full" }: SkeletonProps) {
  return <div className={`skeleton ${height} ${width} ${className}`} />;
}

export function SkeletonCard() {
  return (
    <div className="bg-surface-container-high rounded-2xl p-6 space-y-4">
      <Skeleton height="h-3" width="w-1/3" />
      <Skeleton height="h-10" width="w-1/2" />
      <Skeleton height="h-3" width="w-2/3" />
    </div>
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="bg-surface-container border border-white/5 rounded-2xl overflow-hidden">
      <div className="p-4 border-b border-white/5 flex gap-4">
        <Skeleton height="h-3" width="w-1/4" />
        <Skeleton height="h-3" width="w-1/6" />
        <Skeleton height="h-3" width="w-1/6" />
      </div>
      <div className="divide-y divide-white/5">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex gap-4 p-4 items-center">
            <Skeleton height="h-3" width="w-1/3" />
            <Skeleton height="h-5" width="w-16" className="rounded-full" />
            <Skeleton height="h-3" width="w-12" />
            <Skeleton height="h-3" width="w-24" className="ml-auto" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonStats() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <SkeletonCard />
      <div className="md:col-span-2">
        <SkeletonCard />
      </div>
    </div>
  );
}
