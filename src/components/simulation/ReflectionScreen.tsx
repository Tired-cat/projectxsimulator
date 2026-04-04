import { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Send } from 'lucide-react';
import { buildFullReasoningStory } from '@/components/reasoning/ReasoningNarrative';
import type { ReasoningBoardState, ReasoningBlockId, EvidenceChip } from '@/types/evidenceChip';

const QUADRANT_COLORS: Record<ReasoningBlockId, string> = {
  descriptive: '#D4A017',
  diagnostic: '#C4622D',
  prescriptive: '#4A7C59',
  predictive: '#6B4F8A',
};

const QUADRANT_LABELS: Record<ReasoningBlockId, string> = {
  descriptive: 'Descriptive',
  diagnostic: 'Diagnostic',
  prescriptive: 'Prescriptive',
  predictive: 'Predictive',
};

interface Question {
  key: 'q1_story_accuracy' | 'q2_expression_gaps' | 'q3_annotation_usefulness' | 'q4_unexpected_conflicts' | 'q5_general_feedback';
  text: string;
  limit: number;
}

const QUESTIONS: Question[] = [
  { key: 'q1_story_accuracy', text: 'Did the My Full Reasoning Story reflect what you actually meant? If not, where did it miss?', limit: 100 },
  { key: 'q2_expression_gaps', text: "Was there anything you intended to reason about that you couldn't express by dragging evidence onto the board?", limit: 100 },
  { key: 'q3_annotation_usefulness', text: 'Did adding your own interpretation notes to the evidence chips help you think more clearly? Why or why not?', limit: 100 },
  { key: 'q4_unexpected_conflicts', text: 'If the simulation showed something different from what you expected — what was the conflict and what do you think caused it?', limit: 100 },
  { key: 'q5_general_feedback', text: 'Any other feedback — what felt natural, what felt confusing, what would you change?', limit: 150 },
];

const countWords = (text: string): number => {
  return text.trim().split(/\s+/).filter(word => word.length >= 2).length;
};

interface ReflectionScreenProps {
  sessionId: string;
  userId: string;
  onComplete: () => void;
}

/* ── Read-only chip ── */
function ReadOnlyChip({ chip }: { chip: EvidenceChip }) {
  return (
    <div className="rounded px-2 py-1.5 text-xs bg-card border border-border">
      <span className="font-medium">{chip.label}</span>
      <span className="ml-1 text-muted-foreground">{chip.value}</span>
      {chip.annotation && (
        <p className="mt-1 italic text-muted-foreground text-[11px]">{chip.annotation}</p>
      )}
    </div>
  );
}

