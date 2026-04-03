import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { ArrowUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  sessionId: string;
  userId: string;
  onClose: () => void;
}

/* ── Colour tokens ────────────────────────────── */
const QUAD_COLORS: Record<string, string> = {
  descriptive: '#D4A017', diagnostic: '#C4622D', prescriptive: '#4A7C59', predictive: '#6B4F8A',
};
const QUAD_LABELS: Record<string, string> = {
  descriptive: 'Descriptive', diagnostic: 'Diagnostic', prescriptive: 'Prescriptive', predictive: 'Predictive',
};

/* ── Data interfaces ──────────────────────────── */
interface SessionData {
  started_at: string;
  completed_at: string | null;
  is_completed: boolean;
  tutorial_completed: boolean;
  tutorial_opened: boolean;
}

interface ProfileData {
  email: string | null;
}

interface SubData {
  descriptive_card_count: number;
  diagnostic_card_count: number;
  prescriptive_card_count: number;
  predictive_card_count: number;
  contextualise_pairs_count: number;
  final_tiktok_spend: number | null;
  final_instagram_spend: number | null;
  final_facebook_spend: number | null;
  final_newspaper_spend: number | null;
  feedback_rounds_used: number;
  generated_story: string | null;
  submitted_at: string;
}

interface AllocEvent {
  channel: string;
  new_value: number | null;
  sequence_number: number | null;
}

interface AiFeedback {
  ai_feedback_text: string | null;
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
}

interface NavEvent {
  tab: string;
  entered_at: string;
  time_spent_seconds: number | null;
  visit_number: number | null;
}

interface BoardCard {
  id?: string;
  label?: string;
  value?: string;
  context?: string;
  chipKind?: string;
  sourceId?: string;
  channelName?: string;
  metricName?: string;
  pairedWith?: string;
  paired_with?: string;
  createdAt?: number;
}

/* ── Decision logic ───────────────────────────── */
type DecisionOutcome = 'Correct' | 'Partial' | 'Incorrect' | 'Not submitted';

function getDecision(sub: SubData | null): DecisionOutcome {
  if (!sub) return 'Not submitted';
  const tkCorrect = (sub.final_tiktok_spend ?? 9000) <= 9000;
  const npCorrect = (sub.final_newspaper_spend ?? 1000) >= 1000;
  if (tkCorrect && npCorrect) return 'Correct';
  if (tkCorrect || npCorrect) return 'Partial';
  return 'Incorrect';
}

const DECISION_BADGE: Record<DecisionOutcome, { bg: string; text: string }> = {
  Correct: { bg: '#4A7C59', text: 'Correct decision' },
  Partial: { bg: '#D4A017', text: 'Partial decision' },
  Incorrect: { bg: '#C4622D', text: 'Incorrect decision' },
  'Not submitted': { bg: '#888780', text: 'Not submitted' },
};

/* ── Tutorial badge ───────────────────────────── */
function getTutorialBadge(session: SessionData | null) {
  if (!session) return { bg: '#888780', text: 'No session' };
  if (session.tutorial_completed) return { bg: '#6B4F8A', text: 'Tutorial completed' };
  if (session.tutorial_opened) return { bg: '#D4A017', text: 'Abandoned tutorial' };
  return { bg: '#888780', text: 'Tutorial skipped' };
}

const DETAIL_TABS = [
  { id: 'reasoning', label: 'Reasoning board' },
  { id: 'allocation', label: 'Allocation path' },
  { id: 'ai', label: 'AI feedback' },
  { id: 'navigation', label: 'Navigation' },
  { id: 'sequence', label: 'Board sequence' },
] as const;

type DetailTab = typeof DETAIL_TABS[number]['id'];

/* ══════════════════════════════════════════════════
   MAIN COMPONENT
   ══════════════════════════════════════════════════ */
