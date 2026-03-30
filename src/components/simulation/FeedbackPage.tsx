import { useState, useEffect, useCallback, useRef } from 'react';
import { ArrowLeft, Send, Loader2, Bot, DollarSign, Brain, FileText, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

export function FeedbackPage({ context, sessionId, userId, feedbackEventId, onReturnAndAdjust, onSubmitFinal, onFeedbackReady }: FeedbackPageProps) {
  const [feedback, setFeedback] = useState<AiFeedback | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadOrFetchFeedback() {
      setLoading(true);
      setError(null);

      // 1. Try loading saved feedback from ai_feedback_events
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
                if (!cancelled) {
                  setFeedback(saved);
                  setLoading(false);
                  onFeedbackReady?.();
                }
                return;
              }
            } catch {
              // Not valid JSON, fall through
            }
          }
        } catch {
          // Fall through to fetch from AI
        }
      }

      // 2. Fetch fresh feedback from AI (only if no stored text found)
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
          // 3. Save AI response text to ai_feedback_events row
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

  const handleSubmitFinal = useCallback(async () => {
    setSubmitting(true);
    await onSubmitFinal();
  }, [onSubmitFinal]);

  const boardBlocks = [
    { key: 'descriptive' as const, label: 'Descriptive', desc: 'What happened?' },
    { key: 'diagnostic' as const, label: 'Diagnostic', desc: 'Why did it happen?' },
    { key: 'predictive' as const, label: 'Predictive', desc: 'What will happen?' },
    { key: 'prescriptive' as const, label: 'Prescriptive', desc: 'What should we do?' },
  ];

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

            {/* AI feedback */}
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
            onClick={handleSubmitFinal}
            disabled={submitting || loading}
            className="gap-2"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Submit Final
          </Button>
        </div>
      </div>
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
