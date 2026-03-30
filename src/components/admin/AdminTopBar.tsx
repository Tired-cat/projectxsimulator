import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { LogOut, ArrowLeft, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';

export function AdminTopBar() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const displayName = user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'Admin';

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-card/80 backdrop-blur-sm">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <SidebarTrigger className="mr-1" />
          <Shield className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-bold font-[var(--font-heading)]">Admin Panel</h1>
          <Badge variant="secondary" className="text-xs">Admin</Badge>
        </div>
        <div className="flex items-center gap-3">
          <Button size="sm" variant="outline" onClick={() => navigate('/dashboard')} className="gap-1.5">
            <ArrowLeft className="h-3.5 w-3.5" /> Dashboard
          </Button>
          <span className="text-sm text-muted-foreground hidden md:inline">{displayName}</span>
          <Button size="sm" variant="ghost" onClick={signOut} className="gap-1.5 text-muted-foreground">
            <LogOut className="h-3.5 w-3.5" /> Sign Out
          </Button>
        </div>
      </div>
    </header>
  );
}
