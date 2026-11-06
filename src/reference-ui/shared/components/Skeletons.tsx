import type { ReactNode } from 'react';

const widthClasses = ['w-20', 'w-28', 'w-16', 'w-24', 'w-32', 'w-14'];

interface SkeletonBlockProps {
  className?: string;
}

export const SkeletonBlock = ({ className = '' }: SkeletonBlockProps) => (
  <div aria-hidden="true" className={`animate-shimmer-dark rounded-md bg-white/5 ${className}`} />
);

interface TableSkeletonRowsProps {
  columns: number;
  rows?: number;
}

export const TableSkeletonRows = ({ columns, rows = 7 }: TableSkeletonRowsProps) => (
  <>
    {Array.from({ length: rows }).map((_, rowIndex) => (
      <tr key={`skeleton-row-${rowIndex}`} className="pointer-events-none border-b border-white/5">
        {Array.from({ length: columns }).map((__, columnIndex) => (
          <td key={`skeleton-cell-${rowIndex}-${columnIndex}`}>
            <SkeletonBlock
              className={`h-3.5 ${widthClasses[(rowIndex + columnIndex) % widthClasses.length]} max-w-full`}
            />
          </td>
        ))}
      </tr>
    ))}
  </>
);

export const AdminPageSkeleton = ({ label = 'Loading…' }: { label?: string }) => (
  <section className="flex min-h-[55vh] w-full flex-1 flex-col gap-4" role="status" aria-live="polite">
    <span className="sr-only">{label}</span>

    <div className="flex items-center justify-between gap-3">
      <div className="hidden gap-2 sm:flex">
        <SkeletonBlock className="h-9 w-28" />
        <SkeletonBlock className="h-9 w-28" />
      </div>
      <div className="ml-auto flex min-w-0 flex-1 items-center justify-end gap-2 sm:flex-none">
        <SkeletonBlock className="h-9 min-w-0 flex-1 sm:w-64 sm:flex-none lg:w-80" />
        <SkeletonBlock className="h-9 w-9 shrink-0" />
      </div>
    </div>

    <div className="card-container flex min-h-80 flex-1 flex-col">
      <div className="grid grid-cols-4 gap-4 border-b border-white/10 bg-white/5 px-4 py-3 sm:grid-cols-6">
        {Array.from({ length: 6 }).map((_, index) => (
          <SkeletonBlock key={`header-${index}`} className="h-3 w-16 max-w-full" />
        ))}
      </div>
      <div className="flex-1 divide-y divide-white/5 px-4">
        {Array.from({ length: 7 }).map((_, rowIndex) => (
          <div key={`page-row-${rowIndex}`} className="grid grid-cols-4 gap-4 py-3 sm:grid-cols-6">
            {Array.from({ length: 6 }).map((__, columnIndex) => (
              <SkeletonBlock
                key={`page-cell-${rowIndex}-${columnIndex}`}
                className={`h-3.5 ${widthClasses[(rowIndex + columnIndex) % widthClasses.length]} max-w-full`}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between border-t border-white/10 bg-black/20 px-4 py-3">
        <SkeletonBlock className="h-3.5 w-20" />
        <div className="flex gap-2">
          <SkeletonBlock className="h-7 w-16" />
          <SkeletonBlock className="h-7 w-24" />
        </div>
      </div>
    </div>
  </section>
);

export const DashboardSkeleton = ({ children }: { children?: ReactNode }) => (
  <section className="flex w-full flex-1 flex-col gap-4" role="status" aria-live="polite">
    <span className="sr-only">Loading dashboard…</span>
    {children}
    <div className="flex flex-wrap gap-2">
      <SkeletonBlock className="h-9 w-32" />
      <SkeletonBlock className="h-9 w-32" />
      <SkeletonBlock className="h-9 w-24" />
    </div>
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {Array.from({ length: 10 }).map((_, index) => (
        <div key={`kpi-${index}`} className="liquid-glass-card rounded-lg p-4">
          <SkeletonBlock className="h-3 w-20" />
          <SkeletonBlock className="mt-4 h-7 w-28" />
        </div>
      ))}
    </div>
  </section>
);
