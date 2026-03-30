import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useTutorial } from '@/contexts/TutorialContext';
import { useAuth } from '@/contexts/AuthContext';
import { useSession } from '@/hooks/useSession';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { ArrowRight, CheckCircle2, X } from 'lucide-react';

interface SpotlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

type ArrowDir = 'up' | 'down' | 'left' | 'right';

interface StepConfig {
  step: number;
  target: string;
  title: string;
  description: string;
  action: string | null;
  forceArrowDir: ArrowDir | null;
  /** When true the tooltip is anchored to top-center of viewport */
  tooltipTopCenter?: boolean;
}

const STEP_CONFIG: StepConfig[] = [
  {
    step: 1,
    target: '[data-tutorial="budget-bars"]',
    title: 'Adjust Your $20,000 Budget',
    description:
      'Each bar is a marketing channel. Drag any bar up or down to shift budget between TikTok, Instagram, Facebook, and Newspaper. The total is always $20,000 — raising one channel automatically reduces others.',
    action: 'Drag any channel bar to change its spend',
    forceArrowDir: null,
  },
  {
    step: 2,
    target: '[data-tutorial="view-tabs"]',
    title: 'Switch Views to See the Full Picture',
    description:
      '"Budget" shows your spend. "Views" shows estimated clicks. "Revenue" shows gross income. "Profit" shows net after costs. Click Revenue now — the channel with the most views is often NOT the top revenue earner.',
    action: 'Click the Revenue tab',
    forceArrowDir: null,
  },
  {
    step: 3,
    target: '[data-tutorial="product-mix"]',
    title: 'Discover the Product Mix',
    description:
      'The Product Mix shows what each channel actually sells. TikTok drives huge traffic but mostly sells $10 Bottles. Newspaper has low traffic but converts at 20% for $500 Chairs — making it the hidden revenue gem per dollar spent.',
    action: null,
    forceArrowDir: null,
  },
  {
    step: 4,
    target: '[data-tutorial="compare-button"]',
    title: 'Compare Before & After',
    description:
      'Click "Compare Before / After" to snapshot your current allocation. Then adjust the bars freely — a frozen "Before" pane appears alongside the live "After" pane with delta indicators showing exactly what changed.',
    action: 'Click Compare Before / After to take a snapshot',
    forceArrowDir: null,
  },
  {
    step: 5,
    target: '[data-tutorial="reasoning-board"]',
    title: 'Meet the Reasoning Board',
    description:
      'This is where you build your analysis using four quadrants:\n\n• Descriptive — What did you observe?\n• Diagnostic — Why did it happen?\n• Prescriptive — What decision did you make?\n• Predictive — What outcome do you expect?\n\nNext you\'ll drag evidence bars directly into these quadrants.',
    action: null,
    forceArrowDir: null,
    tooltipTopCenter: true,
  },
  {
    step: 6,
    target: '[data-tutorial="reasoning-tab"]',
    title: 'Open Split View to Drag Evidence',
    description:
      'To drag evidence from the chart onto the Reasoning Board, you need both panels visible at the same time.\n\nDrag the "Reasoning Board" tab → to the right. A split zone will appear — drop it there to open side-by-side view.',
    action: 'Drag the Reasoning Board tab to the split zone on the right',
    forceArrowDir: 'right',
  },
  {
    step: 7,
    target: '[data-tutorial="reason-button"]',
    title: 'Drag Evidence onto the Board',
    description:
      'Split view is open — the chart is on the left, Reasoning Board on the right.\n\nClick the Reason button to make bars draggable, then drag any bar from the chart and drop it onto a quadrant on the Reasoning Board.',
    action: 'Drag one bar onto any Reasoning Board quadrant',
    forceArrowDir: null,
  },
  {
    step: 8,
    target: '[data-tutorial="narrative"]',
    title: 'Your Reasoning Story',
    description:
      'Your evidence auto-generates a reasoning story. Each quadrant adds a sentence — Descriptive sets the scene, Diagnostic explains why, Prescriptive states your decision, Predictive projects what comes next.\n\nDoes the story match your actual thinking?',
    action: null,
    forceArrowDir: null,
  },
  {
    step: 9,
    target: '[data-tutorial="feedback-button"]',
    title: 'Get AI Feedback — One Time Only',
    description:
      'When you\'re satisfied with your reasoning board and budget decisions, click "Get Feedback" for personalised AI analysis.\n\nImportant: you only get this feedback once. Do your best analysis first, then use the feedback to refine your thinking before submitting.',
    action: null,
    forceArrowDir: null,
  },
];

