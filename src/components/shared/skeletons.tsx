import { Skeleton } from "@/components/ui/skeleton";

export function CardGridSkeleton({ count = 3, cols = "lg:grid-cols-3" }: { count?: number; cols?: string }) {
  return (
    <div className={`grid gap-5 sm:grid-cols-2 ${cols}`} aria-busy="true" aria-label="Memuat">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="overflow-hidden rounded-md border border-border bg-surface">
          <Skeleton className="aspect-[16/10] rounded-none" />
          <div className="space-y-2 p-4">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-4 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SectionSkeleton() {
  return (
    <div className="container-page py-16 sm:py-20">
      <Skeleton className="mb-3 h-3 w-24" />
      <Skeleton className="mb-8 h-9 w-80 max-w-full" />
      <CardGridSkeleton />
    </div>
  );
}
