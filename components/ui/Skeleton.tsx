interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = "" }: SkeletonProps) {
  return <div className={`animate-pulse rounded-md bg-slate-100 ${className}`} />;
}

export function ChartSkeleton({ height = 360 }: { height?: number }) {
  return (
    <div style={{ height }} className="flex items-end gap-3 px-4 pb-6 pt-4">
      {[35, 55, 40, 72, 48, 65, 42, 80, 52, 68].map((h, i) => (
        <div
          key={i}
          className="flex-1 animate-pulse rounded-t-md bg-gradient-to-t from-slate-100 to-slate-50"
          style={{ height: `${h}%`, animationDelay: `${i * 80}ms` }}
        />
      ))}
    </div>
  );
}
