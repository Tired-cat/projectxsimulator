import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { ViewSkeleton, EmptyState } from './PilotSkeletons';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { Users, CheckCircle2, Clock, FileText } from 'lucide-react';

/* ── types ──────────────────────────────────────── */
interface PilotHealthProps {
  classId: string | null;
}

interface MetricCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  subtitleColor?: string;
  icon: React.ReactNode;
}

interface FunnelStep {
  label: string;
  count: number;
  color: string;
}

/* ── helpers ────────────────────────────────────── */
async function getSessionIdsForClass(classId: string | null): Promise<string[]> {
  let query = supabase.from('sessions').select('id');
  if (classId) query = query.eq('class_id', classId);
  const { data } = await query;
  return (data ?? []).map((s) => s.id);
}

function minutesBetween(start: string, end: string): number {
  return (new Date(end).getTime() - new Date(start).getTime()) / 60000;
}

function durationBucket(mins: number): string {
  if (mins < 20) return '<20m';
  if (mins < 30) return '20-30m';
  if (mins < 45) return '30-45m';
  if (mins < 60) return '45-60m';
  if (mins < 90) return '60-90m';
  return '90+m';
}

const BUCKET_ORDER = ['<20m', '20-30m', '30-45m', '45-60m', '60-90m', '90+m'];

const TAB_LABEL_MAP: Record<string, string> = {
  home: 'Home',
  my_decisions: 'My Decisions',
  decisions: 'My Decisions',
  reasoning_board: 'Reasoning Board',
  reasoning: 'Reasoning Board',
};

