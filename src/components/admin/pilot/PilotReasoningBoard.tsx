import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { ViewSkeleton, EmptyState } from './PilotSkeletons';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import { LayoutGrid, Grid2x2, Link2, RotateCcw, AlertTriangle } from 'lucide-react';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';

/* ── types ──────────────────────────────────────── */
interface Props {
  classId: string | null;
}

interface SubmissionRow {
  session_id: string;
  descriptive_card_count: number;
  diagnostic_card_count: number;
  prescriptive_card_count: number;
  predictive_card_count: number;
  contextualise_pairs_count: number;
}

const QUADRANTS = [
  { key: 'descriptive_card_count' as const, label: 'Descriptive', color: '#D4A017' },
  { key: 'diagnostic_card_count' as const, label: 'Diagnostic', color: '#C4622D' },
  { key: 'prescriptive_card_count' as const, label: 'Prescriptive', color: '#4A7C59' },
  { key: 'predictive_card_count' as const, label: 'Predictive', color: '#6B4F8A' },
] as const;

type QuadKey = typeof QUADRANTS[number]['key'];

/* ── helpers ────────────────────────────────────── */
async function getSessionIdsForClass(classId: string | null): Promise<string[]> {
  let query = supabase.from('sessions').select('id');
  if (classId) query = query.eq('class_id', classId);
  const { data } = await query;
  return (data ?? []).map((s) => s.id);
}

async function fetchSubmissions(sessionIds: string[]): Promise<SubmissionRow[]> {
  if (sessionIds.length === 0) return [];
  const rows: SubmissionRow[] = [];
  const chunkSize = 100;
  for (let i = 0; i < sessionIds.length; i += chunkSize) {
    const chunk = sessionIds.slice(i, i + chunkSize);
    const { data } = await supabase
      .from('submissions')
      .select('session_id, descriptive_card_count, diagnostic_card_count, prescriptive_card_count, predictive_card_count, contextualise_pairs_count')
      .in('session_id', chunk);
    if (data) rows.push(...(data as SubmissionRow[]));
  }
  return rows;
}

async function fetchResetCounts(sessionIds: string[]): Promise<Record<string, number>> {
  if (sessionIds.length === 0) return {};
  const counts: Record<string, number> = {};
  const chunkSize = 100;
  for (let i = 0; i < sessionIds.length; i += chunkSize) {
    const chunk = sessionIds.slice(i, i + chunkSize);
    const { data } = await supabase
      .from('resets')
      .select('session_id')
      .eq('reset_type', 'board_reset')
      .in('session_id', chunk);
    if (data) {
      for (const r of data) {
        counts[r.session_id] = (counts[r.session_id] || 0) + 1;
      }
    }
  }
  return counts;
}

interface DraggedItem { evidence_id: string; session_count: number; }
interface ContextPair { evidence_id: string; paired_with: string; pair_count: number; }

async function fetchDraggedItems(sessionIds: string[]): Promise<DraggedItem[]> {
  if (sessionIds.length === 0) return [];
  const map: Record<string, Set<string>> = {};
  const chunkSize = 100;
  for (let i = 0; i < sessionIds.length; i += chunkSize) {
    const chunk = sessionIds.slice(i, i + chunkSize);
    const { data } = await supabase
      .from('board_events')
      .select('evidence_id, session_id')
      .eq('event_type', 'drag_to_board')
      .in('session_id', chunk);
    if (data) {
      for (const r of data) {
        if (!r.evidence_id) continue;
        if (!map[r.evidence_id]) map[r.evidence_id] = new Set();
        map[r.evidence_id].add(r.session_id);
      }
    }
  }
  return Object.entries(map)
    .map(([evidence_id, sessions]) => ({ evidence_id, session_count: sessions.size }))
    .sort((a, b) => b.session_count - a.session_count);
}

async function fetchContextPairs(sessionIds: string[]): Promise<ContextPair[]> {
  if (sessionIds.length === 0) return [];
  const map: Record<string, number> = {};
  const chunkSize = 100;
  for (let i = 0; i < sessionIds.length; i += chunkSize) {
    const chunk = sessionIds.slice(i, i + chunkSize);
    const { data } = await supabase
      .from('board_events')
      .select('evidence_id, paired_with')
      .eq('event_type', 'contextualise')
      .in('session_id', chunk);
    if (data) {
      for (const r of data) {
        if (!r.evidence_id || !r.paired_with) continue;
        const key = `${r.evidence_id}|||${r.paired_with}`;
        map[key] = (map[key] || 0) + 1;
      }
    }
  }
  return Object.entries(map)
    .map(([key, pair_count]) => {
      const [evidence_id, paired_with] = key.split('|||');
      return { evidence_id, paired_with, pair_count };
    })
    .sort((a, b) => b.pair_count - a.pair_count)
    .slice(0, 10);
}

