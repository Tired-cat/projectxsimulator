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
  requested_at: string;
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
  exited_at: string | null;
  time_spent_seconds: number | null;
  visit_number: number | null;
}

interface BoardEvent {
  event_type: string;
  evidence_id: string | null;
  evidence_type: string | null;
  quadrant: string | null;
  paired_with: string | null;
  sequence_number: number | null;
  created_at: string;
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
  annotation?: string;
  contextChip?: BoardCard;
  contextChips?: BoardCard[];
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
  const [boardEvents, setBoardEvents] = useState<BoardEvent[]>([]);
  const [writtenDiagnosis, setWrittenDiagnosis] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<DetailTab>('reasoning');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);

      const [sessionRes, profileRes, subRes, allocRes, aiRes, navRes, resetRes, boardRes, boardEventsRes] = await Promise.all([
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
          .select('ai_feedback_text, post_feedback_action, time_adjusting_seconds, requested_at, descriptive_cards_before, diagnostic_cards_before, prescriptive_cards_before, predictive_cards_before, descriptive_cards_after, diagnostic_cards_after, prescriptive_cards_after, predictive_cards_after')
          .eq('session_id', sessionId).maybeSingle(),
        supabase.from('navigation_events')
          .select('tab, entered_at, exited_at, time_spent_seconds, visit_number')
          .eq('session_id', sessionId)
          .order('entered_at', { ascending: true }),
        supabase.from('resets')
          .select('id')
          .eq('session_id', sessionId)
          .eq('reset_type', 'board_reset'),
        supabase.from('reasoning_board_state')
          .select('cards, written_diagnosis')
          .eq('session_id', sessionId)
          .maybeSingle(),
        supabase.from('board_events')
          .select('event_type, evidence_id, evidence_type, quadrant, paired_with, sequence_number, created_at')
          .eq('session_id', sessionId)
          .order('sequence_number', { ascending: true })
          .order('created_at', { ascending: true }),
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
        setWrittenDiagnosis((boardRes.data as any)?.written_diagnosis ?? null);
        setBoardEvents((boardEventsRes.data ?? []) as BoardEvent[]);

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
        {activeTab === 'reasoning' && <ReasoningBoardTab cards={boardCards} generatedStory={sub?.generated_story ?? null} writtenDiagnosis={writtenDiagnosis} />}
        {activeTab === 'allocation' && <AllocationPathTab events={allocEvents} sub={sub} sessionId={sessionId} />}
        {activeTab === 'ai' && <AiFeedbackTab data={aiFeedback} />}
        {activeTab === 'navigation' && <NavigationTab events={navEvents} />}
        {activeTab === 'sequence' && <BoardSequenceTab events={boardEvents} />}
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

/* ── Helper: format evidence_id for display ───── */
function formatEvidenceId(id: string): string {
  return id.replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase());
}

/* ── Tab 1: Reasoning Board ─────────────────────── */
const QUADRANT_ORDER = ['descriptive', 'diagnostic', 'prescriptive', 'predictive'] as const;


function ReasoningBoardTab({ cards, generatedStory }: { cards: BoardCard[]; generatedStory: string | null }) {
  const byQuadrant = useMemo(() => {
    const map: Record<string, BoardCard[]> = {
      descriptive: [], diagnostic: [], prescriptive: [], predictive: [],
    };
    cards.forEach(card => {
      const q = (card as any)._quadrant ?? 'descriptive';
      if (map[q]) map[q].push(card);
    });
    return map;
  }, [cards]);



  if (cards.length === 0) {
    return <p className="text-xs text-muted-foreground py-4 italic">No evidence was placed on the reasoning board.</p>;
  }

  return (
    <div className="space-y-5">
      {/* 2×2 Grid */}
      <div className="grid grid-cols-2 gap-3">
        {QUADRANT_ORDER.map(q => {
          const qCards = byQuadrant[q];
          const color = QUAD_COLORS[q];
          return (
            <div
              key={q}
              className="rounded-[10px] border p-3"
              style={{ borderColor: color + '66', backgroundColor: color + '14' }}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                  <span className="text-[11px] font-medium" style={{ color }}>{QUAD_LABELS[q]}</span>
                </div>
                <span className="text-[10px] text-muted-foreground">
                  {qCards.length > 0 ? `${qCards.length} card${qCards.length !== 1 ? 's' : ''}` : 'empty'}
                </span>
              </div>

              {qCards.length === 0 ? (
                <p className="text-[10px] italic text-muted-foreground">(empty — no evidence placed here)</p>
              ) : (
                <div className="space-y-1.5">
                  {qCards.map((card, i) => {
                    const displayLabel = card.label || formatEvidenceId(card.sourceId || card.id || `card-${i}`);
                    const hasContext = card.contextChip || (card.contextChips && card.contextChips.length > 0);
                    const contextCards = card.contextChips ?? (card.contextChip ? [card.contextChip] : []);

                    return (
                      <div
                        key={i}
                        className="rounded-md bg-white/80 dark:bg-background/80 px-2.5 py-[7px]"
                        style={{
                          border: `0.5px solid ${color}4D`,
                          borderBottomWidth: hasContext ? '2px' : '0.5px',
                          borderBottomColor: hasContext ? color : `${color}4D`,
                        }}
                      >
                        <p className="text-[11px] font-medium leading-snug" style={{ color }}>{displayLabel}</p>
                        {card.value && (
                          <p className="text-[10px] text-muted-foreground mt-0.5">{card.value}</p>
                        )}
                        {card.annotation && (
                          <p className="text-[10px] italic text-foreground/60 mt-1 leading-snug border-t border-border/30 pt-1">
                            "{card.annotation}"
                          </p>
                        )}
                        {contextCards.length > 0 && contextCards.map((ctx, ci) => (
                          <div key={ci} className="flex items-center gap-1 mt-1.5">
                            <span className="inline-flex items-center gap-0">
                              <span className="inline-block w-[7px] h-[7px] rounded-sm border border-muted-foreground/40" />
                              <span className="inline-block w-[7px] h-[7px] rounded-sm border border-muted-foreground/40 -ml-[3px]" />
                            </span>
                            <span className="text-[10px] italic text-muted-foreground">
                              Contextualised with → {ctx.label || formatEvidenceId(ctx.sourceId || ctx.id || '')}
                            </span>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Reasoning Story */}
      <hr className="border-border" />
      <div>
        <p className="text-xs font-medium text-foreground mb-2">My Full Reasoning Story</p>
        <ReasoningStoryBlocks generatedStory={generatedStory} />
      </div>
    </div>
  );
}

const STORY_BLOCK_STYLES = [
  { bg: '#FAEEDA', border: '#D4A017', color: '#854F0B', label: 'Descriptive' },
  { bg: '#FAECE7', border: '#C4622D', color: '#993C1D', label: 'Diagnostic' },
  { bg: '#EAF3DE', border: '#4A7C59', color: '#3B6D11', label: 'Prescriptive' },
  { bg: '#EEEDFE', border: '#6B4F8A', color: '#3C3489', label: 'Predictive' },
];
const MISSING_PLACEHOLDER = '(No reasoning captured for this step)';

function ReasoningStoryBlocks({ generatedStory }: { generatedStory: string | null }) {
  if (!generatedStory) {
    return <p className="text-[11px] text-muted-foreground italic">No reasoning story was generated for this submission.</p>;
  }

  const rawChunks = generatedStory.split(/\.\s+/).map(s => s.trim()).filter(s => s.length > 0);

  // Normalize to exactly 4 blocks
  let blocks: string[];
  if (rawChunks.length >= 4) {
    blocks = [
      rawChunks[0],
      rawChunks[1],
      rawChunks[2],
      rawChunks.slice(3).join('. '),
    ];
  } else {
    blocks = [...rawChunks];
    while (blocks.length < 4) blocks.push(MISSING_PLACEHOLDER);
  }

  // Ensure trailing periods
  blocks = blocks.map(b => b === MISSING_PLACEHOLDER ? b : (b.endsWith('.') ? b : b + '.'));

  const hasMissing = blocks.some(b => b === MISSING_PLACEHOLDER);

  return (
    <div>
      <div className="flex flex-col gap-1">
        {blocks.map((text, i) => {
          const style = STORY_BLOCK_STYLES[i];
          return (
            <div
              key={i}
              className="rounded-r-[5px] py-2 px-2.5 border-l-2"
              style={{
                backgroundColor: style.bg,
                borderLeftColor: style.border,
                color: text === MISSING_PLACEHOLDER ? '#888780' : style.color,
                fontStyle: text === MISSING_PLACEHOLDER ? 'italic' : 'normal',
                fontSize: '11px',
                lineHeight: 1.6,
              }}
            >
              {text}
            </div>
          );
        })}
      </div>
      {hasMissing && (
        <p className="text-[10px] text-[#D4A017] mt-2">
          One or more reasoning steps were not captured in the generated story.
        </p>
      )}
    </div>
  );
}

const ALLOC_DEFAULTS: Record<string, number> = { tiktok: 9000, instagram: 5500, facebook: 4500, newspaper: 1000 };
const ALLOC_CHANNEL_LABELS: Record<string, string> = { tiktok: 'TikTok', instagram: 'Instagram', facebook: 'Facebook', newspaper: 'Newspaper' };

function AllocationPathTab({ events, sub, sessionId }: { events: AllocEvent[]; sub: SubData | null; sessionId: string }) {
  const [allocResets, setAllocResets] = useState(0);

  useEffect(() => {
    (async () => {
      const { count } = await supabase
        .from('resets')
        .select('id', { count: 'exact', head: true })
        .eq('session_id', sessionId)
        .eq('reset_type', 'allocation_reset');
      setAllocResets(count ?? 0);
    })();
  }, [sessionId]);

  /* ── Budget comparison cards ────────────────── */
  const finalValues = useMemo(() => {
    const state = { ...ALLOC_DEFAULTS };
    events.forEach(e => {
      const ch = e.channel?.toLowerCase();
      if (ch && e.new_value != null) state[ch] = e.new_value;
    });
    return state;
  }, [events]);

  /* ── Line chart data ────────────────────────── */
  const chartData = useMemo(() => {
    if (!events.length) return [];
    const seqSet = new Set<number>();
    events.forEach(e => { if (e.sequence_number != null) seqSet.add(e.sequence_number); });
    const seqs = [...seqSet].sort((a, b) => a - b);

    const state = { tiktok: ALLOC_DEFAULTS.tiktok, newspaper: ALLOC_DEFAULTS.newspaper };
    const bySeq = new Map<number, Record<string, number>>();
    events.forEach(e => {
      if (e.sequence_number == null || e.new_value == null) return;
      if (!bySeq.has(e.sequence_number)) bySeq.set(e.sequence_number, {});
      bySeq.get(e.sequence_number)![e.channel.toLowerCase()] = e.new_value;
    });

    const points = [{ label: 'Start', tiktok: state.tiktok, newspaper: state.newspaper }];
    seqs.forEach((seq, i) => {
      const changes = bySeq.get(seq);
      if (changes) {
        if (changes.tiktok != null) state.tiktok = changes.tiktok;
        if (changes.newspaper != null) state.newspaper = changes.newspaper;
      }
      points.push({ label: `Change ${i + 1}`, tiktok: state.tiktok, newspaper: state.newspaper });
    });

    points.push({ label: 'Submit', tiktok: state.tiktok, newspaper: state.newspaper });
    return points;
  }, [events]);

  /* ── Decision outcome ───────────────────────── */
  const noChanges = events.length === 0;
  const tkFinal = finalValues.tiktok;
  const npFinal = finalValues.newspaper;
  const tkCorrect = tkFinal < ALLOC_DEFAULTS.tiktok;
  const npCorrect = npFinal > ALLOC_DEFAULTS.newspaper;

  type OutcomeKey = 'correct' | 'partial' | 'incorrect' | 'nochange';
  const outcome: OutcomeKey = noChanges ? 'nochange' : (tkCorrect && npCorrect ? 'correct' : (tkCorrect || npCorrect ? 'partial' : 'incorrect'));
  const OUTCOME_STYLE: Record<OutcomeKey, { color: string; text: string }> = {
    correct: { color: '#4A7C59', text: 'Correct direction — reduced TikTok and increased Newspaper.' },
    partial: { color: '#D4A017', text: 'Partial — only one of the two correct moves was made.' },
    incorrect: { color: '#C4622D', text: 'Incorrect — budget was not moved in the right direction.' },
    nochange: { color: '#888780', text: 'No changes made.' },
  };

  if (noChanges) {
    return <p className="text-xs text-muted-foreground py-4 italic">This student made no allocation changes — they submitted the default budget.</p>;
  }

  const maxBar = 10000;

  /* ── Table data from submissions ────────────── */
  const TABLE_CHANNELS = [
    { key: 'tiktok', label: 'TikTok', default: 9000, subKey: 'final_tiktok_spend' as keyof SubData, direction: 'decrease' },
    { key: 'instagram', label: 'Instagram', default: 5500, subKey: 'final_instagram_spend' as keyof SubData, direction: 'neutral' },
    { key: 'facebook', label: 'Facebook', default: 4500, subKey: 'final_facebook_spend' as keyof SubData, direction: 'neutral' },
    { key: 'newspaper', label: 'Newspaper', default: 1000, subKey: 'final_newspaper_spend' as keyof SubData, direction: 'increase' },
  ] as const;

  function getDeltaColor(delta: number, direction: string): string {
    if (delta === 0) return '#888780';
    if (direction === 'neutral') return '#888780';
    if (direction === 'decrease') return delta < 0 ? '#4A7C59' : '#C4622D'; // TikTok: decrease = good
    return delta > 0 ? '#4A7C59' : '#C4622D'; // Newspaper: increase = good
  }

  return (
    <div className="space-y-5">
      {/* ── Budget allocation cards ──────────────── */}
      <div>
        <p className="text-xs font-medium text-foreground mb-3">Budget allocation: default → final</p>
        <div className="grid grid-cols-2 gap-3">
          {(['tiktok', 'newspaper', 'instagram', 'facebook'] as const).map(ch => {
            const def = ALLOC_DEFAULTS[ch];
            const fin = finalValues[ch];
            const diff = fin - def;
            const changed = diff !== 0;
            const isIncrease = diff > 0;
            return (
              <div key={ch} className="rounded-lg border border-border/50 p-3">
                <div className="flex items-center gap-1.5 mb-2">
                  <p className="text-[11px] font-medium text-foreground">{ALLOC_CHANNEL_LABELS[ch]}</p>
                  {changed ? (
                    <span className="text-[11px] font-medium" style={{ color: isIncrease ? '#C4622D' : '#4A7C59' }}>
                      {isIncrease ? '↑' : '↓'} {isIncrease ? '+' : ''}${diff.toLocaleString()}
                    </span>
                  ) : (
                    <span className="text-[10px] text-muted-foreground">no change</span>
                  )}
                </div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] text-muted-foreground w-10 shrink-0">Default</span>
                  <div className="flex-1 h-3 bg-muted/30 rounded overflow-hidden">
                    <div className="h-full rounded" style={{ width: `${(def / maxBar) * 100}%`, backgroundColor: '#888780' }} />
                  </div>
                  <span className="text-[10px] text-muted-foreground w-12 text-right">${def.toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground w-10 shrink-0">Final</span>
                  <div className="flex-1 h-3 bg-muted/30 rounded overflow-hidden">
                    <div className="h-full rounded" style={{
                      width: `${(fin / maxBar) * 100}%`,
                      backgroundColor: !changed ? '#888780' : (ch === 'tiktok' ? '#A32D2D' : ch === 'newspaper' ? '#4A7C59' : '#888780'),
                    }} />
                  </div>
                  <span className="text-[10px] text-muted-foreground w-12 text-right">${fin.toLocaleString()}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Decision path line chart ────────────── */}
      <div>
        <p className="text-xs font-medium text-foreground mb-3">Decision path — TikTok & Newspaper spend over time</p>
        <div style={{ height: 220 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10 }}
                interval={chartData.length > 10 ? 1 : 0}
                angle={chartData.length > 8 ? -30 : 0}
                textAnchor={chartData.length > 8 ? 'end' : 'middle'}
                height={chartData.length > 8 ? 50 : 30}
              />
              <YAxis
                domain={[0, 12000]}
                ticks={[0, 3000, 6000, 9000, 12000]}
                tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`}
                tick={{ fontSize: 10 }}
                width={40}
              />
              <Tooltip formatter={(v: number) => `$${v.toLocaleString()}`} />
              <ReferenceLine y={9000} stroke="#88878088" strokeDasharray="6 4" label={{ value: 'TikTok default $9k', position: 'right', fontSize: 9, fill: '#888780' }} />
              <ReferenceLine y={1000} stroke="#88878088" strokeDasharray="6 4" label={{ value: 'Newspaper default $1k', position: 'right', fontSize: 9, fill: '#888780' }} />
              <Line type="monotone" dataKey="tiktok" name="TikTok spend" stroke="#A32D2D" strokeWidth={2} dot={{ r: 4, fill: '#A32D2D' }} />
              <Line type="monotone" dataKey="newspaper" name="Newspaper spend" stroke="#4A7C59" strokeWidth={2} dot={{ r: 4, fill: '#4A7C59' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="flex items-center gap-4 mt-2 justify-center">
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <span className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: '#A32D2D' }} />
            TikTok spend
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <span className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: '#4A7C59' }} />
            Newspaper spend
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <span className="w-6 border-t-2 border-dashed" style={{ borderColor: '#888780' }} />
            Default value
          </div>
        </div>
      </div>

      {/* ── Outcome summary ─────────────────────── */}
      <p className="text-xs font-medium" style={{ color: OUTCOME_STYLE[outcome].color }}>
        {OUTCOME_STYLE[outcome].text}
      </p>

      {/* ── Default vs. final allocation table ───── */}
      <div>
        <p className="text-xs font-medium text-foreground mb-2">Default vs. final allocation</p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 px-3 font-semibold text-muted-foreground">Channel</th>
                <th className="text-right py-2 px-3 font-semibold text-muted-foreground">Default</th>
                <th className="text-right py-2 px-3 font-semibold text-muted-foreground">Final</th>
                <th className="text-right py-2 px-3 font-semibold text-muted-foreground">Change</th>
              </tr>
            </thead>
            <tbody>
              {TABLE_CHANNELS.map(ch => {
                const finalVal = sub ? (sub[ch.subKey] as number | null) : null;
                const hasValue = finalVal != null;
                const delta = hasValue ? finalVal - ch.default : 0;
                return (
                  <tr key={ch.key} className="border-b border-border/30 last:border-0">
                    <td className="py-1.5 px-3 font-medium text-foreground">{ch.label}</td>
                    <td className="py-1.5 px-3 text-right text-muted-foreground">${ch.default.toLocaleString()}</td>
                    <td className="py-1.5 px-3 text-right text-muted-foreground">
                      {hasValue ? `$${finalVal.toLocaleString()}` : '—'}
                    </td>
                    <td className="py-1.5 px-3 text-right font-medium" style={{ color: !hasValue ? '#888780' : getDeltaColor(delta, ch.direction) }}>
                      {!hasValue ? '—' : delta === 0 ? '—' : (
                        <>
                          {delta > 0 ? '↑' : '↓'} {delta > 0 ? '+' : '−'}${Math.abs(delta).toLocaleString()}
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Allocation resets ────────────────────── */}
      {allocResets > 0 && (
        <div className="flex items-start gap-2 p-3 rounded-md bg-amber-50 border border-amber-200">
          <span className="text-amber-600 shrink-0 mt-0.5">⟳</span>
          <p className="text-xs text-amber-800">
            This student reset the budget allocation {allocResets} time{allocResets !== 1 ? 's' : ''} during their session.
          </p>
        </div>
      )}
    </div>
  );
}

/* ── Tab 3: AI Feedback ─────────────────────────── */
function AiFeedbackTab({ data }: { data: AiFeedback | null }) {
  if (!data) {
    return <p className="text-xs text-muted-foreground py-6 text-center italic">This student did not request AI feedback during their session.</p>;
  }

  const quads = ['descriptive', 'diagnostic', 'prescriptive', 'predictive'] as const;
  const submittedImmediately = data.post_feedback_action === 'submitted_immediately' || data.post_feedback_action !== 'adjusted';
  const hasAfter = !submittedImmediately && data.descriptive_cards_after != null;

  const requestedTime = new Date(data.requested_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const timingLabel = submittedImmediately
    ? 'Submitted immediately'
    : data.time_adjusting_seconds != null
      ? `${Math.floor(data.time_adjusting_seconds / 60)} min ${data.time_adjusting_seconds % 60} sec adjusting time`
      : '—';

  return (
    <div className="space-y-5">
      {/* SECTION 1 — Timing */}
      <p className="text-[10px] text-muted-foreground">
        Feedback requested {requestedTime} · {timingLabel}
      </p>

      {/* SECTION 2 — Before / After comparison */}
      <div className="flex items-stretch gap-4">
        {/* Before */}
        <div className="flex-1">
          <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Before feedback</p>
          <div className="space-y-1.5">
            {quads.map(q => {
              const count = data[`${q}_cards_before` as keyof AiFeedback] as number;
              return (
                <div key={q} className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: QUAD_COLORS[q] }} />
                  <span className="text-[11px]" style={{ color: QUAD_COLORS[q] }}>{QUAD_LABELS[q]}:</span>
                  <span className="text-[11px] font-medium" style={{ color: count === 0 ? '#C4622D' : 'inherit' }}>
                    {count} card{count !== 1 ? 's' : ''}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Arrow */}
        <div className="flex items-center justify-center px-2">
          <span className="text-lg text-muted-foreground">→</span>
        </div>

        {/* After */}
        <div className="flex-1">
          <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">After feedback</p>
          {!hasAfter ? (
            <p className="text-[11px] text-muted-foreground italic">Student submitted immediately — no changes made.</p>
          ) : (
            <div className="space-y-1.5">
              {quads.map(q => {
                const before = data[`${q}_cards_before` as keyof AiFeedback] as number;
                const after = data[`${q}_cards_after` as keyof AiFeedback] as number | null;
                const val = after ?? before;
                const increased = after != null && after > before;
                const decreased = after != null && after < before;
                return (
                  <div key={q} className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: QUAD_COLORS[q] }} />
                    <span className="text-[11px]" style={{ color: QUAD_COLORS[q] }}>{QUAD_LABELS[q]}:</span>
                    <span
                      className="text-[11px]"
                      style={{
                        color: increased ? '#0F6E56' : decreased ? '#D4A017' : 'inherit',
                        fontWeight: increased || decreased ? 500 : 400,
                      }}
                    >
                      {val} card{val !== 1 ? 's' : ''}{increased ? ' ↑' : decreased ? ' ↓' : ''}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* SECTION 3 — AI feedback text */}
      {data.ai_feedback_text && (
        <div>
          <p className="text-xs font-medium text-foreground mb-2">Feedback shown to student</p>
          <div
            className="rounded-r-lg py-3 px-3.5 border-l-[3px]"
            style={{
              backgroundColor: '#EEEDFE',
              borderLeftColor: '#6B4F8A',
              color: '#3C3489',
              fontSize: '12px',
              lineHeight: 1.6,
            }}
          >
            <p className="whitespace-pre-wrap">{data.ai_feedback_text}</p>
          </div>
        </div>
      )}

      {/* SECTION 4 — Post-feedback action summary */}
      <div className="text-[11px] text-muted-foreground">
        <p>
          Student chose to: <span className="font-medium text-foreground">
            {submittedImmediately ? 'Submit immediately' : 'Adjust and continue their work'}
          </span>
        </p>
        <p className="mt-1">
          {submittedImmediately
            ? 'They read the feedback and submitted without making any further changes.'
            : data.time_adjusting_seconds != null
              ? `They spent ${(data.time_adjusting_seconds / 60).toFixed(1)} minutes adjusting before submitting.`
              : 'They returned to adjust before submitting.'
          }
        </p>
      </div>
    </div>
  );
}
function NavigationTab({ events }: { events: NavEvent[] }) {
  if (!events.length) {
    return <p className="text-xs text-muted-foreground py-4 italic">No navigation data was captured for this session.</p>;
  }

  const TAB_LABELS: Record<string, string> = {
    home: 'Home', my_decisions: 'My Decisions', reasoning_board: 'Reasoning Board',
  };

  const formatDuration = (secs: number | null) => {
    if (secs == null) return '—';
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}m ${s}s`;
  };

  const formatTimeStr = (iso: string | null) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  function getNote(e: NavEvent): string {
    const tab = e.tab.toLowerCase();
    const visit = e.visit_number ?? 1;
    const secs = e.time_spent_seconds;
    if (tab === 'home' && visit === 1) return 'Session started';
    if (tab === 'reasoning_board' && visit === 1) return 'First visit to board';
    if (tab === 'my_decisions' && visit > 1) return 'Returned to check data';
    if (secs != null && secs > 600) return 'Long time here — may have been stuck or very engaged';
    if (secs != null && secs < 60 && tab === 'reasoning_board') return 'Very brief board visit';
    return '';
  }

  const totalSeconds = events.reduce((sum, e) => sum + (e.time_spent_seconds ?? 0), 0);

  // Pattern observations
  const observations: { text: string; amber?: boolean }[] = [];
  const decisionVisits = events.filter(e => e.tab.toLowerCase() === 'my_decisions').length;
  const hasBoard = events.some(e => e.tab.toLowerCase() === 'reasoning_board');
  if (decisionVisits > 1) {
    observations.push({ text: `This student returned to My Decisions ${decisionVisits} times — they cross-referenced data while building their reasoning board.` });
  }
  if (!hasBoard) {
    observations.push({ text: 'This student never reached the Reasoning Board tab.', amber: true });
  }
  const firstBoardIdx = events.findIndex(e => e.tab.toLowerCase() === 'reasoning_board');
  const firstDecisionsIdx = events.findIndex(e => e.tab.toLowerCase() === 'my_decisions');
  if (firstBoardIdx !== -1 && (firstDecisionsIdx === -1 || firstBoardIdx < firstDecisionsIdx)) {
    observations.push({ text: 'This student went to the Reasoning Board before exploring My Decisions — they may have missed important data.', amber: true });
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <table className="w-full text-[11px]">
          <thead>
            <tr className="bg-muted/40">
              <th className="text-left py-1.5 px-3 text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Tab</th>
              <th className="text-center py-1.5 px-3 text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Visit #</th>
              <th className="text-left py-1.5 px-3 text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Time in</th>
              <th className="text-left py-1.5 px-3 text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Time out</th>
              <th className="text-right py-1.5 px-3 text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Duration</th>
              <th className="text-left py-1.5 px-3 text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Notes</th>
            </tr>
          </thead>
          <tbody>
            {events.map((e, i) => {
              const tabLabel = TAB_LABELS[e.tab.toLowerCase()] ?? e.tab.replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase());
              const note = getNote(e);
              return (
                <tr key={i} className={i % 2 === 1 ? 'bg-muted/20' : ''}>
                  <td className="py-[7px] px-3 font-medium text-foreground">{tabLabel}</td>
                  <td className="py-[7px] px-3 text-center text-muted-foreground">{e.visit_number ?? '—'}</td>
                  <td className="py-[7px] px-3 text-muted-foreground">{formatTimeStr(e.entered_at)}</td>
                  <td className="py-[7px] px-3 text-muted-foreground">{formatTimeStr(e.exited_at)}</td>
                  <td className="py-[7px] px-3 text-right text-muted-foreground">{formatDuration(e.time_spent_seconds)}</td>
                  <td className="py-[7px] px-3 text-muted-foreground italic">{note}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-[10px] text-muted-foreground">Total tracked: {formatDuration(totalSeconds)}</p>

      {observations.length > 0 && (
        <div className="space-y-1.5">
          {observations.map((obs, i) => (
            <p key={i} className="text-[10px] leading-relaxed" style={{ color: obs.amber ? '#D4A017' : undefined }}>
              {obs.amber ? '⚠ ' : '• '}{obs.text}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Tab 5: Board Sequence ──────────────────────── */
const EVENT_TYPE_LABELS: Record<string, string> = {
  drag_to_board: 'drag', contextualise: 'contextualise', remove_card: 'removed card', clear_board: 'cleared board', move_on_board: 'moved',
};

function getDotStyle(event: BoardEvent): { color: string; size: number } {
  if (event.event_type === 'contextualise') return { color: '#6B4F8A', size: 10 };
  if (event.event_type === 'remove_card') return { color: '#888780', size: 8 };
  if (event.event_type === 'clear_board') return { color: '#A32D2D', size: 8 };
  const q = event.quadrant?.toLowerCase() ?? '';
  return { color: QUAD_COLORS[q] ?? '#888780', size: 8 };
}

function getEventDescription(e: BoardEvent): string {
  const eid = e.evidence_id ? formatEvidenceId(e.evidence_id) : '';
  const quad = e.quadrant ? e.quadrant.charAt(0).toUpperCase() + e.quadrant.slice(1) : '';
  switch (e.event_type) {
    case 'drag_to_board':
    case 'move_on_board':
      return `${eid} → ${quad}`;
    case 'contextualise':
      return `${eid} ↔ ${e.paired_with ? formatEvidenceId(e.paired_with) : '?'} — paired in ${quad}`;
    case 'remove_card':
      return `${eid} removed from ${quad}`;
    case 'clear_board':
      return 'Entire board cleared';
    default:
      return `${e.event_type}: ${eid}`;
  }
}

function getEventNote(e: BoardEvent): string | null {
  const eid = (e.evidence_id ?? '').toLowerCase();
  const seq = e.sequence_number ?? 0;
  if (seq === 1 && eid.includes('_views')) return 'First drag was a views item — student started with the views framing';
  if (seq === 1 && eid.includes('_revenue')) return 'First drag was revenue data — student led with the right metric';
  if (e.event_type === 'contextualise') return 'Contextualise used — student paired two pieces of evidence';
  if (e.event_type === 'remove_card') return 'Student removed a card — may have changed their reasoning';
  if (e.event_type === 'clear_board') return 'Full board reset — student started their reasoning over';
  if (eid === 'pro_chair_tiktok') return 'Note: Pro Chair from TikTok was dragged — BUG-02 may have been resolved for this student';
  return null;
}

function BoardSequenceTab({ events }: { events: BoardEvent[] }) {
  if (!events.length) {
    return <p className="text-xs text-muted-foreground py-4 italic">No board interaction data was captured for this session.</p>;
  }

  const dragCount = events.filter(e => e.event_type === 'drag_to_board' || e.event_type === 'move_on_board').length;
  const contextCount = events.filter(e => e.event_type === 'contextualise').length;
  const removeCount = events.filter(e => e.event_type === 'remove_card').length;
  const clearCount = events.filter(e => e.event_type === 'clear_board').length;

  return (
    <div className="space-y-4">
      <p className="text-xs font-medium text-foreground">Exact order every card was placed on the board</p>
      <div className="relative pl-6" style={{ minHeight: 40 }}>
        <div className="absolute left-[5px] top-2 bottom-2 w-px" style={{ backgroundColor: 'hsl(var(--border))' }} />
        {events.map((e, i) => {
          const dot = getDotStyle(e);
          const desc = getEventDescription(e);
          const note = getEventNote(e);
          const timeStr = new Date(e.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
          const label = EVENT_TYPE_LABELS[e.event_type] ?? e.event_type;
          const seqLabel = e.sequence_number ? `#${e.sequence_number}` : '';
          return (
            <div key={i} className="relative mb-3.5">
              <span
                className="absolute rounded-full"
                style={{
                  width: dot.size, height: dot.size, backgroundColor: dot.color,
                  left: -(24 - (dot.size / 2)) + 5, top: 3,
                }}
              />
              <div>
                <p className="text-[10px] text-muted-foreground">{timeStr} · {label} {seqLabel}</p>
                <p className="text-[11px] font-medium text-foreground mt-0.5">{desc}</p>
                {note && <p className="text-[10px] text-muted-foreground italic mt-0.5">{note}</p>}
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-[10px] text-muted-foreground">
        {dragCount} drag event{dragCount !== 1 ? 's' : ''} · {contextCount} Contextualise pair{contextCount !== 1 ? 's' : ''} · {removeCount} removal{removeCount !== 1 ? 's' : ''}{clearCount > 0 ? ` · ${clearCount} board clear${clearCount !== 1 ? 's' : ''}` : ''}
      </p>
    </div>
  );
}