export default function StudentDetailPanel({ sessionId, userId, onClose }: Props) {
  const [session, setSession] = useState<SessionData | null>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [sub, setSub] = useState<SubData | null>(null);
  const [allocEvents, setAllocEvents] = useState<AllocEvent[]>([]);
  const [aiFeedback, setAiFeedback] = useState<AiFeedback | null>(null);
  const [navEvents, setNavEvents] = useState<NavEvent[]>([]);
  const [hasFeedback, setHasFeedback] = useState(false);
  const [allocCount, setAllocCount] = useState(0);
  const [boardResets, setBoardResets] = useState(0);
  const [boardCards, setBoardCards] = useState<BoardCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<DetailTab>('reasoning');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);

      const [sessionRes, profileRes, subRes, allocRes, aiRes, navRes, resetRes, boardRes] = await Promise.all([
        supabase.from('sessions')
          .select('started_at, completed_at, is_completed, tutorial_completed, tutorial_opened')
          .eq('id', sessionId).single(),
        supabase.from('profiles')
          .select('email')
          .eq('id', userId).single(),
        supabase.from('submissions')
          .select('descriptive_card_count, diagnostic_card_count, prescriptive_card_count, predictive_card_count, contextualise_pairs_count, final_tiktok_spend, final_instagram_spend, final_facebook_spend, final_newspaper_spend, feedback_rounds_used, generated_story, submitted_at')
          .eq('session_id', sessionId).maybeSingle(),
        supabase.from('allocation_events')
          .select('channel, new_value, sequence_number')
          .eq('session_id', sessionId)
          .order('sequence_number', { ascending: true }),
        supabase.from('ai_feedback_events')
          .select('ai_feedback_text, post_feedback_action, time_adjusting_seconds, descriptive_cards_before, diagnostic_cards_before, prescriptive_cards_before, predictive_cards_before, descriptive_cards_after, diagnostic_cards_after, prescriptive_cards_after, predictive_cards_after')
          .eq('session_id', sessionId).maybeSingle(),
        supabase.from('navigation_events')
          .select('tab, entered_at, time_spent_seconds, visit_number')
          .eq('session_id', sessionId)
          .order('entered_at', { ascending: true }),
        supabase.from('resets')
          .select('id')
          .eq('session_id', sessionId)
          .eq('reset_type', 'board_reset'),
        supabase.from('reasoning_board_state')
          .select('cards')
          .eq('session_id', sessionId)
          .maybeSingle(),
      ]);

      if (!cancelled) {
        setSession(sessionRes.data as SessionData | null);
        setProfile(profileRes.data as ProfileData | null);
        setSub(subRes.data as SubData | null);
        const alloc = (allocRes.data ?? []) as AllocEvent[];
        setAllocEvents(alloc);
        setAllocCount(alloc.length);
        setAiFeedback(aiRes.data as AiFeedback | null);
        setHasFeedback(aiRes.data != null);
        setNavEvents((navRes.data ?? []) as NavEvent[]);
        setBoardResets((resetRes.data ?? []).length);

        // Parse board cards — can be object keyed by quadrant or an array
        const raw = boardRes.data?.cards;
        let parsedCards: BoardCard[] = [];
        if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
          // Object format: { descriptive: [...], diagnostic: [...], ... }
          const obj = raw as Record<string, BoardCard[]>;
          for (const [quadrant, cards] of Object.entries(obj)) {
            if (Array.isArray(cards)) {
              cards.forEach(c => parsedCards.push({ ...c, chipKind: c.chipKind, _quadrant: quadrant } as any));
            }
          }
        } else if (Array.isArray(raw)) {
          parsedCards = raw as BoardCard[];
        }
        setBoardCards(parsedCards);

        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [sessionId, userId]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-6 w-48 bg-muted/50 rounded animate-pulse" />
        <div className="grid grid-cols-5 gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-20 bg-muted/30 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const decision = getDecision(sub);
  const decisionBadge = DECISION_BADGE[decision];
  const tutorialBadge = getTutorialBadge(session);
  const feedbackBadge = hasFeedback
    ? { bg: '#4A7C59', text: 'AI feedback used' }
    : { bg: '#888780', text: 'No feedback' };

  // Duration
  let durationDisplay = '—';
  let startedTimeDisplay = '';
  if (session) {
    if (session.started_at) {
      startedTimeDisplay = `started ${new Date(session.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    if (session.completed_at && session.started_at) {
      const mins = (new Date(session.completed_at).getTime() - new Date(session.started_at).getTime()) / 60000;
      durationDisplay = `${mins.toFixed(1)}m`;
    }
  }

  // Cards placed
  const totalCards = sub
    ? sub.descriptive_card_count + sub.diagnostic_card_count + sub.prescriptive_card_count + sub.predictive_card_count
    : 0;
  const filledQuadrants = sub
    ? [sub.descriptive_card_count, sub.diagnostic_card_count, sub.prescriptive_card_count, sub.predictive_card_count].filter(c => c > 0).length
    : 0;

  // Date display
  const dateDisplay = session?.started_at
    ? new Date(session.started_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : '';

  return (
    <div className="space-y-5">
      {/* ── ROW 2: Email + scenario date + badges ────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-foreground">
            {profile?.email ?? 'Unknown'}
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            LumbarPro · {dateDisplay}
          </p>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          {[decisionBadge, tutorialBadge, feedbackBadge].map((badge, i) => (
            <span
              key={i}
              className="inline-block px-2.5 py-1 rounded-full text-[10px] font-bold text-white whitespace-nowrap"
              style={{ backgroundColor: badge.bg }}
            >
              {badge.text}
            </span>
          ))}
        </div>
      </div>

      {/* ── SUMMARY STAT CARDS ───────────────────────── */}
      <div className="grid grid-cols-5 gap-3">
        <StatCard label="Duration" value={durationDisplay} sub={startedTimeDisplay} />
        <StatCard label="Cards placed" value={String(totalCards)} sub={`across ${filledQuadrants}/4 quadrants`} />
        <StatCard label="Contextualise pairs" value={String(sub?.contextualise_pairs_count ?? 0)} />
        <StatCard label="Allocation changes" value={String(allocCount)} />
        <StatCard label="Board resets" value={String(boardResets)} />
      </div>

      {/* ── TAB BAR ────────────────────────────────── */}
      <div className="border-b border-border">
        <div className="flex">
          {DETAIL_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'text-xs py-2 px-3.5 cursor-pointer transition-colors whitespace-nowrap',
                activeTab === tab.id
                  ? 'text-[#6B4F8A] border-b-2 border-[#6B4F8A] font-medium'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── TAB CONTENT ──────────────────────────────── */}
      <div className="pt-1">
        {activeTab === 'reasoning' && <ReasoningBoardTab cards={boardCards} generatedStory={sub?.generated_story ?? null} />}
        {activeTab === 'allocation' && <AllocationPathTab events={allocEvents} />}
        {activeTab === 'ai' && <AiFeedbackTab data={aiFeedback} />}
        {activeTab === 'navigation' && <NavigationTab events={navEvents} />}
        {activeTab === 'sequence' && (
          <p className="text-xs text-muted-foreground py-4">Loading Board sequence...</p>
        )}
      </div>
    </div>
  );
}

/* ── Stat Card ──────────────────────────────────── */
function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-muted/30 rounded-lg p-3">
      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="text-xl font-medium text-foreground mt-1">{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
    </div>
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

      {data.ai_feedback_text && (
        <div className="rounded-md p-3 bg-[#6B4F8A]/10 border border-[#6B4F8A]/20">
          <p className="text-xs text-foreground whitespace-pre-wrap leading-relaxed">{data.ai_feedback_text}</p>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Student chose to: <span className="font-semibold text-foreground">
          {data.post_feedback_action === 'adjusted' ? 'Adjust' : 'Submit immediately'}
        </span>
      </p>

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

  const formatTimeStr = (iso: string) => {
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
              <td className="py-1.5 px-3 text-muted-foreground">{formatTimeStr(e.entered_at)}</td>
              <td className="py-1.5 px-3 text-right text-muted-foreground">{formatDuration(e.time_spent_seconds)}</td>
              <td className="py-1.5 px-3 text-center text-muted-foreground">{e.visit_number ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
