import { cn } from '@/lib/utils';

interface RouteLoaderProps {
  fullScreen?: boolean;
  label?: string;
}

export function RouteLoader({ fullScreen = false, label = 'Loading…' }: RouteLoaderProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-center bg-background',
        fullScreen ? 'min-h-screen w-full' : 'min-h-[240px] w-full rounded-md'
      )}
    >
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        <p className="text-sm text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}
