import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Checks whether a student user has at least one enrollment.
 * Returns { enrolled, loading }.
 * For non-student roles, always returns enrolled = true immediately.
 */
export function useEnrollmentCheck(userId: string | undefined, role: string | null) {
  const [enrolled, setEnrolled] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Non-student roles skip enrollment check entirely
    if (!userId || !role || role !== 'student') {
      setEnrolled(true);
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function check() {
      const { data, error } = await supabase
        .from('student_enrollments')
        .select('id')
        .eq('user_id', userId!)
        .limit(1)
        .maybeSingle();

      if (cancelled) return;

      if (error) {
        // On error, allow through to avoid blocking legitimate users
        setEnrolled(true);
      } else {
        setEnrolled(data !== null);
      }
      setLoading(false);
    }

    check();
    return () => { cancelled = true; };
  }, [userId, role]);

  return { enrolled, loading };
}
