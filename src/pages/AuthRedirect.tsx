import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Post-login redirect component. Placed at /auth-redirect.
 * Sends users to the correct landing page based on their role.
 */
export default function AuthRedirect() {
  const { user, role, loading } = useAuth();

  if (loading || (user && role === null)) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading your session…</p>
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  if (role === 'admin') return <Navigate to="/admin" replace />;
  if (role === 'professor') return <Navigate to="/dashboard" replace />;
  return <Navigate to="/" replace />;
}
