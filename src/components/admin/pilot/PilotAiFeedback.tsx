import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { ViewSkeleton } from './PilotSkeletons';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, ReferenceLine,
} from 'recharts';
import { MessageSquare, Timer, CheckCircle, Send, AlertTriangle } from 'lucide-react';

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
}

interface SubRow {
  session_id: string;
  final_tiktok_spend: number | null;
  final_newspaper_spend: number | null;
}

const QUAD_COLORS: Record<string, string> = {
  Descriptive: '#D4A017', Diagnostic: '#C4622D', Prescriptive: '#4A7C59', Predictive: '#6B4F8A',
};

export default function PilotAiFeedback({ classId }: Props) {
  const [rows, setRows] = useState<AiRow[]>([]);
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

      // fetch ai_feedback_events
      const aiRows: AiRow[] = [];
      for (let i = 0; i < ids.length; i += 100) {
        const chunk = ids.slice(i, i + 100);
        const { data } = await supabase
          .from('ai_feedback_events')
          .select('session_id, post_feedback_action, time_adjusting_seconds, descriptive_cards_before, diagnostic_cards_before, prescriptive_cards_before, predictive_cards_before, descriptive_cards_after, diagnostic_cards_after, prescriptive_cards_after, predictive_cards_after, tiktok_spend_before, tiktok_spend_after, newspaper_spend_before, newspaper_spend_after')
          .in('session_id', chunk);
        if (data) aiRows.push(...(data as AiRow[]));
      }

      if (!cancelled) {
        setRows(aiRows);
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
