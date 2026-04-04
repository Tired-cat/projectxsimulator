import { useRef, useEffect, useCallback } from 'react';
import { Target, TrendingUp, AlertTriangle, Lightbulb, ArrowRight, GraduationCap } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GLOBAL_BUDGET, PRODUCTS, CHANNELS } from '@/lib/marketingConstants';
import { useTutorial } from '@/contexts/TutorialContext';
import { supabase } from '@/integrations/supabase/client';

interface SimulationHomeProps {
  onStartDecisions: () => void;
  currentRevenue: number;
  sessionId: string | null;
  userId: string | null;
  boardSeqRef?: React.MutableRefObject<number>;
}

const REVENUE_GOAL = 100000;

export function SimulationHome({ onStartDecisions, currentRevenue, sessionId, userId, boardSeqRef }: SimulationHomeProps) {
  const progressPercent = Math.min((currentRevenue / REVENUE_GOAL) * 100, 100);
  const { startTutorial } = useTutorial();
  const tutorialClickedRef = useRef(false);
  const scenarioReadFiredRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleTutorialClick = useCallback(() => {
    tutorialClickedRef.current = true;

    // Insert tutorial_events row with action='opened'
    if (sessionId && userId) {
      supabase.from('tutorial_events').insert({
        session_id: sessionId,
        user_id: userId,
        action: 'opened',
      }).then(() => {});

      // Update session flag
      supabase.from('sessions').update({ tutorial_opened: true })
        .eq('id', sessionId).then(() => {});
    }

    startTutorial();
  }, [sessionId, userId, startTutorial]);

  // On unmount (navigating away from Home), log 'not_opened' if button was never clicked
  useEffect(() => {
    return () => {
      if (!tutorialClickedRef.current && sessionId && userId) {
        supabase.from('tutorial_events').insert({
          session_id: sessionId,
          user_id: userId,
          action: 'not_opened',
        }).then(() => {});
      }
    };
  }, [sessionId, userId]);

  // Fire scenario_read_complete once when student scrolls to bottom (or content fits on screen)
  const fireScenarioRead = useCallback(() => {
    if (scenarioReadFiredRef.current || !sessionId || !userId) return;
    scenarioReadFiredRef.current = true;
    const seq = boardSeqRef ? ++boardSeqRef.current : 1;
    supabase.from('board_events').insert({
      session_id: sessionId,
      user_id: userId,
      event_type: 'scenario_read_complete',
      sequence_number: seq,
    }).then(() => {});
  }, [sessionId, userId, boardSeqRef]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || scenarioReadFiredRef.current) return;

    // Find the scrollable ancestor (the element that actually scrolls)
    const findScrollParent = (node: HTMLElement): HTMLElement | Window => {
      let parent = node.parentElement;
      while (parent) {
        const style = getComputedStyle(parent);
        if (/(auto|scroll)/.test(style.overflow + style.overflowY)) return parent;
        parent = parent.parentElement;
      }
      return window;
    };

    const scrollParent = findScrollParent(el);

    const checkScroll = () => {
      if (scenarioReadFiredRef.current) return;
      const elRect = el.getBoundingClientRect();
      const viewportH = scrollParent === window
        ? window.innerHeight
        : (scrollParent as HTMLElement).getBoundingClientRect().bottom;
      // Bottom of container is within 50px of the viewport bottom
      if (elRect.bottom <= viewportH + 50) {
        fireScenarioRead();
      }
    };

    // Check immediately (content might fit on screen)
    requestAnimationFrame(checkScroll);

    const target = scrollParent === window ? window : scrollParent;
    target.addEventListener('scroll', checkScroll, { passive: true });
    return () => target.removeEventListener('scroll', checkScroll);
  }, [fireScenarioRead]);

  return (
    <div ref={containerRef} className="max-w-4xl mx-auto space-y-8">
      {/* Tutorial Banner */}
      <button
        onClick={handleTutorialClick}
        className="w-full flex items-center gap-4 p-5 rounded-xl border-2 border-primary/40 bg-primary/5 hover:bg-primary/10 hover:border-primary transition-all group text-left"
      >
        <div className="p-3 bg-primary/20 rounded-xl group-hover:bg-primary/30 transition-colors">
          <GraduationCap className="w-7 h-7 text-primary" />
        </div>
        <div className="flex-1">
          <div className="font-bold text-lg text-foreground">Learn how to use the simulation</div>
          <div className="text-sm text-muted-foreground">
            A quick interactive walkthrough — you'll try each feature on the real interface.
          </div>
        </div>
        <ArrowRight className="w-5 h-5 text-primary opacity-60 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
      </button>

      {/* Hero Section */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-1.5 rounded-full text-sm font-medium">
          <Target className="w-4 h-4" />
          Marketing Analytics Exercise
        </div>
        <h2 className="text-4xl font-bold text-foreground">
          Why isn't TikTok working?
        </h2>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          You're the marketing manager at LumbarPro, a company selling ergonomic products. 
          Your challenge: optimize a ${GLOBAL_BUDGET.toLocaleString()} budget across four advertising channels.
        </p>
      </div>

      {/* The Scenario */}
      <Card className="border-2 border-amber-500/30 bg-amber-500/5">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-amber-500/20 rounded-xl">
              <AlertTriangle className="w-6 h-6 text-amber-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-lg text-foreground mb-2">The Scenario</h3>
              <p className="text-muted-foreground mb-4">
                The previous marketing team heavily invested in TikTok because it generates 
                <strong className="text-pink-500"> massive views</strong>. But leadership noticed 
                that despite high traffic, revenue isn't hitting targets.
              </p>
              <div className="grid sm:grid-cols-2 gap-4 mt-4">
                <div className="p-3 bg-background rounded-lg border border-border">
                  <div className="text-sm font-medium text-muted-foreground">Current TikTok Spend</div>
                  <div className="text-2xl font-bold text-pink-500">$9,000</div>
                  <div className="text-xs text-muted-foreground">45% of total budget</div>
                </div>
                <div className="p-3 bg-background rounded-lg border border-border">
                  <div className="text-sm font-medium text-muted-foreground">Current Newspaper Spend</div>
                  <div className="text-2xl font-bold text-yellow-600">$500</div>
                  <div className="text-xs text-muted-foreground">Only 2.5% of budget</div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Your Objective */}
      <Card className="border-2 border-primary/30 bg-gradient-to-br from-primary/5 via-background to-accent/5 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />
        <CardContent className="p-6 relative">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-primary/15 rounded-xl ring-1 ring-primary/20">
              <Target className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1 space-y-4">
              <h3 className="font-bold text-lg text-foreground">Your Objective</h3>
              <p className="text-[13.5px] leading-relaxed text-muted-foreground">
                Something in this budget doesn't add up. Dig into the data, find what's actually happening, and <strong className="text-foreground">explain it in your own words</strong>.
              </p>
              <p className="text-[13.5px] leading-relaxed text-muted-foreground">
                Place your evidence on the <strong className="text-primary">Reasoning Board</strong>, add your interpretation to each piece, and build your argument across all four steps. Get <strong className="text-primary">AI feedback</strong> when you're ready — then use it.
              </p>
              <div className="p-3.5 bg-primary/[0.07] rounded-lg border border-primary/15">
                <p className="text-[13px] leading-relaxed text-foreground/90 italic">
                  The strongest submissions aren't the ones with the highest revenue. They're the ones with the <strong className="text-primary font-semibold not-italic">clearest reasoning</strong>.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* The Learning Trap */}
      <Card className="border-2 border-primary/30 bg-primary/5">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-primary/20 rounded-xl">
              <Lightbulb className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-lg text-foreground mb-2">💡 The Hidden Trap</h3>
              <p className="text-muted-foreground mb-4">
                This simulation teaches you to look beyond vanity metrics. Switch between 
                <strong> "Views"</strong> and <strong>"Revenue"</strong> filters to see how 
                different channels perform on different metrics.
              </p>
              <p className="text-muted-foreground">
                <strong>Hint:</strong> Check the <em>Product Mix</em> chart to see what each 
                channel is actually selling. Cheap clicks don't always mean good ROI!
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Products Overview */}
      <div className="space-y-4">
        <h3 className="font-bold text-lg text-foreground">Products You're Selling</h3>
        <div className="grid sm:grid-cols-3 gap-4">
          <Card className="border border-border">
            <CardContent className="p-4 text-center">
              <div className="text-3xl mb-2">🧴</div>
              <div className="font-bold">{PRODUCTS.BOTTLE.name}</div>
              <div className="text-2xl font-bold text-cyan-500">${PRODUCTS.BOTTLE.price}</div>
              <div className="text-xs text-muted-foreground mt-1">Entry-level, impulse buy</div>
            </CardContent>
          </Card>
          <Card className="border border-border">
            <CardContent className="p-4 text-center">
              <div className="text-3xl mb-2">🛋️</div>
              <div className="font-bold">{PRODUCTS.CUSHION.name}</div>
              <div className="text-2xl font-bold text-green-500">${PRODUCTS.CUSHION.price}</div>
              <div className="text-xs text-muted-foreground mt-1">Mid-tier, considered purchase</div>
            </CardContent>
          </Card>
          <Card className="border border-border">
            <CardContent className="p-4 text-center">
              <div className="text-3xl mb-2">🪑</div>
              <div className="font-bold">{PRODUCTS.CHAIR.name}</div>
              <div className="text-2xl font-bold text-purple-500">${PRODUCTS.CHAIR.price}</div>
              <div className="text-xs text-muted-foreground mt-1">Premium, high-consideration</div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Channels Overview */}
      <div className="space-y-4">
        <h3 className="font-bold text-lg text-foreground">Advertising Channels</h3>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Object.entries(CHANNELS).map(([id, channel]) => (
            <Card key={id} className="border border-border">
              <CardContent className="p-4">
                <div 
                  className="w-3 h-3 rounded-full mb-2"
                  style={{ backgroundColor: channel.color }}
                />
                <div className="font-bold">{channel.name}</div>
                <div className="text-sm text-muted-foreground">
                  ${channel.cpc}/click
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="text-center pt-4">
        <Button 
          size="lg" 
          onClick={onStartDecisions}
          className="px-8 py-6 text-lg font-bold"
        >
          Start Making Decisions
          <ArrowRight className="w-5 h-5 ml-2" />
        </Button>
        <p className="text-sm text-muted-foreground mt-3">
          Drag the bars in the chart to reallocate your budget
        </p>
      </div>
    </div>
  );
}
