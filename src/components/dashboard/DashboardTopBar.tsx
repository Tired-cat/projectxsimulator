import { useAuth } from '@/contexts/AuthContext';
import { useClassFilter } from '@/contexts/ClassFilterContext';
import { ClassSwitcher } from '@/components/dashboard/ClassSwitcher';
import { Button } from '@/components/ui/button';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { LogOut, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';

export function DashboardTopBar() {
  const { user, signOut } = useAuth();
  const { classes, selectedClassId, setSelectedClassId } = useClassFilter();
  const navigate = useNavigate();
  const isAdmin = user?.email === 'ashwonsouq@gmail.com';

  const displayName = user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'Professor';

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-card/80 backdrop-blur-sm">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <SidebarTrigger className="mr-1" />
          <h1 className="text-lg font-bold font-[var(--font-heading)]">📊 ProjectX Dashboard</h1>
          <Badge variant="secondary" className="text-xs">Live</Badge>
        </div>
        <div className="flex items-center gap-3">
          <ClassSwitcher
            classes={classes}
            selectedClassId={selectedClassId}
            onSelect={setSelectedClassId}
          />
          <span className="text-sm text-muted-foreground hidden md:inline">{displayName}</span>
          {isAdmin && (
            <Button size="sm" variant="outline" onClick={() => navigate('/admin')} className="gap-1.5">
              <Shield className="h-3.5 w-3.5" /> Admin
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={signOut} className="gap-1.5 text-muted-foreground">
            <LogOut className="h-3.5 w-3.5" /> Sign Out
          </Button>
        </div>
      </div>
    </header>
  );
}