/* ── Read-only quadrant ── */
function ReadOnlyQuadrant({ blockId, chips }: { blockId: ReasoningBlockId; chips: EvidenceChip[] }) {
  const color = QUADRANT_COLORS[blockId];
  return (
    <div className="rounded-lg border p-3 min-h-[80px]" style={{ borderColor: color + '60' }}>
      <h4 className="text-[11px] font-semibold uppercase tracking-wide mb-2" style={{ color }}>
        {QUADRANT_LABELS[blockId]}
      </h4>
      {chips.length === 0 ? (
        <p className="text-xs italic text-muted-foreground">(nothing placed here)</p>
      ) : (
        <div className="space-y-1.5">
          {chips.map(chip => (
            <ReadOnlyChip key={chip.id} chip={chip} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ── AI Feedback section ── */
function AiFeedbackSection({ feedbackText }: { feedbackText: string }) {
  // Try to parse JSON structured feedback
  let sections: { label: string; content: string }[] = [];
  try {
    const parsed = JSON.parse(feedbackText);
    if (typeof parsed === 'object' && parsed !== null) {
      const keyMap: Record<string, string> = {
        budgetFeedback: 'Budget',
        reasoningFeedback: 'Reasoning',
        diagnosisFeedback: 'Diagnosis',
        overallNudge: 'Overall',
        Budget: 'Budget',
        Reasoning: 'Reasoning',
        Diagnosis: 'Diagnosis',
        Overall: 'Overall',
      };
      for (const [jsonKey, label] of Object.entries(keyMap)) {
        const val = parsed[jsonKey];
        if (val && typeof val === 'string' && val.trim()) {
          // Avoid duplicates if both camelCase and PascalCase exist
          if (!sections.find(s => s.label === label)) {
            sections.push({ label, content: val.trim() });
          }
        }
      }
    }
  } catch {
    if (feedbackText.trim()) {
      sections = [{ label: 'Feedback', content: feedbackText.trim() }];
    }
  }

  if (sections.length === 0) return null;

  return (
    <div className="space-y-2">
      {sections.map(s => (
        <div key={s.label}>
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">{s.label}</p>
          <p className="text-sm mt-0.5 whitespace-pre-wrap">{s.content}</p>
        </div>
      ))}
    </div>
  );
}

/* ── Main component ── */
export function ReflectionScreen({ sessionId, userId, onComplete }: ReflectionScreenProps) {
  const [board, setBoard] = useState<ReasoningBoardState>({ descriptive: [], diagnostic: [], prescriptive: [], predictive: [] });
  const [writtenDiagnosis, setWrittenDiagnosis] = useState('');
  const [generatedStory, setGeneratedStory] = useState('');
  const [aiFeedbackText, setAiFeedbackText] = useState('');
  const [answers, setAnswers] = useState<Record<string, string>>({
    q1_story_accuracy: '',
    q2_expression_gaps: '',
    q3_annotation_usefulness: '',
    q4_unexpected_conflicts: '',
    q5_general_feedback: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      // Fetch board state + AI feedback in parallel
      const [boardRes, feedbackRes] = await Promise.all([
        supabase
          .from('reasoning_board_state')
          .select('cards, written_diagnosis')
          .eq('session_id', sessionId)
          .eq('user_id', userId)
          .maybeSingle(),
        supabase
          .from('ai_feedback_events')
          .select('ai_feedback_text')
          .eq('session_id', sessionId)
          .eq('user_id', userId)
          .order('requested_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      if (boardRes.data) {
        const cards = boardRes.data.cards as any;
        if (cards && typeof cards === 'object' && !Array.isArray(cards)) {
          const boardState: ReasoningBoardState = {
            descriptive: cards.descriptive ?? [],
            diagnostic: cards.diagnostic ?? [],
            prescriptive: cards.prescriptive ?? [],
            predictive: cards.predictive ?? [],
          };
          setBoard(boardState);
          setGeneratedStory(buildFullReasoningStory(boardState));
        }
        setWrittenDiagnosis(boardRes.data.written_diagnosis ?? '');
      }

      if (feedbackRes.data?.ai_feedback_text) {
        setAiFeedbackText(feedbackRes.data.ai_feedback_text as string);
      }

      setLoaded(true);
    };
    fetchData();
  }, [sessionId, userId]);

  const updateAnswer = useCallback((key: string, value: string) => {
    setAnswers(prev => ({ ...prev, [key]: value }));
  }, []);

  const allValid = QUESTIONS.every(q => {
    const wc = countWords(answers[q.key]);
    return wc >= 3 && wc <= q.limit;
  });

  const handleSubmit = useCallback(async () => {
    if (!allValid || submitting) return;
    setSubmitting(true);
    try {
      await supabase.from('post_simulation_reflections').insert({
        session_id: sessionId,
        user_id: userId,
        ...answers,
      });
      onComplete();
    } catch {
      setSubmitting(false);
    }
  }, [allValid, submitting, sessionId, userId, answers, onComplete]);

  if (!loaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background overflow-y-auto">
      <div className="max-w-[1100px] mx-auto p-6">
        <div className="flex flex-col md:flex-row gap-8">

          {/* LEFT — Read-only board + narrative + AI feedback */}
          <div className="w-full md:w-[45%] md:self-start md:sticky md:top-6 space-y-5">
            <p className="text-[12px] text-muted-foreground uppercase tracking-wider font-medium">
              What you built
            </p>

            {/* 2×2 quadrant grid */}
            <div className="grid grid-cols-2 gap-3">
              {(['descriptive', 'diagnostic', 'prescriptive', 'predictive'] as ReasoningBlockId[]).map(id => (
                <ReadOnlyQuadrant key={id} blockId={id} chips={board[id]} />
              ))}
            </div>

            {/* Written diagnosis */}
            {writtenDiagnosis && (
              <div className="rounded-lg bg-muted/40 border border-border p-4">
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium mb-2">
                  Your written diagnosis
                </p>
                <p className="text-sm whitespace-pre-wrap">{writtenDiagnosis}</p>
              </div>
            )}

            {/* Generated narrative */}
            {generatedStory && (
              <div className="rounded-lg bg-muted/40 border border-border p-4">
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium mb-2">
                  My Full Reasoning Story
                </p>
                <p className="text-sm whitespace-pre-wrap leading-relaxed">{generatedStory}</p>
              </div>
            )}

            {/* AI feedback */}
            {aiFeedbackText && (
              <div className="rounded-lg bg-muted/40 border border-border p-4">
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium mb-2">
                  AI Feedback you received
                </p>
                <AiFeedbackSection feedbackText={aiFeedbackText} />
              </div>
            )}
          </div>

          {/* RIGHT — Questions */}
          <div className="w-full md:w-[55%] space-y-6">
            <div>
              <h2 className="text-base font-medium">Before you finish</h2>
              <p className="text-xs text-muted-foreground mt-1">
                Take 2 minutes to reflect. Your answers help us improve the simulation.
              </p>
            </div>

            {QUESTIONS.map(q => {
              const wc = countWords(answers[q.key]);
              const overLimit = wc > q.limit;
              return (
                <div key={q.key} className="space-y-1.5">
                  <p className="text-[13px] font-medium">{q.text}</p>
                  <Textarea
                    className="resize-none text-sm"
                    rows={3}
                    value={answers[q.key]}
                    onChange={e => updateAnswer(q.key, e.target.value)}
                    placeholder="Type your answer…"
                  />
                  <p className={`text-[11px] ${overLimit ? 'text-destructive' : wc < 3 ? 'text-amber-600' : 'text-muted-foreground'}`}>
                    {wc} / {q.limit} words {wc < 3 && <span className="font-medium">(minimum 3 words)</span>}
                  </p>
                </div>
              );
            })}

            <div className="space-y-2 pb-8">
              <Button
                className="w-full gap-2"
                disabled={!allValid || submitting}
                onClick={handleSubmit}
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Submit reflection
              </Button>
              {!allValid && (
                <p className="text-[11px] text-muted-foreground text-center">
                  Please answer all questions (at least a sentence each)
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
