import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

const TRACKED_TABS = new Set(['home', 'decisions', 'reasoning']);

/**
 * Tracks tab navigation events: inserts a row on enter, updates with
 * exited_at / time_spent_seconds on leave. Increments visit_number per tab.
 */
export function useNavigationTracking(
  activeTabId: string,
  sessionId: string | null,
  userId: string | null,
) {
  const currentRowIdRef = useRef<string | null>(null);
  const enteredAtRef = useRef<number | null>(null);
  const visitCountsRef = useRef<Record<string, number>>({});
  const prevTabRef = useRef<string | null>(null);

  useEffect(() => {
    if (!sessionId || !userId) return;

    const tabName = TRACKED_TABS.has(activeTabId) ? activeTabId : null;
    const prevTab = prevTabRef.current;

    // Same tab — no-op
    if (tabName === prevTab) return;

    // --- Close previous tab ---
    if (prevTab && currentRowIdRef.current && enteredAtRef.current) {
      const now = Date.now();
      const elapsed = Math.round((now - enteredAtRef.current) / 1000);
      const rowId = currentRowIdRef.current;
      supabase
        .from('navigation_events')
        .update({
          exited_at: new Date(now).toISOString(),
          time_spent_seconds: elapsed,
        })
        .eq('id', rowId)
        .then(() => {});
    }

    currentRowIdRef.current = null;
    enteredAtRef.current = null;
    prevTabRef.current = tabName;

    // --- Open new tab ---
    if (!tabName) return;

    const counts = visitCountsRef.current;
    counts[tabName] = (counts[tabName] || 0) + 1;
    const visitNumber = counts[tabName];
    const now = Date.now();
    enteredAtRef.current = now;

    supabase
      .from('navigation_events')
      .insert({
        session_id: sessionId,
        user_id: userId,
        tab: tabName,
        entered_at: new Date(now).toISOString(),
        visit_number: visitNumber,
      })
      .select('id')
      .single()
      .then(({ data }) => {
        if (data) currentRowIdRef.current = data.id;
      });
  }, [activeTabId, sessionId, userId]);

  // Close the current tab row on unmount (e.g. page close)
  useEffect(() => {
    return () => {
      if (currentRowIdRef.current && enteredAtRef.current) {
        const elapsed = Math.round((Date.now() - enteredAtRef.current) / 1000);
        supabase
          .from('navigation_events')
          .update({
            exited_at: new Date().toISOString(),
            time_spent_seconds: elapsed,
          })
          .eq('id', currentRowIdRef.current)
          .then(() => {});
      }
    };
  }, []);
}
