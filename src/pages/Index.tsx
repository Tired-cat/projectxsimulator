import { useCallback, useState, useEffect, ReactNode } from 'react';
import { BarChart3, AlertCircle, PieChart, Settings, LogOut, Send } from 'lucide-react';
import { useMarketingSimulation } from '@/hooks/useMarketingSimulation';
import { SimulationShell } from '@/components/simulation/SimulationShell';
import { SimulationHome } from '@/components/simulation/SimulationHome';
import { SimulationDecisions } from '@/components/simulation/SimulationDecisions';
import { SplitViewBarCharts } from '@/components/simulation/SplitViewBarCharts';
import { ProductMixChart } from '@/components/simulation/ProductMixChart';
import { TabProvider, useTabs } from '@/contexts/TabContext';
import { ReasoningBoardProvider, useReasoningBoard } from '@/contexts/ReasoningBoardContext';
import { TutorialProvider } from '@/contexts/TutorialContext';
import { TutorialOverlay } from '@/components/tutorial/TutorialOverlay';
import { SaveIndicator } from '@/components/SaveIndicator';
import { useAuthContext } from '@/contexts/AuthContext';
import { useSession } from '@/hooks/useSession';
import { useAutoSave } from '@/hooks/useAutoSave';
import { useSubmit } from '@/hooks/useSubmit';
import Auth from '@/pages/Auth';
import type { PanelId } from '@/types/workspaceTypes';
import { GLOBAL_BUDGET, PRODUCTS, CHANNELS, INITIAL_SPEND, calculateMixedRevenue as calcRevenue, CHANNEL_IDS } from '@/lib/marketingConstants';
import type { ChannelSpend } from '@/hooks/useMarketingSimulation';
import type { ReasoningBlockId } from '@/types/evidenceChip';
import { Button } from '@/components/ui/button';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';

