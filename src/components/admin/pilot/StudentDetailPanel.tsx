import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { X, ArrowUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  sessionId: string;
  onClose: () => void;
}

const QUAD_COLORS: Record<string, string> = {
  descriptive: '#D4A017', diagnostic: '#C4622D', prescriptive: '#4A7C59', predictive: '#6B4F8A',
};
const QUAD_LABELS: Record<string, string> = {
  descriptive: 'Descriptive', diagnostic: 'Diagnostic', prescriptive: 'Prescriptive', predictive: 'Predictive',
};

interface SubData {
  descriptive_card_count: number; diagnostic_card_count: number;
  prescriptive_card_count: number; predictive_card_count: number;
  generated_story: string | null;
}

interface AllocEvent {
  channel: string; new_value: number | null; sequence_number: number | null;
}

interface AiFeedback {
  ai_feedback_text: string | null;
  post_feedback_action: string | null;
  time_adjusting_seconds: number | null;
  descriptive_cards_before: number; diagnostic_cards_before: number;
  prescriptive_cards_before: number; predictive_cards_before: number;
  descriptive_cards_after: number | null; diagnostic_cards_after: number | null;
  prescriptive_cards_after: number | null; predictive_cards_after: number | null;
}

interface NavEvent {
  tab: string; entered_at: string; time_spent_seconds: number | null; visit_number: number | null;
}

