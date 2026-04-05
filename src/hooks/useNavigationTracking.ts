import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

const TRACKED_TABS = new Set(['home', 'decisions', 'reasoning']);

interface SplitState {
  enabled: boolean;
  leftTabId: string | null;
  rightTabId: string | null;
}

/**
 * Tracks tab navigation events: inserts a row on enter, updates with
 * exited_at / time_spent_seconds on leave. Increments visit_number per tab.
 *
 * Also tracks split-screen: when split is enabled, both visible tabs are
 * tracked simultaneously so we don't miss reasoning board usage during
 * side-by-side mode.
 */
export function useNavigationTracking(
  activeTabId: string,
  sessionId: string | null,
  userId: string | null,
  split?: SplitState,
) {
  // Track multiple concurrent tabs (for split-screen support)
  const activeRowsRef = useRef<Record<string, { rowId: string; enteredAt: number }>>({});
  const visitCountsRef = useRef<Record<string, number>>({});
  const prevVisibleRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!sessionId || !userId) return;

    // Determine which tracked tabs are currently visible
    const nowVisible = new Set<string>();
    const mainTab = TRACKED_TABS.has(activeTabId) ? activeTabId : null;
    if (mainTab) nowVisible.add(mainTab);

    if (split?.enabled) {
      if (split.leftTabId && TRACKED_TABS.has(split.leftTabId)) nowVisible.add(split.leftTabId);
      if (split.rightTabId && TRACKED_TABS.has(split.rightTabId)) nowVisible.add(split.rightTabId);
    }

    const prev = prevVisibleRef.current;

    // Tabs that were visible before but no longer are → close them
    for (const tab of prev) {
      if (!nowVisible.has(tab)) {
        const active = activeRowsRef.current[tab];
        if (active) {
          const now = Date.now();
          const elapsed = Math.round((now - active.enteredAt) / 1000);
          supabase
            .from('navigation_events')
            .update({
              exited_at: new Date(now).toISOString(),
              time_spent_seconds: elapsed,
            })
            .eq('id', active.rowId)
            .then(() => {});
          delete activeRowsRef.current[tab];
        }
      }
    }

    // Tabs that are newly visible → open them
    for (const tab of nowVisible) {
      if (!prev.has(tab)) {
        const counts = visitCountsRef.current;
        counts[tab] = (counts[tab] || 0) + 1;
        const visitNumber = counts[tab];
        const now = Date.now();

        supabase
          .from('navigation_events')
          .insert({
            session_id: sessionId,
            user_id: userId,
            tab: tab,
            entered_at: new Date(now).toISOString(),
            visit_number: visitNumber,
          })
          .select('id')
          .single()
          .then(({ data }) => {
            if (data) {
              activeRowsRef.current[tab] = { rowId: data.id, enteredAt: now };
            }
          });
      }
    }

    prevVisibleRef.current = nowVisible;
  }, [activeTabId, sessionId, userId, split?.enabled, split?.leftTabId, split?.rightTabId]);

  // Close all active rows on unmount
  useEffect(() => {
    return () => {
      for (const [, active] of Object.entries(activeRowsRef.current)) {
        const elapsed = Math.round((Date.now() - active.enteredAt) / 1000);
        supabase
          .from('navigation_events')
          .update({
            exited_at: new Date().toISOString(),
            time_spent_seconds: elapsed,
          })
          .eq('id', active.rowId)
          .then(() => {});
      }
    };
  }, []);
}
