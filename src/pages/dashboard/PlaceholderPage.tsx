import { Card, CardContent } from '@/components/ui/card';
import { Construction } from 'lucide-react';

export default function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold font-[var(--font-heading)]">{title}</h2>
      <Card>
        <CardContent className="pt-8 pb-8 flex flex-col items-center gap-3 text-muted-foreground">
          <Construction className="h-10 w-10" />
          <p className="text-lg font-medium">Coming soon</p>
          <p className="text-sm">This section is under development.</p>
        </CardContent>
      </Card>
    </div>
  );
}