/* ── small components ───────────────────────────── */
function MetricCard({ label, value, subtitle, subtitleColor, icon }: MetricCardProps) {
  return (
    <Card className="border border-border">
      <CardContent className="py-4 px-5 flex items-start gap-3">
        <div className="h-9 w-9 rounded-lg bg-muted/60 flex items-center justify-center shrink-0 mt-0.5">
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold font-[var(--font-heading)] text-foreground leading-tight">
            {value}
          </p>
          {subtitle && (
            <p className={cn('text-xs mt-0.5', subtitleColor ?? 'text-muted-foreground')}>
              {subtitle}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function FunnelBar({
  step,
  maxCount,
  prevCount,
  index,
}: {
  step: FunnelStep;
  maxCount: number;
  prevCount: number | null;
  index: number;
}) {
  const pct = maxCount > 0 ? Math.round((step.count / maxCount) * 100) : 0;
  const barWidth = maxCount > 0 ? Math.max((step.count / maxCount) * 100, 2) : 0;

  let dropoff = null;
  if (prevCount !== null && prevCount > 0) {
    const dropped = prevCount - step.count;
    const dropPct = Math.round((dropped / prevCount) * 100);
    if (dropped > 0) {
      const isHigh = dropPct > 10;
      dropoff = (
        <span className={cn('text-[10px] ml-2', isHigh ? 'text-red-500 font-medium' : 'text-muted-foreground')}>
          −{dropped} ({dropPct}%)
        </span>
      );
    }
  }

  return (
    <div className="flex items-center gap-3">
      <div className="w-[160px] shrink-0 text-right">
        <span className="text-xs text-foreground font-medium">{step.label}</span>
      </div>
      <div className="flex-1 h-7 bg-muted/30 rounded relative overflow-hidden">
        <div
          className="h-full rounded transition-all duration-500"
          style={{ width: `${barWidth}%`, backgroundColor: step.color }}
        />
        <div className="absolute inset-0 flex items-center px-2.5">
          <span className="text-[11px] font-semibold text-white drop-shadow-sm">
            {step.count}
          </span>
          <span className="text-[10px] text-foreground/60 ml-1.5">({pct}%)</span>
          {dropoff}
        </div>
      </div>
    </div>
  );
}

/* ── main view ──────────────────────────────────── */
export default function PilotHealth({ classId }: PilotHealthProps) {
  const [loading, setLoading] = useState(true);

  // metrics
  const [enrolled, setEnrolled] = useState(0);
  const [completed, setCompleted] = useState(0);
  const [totalSessions, setTotalSessions] = useState(0);
  const [avgDuration, setAvgDuration] = useState<number | null>(null);
  const [submissionCount, setSubmissionCount] = useState(0);

  // funnel
  const [funnelSteps, setFunnelSteps] = useState<FunnelStep[]>([]);

  // charts
  const [durationData, setDurationData] = useState<{ bucket: string; count: number }[]>([]);
  const [abandonData, setAbandonData] = useState<{ tab: string; count: number }[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);

      /* ── 1) enrolled ─────────────────────────── */
      let enrollQuery = supabase
        .from('student_enrollments')
        .select('*', { count: 'exact', head: true });
      if (classId) enrollQuery = enrollQuery.eq('class_id', classId);
      const { count: enrolledCount } = await enrollQuery;

      /* ── 2) sessions ─────────────────────────── */
      let sessQuery = supabase.from('sessions').select('id, is_completed, started_at, completed_at, class_id');
      if (classId) sessQuery = sessQuery.eq('class_id', classId);
      const { data: sessions } = await sessQuery;
      const allSessions = sessions ?? [];
      const sessionIds = allSessions.map((s) => s.id);

      const completedSessions = allSessions.filter((s) => s.is_completed);
      const incompleteSessions = allSessions.filter((s) => !s.is_completed);

      /* ── 3) avg duration ─────────────────────── */
      const durations = completedSessions
        .filter((s) => s.completed_at && s.started_at)
        .map((s) => minutesBetween(s.started_at, s.completed_at!));
      const avg = durations.length > 0
        ? durations.reduce((a, b) => a + b, 0) / durations.length
        : null;

      /* ── 4) submissions ──────────────────────── */
      // submissions link to sessions, need to count those in our session set
      let subCount = 0;
      if (sessionIds.length > 0) {
        // batch in chunks of 100 to avoid URL length issues
        for (let i = 0; i < sessionIds.length; i += 100) {
          const chunk = sessionIds.slice(i, i + 100);
          const { count } = await supabase
            .from('submissions')
            .select('*', { count: 'exact', head: true })
            .in('session_id', chunk);
          subCount += count ?? 0;
        }
      }

      /* ── 5) funnel steps ─────────────────────── */
      const distinctSessionsIn = async (
        table: string,
        filterCol?: string,
        filterVal?: string
      ): Promise<number> => {
        if (sessionIds.length === 0) return 0;
        const seen = new Set<string>();
        for (let i = 0; i < sessionIds.length; i += 100) {
          const chunk = sessionIds.slice(i, i + 100);
          let q = (supabase.from(table as any) as any).select('session_id').in('session_id', chunk);
          if (filterCol && filterVal) q = q.eq(filterCol, filterVal);
          const { data } = await q;
          (data ?? []).forEach((r: any) => seen.add(r.session_id));
        }
        return seen.size;
      };

      const visitedDecisions = await distinctSessionsIn('navigation_events', 'tab', 'decisions');
      const madeAllocation = await distinctSessionsIn('allocation_events');
      // Count reasoning as visited if they navigated to the tab OR placed a card (split-screen use)
      const visitedReasoning = new Set<string>();
      for (let i = 0; i < sessionIds.length; i += 100) {
        const chunk = sessionIds.slice(i, i + 100);
        const [navRes, boardRes] = await Promise.all([
          (supabase.from('navigation_events' as any) as any).select('session_id').in('session_id', chunk).eq('tab', 'reasoning'),
          (supabase.from('board_events' as any) as any).select('session_id').in('session_id', chunk).eq('event_type', 'drag_to_board'),
        ]);
        (navRes.data ?? []).forEach((r: any) => visitedReasoning.add(r.session_id));
        (boardRes.data ?? []).forEach((r: any) => visitedReasoning.add(r.session_id));
      }
      const visitedReasoningCount = visitedReasoning.size;
      const placedCard = await distinctSessionsIn('board_events', 'event_type', 'drag_to_board');
      // Count sessions where at least 1 chip has a non-empty annotation
      let addedAnnotation = 0;
      if (sessionIds.length > 0) {
        const annotatedSessions = new Set<string>();
        for (let i = 0; i < sessionIds.length; i += 100) {
          const chunk = sessionIds.slice(i, i + 100);
          const { data: boardStates } = await supabase
            .from('reasoning_board_state')
            .select('session_id, cards')
            .in('session_id', chunk);
          (boardStates ?? []).forEach((row: any) => {
            const cards = Array.isArray(row.cards) ? row.cards : [];
            const hasAnnotation = cards.some(
              (chip: any) => chip.annotation && chip.annotation.trim() !== ''
            );
            if (hasAnnotation) annotatedSessions.add(row.session_id);
          });
        }
        addedAnnotation = annotatedSessions.size;
      }
      const requestedAI = await distinctSessionsIn('ai_feedback_events');

      const fSteps: FunnelStep[] = [
        { label: 'Enrolled', count: enrolledCount ?? 0, color: '#6B4F8A' },
        { label: 'Session started', count: allSessions.length, color: '#6B4F8A' },
        { label: 'Visited My Decisions', count: visitedDecisions, color: '#6B4F8A' },
        { label: 'Made allocation change', count: madeAllocation, color: '#6B4F8A' },
        { label: 'Visited Reasoning Board', count: visitedReasoningCount, color: '#6B4F8A' },
        { label: 'Placed ≥1 card', count: placedCard, color: '#D4A053' },
        { label: 'Added ≥1 annotation', count: addedAnnotation, color: '#D4A053' },
        { label: 'Requested AI feedback', count: requestedAI, color: '#4CAF50' },
        { label: 'Submitted', count: subCount, color: '#4CAF50' },
      ];

      /* ── 6) duration histogram ───────────────── */
      const bucketCounts: Record<string, number> = {};
      BUCKET_ORDER.forEach((b) => (bucketCounts[b] = 0));
      durations.forEach((d) => {
        const b = durationBucket(d);
        bucketCounts[b] = (bucketCounts[b] ?? 0) + 1;
      });
      const durData = BUCKET_ORDER.map((b) => ({ bucket: b, count: bucketCounts[b] }));

      /* ── 7) abandonment breakdown ────────────── */
      const incompleteIds = incompleteSessions.map((s) => s.id);
      const abandonMap: Record<string, number> = {
        Home: 0,
        'My Decisions': 0,
        'Reasoning Board': 0,
        'Never navigated': 0,
      };
      if (incompleteIds.length > 0) {
        for (let i = 0; i < incompleteIds.length; i += 100) {
          const chunk = incompleteIds.slice(i, i + 100);
          const { data: navs } = await supabase
            .from('navigation_events')
            .select('session_id, tab, entered_at')
            .in('session_id', chunk)
            .order('entered_at', { ascending: false });

          // find last tab per session
          const lastTab: Record<string, string> = {};
          (navs ?? []).forEach((n: any) => {
            if (!lastTab[n.session_id]) lastTab[n.session_id] = n.tab;
          });

          chunk.forEach((sid) => {
            const tab = lastTab[sid];
            if (!tab) {
              abandonMap['Never navigated']++;
            } else {
              const label = TAB_LABEL_MAP[tab] ?? tab;
              if (label in abandonMap) {
                abandonMap[label]++;
              } else {
                abandonMap[label] = (abandonMap[label] ?? 0) + 1;
              }
            }
          });
        }
      }
      const abData = Object.entries(abandonMap)
        .map(([tab, count]) => ({ tab, count }))
        .filter((d) => d.count > 0);

      /* ── set state ───────────────────────────── */
      if (cancelled) return;
      setEnrolled(enrolledCount ?? 0);
      setCompleted(completedSessions.length);
      setTotalSessions(allSessions.length);
      setAvgDuration(avg);
      setSubmissionCount(subCount);
      setFunnelSteps(fSteps);
      setDurationData(durData);
      setAbandonData(abData);
      setLoading(false);
    }

    load();
    return () => { cancelled = true; };
  }, [classId]);

  /* completion rate badge */
  const completionRate = totalSessions > 0
    ? Math.round((completed / totalSessions) * 100)
    : 0;
  const rateColor =
    completionRate >= 70 ? 'text-green-600' :
    completionRate >= 50 ? 'text-amber-500' :
    'text-red-500';

  if (loading) {
    return <ViewSkeleton metrics charts={2} />;
  }

  if (enrolled === 0) {
    return <EmptyState message="No data yet — this will populate once students start using the simulation." />;
  }

  return (
    <div className="space-y-6">
      {/* ── metric cards ─────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Enrolled"
          value={enrolled}
          icon={<Users className="h-4 w-4 text-[#6B4F8A]" />}
        />
        <MetricCard
          label="Completed"
          value={completed}
          subtitle={`${completionRate}% completion rate`}
          subtitleColor={rateColor}
          icon={<CheckCircle2 className="h-4 w-4 text-[#6B4F8A]" />}
        />
        <MetricCard
          label="Avg duration"
          value={avgDuration !== null ? `${avgDuration.toFixed(1)} min` : '—'}
          icon={<Clock className="h-4 w-4 text-[#6B4F8A]" />}
        />
        <MetricCard
          label="Submissions"
          value={submissionCount}
          icon={<FileText className="h-4 w-4 text-[#6B4F8A]" />}
        />
      </div>

      {/* ── completion funnel ────────────────────── */}
      <Card className="border border-border">
        <CardContent className="py-5 px-5 space-y-2">
          <h3 className="text-sm font-semibold text-foreground mb-3">Completion funnel</h3>
          <div className="space-y-1.5">
            {funnelSteps.map((step, idx) => (
              <FunnelBar
                key={step.label}
                step={step}
                maxCount={funnelSteps[0]?.count ?? 1}
                prevCount={idx > 0 ? funnelSteps[idx - 1].count : null}
                index={idx}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ── two charts ───────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Duration histogram */}
        <Card className="border border-border">
          <CardContent className="py-5 px-5">
            <h3 className="text-sm font-semibold text-foreground mb-4">Session duration distribution</h3>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={durationData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="bucket" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ fontSize: 12, borderRadius: 8 }}
                    formatter={(v: number) => [v, 'Sessions']}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]} fill="#6B4F8A" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Abandonment breakdown */}
        <Card className="border border-border">
          <CardContent className="py-5 px-5">
            <h3 className="text-sm font-semibold text-foreground mb-4">Abandonment by last tab visited</h3>
            <div className="h-52">
              {abandonData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                  No incomplete sessions
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={abandonData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="tab" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{ fontSize: 12, borderRadius: 8 }}
                      formatter={(v: number) => [v, 'Sessions']}
                    />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]} fill="#C67A5C" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── funnel flags ─────────────────────────── */}
      <FunnelFlags steps={funnelSteps} />
    </div>
  );
}

