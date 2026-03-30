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
}

const REVENUE_GOAL = 100000;

export function SimulationHome({ onStartDecisions, currentRevenue, sessionId, userId }: SimulationHomeProps) {
  const progressPercent = Math.min((currentRevenue / REVENUE_GOAL) * 100, 100);
  const { startTutorial } = useTutorial();
  const tutorialClickedRef = useRef(false);

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

  return (
    <div className="max-w-4xl mx-auto space-y-8">
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
          Can You Reach $100,000 in Revenue?
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
      <Card className="border-2 border-green-500/30 bg-green-500/5">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-green-500/20 rounded-xl">
              <Target className="w-6 h-6 text-green-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-lg text-foreground mb-2">Your Objective</h3>
              <p className="text-muted-foreground mb-4">
                Reallocate the ${GLOBAL_BUDGET.toLocaleString()} budget to reach 
                <strong className="text-green-600"> $100,000 in revenue</strong>. 
                Drag the bars to adjust spend per channel and watch the results update in real-time.
              </p>
              
              {/* Progress indicator */}
              <div className="p-4 bg-background rounded-lg border border-border">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Current Progress</span>
                  <span className="text-sm font-bold">
                    ${currentRevenue.toLocaleString()} / ${REVENUE_GOAL.toLocaleString()}
                  </span>
                </div>
                <div className="h-3 bg-secondary rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${
                      currentRevenue >= REVENUE_GOAL 
                        ? 'bg-green-500' 
                        : 'bg-gradient-to-r from-primary to-primary/70'
                    }`}
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <div className="text-xs text-muted-foreground text-right mt-1">
                  {progressPercent.toFixed(1)}% of goal
                </div>
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
