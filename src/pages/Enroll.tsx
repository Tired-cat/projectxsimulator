import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Placeholder enrollment page — Step 3 will build the actual class code entry UI.
 * For now, redirects unauthenticated users to /auth.
 */
export default function Enroll() {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;
  if (role !== 'student') return <Navigate to="/auth-redirect" replace />;

  return (
    <div className="h-screen flex items-center justify-center bg-background">
      <p className="text-muted-foreground">Class code entry screen — coming in Step 3</p>
    </div>
  );
}
