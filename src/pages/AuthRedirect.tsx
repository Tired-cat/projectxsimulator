import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useEnrollmentCheck } from '@/hooks/useEnrollmentCheck';

/**
 * Post-login redirect component. Placed at /auth-redirect.
 * Sends users to the correct landing page based on their role.
 * Students without enrollment are sent to /enroll.
 */
export default function AuthRedirect() {
  const { user, role, loading } = useAuth();
  const { enrolled, loading: enrollLoading } = useEnrollmentCheck(user?.id, role);

  if (loading || (user && role === null) || (user && role === 'student' && enrollLoading)) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading your session…</p>
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  if (role === 'admin') return <Navigate to="/admin" replace />;
  if (role === 'professor') return <Navigate to="/dashboard" replace />;

  // Student: check enrollment
  if (enrolled === false) return <Navigate to="/enroll" replace />;
  return <Navigate to="/" replace />;
}
