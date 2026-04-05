import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { ArrowLeft, Send, Loader2, Bot, DollarSign, Brain, FileText, Sparkles, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import type { ReasoningBoardState } from '@/types/evidenceChip';
import type { ChannelSpend } from '@/hooks/useMarketingSimulation';

interface FeedbackContext {
  board: ReasoningBoardState;
  channelSpend: ChannelSpend;
  totals: { totalRevenue: number };
  writtenDiagnosis: string;
}

interface AiFeedback {
  budgetFeedback: string;
  reasoningFeedback: string;
  diagnosisFeedback: string;
  overallNudge: string;
}

interface FeedbackPageProps {
  context: FeedbackContext;
  sessionId: string | null;
  userId: string | null;
  feedbackEventId: string | null;
  onReturnAndAdjust: () => void;
  onSubmitFinal: () => void;
  onFeedbackReady?: () => void;
}

const FEEDBACK_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`;

/* ─── helpers ─── */

function snapshotBoard(board: ReasoningBoardState) {
  return JSON.stringify(board);
}

function snapshotSpend(spend: ChannelSpend) {
  return JSON.stringify(spend);
}

function detectChanges(
  initialBoard: string,
  initialSpend: string,
  currentBoard: ReasoningBoardState,
  currentSpend: ChannelSpend,
): boolean {
  return snapshotBoard(currentBoard) !== initialBoard || snapshotSpend(currentSpend) !== initialSpend;
}

function countAnnotations(board: ReasoningBoardState): number {
  return Object.values(board).flat().filter(c => c.annotation && c.annotation.trim().length > 0).length;
}

function emptyQuadrants(board: ReasoningBoardState): string[] {
  const quadrants: (keyof ReasoningBoardState)[] = ['descriptive', 'diagnostic', 'predictive', 'prescriptive'];
  return quadrants.filter(q => (board[q] || []).length === 0);
}

/* ─── sub-components ─── */

function BoardGapCards({ board }: { board: ReasoningBoardState }) {
  const empty = emptyQuadrants(board);
  const annotationCount = countAnnotations(board);
  const cards: JSX.Element[] = [];

  // Quadrant gap — highlight predictive specifically, then others
  if (empty.includes('predictive')) {
    cards.push(
      <div key="pred-gap" className="flex items-start gap-2.5 rounded-lg border border-amber-300/60 bg-amber-50 p-3 text-sm text-amber-900">
        <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
        <span>Your <strong>Predictive</strong> quadrant is empty — this is where you predict what will happen after your decision. Consider adding one card before submitting.</span>
      </div>
    );
  }

  const otherEmpty = empty.filter(q => q !== 'predictive');
  if (otherEmpty.length > 0) {
    const labels = otherEmpty.map(q => q.charAt(0).toUpperCase() + q.slice(1));
    cards.push(
      <div key="other-gap" className="flex items-start gap-2.5 rounded-lg border border-amber-300/60 bg-amber-50 p-3 text-sm text-amber-900">
        <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
        <span>Your <strong>{labels.join(', ')}</strong> {labels.length === 1 ? 'quadrant is' : 'quadrants are'} empty. Placing evidence in every quadrant strengthens your reasoning.</span>
      </div>
    );
  }

  // Annotation nudge
  if (annotationCount === 0) {
    cards.push(
      <div key="ann-0" className="flex items-start gap-2.5 rounded-lg border border-purple-300/60 bg-purple-50 p-3 text-sm text-purple-900">
        <FileText className="h-4 w-4 text-purple-500 flex-shrink-0 mt-0.5" />
        <span>You have not added any interpretation notes yet. Click the pencil icon on any evidence card to explain why that data point matters — this feeds directly into your AI feedback and helps the Reasoning Story reflect your actual thinking.</span>
      </div>
    );
  } else if (annotationCount === 1) {
    cards.push(
      <div key="ann-1" className="flex items-start gap-2.5 rounded-lg border border-purple-300/60 bg-purple-50 p-3 text-sm text-purple-900">
        <FileText className="h-4 w-4 text-purple-500 flex-shrink-0 mt-0.5" />
        <span>You have added one interpretation note. Adding notes to your other evidence cards helps the AI give more specific feedback — and helps the Reasoning Story reflect what you actually meant.</span>
      </div>
    );
  }

  if (cards.length === 0) return null;
  return <div className="space-y-3">{cards}</div>;
}

function SoftInlineMessage({ hasChanges }: { hasChanges: boolean }) {
  if (hasChanges) return null;
  return (
    <p className="text-center text-xs text-muted-foreground italic">
      You haven't made any adjustments since viewing this feedback. You're welcome to submit as-is — or return to strengthen your reasoning first.
    </p>
  );
}

function ConfirmNoChangesModal({
  open,
  onClose,
  onConfirm,
  submitting,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  submitting: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Submit without changes?</DialogTitle>
          <DialogDescription>
            You haven't adjusted your budget, reasoning board, or annotations since reviewing the AI feedback. Your submission will reflect your original work as-is.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col sm:flex-row gap-2 mt-2">
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Go back and adjust
          </Button>
          <Button onClick={onConfirm} disabled={submitting} className="gap-2">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Yes, submit as-is
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ─── main component ─── */

export function FeedbackPage({ context, sessionId, userId, feedbackEventId, onReturnAndAdjust, onSubmitFinal, onFeedbackReady }: FeedbackPageProps) {
  const [feedback, setFeedback] = useState<AiFeedback | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Snapshot at first render to detect changes
  const initialBoardRef = useRef(snapshotBoard(context.board));
  const initialSpendRef = useRef(snapshotSpend(context.channelSpend));

  const hasChanges = useMemo(
    () => detectChanges(initialBoardRef.current, initialSpendRef.current, context.board, context.channelSpend),
    [context.board, context.channelSpend],
  );

  useEffect(() => {
    let cancelled = false;

    async function loadOrFetchFeedback() {
      setLoading(true);
      setError(null);

      if (feedbackEventId) {
        try {
          const { data } = await supabase
            .from('ai_feedback_events')
            .select('ai_feedback_text')
            .eq('id', feedbackEventId)
            .single();

          if (data?.ai_feedback_text) {
            try {
              const saved = JSON.parse(data.ai_feedback_text) as AiFeedback;
              if (saved.budgetFeedback) {
                if (!cancelled) { setFeedback(saved); setLoading(false); onFeedbackReady?.(); }
                return;
              }
            } catch { /* fall through */ }
          }
        } catch { /* fall through */ }
      }

      try {
        const resp = await fetch(FEEDBACK_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ mode: 'feedback', context }),
        });

        if (!resp.ok) {
          const data = await resp.json().catch(() => ({}));
          throw new Error(data.error || `Error ${resp.status}`);
        }

        const data = await resp.json();
        if (!cancelled) {
          setFeedback(data.feedback);
          onFeedbackReady?.();
          if (feedbackEventId && data.feedback) {
            supabase
              .from('ai_feedback_events')
              .update({ ai_feedback_text: JSON.stringify(data.feedback) })
              .eq('id', feedbackEventId)
              .then(() => {});
          }
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to get feedback');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadOrFetchFeedback();
    return () => { cancelled = true; };
  }, [feedbackEventId]);

  const doSubmit = useCallback(async () => {
    setSubmitting(true);
    try {
      await onSubmitFinal();
    } catch (err) {
      console.error('Submit failed:', err);
      setSubmitting(false);
    }
  }, [onSubmitFinal]);

  const handleSubmitClick = useCallback(() => {
    if (!hasChanges) {
      setConfirmOpen(true);
    } else {
      doSubmit();
    }
  }, [hasChanges, doSubmit]);

  const boardBlocks = [
    { key: 'descriptive' as const, label: 'Descriptive', desc: 'What happened?' },
    { key: 'diagnostic' as const, label: 'Diagnostic', desc: 'Why did it happen?' },
    { key: 'predictive' as const, label: 'Predictive', desc: 'What will happen?' },
    { key: 'prescriptive' as const, label: 'Prescriptive', desc: 'What should we do?' },
  ];

  const submitLabel = hasChanges ? 'Submit Final' : 'Submit without changes';

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium">
            <Sparkles className="h-4 w-4" />
            Your Feedback: A Chance to Adjust
          </div>
          <p className="text-muted-foreground text-sm">
            Review the AI's feedback on your work, then decide whether to go back and improve or submit as final.
          </p>
        </div>

        {/* Section 1: Budget Allocation */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <DollarSign className="h-4 w-4 text-primary" />
              Your Budget Allocation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {Object.entries(context.channelSpend).map(([channel, amount]) => (
                <div key={channel} className="bg-muted rounded-lg p-3 text-center">
                  <p className="text-xs text-muted-foreground capitalize">{channel}</p>
                  <p className="text-lg font-semibold">${(amount as number).toLocaleString()}</p>
                </div>
              ))}
            </div>
            <div className="text-sm text-muted-foreground text-right">
              Total Revenue: <span className="font-semibold text-foreground">${context.totals.totalRevenue.toLocaleString()}</span>
            </div>
            <FeedbackBubble loading={loading} error={error} text={feedback?.budgetFeedback} />
          </CardContent>
        </Card>

        {/* Section 2: Reasoning Board */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Brain className="h-4 w-4 text-primary" />
              Your Reasoning Board
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {boardBlocks.map(({ key, label, desc }) => {
                const chips = context.board[key] || [];
                return (
                  <div key={key} className="bg-muted rounded-lg p-3 space-y-1">
                    <p className="text-xs font-medium text-foreground">{label} <span className="text-muted-foreground">— {desc}</span></p>
                    {chips.length === 0 ? (
                      <p className="text-xs text-muted-foreground italic">No evidence placed</p>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {chips.map((chip: any) => (
                          <span key={chip.id} className="inline-flex items-center bg-background border rounded px-2 py-0.5 text-xs">
                            {chip.label}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <FeedbackBubble loading={loading} error={error} text={feedback?.reasoningFeedback} />
          </CardContent>
        </Card>

        {/* Section 3: Written Diagnosis */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4 text-primary" />
              Your Written Diagnosis
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted rounded-lg p-4">
              {context.writtenDiagnosis ? (
                <p className="text-sm whitespace-pre-wrap">{context.writtenDiagnosis}</p>
              ) : (
                <p className="text-sm text-muted-foreground italic">No diagnosis written yet.</p>
              )}
            </div>
            <FeedbackBubble loading={loading} error={error} text={feedback?.diagnosisFeedback} />
          </CardContent>
        </Card>

        {/* Overall nudge */}
        {feedback?.overallNudge && !loading && (
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="py-4">
              <div className="flex gap-3 items-start">
                <Sparkles className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <p className="text-sm font-medium">{feedback.overallNudge}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Board gap cards */}
        <BoardGapCards board={context.board} />

        {/* Soft inline message */}
        <SoftInlineMessage hasChanges={hasChanges} />

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4 pb-8">
          <Button
            variant="outline"
            size="lg"
            onClick={onReturnAndAdjust}
            className="gap-2"
            disabled={submitting}
          >
            <ArrowLeft className="h-4 w-4" />
            Return Back & Adjust
          </Button>
          <Button
            size="lg"
            onClick={handleSubmitClick}
            disabled={submitting || loading}
            className="gap-2"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            {submitLabel}
          </Button>
        </div>
      </div>

      {/* Confirmation modal for no-changes submission */}
      <ConfirmNoChangesModal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => { setConfirmOpen(false); doSubmit(); }}
        submitting={submitting}
      />
    </div>
  );
}

function FeedbackBubble({ loading, error, text }: { loading: boolean; error: string | null; text?: string }) {
  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground text-sm py-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        Getting AI feedback…
      </div>
    );
  }
  if (error) {
    return <p className="text-destructive text-xs">{error}</p>;
  }
  if (!text) return null;
  return (
    <div className="flex gap-2.5 items-start bg-primary/5 border border-primary/20 rounded-lg p-3">
      <Bot className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
      <p className="text-sm text-foreground">{text}</p>
    </div>
  );
}
