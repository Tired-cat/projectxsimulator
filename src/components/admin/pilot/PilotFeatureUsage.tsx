import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { ViewSkeleton, EmptyState } from './PilotSkeletons';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { ArrowUp, ArrowDown, AlertTriangle, CheckCircle } from 'lucide-react';

interface Props { classId: string | null; }

/* ── helpers ───────────────────────────────────── */
async function getSessionIds(classId: string | null): Promise<string[]> {
  let q = supabase.from('sessions').select('id');
  if (classId) q = q.eq('class_id', classId);
  const { data } = await q;
  return (data ?? []).map((s) => s.id);
}

async function chunked<T>(
  fn: (chunk: string[]) => PromiseLike<{ data: T[] | null }>,
  ids: string[],
): Promise<T[]> {
  if (!ids.length) return [];
  const rows: T[] = [];
  for (let i = 0; i < ids.length; i += 100) {
    const c = ids.slice(i, i + 100);
    const { data } = await fn(c);
    if (data) rows.push(...data);
  }
  return rows;
}

interface SessionRow {
  id: string;
  tutorial_completed: boolean;
  tutorial_opened: boolean;
}

interface SubRow {
  session_id: string;
  final_tiktok_spend: number | null;
  final_newspaper_spend: number | null;
  contextualise_pairs_count: number;
  descriptive_card_count: number;
  diagnostic_card_count: number;
  prescriptive_card_count: number;
  predictive_card_count: number;
}

interface AiFeedbackRow { session_id: string; post_feedback_action: string | null; }
interface BoardEventRow { session_id: string; evidence_type: string | null; }
interface TutorialEventRow { session_id: string; step_number: number | null; action: string; }
interface BoardStateRow { session_id: string; cards: any; written_diagnosis: string | null; }

function isCorrect(s: SubRow): boolean {
  const tk = s.final_tiktok_spend ?? 9000;
  const np = s.final_newspaper_spend ?? 1000;
  return tk <= 9000 && np >= 1000;
}

function verdict(delta: number): { label: string; cls: string } {
  if (delta >= 20) return { label: 'Keep · expand', cls: 'bg-[#4A7C59]/15 text-[#4A7C59]' };
  if (delta >= 10) return { label: 'Monitor', cls: 'bg-amber-100 text-amber-700' };
  return { label: 'Investigate', cls: 'bg-muted text-muted-foreground' };
}

