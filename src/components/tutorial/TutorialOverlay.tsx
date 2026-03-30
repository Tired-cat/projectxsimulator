import { useEffect, useState, useCallback, useMemo } from 'react';
import { useTutorial } from '@/contexts/TutorialContext';
import { cn } from '@/lib/utils';
import { ArrowRight, CheckCircle2, X } from 'lucide-react';

interface SpotlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const STEP_CONFIG = [
  {
    step: 1,
    target: '[data-tutorial="budget-bars"]',
    title: 'Adjust Your $20,000 Budget',
    description:
      'Each bar represents a marketing channel. Drag any bar up or down to move budget between TikTok, Instagram, Facebook, and Newspaper. The total must always equal $20,000 — so raising one channel automatically pulls from others.',
    action: 'Drag any channel bar to change its spend',
    tooltipSide: 'right' as const,
  },
  {
    step: 2,
    target: '[data-tutorial="view-tabs"]',
    title: 'Switch Views to See the Full Picture',
    description:
      'The tabs above the chart change what\'s measured. "Budget" shows spend, "Views" shows clicks driven, "Revenue" shows gross income, "Profit" shows net after deducting spend. Click Revenue now — you\'ll see that the channel with the most views isn\'t always the top revenue driver.',
    action: 'Click the Revenue tab',
    tooltipSide: 'bottom' as const,
  },
  {
    step: 3,
    target: '[data-tutorial="product-mix"]',
    title: 'Discover the Product Mix',
    description:
      'The Product Mix chart shows what each channel actually sells. TikTok drives massive traffic but mostly sells $10 Bottles. Newspaper has low traffic but sells $500 Chairs at a 20% conversion rate — making it the hidden revenue gem per dollar spent.',
    action: null,
    tooltipSide: 'left' as const,
  },
  {
    step: 4,
    target: '[data-tutorial="compare-button"]',
    title: 'Compare Before & After',
    description:
      'Click "Compare Before / After" to snapshot your current allocation. Then freely adjust the bars — you\'ll see a frozen "Before" pane alongside the live "After" pane, with delta indicators showing exactly what changed.',
    action: 'Click Compare Before / After to take a snapshot',
    tooltipSide: 'bottom' as const,
  },
  {
    step: 5,
    target: '[data-tutorial="reason-button"]',
    title: 'Build Your Evidence',
    description:
      'Click the Reason button to enter evidence-collection mode. Each bar becomes draggable. Drag a bar onto one of the four quadrants on the Reasoning Board (Descriptive, Diagnostic, Prescriptive, Predictive) to record it as evidence.',
    action: 'Drag one piece of evidence onto any Reasoning Board quadrant',
    tooltipSide: 'top' as const,
  },
  {
    step: 6,
    target: '[data-tutorial="narrative"]',
    title: 'Your Reasoning Story',
    description:
      'The "At a Glance" cards and "My Full Reasoning Story" update in real time as you add evidence. Review whether the auto-generated narrative matches your actual reasoning — this becomes your analytical submission.',
    action: null,
    tooltipSide: 'top' as const,
  },
];

