import { useEffect, useState, useCallback } from 'react';
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
    target: '[data-tutorial="tab-strip"]',
    title: 'Split View — Compare Before & After',
    description:
      'The tab strip lets you open side-by-side comparisons. Drag one tab onto another, or use the "Compare Before / After" button in Channel Performance to see how your changes compare to the baseline.',
    action: 'Open Split View to continue',
    tooltipSide: 'bottom' as const,
  },
  {
    step: 2,
    target: '[data-tutorial="reason-button"]',
    title: 'Reason Mode & Evidence Dragging',
    description:
      'Click the Reason button to activate drag mode. When active, each bar in Channel Performance and each segment in Product Mix becomes draggable evidence. Drag a bar into any quadrant on the Reasoning Board to build your argument.',
    action: 'Drag one piece of evidence into any Reasoning Board quadrant',
    tooltipSide: 'top' as const,
  },
  {
    step: 3,
    target: '[data-tutorial="narrative"]',
    title: 'Your Reasoning Story',
    description:
      'The "At a Glance" cards and "My Full Reasoning Story" update in real time as you add evidence. Check whether the generated narrative matches what you intended — this is your analytical summary.',
    action: null,
    tooltipSide: 'top' as const,
  },
];

export function TutorialOverlay() {
  const { active, step, skipTutorial, advanceStep, actionCompleted } = useTutorial();
  const [spotlight, setSpotlight] = useState<SpotlightRect | null>(null);

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

  if (!active || !config) return null;

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

  // Position tooltip near spotlight
  const tooltipStyle: React.CSSProperties = {};
  if (spotlight) {
    if (config.tooltipSide === 'bottom') {
      tooltipStyle.top = spotlight.top + spotlight.height + 16;
      tooltipStyle.left = Math.max(16, Math.min(spotlight.left, window.innerWidth - 420));
    } else {
      tooltipStyle.top = spotlight.top - 16;
      tooltipStyle.left = Math.max(16, Math.min(spotlight.left, window.innerWidth - 420));
      tooltipStyle.transform = 'translateY(-100%)';
    }
  } else {
    tooltipStyle.top = '50%';
    tooltipStyle.left = '50%';
    tooltipStyle.transform = 'translate(-50%, -50%)';
  }

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
        className="absolute w-[400px] max-w-[calc(100vw-32px)] pointer-events-auto"
        style={tooltipStyle}
      >
        <div className="bg-card border border-border rounded-xl shadow-2xl p-5 space-y-3">
          {/* Step indicator */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {[1, 2, 3].map((s) => (
                <div
                  key={s}
                  className={cn(
                    'w-2.5 h-2.5 rounded-full transition-colors',
                    s === step
                      ? 'bg-primary scale-125'
                      : s < step
                      ? 'bg-primary/40'
                      : 'bg-muted-foreground/20'
                  )}
                />
              ))}
              <span className="text-xs text-muted-foreground ml-1">Step {step} of 3</span>
            </div>
            <button
              onClick={skipTutorial}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
            >
              <X className="w-3 h-3" />
              Skip Tutorial
            </button>
          </div>

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
              Got It — Finish Tutorial
              <CheckCircle2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
