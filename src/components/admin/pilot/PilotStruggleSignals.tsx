import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { AlertTriangle, CheckCircle, AlertCircle } from 'lucide-react';

interface Props { classId: string | null; }

type Status = 'confirmed' | 'borderline' | 'under';

interface IssueRow {
  issue: string;
  pctAffected: number;
  threshold: number;
  status: Status;
  priority: 'P1' | 'P2';
  note?: string;
}

function getStatus(pct: number, threshold: number, invertCheck?: boolean): Status {
  if (invertCheck) {
    // For Row 8: confirmed if pct < threshold
    if (pct < threshold) return 'confirmed';
    if (pct < threshold + 5) return 'borderline';
    return 'under';
  }
  if (pct > threshold) return 'confirmed';
  if (pct >= threshold - 5) return 'borderline';
  return 'under';
}

const STATUS_CONFIG = {
  confirmed: { color: '#DC2626', bg: 'bg-red-50', border: 'border-red-200', label: 'Confirmed', dot: 'bg-red-500' },
  borderline: { color: '#D97706', bg: 'bg-amber-50', border: 'border-amber-200', label: 'Borderline', dot: 'bg-amber-500' },
  under: { color: '#16A34A', bg: 'bg-green-50', border: 'border-green-200', label: 'Under threshold', dot: 'bg-green-500' },
};

