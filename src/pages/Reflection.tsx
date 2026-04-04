import { useState, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { ReflectionScreen } from '@/components/simulation/ReflectionScreen';
import { Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export default function Reflection() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!user || authLoading) return;

    // Find the user's most recent completed session that hasn't had a reflection submitted
    (async () => {
      // Get the latest completed session
      const { data: sessions } = await supabase
        .from('sessions')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_completed', true)
        .order('completed_at', { ascending: false })
        .limit(5);

      if (!sessions || sessions.length === 0) {
        // No completed session — redirect back to simulation
        setChecking(false);
        return;
      }

      // Check which sessions already have reflections
      const sessionIds = sessions.map(s => s.id);
      const { data: reflections } = await supabase
        .from('post_simulation_reflections')
        .select('session_id')
        .in('session_id', sessionIds);

      const reflectedIds = new Set(reflections?.map(r => r.session_id) ?? []);
      const unreflectedSession = sessions.find(s => !reflectedIds.has(s.id));

      if (unreflectedSession) {
        setSessionId(unreflectedSession.id);
      }
      // If all sessions have reflections, sessionId stays null → redirect
      setChecking(false);
    })();
  }, [user, authLoading]);

  if (authLoading || checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  // No session needing reflection — go back to simulation
  if (!sessionId) return <Navigate to="/" replace />;

  return (
    <ReflectionScreen
      sessionId={sessionId}
      userId={user.id}
      onComplete={() => {
        toast({ title: '✅ Submitted!', description: 'Your reflection has been saved. The simulation is now locked.' });
        navigate('/', { replace: true });
      }}
    />
  );
}
