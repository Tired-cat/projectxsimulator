import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const SCENARIO_ID = 'scenario-1';

interface SessionData {
  sessionId: string | null;
  isCompleted: boolean;
  startedAt: string | null;
  completedAt: string | null;
  loading: boolean;
}

export function useSession() {
  const { user } = useAuth();
  const [data, setData] = useState<SessionData>({
    sessionId: null,
    isCompleted: false,
    startedAt: null,
    completedAt: null,
    loading: true,
  });

  // Initialize or resume session
  useEffect(() => {
    if (!user) {
      setData({ sessionId: null, isCompleted: false, startedAt: null, completedAt: null, loading: false });
      return;
    }

    const init = async () => {
      try {
        // Check for existing session (use limit+order to handle multiple rows gracefully)
        const { data: rows, error: selectError } = await supabase
          .from('sessions')
          .select('*')
          .eq('user_id', user.id)
          .eq('scenario_id', SCENARIO_ID)
          .order('started_at', { ascending: false })
          .limit(1);

        const existing = rows && rows.length > 0 ? rows[0] : null;

        if (existing) {
          setData({
            sessionId: existing.id,
            isCompleted: existing.is_completed,
            startedAt: existing.started_at,
            completedAt: existing.completed_at,
            loading: false,
          });
        } else {
          // Create new session
          const { data: newSession } = await supabase
            .from('sessions')
            .insert({ user_id: user.id, scenario_id: SCENARIO_ID })
            .select()
            .single();

          if (newSession) {
            setData({
              sessionId: newSession.id,
              isCompleted: false,
              startedAt: newSession.started_at,
              completedAt: null,
              loading: false,
            });
          } else {
            setData(prev => ({ ...prev, loading: false }));
          }
        }
      } catch (err) {
        console.error('Session init error:', err);
        setData(prev => ({ ...prev, loading: false }));
      }
    };

    init();
  }, [user]);

  const completeSession = useCallback(async () => {
    if (!data.sessionId) return;
    const now = new Date().toISOString();
    await supabase
      .from('sessions')
      .update({ is_completed: true, completed_at: now })
      .eq('id', data.sessionId);
    setData(prev => ({ ...prev, isCompleted: true, completedAt: now }));
  }, [data.sessionId]);

  return { ...data, completeSession };
}
