import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

type AllowedRole = 'student' | 'professor' | 'admin';

interface RoleGuardProps {
  children: ReactNode;
  allowed: AllowedRole[];
}

const ADMIN_EMAIL = 'ashwonsouq@gmail.com';

export function RoleGuard({ children, allowed }: RoleGuardProps) {
  const { user, role, loading } = useAuth();

  // Wait for both auth AND role to be fully resolved
  if (loading || (user && role === null)) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const isAdmin = user.email === ADMIN_EMAIL;
  const effectiveRole: AllowedRole = isAdmin ? 'admin' : (role ?? 'student');

  if (!allowed.includes(effectiveRole)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
}
