import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { ViewSkeleton } from './PilotSkeletons';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import { AlertTriangle, CheckCircle, AlertCircle, Clock, RotateCcw } from 'lucide-react';

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

interface NavRow { session_id: string; tab: string; time_spent_seconds: number | null; }
interface SubRow { session_id: string; predictive_card_count: number; contextualise_pairs_count: number; }
interface ResetRow { session_id: string; reset_type: string; cards_cleared: number | null; }
interface BoardRow { session_id: string; sequence_number: number | null; evidence_id: string | null; }

function getStatus(pct: number, threshold: number, invertCheck?: boolean): Status {
  if (invertCheck) {
    if (pct < threshold) return 'confirmed';
    if (pct < threshold + 5) return 'borderline';
    return 'under';
  }
  if (pct > threshold) return 'confirmed';
  if (pct >= threshold - 5) return 'borderline';
  return 'under';
}

const STATUS_CONFIG = {
  confirmed: { color: '#DC2626', label: 'Confirmed', dot: 'bg-red-500' },
  borderline: { color: '#D97706', label: 'Borderline', dot: 'bg-amber-500' },
  under: { color: '#16A34A', label: 'Under threshold', dot: 'bg-green-500' },
};

export default function PilotStruggleSignals({ classId }: Props) {
  const [loading, setLoading] = useState(true);
  const [issues, setIssues] = useState<IssueRow[]>([]);
  const [navRows, setNavRows] = useState<NavRow[]>([]);
  const [boardRows, setBoardRows] = useState<BoardRow[]>([]);
  const [resetRows, setResetRows] = useState<ResetRow[]>([]);
  const [totalSessions, setTotalSessions] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);

      let sq = supabase.from('sessions').select('id');
      if (classId) sq = sq.eq('class_id', classId);
      const { data: sessData } = await sq;
      const sessionIds = (sessData ?? []).map((s) => s.id);
      const total = sessionIds.length;

      if (total === 0) {
        if (!cancelled) { setIssues([]); setTotalSessions(0); setLoading(false); }
        return;
      }

      const cq = async <T,>(fn: (ids: string[]) => any, ids: string[]): Promise<T[]> => {
        const res: T[] = [];
        for (let i = 0; i < ids.length; i += 100) {
          const { data } = await fn(ids.slice(i, i + 100));
          if (data) res.push(...(data as T[]));
        }
        return res;
      };

      const [nav, sub, rst, alloc, brd, rbsRaw] = await Promise.all([
        cq<NavRow>((ids) => supabase.from('navigation_events').select('session_id, tab, time_spent_seconds').in('session_id', ids), sessionIds),
        cq<SubRow>((ids) => supabase.from('submissions').select('session_id, predictive_card_count, contextualise_pairs_count').in('session_id', ids), sessionIds),
        cq<ResetRow>((ids) => supabase.from('resets').select('session_id, reset_type, cards_cleared').in('session_id', ids), sessionIds),
        cq<{ session_id: string }>((ids) => supabase.from('allocation_events').select('session_id').in('session_id', ids), sessionIds),
        cq<BoardRow>((ids) => supabase.from('board_events').select('session_id, sequence_number, evidence_id').in('session_id', ids), sessionIds),
        cq<{ session_id: string; cards: any; written_diagnosis: string | null }>((ids) => supabase.from('reasoning_board_state').select('session_id, cards, written_diagnosis').in('session_id', ids), sessionIds),
      ]);

      const totalSubs = new Set(sub.map((r) => r.session_id)).size;
      const subSessions = new Set(sub.map((r) => r.session_id));

      // Row 1
      const sessRB = new Set(nav.filter((r) => r.tab === 'reasoning_board' || r.tab === 'reasoning').map((r) => r.session_id));
      const pctNeverRB = ((total - sessRB.size) / total) * 100;

      // Row 2
      const pctPredEmpty = totalSubs > 0 ? (new Set(sub.filter((r) => r.predictive_card_count === 0).map((r) => r.session_id)).size / totalSubs) * 100 : 0;

      // Row 4
      const rstCounts = new Map<string, number>();
      rst.filter((r) => r.reset_type === 'board_reset').forEach((r) => {
        rstCounts.set(r.session_id, (rstCounts.get(r.session_id) ?? 0) + 1);
      });
      const resetTwice = [...rstCounts.values()].filter((c) => c >= 2).length;
      const pctResetTwice = (resetTwice / total) * 100;

      // Row 5
      const sessWithAlloc = new Set(alloc.map((r) => r.session_id));
      const submittedNoAlloc = [...subSessions].filter((sid) => !sessWithAlloc.has(sid)).length;
      const pctNoAlloc = totalSubs > 0 ? (submittedNoAlloc / totalSubs) * 100 : 0;

      // Row 6
      const sessMD = new Set(nav.filter((r) => r.tab === 'my_decisions' || r.tab === 'decisions').map((r) => r.session_id));
      const pctNeverMD = ((total - sessMD.size) / total) * 100;

      // Row 7
      const sessWithBoard = new Set(brd.map((r) => r.session_id));
      const firstDrag = new Map<string, { seq: number; eid: string }>();
      brd.forEach((r) => {
        if (r.sequence_number == null || !r.evidence_id) return;
        const ex = firstDrag.get(r.session_id);
        if (!ex || r.sequence_number < ex.seq) firstDrag.set(r.session_id, { seq: r.sequence_number, eid: r.evidence_id });
      });
      const viewsFirst = [...firstDrag.values()].filter((v) => v.eid.includes('_views')).length;
      const pctViewsFirst = sessWithBoard.size > 0 ? (viewsFirst / sessWithBoard.size) * 100 : 0;

      // Row 8
      const sessProChair = new Set(brd.filter((r) => r.evidence_id === 'pro_chair_tiktok').map((r) => r.session_id));
      const pctProChair = sessWithBoard.size > 0 ? (sessProChair.size / sessWithBoard.size) * 100 : 0;

      const results: IssueRow[] = [
        { issue: 'Never reached Reasoning Board', pctAffected: pctNeverRB, threshold: 10, status: getStatus(pctNeverRB, 10), priority: 'P1' },
        { issue: 'Left Predictive quadrant empty', pctAffected: pctPredEmpty, threshold: 35, status: getStatus(pctPredEmpty, 35), priority: 'P1' },
        { issue: 'Never used Contextualise', pctAffected: pctCtxZero, threshold: 40, status: getStatus(pctCtxZero, 40), priority: 'P1' },
        { issue: 'Board reset 2+ times', pctAffected: pctResetTwice, threshold: 15, status: getStatus(pctResetTwice, 15), priority: 'P2' },
        { issue: 'Submitted with 0 allocation changes', pctAffected: pctNoAlloc, threshold: 10, status: getStatus(pctNoAlloc, 10), priority: 'P2' },
        { issue: 'Never visited My Decisions', pctAffected: pctNeverMD, threshold: 15, status: getStatus(pctNeverMD, 15), priority: 'P2' },
        { issue: 'Views item dragged first (framing trap)', pctAffected: pctViewsFirst, threshold: 30, status: getStatus(pctViewsFirst, 30), priority: 'P1' },
        {
          issue: 'Pro Chair TikTok never dragged (BUG-02)', pctAffected: pctProChair, threshold: 5,
          status: getStatus(pctProChair, 5, true), priority: 'P1',
          note: pctProChair >= 5 ? `${pctProChair.toFixed(1)}% of students dragged Pro Chair TikTok — BUG-02 may have been partially fixed. Verify.` : undefined,
        },
      ];

      if (!cancelled) {
        setIssues(results);
        setNavRows(nav);
        setBoardRows(brd);
        setResetRows(rst);
        setTotalSessions(total);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [classId]);

  const p1Confirmed = useMemo(() => issues.filter((i) => i.priority === 'P1' && i.status === 'confirmed').length, [issues]);
  const p2Confirmed = useMemo(() => issues.filter((i) => i.priority === 'P2' && i.status === 'confirmed').length, [issues]);
  const totalConfirmed = p1Confirmed + p2Confirmed;

  if (loading) {
    return <ViewSkeleton metrics={false} charts={1} table />;
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
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          row.priority === 'P1' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                        }`}>
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

      {/* ── THREE CHARTS ─────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <TabTimeChart navRows={navRows} />
        <FirstEvidenceDonut boardRows={boardRows} />
      </div>

      <ResetStats resetRows={resetRows} totalSessions={totalSessions} />
    </div>
  );
}

/* ── Tab Time Chart ────────────────────────────── */
const TAB_MAP: Record<string, { label: string; fill: string }> = {
  home: { label: 'Home', fill: '#888780' },
  my_decisions: { label: 'My Decisions', fill: '#D4A017' },
  decisions: { label: 'My Decisions', fill: '#D4A017' },
  reasoning_board: { label: 'Reasoning Board', fill: '#6B4F8A' },
  reasoning: { label: 'Reasoning Board', fill: '#6B4F8A' },
};

const TAB_ORDER = ['home', 'my_decisions', 'reasoning_board'] as const;

function TabTimeChart({ navRows }: { navRows: NavRow[] }) {
  const data = useMemo(() => {
    // Normalize tab names and aggregate by canonical label
    const sums: Record<string, { total: number; count: number; fill: string }> = {};
    navRows.forEach((r) => {
      const mapped = TAB_MAP[r.tab];
      if (!mapped || r.time_spent_seconds == null) return;
      const key = mapped.label;
      if (!sums[key]) sums[key] = { total: 0, count: 0, fill: mapped.fill };
      sums[key].total += r.time_spent_seconds;
      sums[key].count++;
    });
    return ['Home', 'My Decisions', 'Reasoning Board'].map((label) => {
      const s = sums[label];
      const avgMin = s ? +(s.total / s.count / 60).toFixed(1) : 0;
      const fill = s?.fill ?? '#888780';
      return { tab: label, avgMin, fill };
    });
  }, [navRows]);

  const homeAvg = data.find((d) => d.tab === 'Home')?.avgMin ?? 0;
  const rbAvg = data.find((d) => d.tab === 'Reasoning Board')?.avgMin ?? 0;

  return (
    <Card>
      <CardContent className="pt-5 pb-4">
        <h3 className="text-sm font-semibold text-foreground mb-4">Average time spent per tab</h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data} barCategoryGap="25%">
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
            <XAxis dataKey="tab" tick={{ fontSize: 11 }} />
            <YAxis tickFormatter={(v: number) => `${v}m`} tick={{ fontSize: 11 }} width={35} />
            <Tooltip formatter={(v: number) => `${v} min`} />
            <Bar dataKey="avgMin" name="Avg time" radius={[3, 3, 0, 0]}>
              {data.map((d, i) => <Cell key={i} fill={d.fill} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        {homeAvg > 3 && (
          <div className="flex items-start gap-2 mt-3 p-3 rounded-md bg-amber-50 border border-amber-200">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800">Students are spending a long time on the Home page before starting. Orientation guidance may be needed.</p>
          </div>
        )}
        {rbAvg > 0 && rbAvg < 4 && (
          <div className="flex items-start gap-2 mt-3 p-3 rounded-md bg-amber-50 border border-amber-200">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800">Students spend less than 4 minutes on the Reasoning Board on average — they may be rushing through it.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ── First Evidence Donut ──────────────────────── */
function classifyEvidence(eid: string): string {
  if (eid.includes('_views')) return 'Views';
  if (eid.includes('_revenue')) return 'Revenue';
  if (eid.includes('_profit') || eid.includes('_margin')) return 'Profit';
  return 'Other';
}

const DONUT_COLORS: Record<string, string> = {
  Views: '#C4622D', Revenue: '#4A7C59', Profit: '#6B4F8A', Other: '#888780',
};

function FirstEvidenceDonut({ boardRows }: { boardRows: BoardRow[] }) {
  const data = useMemo(() => {
    const firstDrag = new Map<string, { seq: number; eid: string }>();
    boardRows.forEach((r) => {
      if (r.sequence_number == null || !r.evidence_id) return;
      const ex = firstDrag.get(r.session_id);
      if (!ex || r.sequence_number < ex.seq) firstDrag.set(r.session_id, { seq: r.sequence_number, eid: r.evidence_id });
    });
    const counts: Record<string, number> = { Views: 0, Revenue: 0, Profit: 0, Other: 0 };
    [...firstDrag.values()].forEach((v) => { counts[classifyEvidence(v.eid)]++; });
    return Object.entries(counts)
      .filter(([, v]) => v > 0)
      .map(([name, value]) => ({ name, value, color: DONUT_COLORS[name] }));
  }, [boardRows]);

  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <Card>
      <CardContent className="pt-5 pb-4">
        <h3 className="text-sm font-semibold text-foreground mb-4">First evidence type dragged — views vs. revenue</h3>
        {total === 0 ? (
          <p className="text-xs text-muted-foreground py-8 text-center">No board events data available.</p>
        ) : (
          <>
            <div className="flex justify-center">
              <PieChart width={200} height={200}>
                <Pie data={data} dataKey="value" cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={2} stroke="none">
                  {data.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
                <Tooltip formatter={(v: number) => `${v} (${total > 0 ? ((v / total) * 100).toFixed(0) : 0}%)`} />
              </PieChart>
            </div>
            <div className="flex flex-col gap-2 mt-3">
              {data.map((d) => (
                <div key={d.name} className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: d.color }} />
                  <span>{d.name} first: {d.value} ({total > 0 ? ((d.value / total) * 100).toFixed(0) : 0}%)</span>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

/* ── Reset Stats ───────────────────────────────── */
function ResetStats({ resetRows, totalSessions }: { resetRows: ResetRow[]; totalSessions: number }) {
  const stats = useMemo(() => {
    const boardResets = resetRows.filter((r) => r.reset_type === 'board_reset');
    const allocResets = resetRows.filter((r) => r.reset_type === 'allocation_reset');

    const boardResetCount = boardResets.length;
    const allocResetCount = allocResets.length;

    const sessionsWithBoard2 = new Map<string, number>();
    boardResets.forEach((r) => sessionsWithBoard2.set(r.session_id, (sessionsWithBoard2.get(r.session_id) ?? 0) + 1));
    const reset2Plus = [...sessionsWithBoard2.values()].filter((c) => c >= 2).length;

    const cardsCleared = boardResets.filter((r) => r.cards_cleared != null).map((r) => r.cards_cleared!);
    const avgCards = cardsCleared.length > 0 ? +(cardsCleared.reduce((a, b) => a + b, 0) / cardsCleared.length).toFixed(1) : 0;

    const pctReset2 = totalSessions > 0 ? (reset2Plus / totalSessions) * 100 : 0;

    return { boardResetCount, allocResetCount, reset2Plus, avgCards, pctReset2 };
  }, [resetRows, totalSessions]);

  const CARDS = [
    { label: 'Total board resets', value: stats.boardResetCount, icon: RotateCcw, color: '#C4622D' },
    { label: 'Total allocation resets', value: stats.allocResetCount, icon: RotateCcw, color: '#888780' },
    { label: 'Students who reset board 2+ times', value: stats.reset2Plus, icon: AlertTriangle, color: stats.pctReset2 > 15 ? '#D97706' : '#888780', flagged: stats.pctReset2 > 15 },
    { label: 'Avg cards cleared per board reset', value: stats.avgCards, icon: Clock, color: '#6B4F8A' },
  ];

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-foreground">Reset heatmap</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {CARDS.map((c) => (
          <Card key={c.label} className={c.flagged ? 'border-amber-300 bg-amber-50/50' : ''}>
            <CardContent className="py-4 text-center">
              <c.icon className="h-5 w-5 mx-auto mb-2" style={{ color: c.color }} />
              <p className="text-2xl font-bold" style={{ color: c.color }}>{c.value}</p>
              <p className="text-[10px] text-muted-foreground mt-1">{c.label}</p>
              {c.flagged && (
                <p className="text-[10px] text-amber-700 font-medium mt-1">
                  {stats.pctReset2.toFixed(0)}% of sessions — above 15% threshold
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
