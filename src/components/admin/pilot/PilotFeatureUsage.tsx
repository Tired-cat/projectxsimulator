import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { ArrowUp, ArrowDown } from 'lucide-react';

interface Props { classId: string | null; }

/* ── helpers ───────────────────────────────────── */
async function getSessionIds(classId: string | null): Promise<string[]> {
  let q = supabase.from('sessions').select('id');
  if (classId) q = q.eq('class_id', classId);
  const { data } = await q;
  return (data ?? []).map((s) => s.id);
}

async function chunkedIn<T>(table: string, select: string, sessionIds: string[]): Promise<T[]> {
  if (!sessionIds.length) return [];
  const rows: T[] = [];
  for (let i = 0; i < sessionIds.length; i += 100) {
    const chunk = sessionIds.slice(i, i + 100);
    const { data } = await supabase.from(table).select(select).in('session_id', chunk);
    if (data) rows.push(...(data as T[]));
  }
  return rows;
}

interface SessionRow {
  id: string;
  tutorial_completed: boolean;
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

interface AiFeedbackRow { session_id: string; }
interface BoardEventRow { session_id: string; evidence_type: string | null; }
interface TutorialEventRow { session_id: string; step_number: number | null; action: string; }

function isCorrect(s: SubRow): boolean {
  const tk = s.final_tiktok_spend ?? 9000;
  const np = s.final_newspaper_spend ?? 1000;
  return tk < 9000 && np > 1000;
}

function verdict(delta: number): { label: string; cls: string } {
  if (delta >= 20) return { label: 'Keep · expand', cls: 'bg-[#4A7C59]/15 text-[#4A7C59]' };
  if (delta >= 10) return { label: 'Monitor', cls: 'bg-amber-100 text-amber-700' };
  return { label: 'Investigate', cls: 'bg-muted text-muted-foreground' };
}

export default function PilotFeatureUsage({ classId }: Props) {
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [subs, setSubs] = useState<SubRow[]>([]);
  const [aiFeedbackSessions, setAiFeedbackSessions] = useState<Set<string>>(new Set());
  const [productMixSessions, setProductMixSessions] = useState<Set<string>>(new Set());
  const [tutorialEvents, setTutorialEvents] = useState<TutorialEventRow[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const ids = await getSessionIds(classId);

      // fetch all in parallel
      const [sessData, subData, aiData, boardData, tutData] = await Promise.all([
        chunkedIn<SessionRow>('sessions', 'id, tutorial_completed', ids),
        chunkedIn<SubRow>('submissions', 'session_id, final_tiktok_spend, final_newspaper_spend, contextualise_pairs_count, descriptive_card_count, diagnostic_card_count, prescriptive_card_count, predictive_card_count', ids),
        chunkedIn<AiFeedbackRow>('ai_feedback_events', 'session_id', ids),
        chunkedIn<BoardEventRow>('board_events', 'session_id, evidence_type', ids),
        chunkedIn<TutorialEventRow>('tutorial_events', 'session_id, step_number, action', ids),
      ]);

      if (!cancelled) {
        setSessions(sessData);
        setSubs(subData);
        setAiFeedbackSessions(new Set(aiData.map((r) => r.session_id)));
        setProductMixSessions(new Set(
          boardData.filter((r) => r.evidence_type === 'product_mix').map((r) => r.session_id)
        ));
        setTutorialEvents(tutData);
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

    // Row 2 — Contextualise
    const contextIds = new Set(subs.filter((s) => s.contextualise_pairs_count > 0).map((s) => s.session_id));

    // Row 3 — AI feedback
    // aiFeedbackSessions already a Set

    // Row 4 — Product mix
    // productMixSessions already a Set

    // Row 5 — All 4 quadrants
    const allQuadIds = new Set(
      subs.filter((s) =>
        s.descriptive_card_count > 0 && s.diagnostic_card_count > 0 &&
        s.prescriptive_card_count > 0 && s.predictive_card_count > 0
      ).map((s) => s.session_id)
    );

    return [
      calcRow('Tutorial completed', tutCompletedIds),
      calcRow('Contextualise mechanic', contextIds),
      calcRow('AI feedback', aiFeedbackSessions),
      calcRow('Product mix analysis', productMixSessions),
      calcRow('All 4 quadrants filled', allQuadIds),
    ];
  }, [sessions, subs, aiFeedbackSessions, productMixSessions]);

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
    return <div className="flex items-center justify-center h-64 text-sm text-muted-foreground">Loading feature usage data…</div>;
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
    </div>
  );
}
