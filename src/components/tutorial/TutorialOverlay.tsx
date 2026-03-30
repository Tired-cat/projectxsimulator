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

type ArrowDir = 'up' | 'down' | 'left' | 'right';

const STEP_CONFIG = [
  {
    step: 1,
    target: '[data-tutorial="budget-bars"]',
    title: 'Adjust Your $20,000 Budget',
    description:
      'Each bar is a marketing channel. Drag any bar up or down to shift budget between TikTok, Instagram, Facebook, and Newspaper. The total is always $20,000 — raising one channel automatically reduces others.',
    action: 'Drag any channel bar to change its spend',
    arrowDir: null as ArrowDir | null,  // computed automatically
    forceArrowDir: null as ArrowDir | null,
  },
  {
    step: 2,
    target: '[data-tutorial="view-tabs"]',
    title: 'Switch Views to See the Full Picture',
    description:
      '"Budget" shows your spend. "Views" shows estimated clicks. "Revenue" shows gross income. "Profit" shows net after costs. Click Revenue now — the channel with the most views is often NOT the top revenue earner.',
    action: 'Click the Revenue tab',
    arrowDir: null as ArrowDir | null,
    forceArrowDir: null as ArrowDir | null,
  },
  {
    step: 3,
    target: '[data-tutorial="product-mix"]',
    title: 'Discover the Product Mix',
    description:
      'The Product Mix shows what each channel actually sells. TikTok drives huge traffic but mostly sells $10 Bottles. Newspaper has low traffic but converts at 20% for $500 Chairs — making it the hidden revenue gem per dollar spent.',
    action: null,
    arrowDir: null as ArrowDir | null,
    forceArrowDir: null as ArrowDir | null,
  },
  {
    step: 4,
    target: '[data-tutorial="compare-button"]',
    title: 'Compare Before & After',
    description:
      'Click "Compare Before / After" to snapshot your current allocation. Then adjust the bars freely — a frozen "Before" pane appears alongside the live "After" pane with delta indicators showing exactly what changed.',
    action: 'Click Compare Before / After to take a snapshot',
    arrowDir: null as ArrowDir | null,
    forceArrowDir: null as ArrowDir | null,
  },
  {
    step: 5,
    target: '[data-tutorial="reasoning-board"]',
    title: 'Meet the Reasoning Board',
    description:
      'This is where you build your analysis using four quadrants:\n\n• Descriptive — What did you observe?\n• Diagnostic — Why did it happen?\n• Prescriptive — What decision did you make?\n• Predictive — What outcome do you expect?\n\nNext you\'ll drag evidence bars directly into these quadrants.',
    action: null,
    arrowDir: null as ArrowDir | null,
    forceArrowDir: null as ArrowDir | null,
  },
  {
    step: 6,
    target: '[data-tutorial="reasoning-tab"]',
    title: 'Open Split View to Drag Evidence',
    description:
      'To drag evidence from the chart onto the Reasoning Board, you need both panels visible at the same time.\n\nDrag the "Reasoning Board" tab → to the right. A split zone will appear — drop it there to open side-by-side view (chart on left, board on right).',
    action: 'Drag the Reasoning Board tab to the split zone on the right',
    arrowDir: null as ArrowDir | null,
    forceArrowDir: 'right' as ArrowDir, // always point right for this step
  },
  {
    step: 7,
    target: '[data-tutorial="reason-button"]',
    title: 'Drag Evidence onto the Board',
    description:
      'Split view is open — the chart is on the left, Reasoning Board on the right.\n\nClick the Reason button to make bars draggable, then drag any bar from the chart and drop it onto a quadrant on the Reasoning Board.',
    action: 'Drag one bar onto any Reasoning Board quadrant',
    arrowDir: null as ArrowDir | null,
    forceArrowDir: null as ArrowDir | null,
  },
  {
    step: 8,
    target: '[data-tutorial="narrative"]',
    title: 'Your Reasoning Story',
    description:
      'Your evidence auto-generates a reasoning story. Each quadrant adds a sentence — Descriptive sets the scene, Diagnostic explains why, Prescriptive states your decision, Predictive projects what comes next.\n\nDoes the story match your actual thinking?',
    action: null,
    arrowDir: null as ArrowDir | null,
    forceArrowDir: null as ArrowDir | null,
  },
  {
    step: 9,
    target: '[data-tutorial="feedback-button"]',
    title: 'Get AI Feedback — One Time Only',
    description:
      'When you\'re satisfied with your reasoning board and budget decisions, click "Get Feedback" for personalised AI analysis.\n\nImportant: you only get this feedback once. Do your best analysis first, then use the feedback to refine your thinking before submitting.',
    action: null,
    arrowDir: null as ArrowDir | null,
    forceArrowDir: null as ArrowDir | null,
  },
];

