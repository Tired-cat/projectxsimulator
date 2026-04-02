import { useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';

const routeMeta: Record<string, { title: string; subtitle: string }> = {
  '/admin': { title: 'Overview', subtitle: 'System-wide summary' },
  '/admin/professors': { title: 'Professors', subtitle: 'Manage instructor accounts' },
  '/admin/students': { title: 'Students', subtitle: 'Manage student accounts' },
  '/admin/classes': { title: 'Classes', subtitle: 'Manage class sections' },
  '/admin/class-codes': { title: 'Class codes', subtitle: 'View and generate join codes' },
  '/admin/pilot': { title: 'Pilot dashboard', subtitle: 'Analytics and insights' },
  '/admin/system': { title: 'System / danger', subtitle: 'Dangerous operations' },
};

export function AdminTopBar() {
  const { signOut } = useAuth();
  const location = useLocation();

  const meta = routeMeta[location.pathname] ?? { title: 'Admin', subtitle: '' };

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-card/90 backdrop-blur-sm">
      <div className="flex items-center justify-between px-6 py-3">
        <div>
          <h2 className="text-base font-semibold font-[var(--font-heading)] text-foreground">
            {meta.title}
          </h2>
          {meta.subtitle && (
            <p className="text-xs text-muted-foreground mt-0.5">{meta.subtitle}</p>
          )}
        </div>
        <Button size="sm" variant="ghost" onClick={signOut} className="gap-1.5 text-muted-foreground">
          <LogOut className="h-3.5 w-3.5" /> Sign out
        </Button>
      </div>
    </header>
  );
}
