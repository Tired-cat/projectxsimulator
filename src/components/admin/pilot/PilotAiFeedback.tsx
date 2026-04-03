import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { ViewSkeleton } from './PilotSkeletons';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, ReferenceLine,
} from 'recharts';
import { MessageSquare, Timer, CheckCircle, Send, AlertTriangle, FileText } from 'lucide-react';

interface Props { classId: string | null; }

interface AiRow {
  session_id: string;
  post_feedback_action: string | null;
  time_adjusting_seconds: number | null;
  descriptive_cards_before: number;
  diagnostic_cards_before: number;
  prescriptive_cards_before: number;
  predictive_cards_before: number;
  descriptive_cards_after: number | null;
  diagnostic_cards_after: number | null;
  prescriptive_cards_after: number | null;
  predictive_cards_after: number | null;
  tiktok_spend_before: number | null;
  tiktok_spend_after: number | null;
  newspaper_spend_before: number | null;
  newspaper_spend_after: number | null;
  ai_feedback_text: string | null;
}

interface SubRow {
  session_id: string;
  final_tiktok_spend: number | null;
  final_newspaper_spend: number | null;
}

const QUAD_COLORS: Record<string, string> = {
  Descriptive: '#D4A017', Diagnostic: '#C4622D', Prescriptive: '#4A7C59', Predictive: '#6B4F8A',
};

function parseAiFeedback(text: string | null): { budgetFeedback?: string; reasoningFeedback?: string; diagnosisFeedback?: string; overallNudge?: string } | null {
  if (!text) return null;
  try {
    const parsed = JSON.parse(text);
    if (typeof parsed === 'object' && parsed !== null) return parsed;
  } catch { /* fall through */ }
  return null;
}

function wordCount(s: string | undefined | null): number {
  if (!s || typeof s !== 'string') return 0;
  return s.trim().split(/\s+/).filter(Boolean).length;
}

function isCorrectDecision(sub: SubRow): boolean {
  return (sub.final_tiktok_spend != null && sub.final_tiktok_spend < 9000) &&
         (sub.final_newspaper_spend != null && sub.final_newspaper_spend > 1000);
}

