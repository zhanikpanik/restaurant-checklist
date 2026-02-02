import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: (string | undefined | null | boolean)[]) {
  return twMerge(clsx(inputs));
}

export interface SkeletonProps {
  className?: string;
  variant?: "text" | "circular" | "rectangular";
  width?: string | number;
  height?: string | number;
  lines?: number;
}

export function Skeleton({
  className,
  variant = "text",
  width,
  height,
  lines = 1,
}: SkeletonProps) {
  const baseStyles = "animate-pulse bg-gray-200";

  const variants = {
    text: "rounded",
    circular: "rounded-full",
    rectangular: "rounded-lg",
  };

  const style: React.CSSProperties = {
    width: width,
    height: height || (variant === "text" ? "1em" : undefined),
  };

  if (lines > 1) {
    return (
      <div className="space-y-2">
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={cn(baseStyles, variants[variant], className)}
            style={{
              ...style,
              width: i === lines - 1 ? "75%" : width,
            }}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={cn(baseStyles, variants[variant], className)}
      style={style}
    />
  );
}

// Pre-built skeleton patterns
export function SkeletonCard() {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <Skeleton width="40%" height="1.5rem" />
        <Skeleton width="4rem" height="1.5rem" variant="rectangular" />
      </div>
      <Skeleton lines={2} />
      <div className="flex gap-2">
        <Skeleton width="5rem" height="2rem" variant="rectangular" />
        <Skeleton width="5rem" height="2rem" variant="rectangular" />
      </div>
    </div>
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex gap-4 p-3 bg-gray-50 rounded-lg">
        <Skeleton width="10%" height="1rem" />
        <Skeleton width="25%" height="1rem" />
        <Skeleton width="20%" height="1rem" />
        <Skeleton width="15%" height="1rem" />
        <Skeleton width="15%" height="1rem" />
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 p-3 border-b border-gray-100">
          <Skeleton width="10%" height="1rem" />
          <Skeleton width="25%" height="1rem" />
          <Skeleton width="20%" height="1rem" />
          <Skeleton width="15%" height="1rem" />
          <Skeleton width="15%" height="1rem" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonList({ items = 3 }: { items?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: items }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}