export function TutorialOverlay() {
  const { active, step, skipTutorial, advanceStep, actionCompleted } = useTutorial();
  const [spotlight, setSpotlight] = useState<SpotlightRect | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);

  const config = STEP_CONFIG[step - 1];

  const measureTarget = useCallback(() => {
    if (!active || !config) return;
    const el = document.querySelector(config.target);
    if (el) {
      const rect = el.getBoundingClientRect();
      setSpotlight({
        top: rect.top - 8,
        left: rect.left - 8,
        width: rect.width + 16,
        height: rect.height + 16,
      });
    } else {
      setSpotlight(null);
    }
  }, [active, config]);

  useEffect(() => {
    if (!active) return;
    measureTarget();
    const interval = setInterval(measureTarget, 500);
    window.addEventListener('resize', measureTarget);
    window.addEventListener('scroll', measureTarget, true);
    return () => {
      clearInterval(interval);
      window.removeEventListener('resize', measureTarget);
      window.removeEventListener('scroll', measureTarget, true);
    };
  }, [active, measureTarget]);

  useEffect(() => {
    if (!active) return;
    setIsMinimized(false);
  }, [active, step]);

  const shouldRender = active && !!config;

  // Build clip-path to cut out the spotlight area
  const clipPath = spotlight
    ? `polygon(
        0% 0%, 0% 100%,
        ${spotlight.left}px 100%,
        ${spotlight.left}px ${spotlight.top}px,
        ${spotlight.left + spotlight.width}px ${spotlight.top}px,
        ${spotlight.left + spotlight.width}px ${spotlight.top + spotlight.height}px,
        ${spotlight.left}px ${spotlight.top + spotlight.height}px,
        ${spotlight.left}px 100%,
        100% 100%, 100% 0%
      )`
    : undefined;

  const tooltipStyle = useMemo((): React.CSSProperties => {
    const margin = 16;
    const tooltipWidth = isMinimized ? 300 : 400;
    const tooltipHeight = isMinimized ? 64 : 280;

    // Fallback to centered placement if no spotlight target exists.
    if (!spotlight) {
      return {
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
      };
    }

    const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

    const centerX = spotlight.left + spotlight.width / 2;
    const centerY = spotlight.top + spotlight.height / 2;

    const candidates = [
      { x: centerX - tooltipWidth / 2, y: spotlight.top + spotlight.height + margin }, // below
      { x: centerX - tooltipWidth / 2, y: spotlight.top - tooltipHeight - margin }, // above
      { x: spotlight.left + spotlight.width + margin, y: centerY - tooltipHeight / 2 }, // right
      { x: spotlight.left - tooltipWidth - margin, y: centerY - tooltipHeight / 2 }, // left
    ].map((c) => ({
      x: clamp(c.x, margin, window.innerWidth - tooltipWidth - margin),
      y: clamp(c.y, margin, window.innerHeight - tooltipHeight - margin),
    }));

    // Avoid blocking likely interaction zones on step 5 (chart + reasoning board).
    const avoidRects: Array<{ left: number; top: number; right: number; bottom: number }> = [];
    if (step === 5) {
      document.querySelectorAll('[data-tutorial="chart-area"], [data-tutorial="reasoning-board"]').forEach((el) => {
        const rect = el.getBoundingClientRect();
        avoidRects.push({ left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom });
      });
    }

    const overlapArea = (
      a: { left: number; top: number; right: number; bottom: number },
      b: { left: number; top: number; right: number; bottom: number }
    ) => {
      const overlapX = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
      const overlapY = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
      return overlapX * overlapY;
    };

    let best = candidates[0];
    let bestScore = Number.POSITIVE_INFINITY;

    for (const candidate of candidates) {
      const rect = {
        left: candidate.x,
        top: candidate.y,
        right: candidate.x + tooltipWidth,
        bottom: candidate.y + tooltipHeight,
      };

      const spotlightRect = {
        left: spotlight.left,
        top: spotlight.top,
        right: spotlight.left + spotlight.width,
        bottom: spotlight.top + spotlight.height,
      };

      const spotlightOverlap = overlapArea(rect, spotlightRect);
      const avoidOverlap = avoidRects.reduce((sum, avoid) => sum + overlapArea(rect, avoid), 0);
      const dx = rect.left + tooltipWidth / 2 - centerX;
      const dy = rect.top + tooltipHeight / 2 - centerY;
      const distancePenalty = Math.sqrt(dx * dx + dy * dy);

      const score = spotlightOverlap * 100 + avoidOverlap * 10 + distancePenalty;
      if (score < bestScore) {
        bestScore = score;
        best = candidate;
      }
    }

    return {
      top: best.y,
      left: best.x,
    };
  }, [spotlight, step, isMinimized]);

  if (!shouldRender) return null;

  return (
    <div className="fixed inset-0 z-[9999] pointer-events-none">
      {/* Dimmed overlay with spotlight cutout */}
      <div
        className="absolute inset-0 bg-black/60 transition-all duration-300 pointer-events-none"
        style={{ clipPath }}
      />

      {/* Spotlight border ring */}
      {spotlight && (
        <div
          className="absolute rounded-xl border-2 border-primary shadow-[0_0_0_4px_hsl(var(--primary)/0.2)] pointer-events-none transition-all duration-300"
          style={{
            top: spotlight.top,
            left: spotlight.left,
            width: spotlight.width,
            height: spotlight.height,
          }}
        />
      )}

      {/* Tooltip card */}
      <div
        className={cn(
          'absolute max-w-[calc(100vw-32px)] pointer-events-auto transition-all duration-200',
          isMinimized ? 'w-[300px]' : 'w-[400px]'
        )}
        style={tooltipStyle}
      >
        <div className="bg-card border border-border rounded-xl shadow-2xl p-5 space-y-3">
          {/* Step indicator */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5, 6].map((s) => (
                <div
                  key={s}
                  className={cn(
                    'w-2 h-2 rounded-full transition-colors',
                    s === step
                      ? 'bg-primary scale-125'
                      : s < step
                      ? 'bg-primary/40'
                      : 'bg-muted-foreground/20'
                  )}
                />
              ))}
              <span className="text-xs text-muted-foreground ml-1">Step {step} of 6</span>
            </div>
            <button
              onClick={() => setIsMinimized((prev) => !prev)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              title={isMinimized ? 'Expand tutorial' : 'Minimize tutorial'}
            >
              {isMinimized ? 'Expand' : 'Minimize'}
            </button>
          </div>

          {isMinimized ? (
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground">Tutorial minimized while you interact.</p>
              <button
                onClick={skipTutorial}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
              >
                <X className="w-3 h-3" />
                Skip
              </button>
            </div>
          ) : (
            <>

          {/* Title + description */}
          <div>
            <h3 className="text-base font-bold text-foreground">{config.title}</h3>
            <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
              {config.description}
            </p>
          </div>

          {/* Action prompt or Got It button */}
          {config.action ? (
            <div className="space-y-2">
              <div
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  actionCompleted
                    ? 'bg-green-500/10 text-green-700 dark:text-green-400'
                    : 'bg-primary/10 text-primary'
                )}
              >
                {actionCompleted ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Done! Click Next to continue.
                  </>
                ) : (
                  <>
                    <span className="w-4 h-4 border-2 border-current rounded-full flex-shrink-0 animate-pulse" />
                    {config.action}
                  </>
                )}
              </div>
              {actionCompleted && (
                <button
                  onClick={advanceStep}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-bold hover:bg-primary/90 transition-colors"
                >
                  Next Step
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          ) : (
            <button
              onClick={advanceStep}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-bold hover:bg-primary/90 transition-colors"
            >
              {step === 6 ? 'Got It — Finish Tutorial' : 'Got It — Next Step'}
              {step === 6 ? <CheckCircle2 className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
            </button>
          )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