export default function StudentDetailPanel({ sessionId, onClose }: Props) {
  const [sub, setSub] = useState<SubData | null>(null);
  const [allocEvents, setAllocEvents] = useState<AllocEvent[]>([]);
  const [aiFeedback, setAiFeedback] = useState<AiFeedback | null>(null);
  const [navEvents, setNavEvents] = useState<NavEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [subRes, allocRes, aiRes, navRes] = await Promise.all([
        supabase.from('submissions').select('descriptive_card_count, diagnostic_card_count, prescriptive_card_count, predictive_card_count, generated_story').eq('session_id', sessionId).maybeSingle(),
        supabase.from('allocation_events').select('channel, new_value, sequence_number').eq('session_id', sessionId).order('sequence_number', { ascending: true }),
        supabase.from('ai_feedback_events').select('ai_feedback_text, post_feedback_action, time_adjusting_seconds, descriptive_cards_before, diagnostic_cards_before, prescriptive_cards_before, predictive_cards_before, descriptive_cards_after, diagnostic_cards_after, prescriptive_cards_after, predictive_cards_after').eq('session_id', sessionId).maybeSingle(),
        supabase.from('navigation_events').select('tab, entered_at, time_spent_seconds, visit_number').eq('session_id', sessionId).order('entered_at', { ascending: true }),
      ]);
      if (!cancelled) {
        setSub(subRes.data as SubData | null);
        setAllocEvents((allocRes.data ?? []) as AllocEvent[]);
        setAiFeedback(aiRes.data as AiFeedback | null);
        setNavEvents((navRes.data ?? []) as NavEvent[]);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [sessionId]);

  if (loading) {
    return (
      <Card className="mt-3">
        <CardContent className="py-8 text-center text-sm text-muted-foreground">Loading student detail…</CardContent>
      </Card>
    );
  }

  return (
    <Card className="mt-3 border-[#6B4F8A]/30">
      <CardContent className="pt-4 pb-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-foreground">Student detail</h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-muted transition-colors">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        <Tabs defaultValue="board">
          <TabsList className="h-8 mb-4">
            <TabsTrigger value="board" className="text-xs px-3 h-7">Board state</TabsTrigger>
            <TabsTrigger value="alloc" className="text-xs px-3 h-7">Allocation path</TabsTrigger>
            <TabsTrigger value="ai" className="text-xs px-3 h-7">AI feedback</TabsTrigger>
            <TabsTrigger value="nav" className="text-xs px-3 h-7">Navigation</TabsTrigger>
          </TabsList>

          <TabsContent value="board"><BoardStateTab sub={sub} /></TabsContent>
          <TabsContent value="alloc"><AllocationPathTab events={allocEvents} /></TabsContent>
          <TabsContent value="ai"><AiFeedbackTab data={aiFeedback} /></TabsContent>
          <TabsContent value="nav"><NavigationTab events={navEvents} /></TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

/* ── Tab 1: Board State ─────────────────────────── */
function BoardStateTab({ sub }: { sub: SubData | null }) {
  if (!sub) {
    return <p className="text-xs text-muted-foreground py-4">No submission data for this student.</p>;
  }

  const quads = [
    { key: 'descriptive', count: sub.descriptive_card_count },
    { key: 'diagnostic', count: sub.diagnostic_card_count },
    { key: 'prescriptive', count: sub.prescriptive_card_count },
    { key: 'predictive', count: sub.predictive_card_count },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        {quads.map((q) => (
          <div
            key={q.key}
            className="rounded-lg border p-3"
            style={{ borderColor: QUAD_COLORS[q.key] + '40', backgroundColor: QUAD_COLORS[q.key] + '08' }}
          >
            <p className="text-xs font-semibold" style={{ color: QUAD_COLORS[q.key] }}>{QUAD_LABELS[q.key]}</p>
            <p className="text-lg font-bold mt-1" style={{ color: QUAD_COLORS[q.key] }}>
              {q.count} card{q.count !== 1 ? 's' : ''}
            </p>
            {q.count === 0 && <p className="text-[10px] text-muted-foreground">(empty)</p>}
          </div>
        ))}
      </div>

      <div>
        <p className="text-xs font-semibold text-muted-foreground mb-1">Reasoning story</p>
        {sub.generated_story ? (
          <div className="text-xs text-foreground bg-muted/30 rounded-md p-3 whitespace-pre-wrap leading-relaxed">
            {sub.generated_story}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground italic">No reasoning story generated.</p>
        )}
      </div>
    </div>
  );
}

/* ── Tab 2: Allocation Path ─────────────────────── */
function AllocationPathTab({ events }: { events: AllocEvent[] }) {
  const chartData = useMemo(() => {
    if (!events.length) return [];
    // Build timeline per channel
    const bySeq = new Map<number, Record<string, number>>();
    events.forEach((e) => {
      if (e.sequence_number == null || e.new_value == null) return;
      if (!bySeq.has(e.sequence_number)) bySeq.set(e.sequence_number, {});
      bySeq.get(e.sequence_number)![e.channel] = e.new_value;
    });
    const seqs = [...bySeq.keys()].sort((a, b) => a - b);
    const state: Record<string, number> = { tiktok: 9000, newspaper: 1000 };
    return seqs.map((seq) => {
      const changes = bySeq.get(seq)!;
      Object.entries(changes).forEach(([ch, val]) => { state[ch] = val; });
      return { seq, tiktok: state.tiktok, newspaper: state.newspaper };
    });
  }, [events]);

  if (!events.length) {
    return <p className="text-xs text-muted-foreground py-4">Student made no allocation changes.</p>;
  }

  return (
    <div>
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="seq" tick={{ fontSize: 10 }} label={{ value: 'Change #', position: 'insideBottom', offset: -2, fontSize: 10 }} />
          <YAxis domain={[0, 12000]} tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 10 }} width={45} />
          <Tooltip formatter={(v: number) => `$${v.toLocaleString()}`} />
          <ReferenceLine y={9000} stroke="#888780" strokeDasharray="4 4" label={{ value: 'TikTok default', fontSize: 9, fill: '#888780' }} />
          <ReferenceLine y={1000} stroke="#888780" strokeDasharray="4 4" label={{ value: 'Newspaper default', fontSize: 9, fill: '#888780' }} />
          <Line type="monotone" dataKey="tiktok" name="TikTok" stroke="#C4622D" strokeWidth={2} dot={{ r: 3 }} />
          <Line type="monotone" dataKey="newspaper" name="Newspaper" stroke="#4A7C59" strokeWidth={2} dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ── Tab 3: AI Feedback ─────────────────────────── */
function AiFeedbackTab({ data }: { data: AiFeedback | null }) {
  if (!data) {
    return <p className="text-xs text-muted-foreground py-4">Student did not request AI feedback.</p>;
  }

  const quads = ['descriptive', 'diagnostic', 'prescriptive', 'predictive'] as const;

  const formatTime = (secs: number | null) => {
    if (secs == null) return '—';
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m} minute${m !== 1 ? 's' : ''} ${s} second${s !== 1 ? 's' : ''}`;
  };

  return (
    <div className="space-y-4">
      {/* Before */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground mb-2">Before feedback</p>
        <div className="flex gap-3">
          {quads.map((q) => {
            const key = `${q}_cards_before` as keyof AiFeedback;
            return (
              <div key={q} className="text-center">
                <p className="text-[10px] font-medium" style={{ color: QUAD_COLORS[q] }}>{QUAD_LABELS[q]}</p>
                <p className="text-sm font-bold" style={{ color: QUAD_COLORS[q] }}>{data[key] as number}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Feedback text */}
      {data.ai_feedback_text && (
        <div className="rounded-md p-3 bg-[#6B4F8A]/10 border border-[#6B4F8A]/20">
          <p className="text-xs text-foreground whitespace-pre-wrap leading-relaxed">{data.ai_feedback_text}</p>
        </div>
      )}

      {/* Action */}
      <p className="text-xs text-muted-foreground">
        Student chose to: <span className="font-semibold text-foreground">
          {data.post_feedback_action === 'adjusted' ? 'Adjust' : 'Submit immediately'}
        </span>
      </p>

      {/* After (if adjusted) */}
      {data.post_feedback_action === 'adjusted' && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-2">After feedback</p>
          <div className="flex gap-3">
            {quads.map((q) => {
              const beforeKey = `${q}_cards_before` as keyof AiFeedback;
              const afterKey = `${q}_cards_after` as keyof AiFeedback;
              const before = data[beforeKey] as number;
              const after = data[afterKey] as number | null;
              const increased = after != null && after > before;
              return (
                <div key={q} className="text-center">
                  <p className="text-[10px] font-medium" style={{ color: QUAD_COLORS[q] }}>{QUAD_LABELS[q]}</p>
                  <p className="text-sm font-bold inline-flex items-center gap-0.5" style={{ color: QUAD_COLORS[q] }}>
                    {after ?? '—'}
                    {increased && <ArrowUp className="h-3 w-3 text-[#4A7C59]" />}
                  </p>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Time adjusting: <span className="font-medium text-foreground">{formatTime(data.time_adjusting_seconds)}</span>
          </p>
        </div>
      )}
    </div>
  );
}

/* ── Tab 4: Navigation ──────────────────────────── */
function NavigationTab({ events }: { events: NavEvent[] }) {
  if (!events.length) {
    return <p className="text-xs text-muted-foreground py-4">No navigation data captured.</p>;
  }

  const formatDuration = (secs: number | null) => {
    if (secs == null) return '—';
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}m ${s}s`;
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-2 px-3 font-semibold text-muted-foreground">Tab</th>
            <th className="text-left py-2 px-3 font-semibold text-muted-foreground">Entered at</th>
            <th className="text-right py-2 px-3 font-semibold text-muted-foreground">Time spent</th>
            <th className="text-center py-2 px-3 font-semibold text-muted-foreground">Visit #</th>
          </tr>
        </thead>
        <tbody>
          {events.map((e, i) => (
            <tr key={i} className="border-b border-border/30 last:border-0">
              <td className="py-1.5 px-3 font-medium text-foreground capitalize">{e.tab.replace(/_/g, ' ')}</td>
              <td className="py-1.5 px-3 text-muted-foreground">{formatTime(e.entered_at)}</td>
              <td className="py-1.5 px-3 text-right text-muted-foreground">{formatDuration(e.time_spent_seconds)}</td>
              <td className="py-1.5 px-3 text-center text-muted-foreground">{e.visit_number ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
