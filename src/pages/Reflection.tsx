import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { ReflectionScreen } from '@/components/simulation/ReflectionScreen';
import { toast } from '@/hooks/use-toast';

type GuardState = 'loading' | 'allowed' | 'redirect';

const Reflection = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [guardState, setGuardState] = useState<GuardState>('loading');
  const [sessionId, setSessionId] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading || !user) return;

    const check = async () => {
      // Find the most recent completed session for this user
      const { data: session } = await supabase
        .from('sessions')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_completed', true)
        .order('completed_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!session) {
        setGuardState('redirect');
        return;
      }

      // Check if reflection already submitted for this session
      const { data: existing } = await supabase
        .from('post_simulation_reflections')
        .select('id')
        .eq('session_id', session.id)
        .eq('user_id', user.id)
        .maybeSingle();

      if (existing) {
        setGuardState('redirect');
        return;
      }

      setSessionId(session.id);
      setGuardState('allowed');
    };

    check();
  }, [user, authLoading]);

  if (authLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (guardState === 'loading') {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (guardState === 'redirect') {
    return <Navigate to="/" replace />;
  }

  return (
    <ReflectionScreen
      sessionId={sessionId!}
      userId={user.id}
      onComplete={() => {
        toast({
          title: '✅ Submitted!',
          description: 'Your work has been submitted successfully. The simulation is now locked.',
        });
        navigate('/', { replace: true });
      }}
    />
  );
};

export default Reflection;
