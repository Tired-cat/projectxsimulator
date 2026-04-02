import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const views = [
  'Pilot Health',
  'Reasoning Board',
  'Allocation Decisions',
  'Feature Usage',
  'AI Feedback',
  'Struggle Signals',
  'Per-Student Table',
];

export default function AdminPilot() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold font-[var(--font-heading)] text-foreground">
        Pilot analytics dashboard
      </h2>

      <Card className="border border-border">
        <CardContent className="py-8 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {views.map(v => (
              <div
                key={v}
                className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-4 py-3"
              >
                <Badge variant="secondary" className="text-xs">Coming</Badge>
                <span className="text-sm font-medium text-foreground">{v}</span>
              </div>
            ))}
          </div>

          <p className="text-sm text-muted-foreground text-center pt-2">
            Build in progress
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