function SimulationContent() {
  const { openTab } = useTabs();
  const { user, signOut, isProfessor, role } = useAuthContext();
  const { board, writtenDiagnosis, loadBoard, setWrittenDiagnosis } = useReasoningBoard();
  
  const { session, savedState, loading: sessionLoading, setSession } = useSession(user?.id);
  
  const [isLocked, setIsLocked] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);

  const {
    channelSpend,
    updateChannelSpend,
    remainingBudget,
    totalSpent,
    channelMetrics,
    totals,
    resetSimulation,
    hasUserModified,
  } = useMarketingSimulation();

  // Auto-save
  const { saveStatus, adjustmentsMade, forceSave, initAdjustments } = useAutoSave({
    sessionId: session?.id ?? null,
    userId: user?.id,
    board,
    writtenDiagnosis,
    isCompleted: isLocked,
  });

  // Submit
  const { submit, isSubmitting, isSubmitted, setIsSubmitted } = useSubmit({
    sessionId: session?.id ?? null,
    userId: user?.id,
    sessionStartedAt: session?.startedAt ?? null,
    board,
    writtenDiagnosis,
    forceSave,
    onCompleted: () => {
      setIsLocked(true);
      toast({ title: '✅ Submitted!', description: 'Your work has been submitted. No further edits can be made.' });
    },
  });

  // Load saved state on mount
  useEffect(() => {
    if (savedState) {
      // Reconstruct board from saved cards
      const cards = savedState.cards as any[];
      if (Array.isArray(cards) && cards.length > 0) {
        const reconstructed: Record<ReasoningBlockId, any[]> = {
          descriptive: [],
          diagnostic: [],
          predictive: [],
          prescriptive: [],
        };
        for (const card of cards) {
          const blockId = card.blockId as ReasoningBlockId;
          if (blockId && reconstructed[blockId]) {
            const { blockId: _, ...chip } = card;
            reconstructed[blockId].push(chip);
          }
        }
        loadBoard(reconstructed);
      }
      if (savedState.writtenDiagnosis) {
        setWrittenDiagnosis(savedState.writtenDiagnosis);
      }
      initAdjustments(savedState.adjustmentsMade);
    }
  }, [savedState]);

  // Lock if already completed
  useEffect(() => {
    if (session?.isCompleted) {
      setIsLocked(true);
      setIsSubmitted(true);
    }
  }, [session?.isCompleted]);

  // Compare-mode state
  const [shellCompareActive, setShellCompareActive] = useState(false);
  const [shellSnapshotSpend, setShellSnapshotSpend] = useState<ChannelSpend | null>(null);
  const [shellBaselineSpend, setShellBaselineSpend] = useState<ChannelSpend>({ ...INITIAL_SPEND } as ChannelSpend);

  const handleShellActivateCompare = useCallback(() => {
    setShellSnapshotSpend({ ...channelSpend });
    setShellBaselineSpend({ ...channelSpend });
    setShellCompareActive(true);
    window.dispatchEvent(new Event('tutorial:compare-activated'));
  }, [channelSpend]);

  const handleShellCloseCompare = useCallback(() => {
    setShellCompareActive(false);
    setShellSnapshotSpend(null);
  }, []);

  const handleStartDecisions = useCallback(() => {
    openTab('decisions');
  }, [openTab]);

  const renderPanelContent = useCallback((panelId: PanelId): ReactNode => {
    switch (panelId) {
      case 'channel-performance':
        return (
          <SplitViewBarCharts
            channelSpend={channelSpend}
            onSpendChange={isLocked ? () => {} : updateChannelSpend}
            channelMetrics={channelMetrics}
            totals={totals}
            remainingBudget={remainingBudget}
            isSplitView={shellCompareActive}
            snapshotSpend={shellSnapshotSpend}
            baselineSpend={shellBaselineSpend}
            onActivateSplitView={handleShellActivateCompare}
            onCloseSplitView={handleShellCloseCompare}
          />
        );
      case 'product-mix':
        return <ProductMixChart channelMetrics={channelMetrics} />;
      case 'hints':
        return (
          <div className="bg-gradient-to-r from-primary/5 to-secondary/30 rounded-lg p-4">
            <p className="text-sm text-muted-foreground">
              💡 <strong>The Trap:</strong> Switch between <em>"Views"</em> and <em>"Revenue"</em> filters.
              Which channel looks best in each view? Then check the <em>Product Mix</em> to see what each
              channel actually sells!
            </p>
          </div>
        );
      case 'assumptions':
        return (
          <Accordion type="single" collapsible defaultValue="assumptions">
            <AccordionItem value="assumptions" className="border-none">
              <AccordionTrigger className="py-3 hover:no-underline">
                <span className="text-sm font-medium">📋 Simulation Assumptions</span>
              </AccordionTrigger>
              <AccordionContent className="pb-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm text-foreground">Products</h4>
                    <div className="space-y-1 text-xs text-muted-foreground">
                      <p>• <strong>{PRODUCTS.BOTTLE.name}</strong> - Entry-level, impulse buy</p>
                      <p>• <strong>{PRODUCTS.CUSHION.name}</strong> - Mid-tier, considered purchase</p>
                      <p>• <strong>{PRODUCTS.CHAIR.name}</strong> - Premium, high-consideration</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm text-foreground">Channel Tendencies</h4>
                    <div className="space-y-1 text-xs text-muted-foreground">
                      <p>• <strong>TikTok:</strong> ${CHANNELS.tiktok.cpc}/click, young audience, impulse buyers</p>
                      <p>• <strong>Instagram:</strong> ${CHANNELS.instagram.cpc}/click, lifestyle focus</p>
                      <p>• <strong>Facebook:</strong> ${CHANNELS.facebook.cpc}/click, older demographics</p>
                      <p>• <strong>Newspaper:</strong> ${CHANNELS.newspaper.cpc}/click, professional readers, high intent</p>
                    </div>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        );
      default:
        return null;
    }
  }, [channelSpend, updateChannelSpend, channelMetrics, totals, remainingBudget, hasUserModified, shellCompareActive, shellSnapshotSpend, shellBaselineSpend, handleShellActivateCompare, handleShellCloseCompare, isLocked]);

  if (sessionLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Loading your session…</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <SimulationShell
        homeContent={
          <SimulationHome 
            onStartDecisions={handleStartDecisions}
            currentRevenue={totals.totalRevenue}
          />
        }
        decisionsContent={
          <SimulationDecisions
            channelSpend={channelSpend}
            updateChannelSpend={isLocked ? (() => {}) as any : updateChannelSpend}
            channelMetrics={channelMetrics}
            totals={totals}
            remainingBudget={remainingBudget}
            hasUserModified={hasUserModified}
            totalSpent={totalSpent}
            onReset={isLocked ? () => {} : resetSimulation}
          />
        }
        renderPanelContent={renderPanelContent}
        statusBarExtra={
          <div className="flex items-center gap-3">
            <SaveIndicator status={saveStatus} />
            {!isLocked && !isProfessor && (
              <Button
                size="sm"
                variant="default"
                className="h-6 text-xs px-3"
                onClick={() => setShowSubmitConfirm(true)}
              >
                <Send className="w-3 h-3 mr-1" />
                Submit
              </Button>
            )}
            {isSubmitted && (
              <span className="text-xs font-medium text-emerald-600 flex items-center gap-1">
                ✅ Submitted
              </span>
            )}
            <span className="text-xs text-muted-foreground">
              {user?.email} ({role})
            </span>
            <button
              onClick={signOut}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
            >
              <LogOut className="w-3 h-3" />
              Sign out
            </button>
          </div>
        }
      />
      <TutorialOverlay />

      {/* Submit confirmation dialog */}
      <Dialog open={showSubmitConfirm} onOpenChange={setShowSubmitConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit your work?</DialogTitle>
            <DialogDescription>
              Once submitted, you won't be able to make any further changes. 
              Make sure you're happy with your reasoning board and decisions.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 justify-end mt-4">
            <Button variant="outline" onClick={() => setShowSubmitConfirm(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                setShowSubmitConfirm(false);
                submit();
              }}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Submitting…' : 'Yes, Submit'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

const Index = () => {
  const { isAuthenticated, loading } = useAuthContext();

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Auth />;
  }

  return (
    <TabProvider>
      <ReasoningBoardProvider>
        <TutorialProvider>
          <SimulationContent />
        </TutorialProvider>
      </ReasoningBoardProvider>
    </TabProvider>
  );
};

export default Index;