export default function PilotAiFeedback({ classId }: Props) {
  const [rows, setRows] = useState<AiRow[]>([]);
  const [subs, setSubs] = useState<SubRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);

      // get session ids
      let sq = supabase.from('sessions').select('id');
      if (classId) sq = sq.eq('class_id', classId);
      const { data: sessData } = await sq;
      const ids = (sessData ?? []).map((s) => s.id);

      // fetch ai_feedback_events + submissions in parallel
      const aiRows: AiRow[] = [];
      const subRows: SubRow[] = [];
      const fetchAi = async () => {
        for (let i = 0; i < ids.length; i += 100) {
          const chunk = ids.slice(i, i + 100);
          const { data } = await supabase
            .from('ai_feedback_events')
            .select('session_id, post_feedback_action, time_adjusting_seconds, descriptive_cards_before, diagnostic_cards_before, prescriptive_cards_before, predictive_cards_before, descriptive_cards_after, diagnostic_cards_after, prescriptive_cards_after, predictive_cards_after, tiktok_spend_before, tiktok_spend_after, newspaper_spend_before, newspaper_spend_after, ai_feedback_text')
            .in('session_id', chunk);
          if (data) aiRows.push(...(data as AiRow[]));
        }
      };
      const fetchSubs = async () => {
        for (let i = 0; i < ids.length; i += 100) {
          const chunk = ids.slice(i, i + 100);
          const { data } = await supabase
            .from('submissions')
            .select('session_id, final_tiktok_spend, final_newspaper_spend')
            .in('session_id', chunk);
          if (data) subRows.push(...(data as SubRow[]));
        }
      };
      await Promise.all([fetchAi(), fetchSubs()]);

      if (!cancelled) {
        setRows(aiRows);
        setSubs(subRows);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [classId]);

  const adjusted = useMemo(() => rows.filter((r) => r.post_feedback_action === 'adjusted'), [rows]);
  const submitted = useMemo(() => rows.filter((r) => r.post_feedback_action === 'submitted_immediately'), [rows]);

  const pctAdjusted = rows.length > 0 ? ((adjusted.length / rows.length) * 100).toFixed(0) : '0';
  const pctSubmitted = rows.length > 0 ? ((submitted.length / rows.length) * 100).toFixed(0) : '0';

  const avgAdjustTime = useMemo(() => {
    const times = adjusted.filter((r) => r.time_adjusting_seconds != null).map((r) => r.time_adjusting_seconds!);
    if (!times.length) return 0;
    return times.reduce((a, b) => a + b, 0) / times.length / 60;
  }, [adjusted]);

  // board state delta — only rows where board_state_after is populated and at least one _after > 0
  const deltaData = useMemo(() => {
    const withAfter = rows.filter((r) =>
      r.descriptive_cards_after != null &&
      r.diagnostic_cards_after != null &&
      r.prescriptive_cards_after != null &&
      r.predictive_cards_after != null &&
      ((r.descriptive_cards_after ?? 0) > 0 || (r.diagnostic_cards_after ?? 0) > 0 || (r.prescriptive_cards_after ?? 0) > 0 || (r.predictive_cards_after ?? 0) > 0)
    );
    if (!withAfter.length) return [];
    const quads = ['Descriptive', 'Diagnostic', 'Prescriptive', 'Predictive'] as const;
    return quads.map((q) => {
      const beforeKey = `${q.toLowerCase()}_cards_before` as keyof AiRow;
      const afterKey = `${q.toLowerCase()}_cards_after` as keyof AiRow;
      const sum = withAfter.reduce((s, r) => s + ((r[afterKey] as number ?? 0) - (r[beforeKey] as number)), 0);
      return { quadrant: q, delta: +(sum / withAfter.length).toFixed(2), fill: QUAD_COLORS[q] };
    });
  }, [rows]);

  const predictiveHighest = useMemo(() => {
    if (!deltaData.length) return false;
    const pred = deltaData.find((d) => d.quadrant === 'Predictive');
    if (!pred || pred.delta <= 0) return false;
    return deltaData.every((d) => d.quadrant === 'Predictive' || d.delta <= pred.delta);
  }, [deltaData]);

  // donut
  const donutData = [
    { name: 'Adjusted', value: adjusted.length, color: '#4A7C59' },
    { name: 'Submitted immediately', value: submitted.length, color: '#888780' },
  ];
  const donutTotal = adjusted.length + submitted.length;

  // ── Annotation metrics ──
  const parsedFeedbacks = useMemo(() =>
    rows.map((r) => ({ session_id: r.session_id, parsed: parseAiFeedback(r.ai_feedback_text) })),
    [rows]
  );

  const annotationMetrics = useMemo(() => {
    if (!rows.length) return null;

    // Card 1: Annotations reached AI — diagnosisFeedback is non-empty
    const withDiagnosisFeedback = parsedFeedbacks.filter((r) => {
      const df = r.parsed?.diagnosisFeedback;
      return df && typeof df === 'string' && df.trim().length > 0;
    });
    const pctReached = Math.round((withDiagnosisFeedback.length / rows.length) * 100);

    // Card 2: Diagnosis feedback substantive (> 30 words)
    const substantiveDiagnosis = parsedFeedbacks.filter((r) => wordCount(r.parsed?.diagnosisFeedback) > 30);
    const pctSubstantive = Math.round((substantiveDiagnosis.length / rows.length) * 100);

    // Card 3: Correct decision rate — substantive vs thin/absent
    const subMap = new Map(subs.map((s) => [s.session_id, s]));
    const substantiveSessionIds = new Set(substantiveDiagnosis.map((r) => r.session_id));
    const thinSessionIds = new Set(
      parsedFeedbacks.filter((r) => !substantiveSessionIds.has(r.session_id)).map((r) => r.session_id)
    );

    const correctInSubstantive = [...substantiveSessionIds].filter((sid) => {
      const sub = subMap.get(sid);
      return sub && isCorrectDecision(sub);
    }).length;
    const correctInThin = [...thinSessionIds].filter((sid) => {
      const sub = subMap.get(sid);
      return sub && isCorrectDecision(sub);
    }).length;

    const pctCorrectSubstantive = substantiveSessionIds.size > 0 ? Math.round((correctInSubstantive / substantiveSessionIds.size) * 100) : 0;
    const pctCorrectThin = thinSessionIds.size > 0 ? Math.round((correctInThin / thinSessionIds.size) * 100) : 0;

    return { pctReached, pctSubstantive, pctCorrectSubstantive, pctCorrectThin, substantiveCount: substantiveSessionIds.size, thinCount: thinSessionIds.size };
  }, [rows, parsedFeedbacks, subs]);

  // ── Field analysis chart ──
  const fieldAnalysis = useMemo(() => {
    if (!parsedFeedbacks.length) return [];
    const fields = [
      { key: 'budgetFeedback' as const, label: 'Budget allocation', fill: '#888780' },
      { key: 'reasoningFeedback' as const, label: 'Reasoning board', fill: '#6B4F8A' },
      { key: 'diagnosisFeedback' as const, label: 'Written diagnosis', fill: '#D4A017' },
      { key: 'overallNudge' as const, label: 'Overall nudge', fill: '#4A7C59' },
    ];
    const total = parsedFeedbacks.length;
    return fields.map((f) => {
      const substantive = parsedFeedbacks.filter((r) => wordCount(r.parsed?.[f.key]) > 30).length;
      return { field: f.label, pct: total > 0 ? Math.round((substantive / total) * 100) : 0, fill: f.fill };
    });
  }, [parsedFeedbacks]);

  const diagnosisSubstantiveRate = fieldAnalysis.find((f) => f.field === 'Written diagnosis')?.pct ?? 0;

  if (loading) {
    return <ViewSkeleton metrics charts={2} />;
  }

  if (rows.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-12 text-center">
          <MessageSquare className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No students have requested AI feedback yet. This view will populate once students use the feedback button.</p>
        </CardContent>
      </Card>
    );
  }

  const METRICS = [
    { label: 'Adjusted after feedback', value: `${pctAdjusted}%`, sub: `${adjusted.length} event${adjusted.length !== 1 ? 's' : ''}`, icon: CheckCircle, color: '#4A7C59' },
    { label: 'Submitted immediately', value: `${pctSubmitted}%`, sub: `${submitted.length} event${submitted.length !== 1 ? 's' : ''}`, icon: Send, color: '#888780' },
    { label: 'Avg adjust time', value: `${avgAdjustTime.toFixed(1)} min`, sub: 'after seeing feedback', icon: Timer, color: '#D4A017' },
  ];

  return (
    <div className="space-y-6">
      {/* ── METRIC CARDS ─────────────────────────── */}
      <div className="grid grid-cols-3 gap-4">
        {METRICS.map((m) => (
          <Card key={m.label}>
            <CardContent className="py-4 text-center">
              <m.icon className="h-5 w-5 mx-auto mb-2" style={{ color: m.color }} />
              <p className="text-2xl font-bold" style={{ color: m.color }}>{m.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{m.label}</p>
              <p className="text-[10px] text-muted-foreground">{m.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── TWO CHARTS ───────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Board state delta */}
        <Card>
          <CardContent className="pt-5 pb-4">
            <h3 className="text-sm font-semibold text-foreground mb-1">Average cards added per quadrant after AI feedback</h3>
            <p className="text-[10px] text-muted-foreground mb-4">Positive values = students added evidence to that quadrant after seeing feedback</p>
            {deltaData.length === 0 ? (
              <p className="text-xs text-muted-foreground py-8 text-center">No adjusted sessions with after-state data.</p>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={deltaData} barCategoryGap="25%">
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="quadrant" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} width={35} />
                    <ReferenceLine y={0} stroke="hsl(var(--border))" />
                    <Tooltip formatter={(v: number) => `${v.toFixed(2)} cards`} />
                    <Bar dataKey="delta" name="Avg cards added" radius={[3, 3, 0, 0]}>
                      {deltaData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                {predictiveHighest && (
                  <div className="flex items-start gap-2 mt-3 p-3 rounded-md bg-[#6B4F8A]/10 border border-[#6B4F8A]/20">
                    <CheckCircle className="h-4 w-4 shrink-0 mt-0.5" style={{ color: '#6B4F8A' }} />
                    <p className="text-xs" style={{ color: '#6B4F8A' }}>Students most commonly added a Predictive card after feedback — this is the quadrant they consistently skip.</p>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Post-feedback action donut */}
        <Card>
          <CardContent className="pt-5 pb-4">
            <h3 className="text-sm font-semibold text-foreground mb-4">What students did after seeing feedback</h3>
            <div className="flex justify-center">
              <PieChart width={220} height={220}>
                <Pie
                  data={donutData}
                  dataKey="value"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={95}
                  paddingAngle={2}
                  stroke="none"
                >
                  {donutData.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
                <Tooltip formatter={(v: number) => `${v} (${donutTotal > 0 ? ((v / donutTotal) * 100).toFixed(0) : 0}%)`} />
              </PieChart>
            </div>
            <div className="flex flex-col gap-2 mt-3">
              {donutData.map((d) => (
                <div key={d.name} className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: d.color }} />
                  <span>{d.name}: {d.value} ({donutTotal > 0 ? ((d.value / donutTotal) * 100).toFixed(0) : 0}%)</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── ALLOCATION DELTA AFTER FEEDBACK ──────── */}
      <AllocationDeltaChart rows={rows} />

      {/* ── SECTION 1: Written diagnosis in AI feedback ── */}
      {annotationMetrics && (
        <>
          <h3 className="text-sm font-semibold text-foreground pt-2">Written diagnosis in AI feedback</h3>
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="py-4 text-center">
                <FileText className="h-5 w-5 mx-auto mb-2" style={{ color: '#D4A017' }} />
                <p className="text-2xl font-bold" style={{ color: '#D4A017' }}>{annotationMetrics.pctReached}%</p>
                <p className="text-xs text-muted-foreground mt-1">Annotations reached AI</p>
                <p className="text-[10px] text-muted-foreground">diagnosisFeedback non-empty</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-4 text-center">
                <MessageSquare className="h-5 w-5 mx-auto mb-2" style={{ color: '#6B4F8A' }} />
                <p className="text-2xl font-bold" style={{ color: '#6B4F8A' }}>{annotationMetrics.pctSubstantive}%</p>
                <p className="text-xs text-muted-foreground mt-1">Diagnosis feedback substantive</p>
                <p className="text-[10px] text-muted-foreground">&gt; 30 words in diagnosisFeedback</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-4 text-center">
                <CheckCircle className="h-5 w-5 mx-auto mb-2" style={{ color: '#4A7C59' }} />
                <p className="text-2xl font-bold" style={{ color: '#4A7C59' }}>
                  {annotationMetrics.pctCorrectSubstantive}% <span className="text-base font-normal text-muted-foreground">vs</span> {annotationMetrics.pctCorrectThin}%
                </p>
                <p className="text-xs text-muted-foreground mt-1">Annotation → correct decision</p>
                <p className="text-[10px] text-muted-foreground">
                  substantive (n={annotationMetrics.substantiveCount}) vs thin/absent (n={annotationMetrics.thinCount})
                </p>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* ── SECTION 2: AI response field analysis ── */}
      {fieldAnalysis.length > 0 && (
        <Card>
          <CardContent className="pt-5 pb-4">
            <h3 className="text-sm font-semibold text-foreground mb-1">Which feedback sections are substantive?</h3>
            <p className="text-[10px] text-muted-foreground mb-4">% of sessions where field has &gt; 30 words</p>
            <div style={{ height: 180 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={fieldAnalysis} barCategoryGap="25%">
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="field" tick={{ fontSize: 10 }} />
                  <YAxis tickFormatter={(v: number) => `${v}%`} tick={{ fontSize: 11 }} width={40} domain={[0, 100]} />
                  <Tooltip formatter={(v: number) => `${v}%`} />
                  <Bar dataKey="pct" name="Substantive %" radius={[3, 3, 0, 0]}>
                    {fieldAnalysis.map((d, i) => <Cell key={i} fill={d.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            {diagnosisSubstantiveRate < 40 && (
              <div className="flex items-start gap-2 mt-3 p-3 rounded-md bg-amber-50 border border-amber-200">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-800">
                  The written diagnosis section of AI feedback is often thin. Students' annotations may not be giving the AI enough context to respond to — check whether written_diagnosis is reaching the edge function.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}




/* ── Allocation Delta After Feedback ───────────── */
function AllocationDeltaChart({ rows }: { rows: AiRow[] }) {
  const data = useMemo(() => {
    const adjusted = rows.filter((r) => r.post_feedback_action === 'adjusted' && r.tiktok_spend_after != null);
    if (!adjusted.length) return null;
    const avgTkBefore = adjusted.reduce((s, r) => s + (r.tiktok_spend_before ?? 9000), 0) / adjusted.length;
    const avgTkAfter = adjusted.reduce((s, r) => s + (r.tiktok_spend_after ?? 9000), 0) / adjusted.length;
    const avgNpBefore = adjusted.reduce((s, r) => s + (r.newspaper_spend_before ?? 1000), 0) / adjusted.length;
    const avgNpAfter = adjusted.reduce((s, r) => s + (r.newspaper_spend_after ?? 1000), 0) / adjusted.length;
    const tkDecreased = avgTkAfter < avgTkBefore;
    const npIncreased = avgNpAfter > avgNpBefore;
    return {
      bars: [
        { channel: 'TikTok', before: Math.round(avgTkBefore), after: Math.round(avgTkAfter), afterColor: '#C4622D' },
        { channel: 'Newspaper', before: Math.round(avgNpBefore), after: Math.round(avgNpAfter), afterColor: '#4A7C59' },
      ],
      correct: tkDecreased && npIncreased,
    };
  }, [rows]);

  if (!data) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-xs text-muted-foreground">No adjusted sessions with spend data available.</p>
        </CardContent>
      </Card>
    );
  }

  const chartData = data.bars.map((b) => ({ channel: b.channel, before: b.before, after: b.after }));

  return (
    <Card>
      <CardContent className="pt-5 pb-4">
        <h3 className="text-sm font-semibold text-foreground mb-4">Average spend before vs. after feedback — did feedback push toward the correct allocation?</h3>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={chartData} barCategoryGap="30%">
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
            <XAxis dataKey="channel" tick={{ fontSize: 11 }} />
            <YAxis domain={[0, 10000]} tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} width={45} />
            <Tooltip formatter={(v: number) => `$${v.toLocaleString()}`} />
            <Bar dataKey="before" name="Before feedback" fill="#888780" radius={[3, 3, 0, 0]} />
            <Bar dataKey="after" name="After feedback" radius={[3, 3, 0, 0]}>
              {data.bars.map((b, i) => <Cell key={i} fill={b.afterColor} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div className="flex items-center gap-4 mt-3 justify-center">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: '#888780' }} /> Before feedback
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: '#C4622D' }} /> After (TikTok)
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: '#4A7C59' }} /> After (Newspaper)
          </div>
        </div>
        {data.correct ? (
          <div className="flex items-start gap-2 mt-3 p-3 rounded-md bg-[#4A7C59]/10 border border-[#4A7C59]/20">
            <CheckCircle className="h-4 w-4 shrink-0 mt-0.5" style={{ color: '#4A7C59' }} />
            <p className="text-xs" style={{ color: '#4A7C59' }}>Feedback is pushing students toward the correct allocation.</p>
          </div>
        ) : (
          <div className="flex items-start gap-2 mt-3 p-3 rounded-md bg-amber-50 border border-amber-200">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800">Feedback is not consistently changing allocation decisions.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
