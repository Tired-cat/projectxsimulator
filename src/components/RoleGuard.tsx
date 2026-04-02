import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

type AllowedRole = 'student' | 'professor' | 'admin';

interface RoleGuardProps {
  children: ReactNode;
  allowed: AllowedRole[];
}

export function RoleGuard({ children, allowed }: RoleGuardProps) {
  const { user, role, loading } = useAuth();

  if (loading || (user && role === null)) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Loading…</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (!role || !allowed.includes(role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
}