// Large animated arrow rendered next to the spotlight
function FloatingArrow({ direction, spotlight }: { direction: ArrowDir; spotlight: SpotlightRect }) {
  const SIZE = 52;
  const GAP = 10;

  let left: number, top: number;
  const rotation = { right: 0, down: 90, left: 180, up: 270 }[direction];

  if (direction === 'right') {
    left = spotlight.left + spotlight.width + GAP;
    top  = spotlight.top  + spotlight.height / 2 - SIZE / 2;
  } else if (direction === 'left') {
    left = spotlight.left - SIZE - GAP;
    top  = spotlight.top  + spotlight.height / 2 - SIZE / 2;
  } else if (direction === 'down') {
    left = spotlight.left + spotlight.width  / 2 - SIZE / 2;
    top  = spotlight.top  + spotlight.height + GAP;
  } else {
    left = spotlight.left + spotlight.width  / 2 - SIZE / 2;
    top  = spotlight.top  - SIZE - GAP;
  }

  return (
    <div
      className="absolute z-[10001] pointer-events-none animate-bounce"
      style={{ left, top }}
    >
      <svg
        width={SIZE}
        height={SIZE}
        viewBox="0 0 52 52"
        fill="none"
        style={{ transform: `rotate(${rotation}deg)`, filter: 'drop-shadow(0 0 6px hsl(var(--primary)/0.6))' }}
      >
        {/* Arrow shaft + head */}
        <path
          d="M6 26H46M46 26L32 12M46 26L32 40"
          stroke="hsl(var(--primary))"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

// Second arrow for step 6: also show a "drag direction" arrow below the tab
function SplitViewHintArrow({ spotlight }: { spotlight: SpotlightRect }) {
  const SIZE = 44;
  return (
    <div
      className="absolute z-[10001] pointer-events-none animate-pulse"
      style={{
        left: spotlight.left + spotlight.width / 2 - SIZE / 2,
        top:  spotlight.top  + spotlight.height + 12,
      }}
    >
      <svg width={SIZE} height={SIZE} viewBox="0 0 44 44" fill="none"
        style={{ filter: 'drop-shadow(0 0 5px hsl(var(--primary)/0.5))' }}>
        <path d="M4 22H40M40 22L28 10M40 22L28 34"
          stroke="hsl(var(--primary))" strokeWidth="4.5"
          strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      <p className="text-xs font-bold text-center mt-1" style={{ color: 'hsl(var(--primary))' }}>drag →</p>
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
      setSpotlight({ top: rect.top - 8, left: rect.left - 8, width: rect.width + 16, height: rect.height + 16 });
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

  // Tooltip positioning
  const tooltipStyle = useMemo((): React.CSSProperties => {
    const margin = 16;
    const tooltipWidth  = isMinimized ? 300 : 400;
    const tooltipHeight = isMinimized ? 64  : 300;

    if (!spotlight) return { top: '50%', left: '50%', transform: 'translate(-50%,-50%)' };

    const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
    const cx = spotlight.left + spotlight.width  / 2;
    const cy = spotlight.top  + spotlight.height / 2;

    const candidates = [
      { x: cx - tooltipWidth / 2, y: spotlight.top  + spotlight.height + margin },
      { x: cx - tooltipWidth / 2, y: spotlight.top  - tooltipHeight - margin },
      { x: spotlight.left + spotlight.width  + margin, y: cy - tooltipHeight / 2 },
      { x: spotlight.left - tooltipWidth - margin,     y: cy - tooltipHeight / 2 },
    ].map(c => ({
      x: clamp(c.x, margin, window.innerWidth  - tooltipWidth  - margin),
      y: clamp(c.y, margin, window.innerHeight - tooltipHeight - margin),
    }));

    // On step 7 (drag evidence), avoid covering chart area and reasoning board
    const avoidRects: Array<{ left: number; top: number; right: number; bottom: number }> = [];
    if (step === 7) {
      document.querySelectorAll('[data-tutorial="chart-area"], [data-tutorial="reasoning-board"]').forEach(el => {
        const r = el.getBoundingClientRect();
        avoidRects.push({ left: r.left, top: r.top, right: r.right, bottom: r.bottom });
      });
    }

    const overlapArea = (
      a: { left: number; top: number; right: number; bottom: number },
      b: { left: number; top: number; right: number; bottom: number }
    ) => Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) *
         Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));

    let best = candidates[0];
    let bestScore = Infinity;

    for (const c of candidates) {
      const r = { left: c.x, top: c.y, right: c.x + tooltipWidth, bottom: c.y + tooltipHeight };
      const sr = { left: spotlight.left, top: spotlight.top, right: spotlight.left + spotlight.width, bottom: spotlight.top + spotlight.height };
      const score = overlapArea(r, sr) * 100
        + avoidRects.reduce((s, a) => s + overlapArea(r, a), 0) * 10
        + Math.hypot(r.left + tooltipWidth / 2 - cx, r.top + tooltipHeight / 2 - cy);
      if (score < bestScore) { bestScore = score; best = c; }
    }

    return { top: best.y, left: best.x };
  }, [spotlight, step, isMinimized]);

  // Direction of arrow: toward spotlight from tooltip
  const arrowDir = useMemo((): ArrowDir | null => {
    // Use forced direction for specific steps (e.g. step 6 always right)
    if (config?.forceArrowDir) return config.forceArrowDir;
    // Only show arrow when action is pending
    if (!config?.action || actionCompleted || !spotlight) return null;

    const tooltipWidth  = isMinimized ? 300 : 400;
    const tooltipHeight = isMinimized ? 64  : 300;
    const tipTop  = typeof tooltipStyle.top  === 'number' ? tooltipStyle.top  : null;
    const tipLeft = typeof tooltipStyle.left === 'number' ? tooltipStyle.left : null;
    if (tipTop === null || tipLeft === null) return null;

    const dx = (spotlight.left + spotlight.width  / 2) - (tipLeft + tooltipWidth  / 2);
    const dy = (spotlight.top  + spotlight.height / 2) - (tipTop  + tooltipHeight / 2);
    if (Math.abs(dx) < 60 && Math.abs(dy) < 60) return null;
    return Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
  }, [config, actionCompleted, spotlight, tooltipStyle, isMinimized]);

  if (!active || !config) return null;

  return (
    <div className="fixed inset-0 z-[9999] pointer-events-none">

      {/* Very subtle background tint — does NOT block interaction */}
      <div className="absolute inset-0 bg-black/15 pointer-events-none" />

      {/* Spotlight: pulsing halo + solid ring — no clip-path, page stays usable */}
      {spotlight && (
        <>
          <div
            className="absolute rounded-xl border-2 border-primary/60 animate-ping pointer-events-none"
            style={{ top: spotlight.top, left: spotlight.left, width: spotlight.width, height: spotlight.height }}
          />
          <div
            className="absolute rounded-xl border-[3px] border-primary pointer-events-none transition-all duration-300"
            style={{
              top: spotlight.top, left: spotlight.left,
              width: spotlight.width, height: spotlight.height,
              boxShadow: '0 0 0 6px hsl(var(--primary)/0.2), 0 0 20px hsl(var(--primary)/0.3)',
            }}
          />
        </>
      )}

      {/* Big floating arrow pointing at the spotlight */}
      {spotlight && arrowDir && !actionCompleted && (
        <FloatingArrow direction={arrowDir} spotlight={spotlight} />
      )}

      {/* Step 6: extra "drag →" hint arrow below the reasoning tab */}
      {spotlight && step === 6 && !actionCompleted && (
        <SplitViewHintArrow spotlight={spotlight} />
      )}

      {/* Tooltip card */}
      <div
        className={cn('absolute max-w-[calc(100vw-32px)] pointer-events-auto transition-all duration-200',
          isMinimized ? 'w-[300px]' : 'w-[400px]')}
        style={tooltipStyle}
      >
        <div className="bg-card border-2 border-primary/20 rounded-xl shadow-2xl p-5 space-y-3">

          {/* Step dots + minimize */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              {[1,2,3,4,5,6,7,8,9].map(s => (
                <div key={s} className={cn('w-2 h-2 rounded-full transition-colors',
                  s === step ? 'bg-primary scale-125' : s < step ? 'bg-primary/40' : 'bg-muted-foreground/20'
                )} />
              ))}
              <span className="text-xs text-muted-foreground ml-1">Step {step} of 9</span>
            </div>
            <button onClick={() => setIsMinimized(p => !p)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              {isMinimized ? 'Expand' : 'Minimize'}
            </button>
          </div>

          {isMinimized ? (
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground">Tutorial minimized.</p>
              <button onClick={skipTutorial}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
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
                  <div className={cn(
                    'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                    actionCompleted ? 'bg-green-500/10 text-green-700' : 'bg-primary/10 text-primary'
                  )}>
                    {actionCompleted ? (
                      <><CheckCircle2 className="w-4 h-4" />Done! Click Next to continue.</>
                    ) : (
                      <><span className="w-4 h-4 border-2 border-current rounded-full flex-shrink-0 animate-pulse" />{config.action}</>
                    )}
                  </div>
                  {actionCompleted && (
                    <button onClick={advanceStep}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-bold hover:bg-primary/90 transition-colors">
                      Next Step <ArrowRight className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ) : (
                <button onClick={advanceStep}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-bold hover:bg-primary/90 transition-colors">
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