export default function PilotStruggleSignals({ classId }: Props) {
  const [loading, setLoading] = useState(true);
  const [issues, setIssues] = useState<IssueRow[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);

      // 1. Get session IDs for class
      let sq = supabase.from('sessions').select('id');
      if (classId) sq = sq.eq('class_id', classId);
      const { data: sessData } = await sq;
      const sessionIds = (sessData ?? []).map((s) => s.id);
      const totalSessions = sessionIds.length;

      if (totalSessions === 0) {
        if (!cancelled) { setIssues([]); setLoading(false); }
        return;
      }

      // 2. Fetch all needed data in parallel (chunked)
      const chunkQuery = async <T,>(queryFn: (ids: string[]) => any, ids: string[]): Promise<T[]> => {
        const results: T[] = [];
        for (let i = 0; i < ids.length; i += 100) {
          const { data } = await queryFn(ids.slice(i, i + 100));
          if (data) results.push(...(data as T[]));
        }
        return results;
      };

      const [navRows, subRows, resetRows, allocRows, boardRows] = await Promise.all([
        chunkQuery<{ session_id: string; tab: string }>((ids) => supabase.from('navigation_events').select('session_id, tab').in('session_id', ids), sessionIds),
        chunkQuery<{ session_id: string; predictive_card_count: number; contextualise_pairs_count: number }>((ids) => supabase.from('submissions').select('session_id, predictive_card_count, contextualise_pairs_count').in('session_id', ids), sessionIds),
        chunkQuery<{ session_id: string; reset_type: string }>((ids) => supabase.from('resets').select('session_id, reset_type').in('session_id', ids), sessionIds),
        chunkQuery<{ session_id: string }>((ids) => supabase.from('allocation_events').select('session_id').in('session_id', ids), sessionIds),
        chunkQuery<{ session_id: string; sequence_number: number | null; evidence_id: string | null }>((ids) => supabase.from('board_events').select('session_id, sequence_number, evidence_id').in('session_id', ids), sessionIds),
      ]);

      const totalSubmissions = new Set(subRows.map((r) => r.session_id)).size;
      const submissionSessions = new Set(subRows.map((r) => r.session_id));

      // Row 1: Never reached Reasoning Board
      const sessionsWithRB = new Set(navRows.filter((r) => r.tab === 'reasoning_board').map((r) => r.session_id));
      const pctNeverRB = ((totalSessions - sessionsWithRB.size) / totalSessions) * 100;

      // Row 2: Left Predictive empty
      const predEmpty = subRows.filter((r) => r.predictive_card_count === 0);
      const pctPredEmpty = totalSubmissions > 0 ? (new Set(predEmpty.map((r) => r.session_id)).size / totalSubmissions) * 100 : 0;

      // Row 3: Never used Contextualise
      const ctxZero = subRows.filter((r) => r.contextualise_pairs_count === 0);
      const pctCtxZero = totalSubmissions > 0 ? (new Set(ctxZero.map((r) => r.session_id)).size / totalSubmissions) * 100 : 0;

      // Row 4: Board reset 2+ times
      const resetCounts = new Map<string, number>();
      resetRows.filter((r) => r.reset_type === 'board_reset').forEach((r) => {
        resetCounts.set(r.session_id, (resetCounts.get(r.session_id) ?? 0) + 1);
      });
      const resetTwice = [...resetCounts.values()].filter((c) => c >= 2).length;
      const pctResetTwice = (resetTwice / totalSessions) * 100;

      // Row 5: Submitted with 0 allocation changes
      const sessionsWithAlloc = new Set(allocRows.map((r) => r.session_id));
      const submittedNoAlloc = [...submissionSessions].filter((sid) => !sessionsWithAlloc.has(sid)).length;
      const pctNoAlloc = totalSubmissions > 0 ? (submittedNoAlloc / totalSubmissions) * 100 : 0;

      // Row 6: Never visited My Decisions
      const sessionsWithMD = new Set(navRows.filter((r) => r.tab === 'my_decisions').map((r) => r.session_id));
      const pctNeverMD = ((totalSessions - sessionsWithMD.size) / totalSessions) * 100;

      // Row 7: Views item dragged first (framing trap)
      const sessionsWithBoard = new Set(boardRows.map((r) => r.session_id));
      const firstDragPerSession = new Map<string, { seq: number; evidenceId: string }>();
      boardRows.forEach((r) => {
        if (r.sequence_number == null || !r.evidence_id) return;
        const existing = firstDragPerSession.get(r.session_id);
        if (!existing || r.sequence_number < existing.seq) {
          firstDragPerSession.set(r.session_id, { seq: r.sequence_number, evidenceId: r.evidence_id });
        }
      });
      const viewsFirst = [...firstDragPerSession.values()].filter((v) => v.evidenceId.includes('_views')).length;
      const pctViewsFirst = sessionsWithBoard.size > 0 ? (viewsFirst / sessionsWithBoard.size) * 100 : 0;

      // Row 8: Pro Chair TikTok never dragged (BUG-02)
      const sessionsWithProChairTT = new Set(
        boardRows.filter((r) => r.evidence_id === 'pro_chair_tiktok').map((r) => r.session_id)
      );
      const pctDraggedProChair = sessionsWithBoard.size > 0 ? (sessionsWithProChairTT.size / sessionsWithBoard.size) * 100 : 0;

      const results: IssueRow[] = [
        { issue: 'Never reached Reasoning Board', pctAffected: pctNeverRB, threshold: 10, status: getStatus(pctNeverRB, 10), priority: 'P1' },
        { issue: 'Left Predictive quadrant empty', pctAffected: pctPredEmpty, threshold: 35, status: getStatus(pctPredEmpty, 35), priority: 'P1' },
        { issue: 'Never used Contextualise', pctAffected: pctCtxZero, threshold: 40, status: getStatus(pctCtxZero, 40), priority: 'P1' },
        { issue: 'Board reset 2+ times', pctAffected: pctResetTwice, threshold: 15, status: getStatus(pctResetTwice, 15), priority: 'P2' },
        { issue: 'Submitted with 0 allocation changes', pctAffected: pctNoAlloc, threshold: 10, status: getStatus(pctNoAlloc, 10), priority: 'P2' },
        { issue: 'Never visited My Decisions', pctAffected: pctNeverMD, threshold: 15, status: getStatus(pctNeverMD, 15), priority: 'P2' },
        { issue: 'Views item dragged first (framing trap)', pctAffected: pctViewsFirst, threshold: 30, status: getStatus(pctViewsFirst, 30), priority: 'P1' },
        {
          issue: 'Pro Chair TikTok never dragged (BUG-02)',
          pctAffected: pctDraggedProChair,
          threshold: 5,
          status: getStatus(pctDraggedProChair, 5, true),
          priority: 'P1',
          note: pctDraggedProChair >= 5
            ? `${pctDraggedProChair.toFixed(1)}% of students dragged Pro Chair TikTok — BUG-02 may have been partially fixed. Verify.`
            : undefined,
        },
      ];

      if (!cancelled) { setIssues(results); setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [classId]);

  const p1Confirmed = useMemo(() => issues.filter((i) => i.priority === 'P1' && i.status === 'confirmed').length, [issues]);
  const p2Confirmed = useMemo(() => issues.filter((i) => i.priority === 'P2' && i.status === 'confirmed').length, [issues]);
  const totalConfirmed = p1Confirmed + p2Confirmed;

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-sm text-muted-foreground">Loading struggle signal data…</div>;
  }

  if (issues.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-12 text-center">
          <AlertTriangle className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No session data available. Struggle signals will populate once students begin the simulation.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── KNOWN ISSUES TABLE ────────────────────── */}
      <Card>
        <CardContent className="pt-5 pb-4">
          <h3 className="text-sm font-semibold text-foreground mb-4">Known issues — traffic light status</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 pr-4 font-semibold text-muted-foreground">Issue</th>
                  <th className="text-right py-2 px-4 font-semibold text-muted-foreground whitespace-nowrap">% affected</th>
                  <th className="text-right py-2 px-4 font-semibold text-muted-foreground">Threshold</th>
                  <th className="text-center py-2 px-4 font-semibold text-muted-foreground">Status</th>
                  <th className="text-center py-2 px-4 font-semibold text-muted-foreground">Priority</th>
                </tr>
              </thead>
              <tbody>
                {issues.map((row) => {
                  const cfg = STATUS_CONFIG[row.status];
                  return (
                    <tr key={row.issue} className="border-b border-border/50 last:border-0">
                      <td className="py-2.5 pr-4 font-medium text-foreground">
                        {row.issue}
                        {row.note && (
                          <div className="mt-1 flex items-start gap-1.5 p-2 rounded bg-amber-50 border border-amber-200">
                            <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
                            <span className="text-[10px] text-amber-800">{row.note}</span>
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-4 text-right font-bold" style={{ color: cfg.color }}>
                        {row.pctAffected.toFixed(1)}%
                      </td>
                      <td className="py-2.5 px-4 text-right text-muted-foreground whitespace-nowrap">
                        {row.issue.includes('BUG-02') ? '< 5%' : `> ${row.threshold}%`}
                      </td>
                      <td className="py-2.5 px-4">
                        <div className="flex items-center justify-center gap-1.5">
                          <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${cfg.dot}`} />
                          <span style={{ color: cfg.color }} className="font-medium">{cfg.label}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            row.priority === 'P1'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          {row.priority}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ── SUMMARY ──────────────────────────────── */}
      {totalConfirmed > 0 ? (
        <div className="flex items-start gap-2 p-4 rounded-md bg-red-50 border border-red-200">
          <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-800">
              {totalConfirmed} issue{totalConfirmed !== 1 ? 's' : ''} confirmed at scale.
              {p1Confirmed > 0 && ` ${p1Confirmed} critical (P1).`}
              {p2Confirmed > 0 && ` ${p2Confirmed} moderate (P2).`}
            </p>
            <p className="text-xs text-red-700 mt-1">Fix these before the next pilot run.</p>
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-2 p-4 rounded-md bg-green-50 border border-green-200">
          <CheckCircle className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
          <p className="text-sm font-semibold text-green-800">No issues confirmed at scale. All signals are under threshold.</p>
        </div>
      )}
    </div>
  );
}