/* ── Funnel Flags component ──────────────────────── */
interface FlagDef {
  fromLabel: string;
  toLabel: string;
  threshold: number; // fraction, e.g. 0.10 = 10%
  message: (dropped: number, dropPct: number) => string;
}

const FLAG_DEFS: FlagDef[] = [
  {
    fromLabel: 'Enrolled',
    toLabel: 'Session started',
    threshold: 0.10,
    message: (d) =>
      `${d} student${d !== 1 ? 's' : ''} enrolled but never opened the simulation. Check that the simulation URL was shared correctly and students can log in.`,
  },
  {
    fromLabel: 'Session started',
    toLabel: 'Visited My Decisions',
    threshold: 0.10,
    message: (d) =>
      `${d} student${d !== 1 ? 's' : ''} opened the simulation but never left the Home page. Students may not know where to start — consider improving Home page guidance.`,
  },
  {
    fromLabel: 'Visited My Decisions',
    toLabel: 'Visited Reasoning Board',
    threshold: 0.15,
    message: (d) =>
      `${d} student${d !== 1 ? 's' : ''} used My Decisions but never reached the Reasoning Board. The Reasoning Board tab may not be discoverable enough.`,
  },
  {
    fromLabel: 'Visited Reasoning Board',
    toLabel: 'Placed ≥1 card',
    threshold: 0.10,
    message: (d) =>
      `${d} student${d !== 1 ? 's' : ''} reached the Reasoning Board but never placed a card. The Reason mode button may not be understood.`,
  },
  {
    fromLabel: 'Placed ≥1 card',
    toLabel: 'Used Contextualise',
    threshold: 0.35,
    message: (_d, pct) =>
      `${pct}% of students who placed evidence never used Contextualise. The pairing mechanic may need more prominence or explanation.`,
  },
];

function FunnelFlags({ steps }: { steps: FunnelStep[] }) {
  const stepMap = new Map(steps.map((s) => [s.label, s.count]));

  const flags: string[] = [];
  for (const def of FLAG_DEFS) {
    const from = stepMap.get(def.fromLabel);
    const to = stepMap.get(def.toLabel);
    if (from === undefined || to === undefined || from === 0) continue;
    const dropped = from - to;
    const dropPct = dropped / from;
    if (dropPct > def.threshold) {
      flags.push(def.message(dropped, Math.round(dropPct * 100)));
    }
  }

  return (
    <Card className="border border-border">
      <CardContent className="py-5 px-5 space-y-3">
        <h3 className="text-sm font-semibold text-foreground">Funnel flags</h3>
        {flags.length === 0 ? (
          <div className="rounded-md border-l-4 border-green-500 bg-green-500/5 px-4 py-3">
            <p className="text-sm text-foreground">No critical drop-offs detected.</p>
          </div>
        ) : (
          flags.map((msg, i) => (
            <div
              key={i}
              className="rounded-md border-l-4 border-amber-500 bg-amber-500/5 px-4 py-3"
            >
              <p className="text-sm text-foreground">{msg}</p>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