/* ── Comparison Charts ─────────────────────────── */
function ComparisonCharts({ sessions, subs, subBySession }: {
  sessions: SessionRow[];
  subs: SubRow[];
  subBySession: Map<string, SubRow>;
}) {
  const tutorialData = useMemo(() => {
    const groups = { Completed: { correct: 0, total: 0 }, Abandoned: { correct: 0, total: 0 }, Skipped: { correct: 0, total: 0 } };
    sessions.forEach((s) => {
      const sub = subBySession.get(s.id);
      if (!sub) return;
      const bucket: keyof typeof groups = s.tutorial_completed ? 'Completed' : s.tutorial_opened ? 'Abandoned' : 'Skipped';
      groups[bucket].total++;
      if (isCorrect(sub)) groups[bucket].correct++;
    });
    return [
      { status: 'Completed', rate: groups.Completed.total > 0 ? (groups.Completed.correct / groups.Completed.total) * 100 : 0, fill: '#4A7C59' },
      { status: 'Abandoned', rate: groups.Abandoned.total > 0 ? (groups.Abandoned.correct / groups.Abandoned.total) * 100 : 0, fill: '#D4A017' },
      { status: 'Skipped', rate: groups.Skipped.total > 0 ? (groups.Skipped.correct / groups.Skipped.total) * 100 : 0, fill: '#C4622D' },
    ];
  }, [sessions, subBySession]);

  const contextData = useMemo(() => {
    let usedCorrect = 0, usedTotal = 0, notCorrect = 0, notTotal = 0;
    subs.forEach((s) => {
      if (s.contextualise_pairs_count > 0) { usedTotal++; if (isCorrect(s)) usedCorrect++; }
      else { notTotal++; if (isCorrect(s)) notCorrect++; }
    });
    const usedRate = usedTotal > 0 ? (usedCorrect / usedTotal) * 100 : 0;
    const notRate = notTotal > 0 ? (notCorrect / notTotal) * 100 : 0;
    return { bars: [{ label: 'Used Contextualise', rate: usedRate, fill: '#4A7C59' }, { label: 'Did not use', rate: notRate, fill: '#C4622D' }], gap: usedRate - notRate };
  }, [subs]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card>
        <CardContent className="pt-5 pb-4">
          <h3 className="text-sm font-semibold text-foreground mb-4">Correct decision rate by tutorial status</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={tutorialData} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis dataKey="status" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 100]} tickFormatter={(v: number) => `${v}%`} tick={{ fontSize: 11 }} width={40} />
              <Tooltip formatter={(v: number) => `${v.toFixed(1)}%`} />
              <Bar dataKey="rate" name="Correct rate" radius={[3, 3, 0, 0]}>
                {tutorialData.map((d, i) => <Cell key={i} fill={d.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="flex items-center gap-4 mt-3 justify-center">
            {[{ label: 'Completed', color: '#4A7C59' }, { label: 'Abandoned', color: '#D4A017' }, { label: 'Skipped', color: '#C4622D' }].map((l) => (
              <div key={l.label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: l.color }} />
                {l.label}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-5 pb-4">
          <h3 className="text-sm font-semibold text-foreground mb-4">Correct decision rate by Contextualise usage</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={contextData.bars} barCategoryGap="40%">
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 100]} tickFormatter={(v: number) => `${v}%`} tick={{ fontSize: 11 }} width={40} />
              <Tooltip formatter={(v: number) => `${v.toFixed(1)}%`} />
              <Bar dataKey="rate" name="Correct rate" radius={[3, 3, 0, 0]}>
                {contextData.bars.map((d, i) => <Cell key={i} fill={d.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <p className="text-xs text-muted-foreground mt-3">
            Students who used Contextualise were <span className="font-semibold text-foreground">{Math.abs(contextData.gap).toFixed(0)}pp</span> {contextData.gap >= 0 ? 'more' : 'less'} likely to make the correct decision.
          </p>
          {contextData.gap >= 20 && (
            <div className="flex items-start gap-2 mt-2 p-3 rounded-md bg-[#4A7C59]/10 border border-[#4A7C59]/20">
              <CheckCircle className="h-4 w-4 shrink-0 mt-0.5" style={{ color: '#4A7C59' }} />
              <p className="text-xs" style={{ color: '#4A7C59' }}>Contextualise is having a meaningful impact. Consider making it more prominent.</p>
            </div>
          )}
          {contextData.gap < 10 && (
            <div className="flex items-start gap-2 mt-2 p-3 rounded-md bg-amber-50 border border-amber-200">
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800">Contextualise is not significantly changing outcomes. Investigate whether students understand how to use it.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function PilotFeatureUsage({ classId }: Props) {
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [subs, setSubs] = useState<SubRow[]>([]);
  const [aiFeedbackRows, setAiFeedbackRows] = useState<AiFeedbackRow[]>([]);
  const [productMixSessions, setProductMixSessions] = useState<Set<string>>(new Set());
  const [tutorialEvents, setTutorialEvents] = useState<TutorialEventRow[]>([]);
  const [boardStates, setBoardStates] = useState<BoardStateRow[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const ids = await getSessionIds(classId);

      const [sessData, subData, aiData, boardData, tutData, bsData] = await Promise.all([
        chunked<SessionRow>((c) => supabase.from('sessions').select('id, tutorial_completed, tutorial_opened').in('id', c), ids),
        chunked<SubRow>((c) => supabase.from('submissions').select('session_id, final_tiktok_spend, final_newspaper_spend, contextualise_pairs_count, descriptive_card_count, diagnostic_card_count, prescriptive_card_count, predictive_card_count').in('session_id', c), ids),
        chunked<AiFeedbackRow>((c) => supabase.from('ai_feedback_events').select('session_id, post_feedback_action').in('session_id', c), ids),
        chunked<BoardEventRow>((c) => supabase.from('board_events').select('session_id, evidence_type').in('session_id', c), ids),
        chunked<TutorialEventRow>((c) => supabase.from('tutorial_events').select('session_id, step_number, action').in('session_id', c), ids),
        chunked<BoardStateRow>((c) => supabase.from('reasoning_board_state').select('session_id, cards, written_diagnosis').in('session_id', c), ids),
      ]);

      if (!cancelled) {
        setSessions(sessData);
        setSubs(subData);
        setAiFeedbackRows(aiData);
        setProductMixSessions(new Set(
          boardData.filter((r) => r.evidence_type === 'product_mix').map((r) => r.session_id)
        ));
        setTutorialEvents(tutData);
        setBoardStates(bsData);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [classId]);

  /* ── build sub lookup by session ─────────────── */
  const subBySession = useMemo(() => {
    const m = new Map<string, SubRow>();
    subs.forEach((s) => m.set(s.session_id, s));
    return m;
  }, [subs]);

  const sessionSet = useMemo(() => new Set(sessions.map((s) => s.id)), [sessions]);

  /* ── board state lookups ──────────────────────── */
  const boardStateBySession = useMemo(() => {
    const m = new Map<string, BoardStateRow>();
    boardStates.forEach((b) => m.set(b.session_id, b));
    return m;
  }, [boardStates]);

  /* ── helper: count annotations in a cards JSONB ─ */
  function countAnnotations(cards: any): { annotated: number; totalSlots: number } {
    let annotated = 0;
    let totalSlots = 0;
    if (cards && typeof cards === 'object' && !Array.isArray(cards)) {
      for (const quadrant of Object.values(cards as Record<string, any>)) {
        if (Array.isArray(quadrant)) {
          const slotsInQuadrant = Math.min(quadrant.length, 2);
          totalSlots += slotsInQuadrant;
          for (let i = 0; i < slotsInQuadrant; i++) {
            const chip = quadrant[i];
            if (chip && typeof chip.annotation === 'string' && chip.annotation.trim().length > 0) {
              annotated++;
            }
          }
        }
      }
    }
    return { annotated, totalSlots };
  }

  /* ── feature matrix rows ─────────────────────── */
  const matrixRows = useMemo(() => {
    const totalSessions = sessions.length;
    if (totalSessions === 0) return [];

    const pct = (n: number, d: number) => (d > 0 ? (n / d) * 100 : 0);

    function calcRow(
      label: string,
      userSessionIds: Set<string>,
    ) {
      const usedBy = pct(userSessionIds.size, totalSessions);
      let userCorrect = 0, userTotal = 0, nonUserCorrect = 0, nonUserTotal = 0;
      subs.forEach((s) => {
        if (userSessionIds.has(s.session_id)) {
          userTotal++;
          if (isCorrect(s)) userCorrect++;
        } else {
          nonUserTotal++;
          if (isCorrect(s)) nonUserCorrect++;
        }
      });
      const crUser = pct(userCorrect, userTotal);
      const crNon = pct(nonUserCorrect, nonUserTotal);
      const delta = crUser - crNon;
      return { label, usedBy, crUser, crNon, delta, verdict: verdict(delta) };
    }

    // Row 1 — Tutorial completed
    const tutCompletedIds = new Set(sessions.filter((s) => s.tutorial_completed).map((s) => s.id));

    // Row 2 — Adjusted after feedback (post_feedback_action = 'adjusted')
    const adjustedIds = new Set(
      aiFeedbackRows.filter((r) => r.post_feedback_action === 'adjusted').map((r) => r.session_id)
    );
    const submittedImmediatelyIds = new Set(
      aiFeedbackRows.filter((r) => r.post_feedback_action === 'submitted_immediately').map((r) => r.session_id)
    );
    // Custom calc for adjusted: non-users = submitted_immediately (not "everyone else")
    const adjustedRow = (() => {
      const usedBy = pct(adjustedIds.size, totalSessions);
      let adjCorrect = 0, adjTotal = 0, immCorrect = 0, immTotal = 0;
      subs.forEach((s) => {
        if (adjustedIds.has(s.session_id)) {
          adjTotal++; if (isCorrect(s)) adjCorrect++;
        } else if (submittedImmediatelyIds.has(s.session_id)) {
          immTotal++; if (isCorrect(s)) immCorrect++;
        }
      });
      const crUser = pct(adjCorrect, adjTotal);
      const crNon = pct(immCorrect, immTotal);
      const delta = crUser - crNon;
      return { label: 'Adjusted after feedback', usedBy, crUser, crNon, delta, verdict: verdict(delta) };
    })();

    // Row 3 — Product mix
    // Row 4 — All 4 quadrants
    const allQuadIds = new Set(
      subs.filter((s) =>
        s.descriptive_card_count > 0 && s.diagnostic_card_count > 0 &&
        s.prescriptive_card_count > 0 && s.predictive_card_count > 0
      ).map((s) => s.session_id)
    );

    // Row 5 — Contextual Notes used (at least 1 annotation)
    const annotatedIds = new Set<string>();
    const allSlotIds = new Set<string>();
    boardStates.forEach((b) => {
      const { annotated, totalSlots } = countAnnotations(b.cards);
      if (annotated > 0) annotatedIds.add(b.session_id);
      if (totalSlots > 0 && annotated >= totalSlots) allSlotIds.add(b.session_id);
    });

    // Row 6 — Written diagnosis generated
    const diagnosisIds = new Set(
      boardStates.filter((b) => b.written_diagnosis && typeof b.written_diagnosis === 'string' && b.written_diagnosis.trim().length > 0)
        .map((b) => b.session_id)
    );

    // Row 7 — All annotation slots used

    return [
      calcRow('Tutorial completed', tutCompletedIds),
      adjustedRow,
      calcRow('Product mix analysis', productMixSessions),
      calcRow('All 4 quadrants filled', allQuadIds),
      calcRow('Contextual Notes used', annotatedIds),
      calcRow('Written diagnosis generated', diagnosisIds),
      calcRow('All annotation slots used', allSlotIds),
    ];
  }, [sessions, subs, aiFeedbackRows, productMixSessions, boardStates]);

  /* ── tutorial step drop-off ──────────────────── */
  const tutorialChartData = useMemo(() => {
    const viewed = new Map<number, number>();
    const skipped = new Map<number, number>();

    tutorialEvents.forEach((e) => {
      const step = e.step_number;
      if (step == null) return;
      if (e.action === 'step_viewed') viewed.set(step, (viewed.get(step) ?? 0) + 1);
      if (e.action === 'skipped') skipped.set(step, (skipped.get(step) ?? 0) + 1);
    });

    const maxStep = Math.max(...[...viewed.keys(), ...skipped.keys()], 0);
    if (maxStep === 0) return [];

    return Array.from({ length: maxStep }, (_, i) => {
      const s = i + 1;
      return { step: `Step ${s}`, reached: viewed.get(s) ?? 0, abandoned: skipped.get(s) ?? 0 };
    });
  }, [tutorialEvents]);

  const biggestDrop = useMemo(() => {
    if (tutorialChartData.length < 2) return null;
    let maxDrop = 0, maxStep = 0;
    for (let i = 1; i < tutorialChartData.length; i++) {
      const drop = tutorialChartData[i - 1].reached - tutorialChartData[i].reached;
      if (drop > maxDrop) { maxDrop = drop; maxStep = i + 1; }
    }
    // also check abandoned counts
    tutorialChartData.forEach((d, i) => {
      if (d.abandoned > maxDrop) { maxDrop = d.abandoned; maxStep = i + 1; }
    });
    return maxDrop > 0 ? { step: maxStep, count: maxDrop } : null;
  }, [tutorialChartData]);

  if (loading) {
    return <ViewSkeleton metrics={false} charts={1} table />;
  }

  if (matrixRows.length === 0 && tutorialChartData.length === 0) {
    return <EmptyState message="No data yet — this will populate once students start using the simulation." />;
  }

  return (
    <div className="space-y-6">
      {/* ── FEATURE USAGE MATRIX ─────────────────── */}
      <Card>
        <CardContent className="pt-5 pb-4">
          <h3 className="text-sm font-semibold text-foreground mb-4">Feature usage matrix</h3>
          {matrixRows.length === 0 ? (
            <p className="text-xs text-muted-foreground">No session data available.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Feature</TableHead>
                  <TableHead className="text-xs text-right">Used by</TableHead>
                  <TableHead className="text-xs text-right">Correct rate (users)</TableHead>
                  <TableHead className="text-xs text-right">Correct rate (non-users)</TableHead>
                  <TableHead className="text-xs text-right">Delta</TableHead>
                  <TableHead className="text-xs">Verdict</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {matrixRows.map((row) => (
                  <TableRow key={row.label}>
                    <TableCell className="text-xs font-medium">{row.label}</TableCell>
                    <TableCell className="text-xs text-right">{row.usedBy.toFixed(0)}%</TableCell>
                    <TableCell className="text-xs text-right">{row.crUser.toFixed(0)}%</TableCell>
                    <TableCell className="text-xs text-right">{row.crNon.toFixed(0)}%</TableCell>
                    <TableCell className="text-xs text-right">
                      <span className={`inline-flex items-center gap-0.5 ${row.delta >= 0 ? 'text-[#4A7C59]' : 'text-[#C4622D]'}`}>
                        {row.delta >= 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                        {Math.abs(row.delta).toFixed(0)}pp
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${row.verdict.cls}`}>
                        {row.verdict.label}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* ── TUTORIAL STEP DROP-OFF ───────────────── */}
      <Card>
        <CardContent className="pt-5 pb-4">
          <h3 className="text-sm font-semibold text-foreground mb-4">Tutorial step drop-off</h3>
          {tutorialChartData.length === 0 ? (
            <p className="text-xs text-muted-foreground">No tutorial event data available.</p>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={tutorialChartData} barCategoryGap="25%">
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="step" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={35} />
                  <Tooltip />
                  <Bar dataKey="reached" name="Reached step" fill="#6B4F8A" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="abandoned" name="Abandoned here" fill="#C4622D" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              {/* legend */}
              <div className="flex items-center gap-4 mt-3 justify-center">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: '#6B4F8A' }} />
                  Reached step
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: '#C4622D' }} />
                  Abandoned here
                </div>
              </div>
              {biggestDrop && (
                <p className="text-xs text-muted-foreground mt-3">
                  Largest drop at <span className="font-semibold text-foreground">Step {biggestDrop.step}</span> — {biggestDrop.count} student{biggestDrop.count !== 1 ? 's' : ''} abandoned here.
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>
      {/* ── COMPARISON CHARTS ────────────────────── */}
      <ComparisonCharts sessions={sessions} subs={subs} subBySession={subBySession} />
    </div>
  );
}
