import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';

export type AppRole = 'student' | 'professor';

interface AuthState {
  user: User | null;
  session: Session | null;
  role: AppRole | null;
  loading: boolean;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    role: null,
    loading: true,
  });

  useEffect(() => {
    // Set up auth listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        const user = session?.user ?? null;
        let role: AppRole | null = null;

        if (user) {
          // Fetch role from profiles (defer to avoid deadlock)
          setTimeout(async () => {
            const { data } = await supabase
              .from('profiles')
              .select('role')
              .eq('id', user.id)
              .single();
            if (data) {
              setState(prev => ({ ...prev, role: data.role as AppRole }));
            }
          }, 0);
        }

        setState({ user, session, role, loading: false });
      }
    );

    // THEN check existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      const user = session?.user ?? null;
      if (user) {
        supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single()
          .then(({ data }) => {
            setState({
              user,
              session,
              role: (data?.role as AppRole) ?? null,
              loading: false,
            });
          });
      } else {
        setState({ user: null, session: null, role: null, loading: false });
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = useCallback(async (email: string, password: string, role: AppRole, displayName?: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          role,
          display_name: displayName || email.split('@')[0],
        },
      },
    });
    return { data, error };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { data, error };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setState({ user: null, session: null, role: null, loading: false });
  }, []);

  return {
    ...state,
    signUp,
    signIn,
    signOut,
    isAuthenticated: !!state.user,
    isProfessor: state.role === 'professor',
    isStudent: state.role === 'student',
  };
}
