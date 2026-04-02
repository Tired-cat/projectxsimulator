import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart3 } from 'lucide-react';

/** Skeleton for metric card rows (e.g. 4 KPI cards) */
export function MetricCardsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i}>
          <CardContent className="py-4 text-center space-y-2">
            <Skeleton className="h-5 w-5 mx-auto rounded-full" />
            <Skeleton className="h-7 w-16 mx-auto" />
            <Skeleton className="h-3 w-24 mx-auto" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/** Skeleton for a chart card */
export function ChartSkeleton({ height = 240 }: { height?: number }) {
  return (
    <Card>
      <CardContent className="pt-5 pb-4">
        <Skeleton className="h-4 w-48 mb-4" />
        <div className="flex items-end gap-2 justify-center" style={{ height }}>
          {[40, 65, 80, 55, 70, 45, 60, 75].map((h, i) => (
            <Skeleton key={i} className="w-8 rounded-t" style={{ height: `${h}%` }} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/** Skeleton for a table */
export function TableSkeleton({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <Card>
      <CardContent className="pt-5 pb-4">
        <Skeleton className="h-4 w-40 mb-4" />
        <div className="space-y-2">
          <div className="flex gap-4">
            {Array.from({ length: cols }).map((_, i) => (
              <Skeleton key={i} className="h-3 flex-1" />
            ))}
          </div>
          {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="flex gap-4">
              {Array.from({ length: cols }).map((_, j) => (
                <Skeleton key={j} className="h-4 flex-1" />
              ))}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/** Full-view skeleton combining metrics + charts */
export function ViewSkeleton({ metrics = true, charts = 2, table = false }: { metrics?: boolean; charts?: number; table?: boolean }) {
  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {metrics && <MetricCardsSkeleton />}
      {charts > 0 && (
        <div className={`grid grid-cols-1 ${charts > 1 ? 'md:grid-cols-2' : ''} gap-6`}>
          {Array.from({ length: charts }).map((_, i) => (
            <ChartSkeleton key={i} />
          ))}
        </div>
      )}
      {table && <TableSkeleton />}
    </div>
  );
}

/** Empty state with icon and message */
export function EmptyState({ message, icon }: { message: string; icon?: React.ReactNode }) {
  return (
    <Card className="border-dashed">
      <CardContent className="py-12 text-center">
        {icon ?? <BarChart3 className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />}
        <p className="text-sm text-muted-foreground">{message}</p>
      </CardContent>
    </Card>
  );
}