/** Arrow pinned to the viewport EDGE, pointing toward an off-screen target */
function EdgeArrow({ direction }: { direction: ArrowDir }) {
  const SIZE = 56;
  const EDGE_GAP = 24;
  const rotation = { right: 0, down: 90, left: 180, up: 270 }[direction];

  const style: React.CSSProperties = { position: 'absolute', zIndex: 10001 };
  if (direction === 'down') {
    style.bottom = EDGE_GAP;
    style.left = '50%';
    style.transform = 'translateX(-50%)';
  } else if (direction === 'up') {
    style.top = EDGE_GAP;
    style.left = '50%';
    style.transform = 'translateX(-50%)';
  } else if (direction === 'right') {
    style.right = EDGE_GAP;
    style.top = '50%';
    style.transform = 'translateY(-50%)';
  } else {
    style.left = EDGE_GAP;
    style.top = '50%';
    style.transform = 'translateY(-50%)';
  }

  const label: Record<ArrowDir, string> = {
    down: 'scroll down',
    up: 'scroll up',
    right: 'over here →',
    left: '← over here',
  };

  return (
    <div className="pointer-events-none animate-bounce" style={style}>
      <svg
        width={SIZE}
        height={SIZE}
        viewBox="0 0 52 52"
        fill="none"
        style={{
          transform: `rotate(${rotation}deg)`,
          filter: 'drop-shadow(0 0 8px hsl(var(--primary)/0.9))',
          display: 'block',
          margin: '0 auto',
        }}
      >
        <path
          d="M6 26H46M46 26L32 12M46 26L32 40"
          stroke="hsl(var(--primary))"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <p
        className="text-xs font-bold text-center mt-0.5"
        style={{ color: 'hsl(var(--primary))', textShadow: '0 0 8px hsl(var(--primary)/0.5)' }}
      >
        {label[direction]}
      </p>
    </div>
  );
}