interface FirstDragEvent { quadrant: string | null; evidence_id: string | null; evidence_type: string | null; }

async function fetchFirstDrags(sessionIds: string[]): Promise<FirstDragEvent[]> {
  if (sessionIds.length === 0) return [];
  const rows: FirstDragEvent[] = [];
  const chunkSize = 100;
  for (let i = 0; i < sessionIds.length; i += chunkSize) {
    const chunk = sessionIds.slice(i, i + chunkSize);
    const { data } = await supabase
      .from('board_events')
      .select('quadrant, evidence_id, evidence_type')
      .eq('event_type', 'drag_to_board')
      .eq('sequence_number', 1)
      .in('session_id', chunk);
    if (data) rows.push(...(data as FirstDragEvent[]));
  }
  return rows;
}

/* ── metric card ────────────────────────────────── */
function MetricCard({ label, value, icon }: { label: string; value: string | number; icon: React.ReactNode }) {
  return (
    <Card className="bg-background border-border shadow-sm">
      <CardContent className="p-4 flex items-start gap-3">
        <div className="p-2 rounded-md bg-muted/50 text-muted-foreground">{icon}</div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold font-[var(--font-heading)] text-foreground leading-tight mt-0.5">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

/* ── main component ─────────────────────────────── */
export default function PilotReasoningBoard({ classId }: Props) {
  const [submissions, setSubmissions] = useState<SubmissionRow[]>([]);
  const [resetCounts, setResetCounts] = useState<Record<string, number>>({});
  const [draggedItems, setDraggedItems] = useState<DraggedItem[]>([]);
  
  const [firstDrags, setFirstDrags] = useState<FirstDragEvent[]>([]);
  const [totalSessions, setTotalSessions] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const sids = await getSessionIdsForClass(classId);
      const [subs, resets, dragged, firsts] = await Promise.all([
        fetchSubmissions(sids),
        fetchResetCounts(sids),
        fetchDraggedItems(sids),
        fetchFirstDrags(sids),
      ]);
      if (!cancelled) {
        setSubmissions(subs);
        setResetCounts(resets);
        setDraggedItems(dragged);
        setFirstDrags(firsts);
        setTotalSessions(sids.length);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [classId]);

  /* ── derived metrics ───────────────────────────── */
  const n = submissions.length;

  const avgCardsPlaced = useMemo(() => {
    if (n === 0) return '0.0';
    const total = submissions.reduce((s, r) =>
      s + r.descriptive_card_count + r.diagnostic_card_count + r.prescriptive_card_count + r.predictive_card_count, 0);
    return (total / n).toFixed(1);
  }, [submissions, n]);

  const allFourPct = useMemo(() => {
    if (n === 0) return '0%';
    const filled = submissions.filter(r =>
      r.descriptive_card_count > 0 && r.diagnostic_card_count > 0 &&
      r.prescriptive_card_count > 0 && r.predictive_card_count > 0).length;
    return `${Math.round((filled / n) * 100)}%`;
  }, [submissions, n]);




  const avgBoardResets = useMemo(() => {
    const sessionIds = [...new Set(submissions.map(s => s.session_id))];
    if (sessionIds.length === 0) return '0.0';
    const total = sessionIds.reduce((s, id) => s + (resetCounts[id] || 0), 0);
    return (total / sessionIds.length).toFixed(1);
  }, [submissions, resetCounts]);

  /* ── quadrant stats ────────────────────────────── */
  const quadrantStats = useMemo(() => {
    return QUADRANTS.map(q => {
      const avg = n === 0 ? 0 : submissions.reduce((s, r) => s + r[q.key], 0) / n;
      const filledCount = n === 0 ? 0 : submissions.filter(r => r[q.key] > 0).length;
      const filledPct = n === 0 ? 0 : Math.round((filledCount / n) * 100);
      return { ...q, avg: avg.toFixed(1), filledPct };
    });
  }, [submissions, n]);

  /* ── distribution chart data ───────────────────── */
  const distData = useMemo(() => {
    const buckets = ['0 cards', '1 card', '2 cards', '3+ cards'];
    return buckets.map((bucket, bi) => {
      const row: Record<string, string | number> = { bucket };
      for (const q of QUADRANTS) {
        const count = submissions.filter(r => {
          const v = r[q.key];
          if (bi === 0) return v === 0;
          if (bi === 1) return v === 1;
          if (bi === 2) return v === 2;
          return v >= 3;
        }).length;
        row[q.label] = count;
      }
      return row;
    });
  }, [submissions]);

  /* ── most dragged chart data ───────────────────── */
  const topDragged = useMemo(() => {
    return draggedItems.slice(0, 12).map(d => ({
      evidence_id: d.evidence_id,
      pct: totalSessions > 0 ? Math.round((d.session_count / totalSessions) * 100) : 0,
      count: d.session_count,
    }));
  }, [draggedItems, totalSessions]);

  /* ── rarely dragged items ──────────────────────── */
  const rarelyDragged = useMemo(() => {
    const allDraggedIds = new Set(draggedItems.map(d => d.evidence_id));
    const threshold = totalSessions > 0 ? totalSessions * 0.05 : 0;
    const rare = draggedItems.filter(d => d.session_count < threshold).map(d => d.evidence_id);
    // We can't know ALL possible evidence_ids without a master list,
    // so we show items that appeared but were used by < 5% of sessions
    return rare;
  }, [draggedItems, totalSessions]);

  if (loading) {
    return <ViewSkeleton metrics charts={2} table />;
  }

  if (totalSessions === 0) {
    return <EmptyState message="No data yet — this will populate once students start using the simulation." />;
  }

  return (
    <div className="space-y-6">
      {/* ── top row metric cards ───────────────────── */}
      <div className="grid grid-cols-3 gap-4">
        <MetricCard label="Avg cards placed" value={avgCardsPlaced} icon={<LayoutGrid className="h-4 w-4" />} />
        <MetricCard label="All 4 quadrants filled" value={allFourPct} icon={<Grid2x2 className="h-4 w-4" />} />
        <MetricCard label="Avg board resets" value={avgBoardResets} icon={<RotateCcw className="h-4 w-4" />} />
      </div>

      {/* ── quadrant fill rate blocks ──────────────── */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3">Quadrant fill rate</h3>
        <div className="grid grid-cols-4 gap-4">
          {quadrantStats.map(q => (
            <Card key={q.key} className="bg-background border-border shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-3 w-3 rounded-full" style={{ backgroundColor: q.color }} />
                  <span className="text-xs font-medium text-foreground">{q.label}</span>
                  {q.label === 'Predictive' && q.filledPct < 60 && (
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-500 ml-auto" />
                  )}
                </div>
                <p className="text-2xl font-bold font-[var(--font-heading)] text-foreground">{q.avg}</p>
                <p className="text-xs text-muted-foreground">avg cards</p>
                <p className={cn(
                  'text-xs font-medium mt-1',
                  q.filledPct >= 80 ? 'text-emerald-600' : q.filledPct >= 60 ? 'text-foreground' : 'text-amber-600'
                )}>
                  {q.filledPct}% of students filled
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* ── quadrant distribution chart ────────────── */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3">Quadrant distribution</h3>
        <Card className="bg-background border-border shadow-sm">
          <CardContent className="p-4">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={distData} barCategoryGap="20%">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="bucket" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  {QUADRANTS.map(q => (
                    <Bar key={q.label} dataKey={q.label} fill={q.color} radius={[3, 3, 0, 0]} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
            {/* inline legend */}
            <div className="flex items-center justify-center gap-5 mt-2">
              {QUADRANTS.map(q => (
                <div key={q.label} className="flex items-center gap-1.5">
                  <div className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: q.color }} />
                  <span className="text-xs text-muted-foreground">{q.label}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── most dragged evidence items ────────────── */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3">Most dragged evidence items</h3>
        <Card className="bg-background border-border shadow-sm">
          <CardContent className="p-4">
            {topDragged.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No drag events recorded yet.</p>
            ) : (
              <div style={{ height: Math.max(topDragged.length * 40 + 80, 200) }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topDragged} layout="vertical" margin={{ left: 140, right: 20, top: 10, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11 }} unit="%" />
                    <YAxis type="category" dataKey="evidence_id" tick={{ fontSize: 11 }} width={130} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--background))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                      formatter={(value: number) => [`${value}%`, 'Sessions']}
                    />
                    <Bar dataKey="pct" fill="#6B4F8A" radius={[0, 3, 3, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── rarely dragged items ───────────────────── */}
      {rarelyDragged.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-1">Evidence items rarely used</h3>
          <p className="text-xs text-muted-foreground mb-3">
            Used by &lt;5% of sessions — review whether these are visible and labeled clearly.
          </p>
          <div className="flex flex-wrap gap-2">
            {rarelyDragged.map(id => (
              <span key={id} className="px-2.5 py-1 rounded-full bg-muted text-xs text-muted-foreground">
                {id}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── first drag donut charts ────────────────── */}
      <FirstDragCharts firstDrags={firstDrags} />
    </div>
  );
}

/* ── First drag charts sub-component ────────────── */
const QUAD_COLORS: Record<string, string> = {
  descriptive: '#D4A017',
  diagnostic: '#C4622D',
  prescriptive: '#4A7C59',
  predictive: '#6B4F8A',
};

function FirstDragCharts({ firstDrags }: { firstDrags: FirstDragEvent[] }) {
  const quadrantData = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const d of firstDrags) {
      const q = (d.quadrant || 'unknown').toLowerCase();
      counts[q] = (counts[q] || 0) + 1;
    }
    return Object.entries(counts).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value,
      color: QUAD_COLORS[name] || '#888780',
    }));
  }, [firstDrags]);

  const framingData = useMemo(() => {
    let views = 0, revenue = 0, profit = 0, other = 0;
    for (const d of firstDrags) {
      const eid = (d.evidence_id || '').toLowerCase();
      const etype = (d.evidence_type || '').toLowerCase();
      // Channel bar metrics
      if (eid.includes('_clicks') || eid.includes('_views') || eid.includes('_view')) views++;
      else if (eid.includes('_revenue') || etype === 'product_mix') revenue++;
      else if (eid.includes('_profit')) profit++;
      else if (eid.includes('_budget')) other++; // budget/spend is neither views nor revenue
      else other++;
    }
    return [
      { name: 'Views first', value: views, color: '#C4622D' },
      { name: 'Revenue first', value: revenue, color: '#4A7C59' },
      { name: 'Profit first', value: profit, color: '#6B4F8A' },
      { name: 'Budget first', value: other, color: '#D4A053' },
    ].filter(d => d.value > 0);
  }, [firstDrags]);

  const total = firstDrags.length;
  const viewsPct = total > 0
    ? Math.round((framingData.find(d => d.name === 'Views first')?.value || 0) / total * 100)
    : 0;

  if (total === 0) return null;

  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        {/* LEFT — first drag quadrant */}
        <Card className="bg-background border-border shadow-sm">
          <CardContent className="p-4">
            <h4 className="text-sm font-semibold text-foreground">Where students placed their first card</h4>
            <p className="text-xs text-muted-foreground mb-4">
              Descriptive should dominate — other quadrants first = student skipped the observation step
            </p>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={quadrantData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                  >
                    {quadrantData.map((d, i) => (
                      <Cell key={i} fill={d.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-4 mt-2">
              {quadrantData.map(d => (
                <div key={d.name} className="flex items-center gap-1.5">
                  <div className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: d.color }} />
                  <span className="text-xs text-muted-foreground">{d.name} ({d.value})</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* RIGHT — framing trap */}
        <Card className="bg-background border-border shadow-sm">
          <CardContent className="p-4">
            <h4 className="text-sm font-semibold text-foreground">First evidence type dragged</h4>
            <p className="text-xs text-muted-foreground mb-4">
              If views-first &gt;30% — students are anchoring on the wrong metric. Default tab framing needs changing.
            </p>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={framingData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                  >
                    {framingData.map((d, i) => (
                      <Cell key={i} fill={d.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-4 mt-2">
              {framingData.map(d => (
                <div key={d.name} className="flex items-center gap-1.5">
                  <div className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: d.color }} />
                  <span className="text-xs text-muted-foreground">{d.name} ({d.value})</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* views-first flag */}
      {viewsPct > 30 && (
        <Card className="border-l-4 border-l-red-500 bg-red-50/50 shadow-sm">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-foreground">Framing trap detected</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {viewsPct}% of students dragged a views metric first. Students are anchoring on impressions instead of revenue or profit — consider changing the default tab or adding guidance.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}
