import { ReactNode, useState, useCallback } from 'react';
import { RotateCcw, Home, BarChart3, Monitor } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { GLOBAL_BUDGET } from '@/lib/marketingConstants';
import { cn } from '@/lib/utils';

export type SimulationTab = 'home' | 'decisions';

interface SimulationShellProps {
  totalSpent: number;
  onReset: () => void;
  activeTab: SimulationTab;
  onTabChange: (tab: SimulationTab) => void;
  homeContent: ReactNode;
  decisionsContent: ReactNode;
}

const tabs = [
  { id: 'home' as SimulationTab, label: 'Home', icon: Home },
  { id: 'decisions' as SimulationTab, label: 'My Decisions', icon: BarChart3 },
];

export function SimulationShell({
  totalSpent,
  onReset,
  activeTab,
  onTabChange,
  homeContent,
  decisionsContent,
}: SimulationShellProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-slate-50 to-blue-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800 py-8 px-4">
      {/* Outer page context - user knows they're "outside" the simulator */}
      <div className="max-w-7xl mx-auto">
        {/* Browser window shell */}
        <div 
          className="relative bg-card rounded-2xl shadow-2xl border-2 border-border/50 overflow-hidden"
          style={{
            // Stable fixed height to prevent layout shifts
            height: 'calc(100vh - 64px)',
            minHeight: '700px',
            maxHeight: '1000px',
            // Create isolated stacking context
            isolation: 'isolate',
          }}
        >
          {/* Browser chrome / title bar */}
          <div className="bg-muted/80 backdrop-blur-sm border-b border-border px-4 py-3 flex items-center gap-3">
            {/* Traffic light dots */}
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-400" />
              <div className="w-3 h-3 rounded-full bg-yellow-400" />
              <div className="w-3 h-3 rounded-full bg-green-400" />
            </div>
            
            {/* URL bar style */}
            <div className="flex-1 flex items-center justify-center">
              <div className="flex items-center gap-2 bg-background/80 px-4 py-1.5 rounded-lg border border-border/50 text-sm text-muted-foreground max-w-md w-full">
                <Monitor className="w-4 h-4" />
                <span className="truncate">lumbar-pro-simulator.app</span>
              </div>
            </div>
            
            {/* Spacer for symmetry */}
            <div className="w-16" />
          </div>

          {/* Internal app header */}
          <div className="bg-card border-b border-border px-6 py-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-primary-foreground font-bold text-lg">
                  L
                </div>
                <div>
                  <h1 className="text-xl font-bold text-foreground">
                    LumbarPro Marketing Simulator
                  </h1>
                  <p className="text-xs text-muted-foreground">
                    Interactive budget allocation exercise
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                {/* Budget indicator */}
                <div className="flex items-center gap-3 bg-secondary/50 px-4 py-2 rounded-lg border border-border">
                  <div className="text-right">
                    <div className="text-xs text-muted-foreground">Budget Used</div>
                    <div className="text-sm font-bold text-primary">
                      ${totalSpent.toLocaleString()} / ${GLOBAL_BUDGET.toLocaleString()}
                    </div>
                  </div>
                  <div className="w-20 h-2 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-300"
                      style={{ width: `${(totalSpent / GLOBAL_BUDGET) * 100}%` }}
                    />
                  </div>
                </div>
                
                <Button variant="outline" size="sm" onClick={onReset}>
                  <RotateCcw className="h-4 w-4 mr-1" />
                  Reset
                </Button>
              </div>
            </div>
          </div>

          {/* Internal navigation tabs */}
          <div className="bg-muted/30 border-b border-border px-6">
            <nav className="flex gap-1" aria-label="Simulator navigation">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => onTabChange(tab.id)}
                    className={cn(
                      'flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all border-b-2 -mb-px',
                      isActive
                        ? 'border-primary text-primary bg-background/50'
                        : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-background/30'
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Content area with independent scroll */}
          <ScrollArea 
            className="flex-1"
            style={{
              // Fixed height for stable layout
              height: 'calc(100% - 180px)',
            }}
          >
            <div className="p-6">
              {activeTab === 'home' && homeContent}
              {activeTab === 'decisions' && decisionsContent}
            </div>
          </ScrollArea>
        </div>

        {/* Footer outside the shell */}
        <div className="mt-4 text-center text-xs text-muted-foreground">
          <p>© 2024 LumbarPro Learning Platform • Educational Simulation</p>
        </div>
      </div>
    </div>
  );
}