/** Extra "drag →" hint arrow right next to the reasoning tab (step 6 only) */
function SplitViewHintArrow({ spotlight }: { spotlight: SpotlightRect }) {
  const SIZE = 44;
  return (
    <div
      className="absolute z-[10001] pointer-events-none animate-pulse"
      style={{
        left: spotlight.left + spotlight.width + 8,
        top: spotlight.top + spotlight.height / 2 - SIZE / 2,
      }}
    >
      <svg width={SIZE} height={SIZE} viewBox="0 0 44 44" fill="none"
        style={{ filter: 'drop-shadow(0 0 5px hsl(var(--primary)/0.7))' }}>
        <path d="M4 22H40M40 22L28 10M40 22L28 34"
          stroke="hsl(var(--primary))" strokeWidth="4.5"
          strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

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
        top: rect.top - 6,
        left: rect.left - 6,
        width: rect.width + 12,
        height: rect.height + 12,
      });
    } else {
      setSpotlight(null);
    }
  }, [active, config]);

  useEffect(() => {
    if (!active) return;
    measureTarget();
    const interval = setInterval(measureTarget, 300);
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

  /** True when the target element is fully visible in the viewport */
  const isTargetFullyInViewport = useMemo(() => {
    if (!spotlight) return false;
    return (
      spotlight.top >= 0 &&
      spotlight.left >= 0 &&
      spotlight.top + spotlight.height <= window.innerHeight &&
      spotlight.left + spotlight.width <= window.innerWidth
    );
  }, [spotlight]);

  /**
   * Direction of the edge arrow.
   * - forceArrowDir: always use this (e.g., step 6 always shows right)
   * - otherwise: only show when target is NOT fully in viewport, pointing toward it
   */
  const arrowDir = useMemo((): ArrowDir | null => {
    if (config?.forceArrowDir) return config.forceArrowDir;
    // No action steps don't need arrows
    if (!config?.action || actionCompleted) return null;
    // Target is visible — no arrow needed, spotlight ring is enough
    if (isTargetFullyInViewport) return null;
    // Target not in viewport — figure out which direction
    if (!spotlight) return null;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const targetCx = spotlight.left + spotlight.width / 2;
    const targetCy = spotlight.top + spotlight.height / 2;
    // Clamp to screen edges to see the offset direction
    const dx = targetCx < 0 ? targetCx : targetCx > vw ? targetCx - vw : 0;
    const dy = targetCy < 0 ? targetCy : targetCy > vh ? targetCy - vh : 0;
    if (dx === 0 && dy === 0) return null; // partially visible, no arrow
    return Math.abs(dx) >= Math.abs(dy)
      ? dx > 0 ? 'right' : 'left'
      : dy > 0 ? 'down' : 'up';
  }, [config, actionCompleted, spotlight, isTargetFullyInViewport]);

  /** Tooltip position: prefer below target, then above, then sides. Step 5 always top-center. */
  const tooltipStyle = useMemo((): React.CSSProperties => {
    const margin = 16;
    const tooltipW = isMinimized ? 300 : 400;
    const tooltipH = isMinimized ? 60 : 320;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    if (config?.tooltipTopCenter) {
      return {
        top: margin,
        left: Math.max(margin, vw / 2 - tooltipW / 2),
      };
    }

    if (!spotlight) return { top: '50%', left: '50%', transform: 'translate(-50%,-50%)' };

    const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
    const cx = spotlight.left + spotlight.width / 2;
    const cy = spotlight.top + spotlight.height / 2;

    // Candidate positions: below, above, right, left
    const candidates = [
      { x: cx - tooltipW / 2, y: spotlight.top + spotlight.height + margin + 8 },
      { x: cx - tooltipW / 2, y: spotlight.top - tooltipH - margin - 8 },
      { x: spotlight.left + spotlight.width + margin + 8, y: cy - tooltipH / 2 },
      { x: spotlight.left - tooltipW - margin - 8, y: cy - tooltipH / 2 },
    ].map(c => ({
      x: clamp(c.x, margin, vw - tooltipW - margin),
      y: clamp(c.y, margin, vh - tooltipH - margin),
    }));

    // Pick the candidate with least overlap with spotlight
    const sr = {
      left: spotlight.left, top: spotlight.top,
      right: spotlight.left + spotlight.width, bottom: spotlight.top + spotlight.height,
    };
    const overlapArea = (
      a: { left: number; top: number; right: number; bottom: number },
      b: typeof sr
    ) =>
      Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) *
      Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));

    let best = candidates[0];
    let bestScore = Infinity;
    for (const c of candidates) {
      const r = { left: c.x, top: c.y, right: c.x + tooltipW, bottom: c.y + tooltipH };
      const score = overlapArea(r, sr) * 100 +
        Math.hypot(r.left + tooltipW / 2 - cx, r.top + tooltipH / 2 - cy);
      if (score < bestScore) { bestScore = score; best = c; }
    }

    return { top: best.y, left: best.x };
  }, [spotlight, step, isMinimized, config]);

  if (!active || !config) return null;

  return (
    <div className="fixed inset-0 z-[9999] pointer-events-none">

      {/* NO background overlay — page looks completely normal */}

      {/* Spotlight ring — only when target is visible in viewport */}
      {spotlight && isTargetFullyInViewport && (
        <>
          {/* Outer pulsing ring */}
          <div
            className="absolute rounded-xl border-2 border-primary/50 animate-ping pointer-events-none"
            style={{
              top: spotlight.top, left: spotlight.left,
              width: spotlight.width, height: spotlight.height,
            }}
          />
          {/* Solid glow ring */}
          <div
            className="absolute rounded-xl pointer-events-none transition-all duration-300"
            style={{
              top: spotlight.top, left: spotlight.left,
              width: spotlight.width, height: spotlight.height,
              border: '3px solid hsl(var(--primary))',
              boxShadow: '0 0 0 4px hsl(var(--primary)/0.15), 0 0 24px hsl(var(--primary)/0.35)',
            }}
          />
        </>
      )}

      {/* Edge arrow — only when target is NOT in viewport (tells user where to go) */}
      {arrowDir && !actionCompleted && (
        <EdgeArrow direction={arrowDir} />
      )}

      {/* Step 6 drag-hint arrow — also shown when target IS visible */}
      {spotlight && isTargetFullyInViewport && step === 6 && !actionCompleted && (
        <SplitViewHintArrow spotlight={spotlight} />
      )}

      {/* Tooltip card */}
      <div
        className={cn(
          'absolute max-w-[calc(100vw-32px)] pointer-events-auto transition-all duration-200',
          isMinimized ? 'w-[300px]' : 'w-[400px]'
        )}
        style={tooltipStyle}
      >
        <div className="bg-card border-2 border-primary/20 rounded-xl shadow-2xl p-5 space-y-3">

          {/* Step dots + minimize */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(s => (
                <div
                  key={s}
                  className={cn(
                    'w-2 h-2 rounded-full transition-colors',
                    s === step ? 'bg-primary scale-125' : s < step ? 'bg-primary/40' : 'bg-muted-foreground/20'
                  )}
                />
              ))}
              <span className="text-xs text-muted-foreground ml-1">Step {step} of 9</span>
            </div>
            <button
              onClick={() => setIsMinimized(p => !p)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {isMinimized ? 'Expand' : 'Minimize'}
            </button>
          </div>

          {isMinimized ? (
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground">Tutorial minimized.</p>
              <button
                onClick={skipTutorial}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
              >
                <X className="w-3 h-3" /> Skip
              </button>
            </div>
          ) : (
            <>
              <div>
                <h3 className="text-base font-bold text-foreground">{config.title}</h3>
                <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed whitespace-pre-line">
                  {config.description}
                </p>
              </div>

              {config.action ? (
                <div className="space-y-2">
                  <div
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                      actionCompleted
                        ? 'bg-green-500/10 text-green-700'
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
                      Next Step <ArrowRight className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ) : (
                <button
                  onClick={advanceStep}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-bold hover:bg-primary/90 transition-colors"
                >
                  {step === 9 ? 'Got It — Finish Tutorial' : 'Got It — Next Step'}
                  {step === 9 ? <CheckCircle2 className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
