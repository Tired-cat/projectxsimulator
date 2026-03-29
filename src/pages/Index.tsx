import { useCallback, useState, useEffect, useMemo, ReactNode } from 'react';
import { BarChart3, AlertCircle, PieChart, Settings, LogOut, Send, MessageCircle } from 'lucide-react';
import { DndContext, DragEndEvent, DragStartEvent, DragCancelEvent, DragOverlay } from '@dnd-kit/core';
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
import { useAuth } from '@/contexts/AuthContext';
import { useSession } from '@/hooks/useSession';
import { useAutoSave } from '@/hooks/useAutoSave';
import { useSubmission } from '@/hooks/useSubmission';
import { supabase } from '@/integrations/supabase/client';
import Auth from '@/pages/Auth';
import type { PanelId } from '@/types/workspaceTypes';
import { GLOBAL_BUDGET, PRODUCTS, CHANNELS, INITIAL_SPEND, calculateMixedRevenue as calcRevenue, CHANNEL_IDS } from '@/lib/marketingConstants';
import type { ChannelSpend } from '@/hooks/useMarketingSimulation';
import { createEvidenceChip } from '@/types/evidenceChip';
import type { ReasoningBoardState } from '@/types/evidenceChip';
import type { EvidenceDragData, EvidenceDropData, ExternalEvidencePayload } from '@/lib/evidenceDnd';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';


function SimulationContent() {
  const { openTab } = useTabs();
  const { user, signOut, role } = useAuth();
  const { board, addChip, moveChip, contextualiseChip, writtenDiagnosis, loadBoard } = useReasoningBoard();
  const [activeDragHtml, setActiveDragHtml] = useState<string | null>(null);
  const [activeDragSize, setActiveDragSize] = useState<{ width: number; height: number } | null>(null);
  const [usedAi, setUsedAi] = useState(false);

  const handleChatWithAi = useCallback(() => {
    setUsedAi(true);
    window.open('#', '_blank');
  }, []);

  // --- @dnd-kit onDragEnd handler (central dispatcher) ---
  const chipFromPayload = useCallback((payload: ExternalEvidencePayload) => {
    const { label, value, context, sourceId, ...rest } = payload;
    return createEvidenceChip(label, value, context, sourceId, rest);
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    setActiveDragHtml(null);
    setActiveDragSize(null);
    const { active, over } = event;
    const dragData = active.data.current as EvidenceDragData | undefined;
    const dropData = over?.data.current as EvidenceDropData | undefined;

    if (!dragData || !dropData) return;

    if (dropData.kind === 'reasoning-block') {
      if (dragData.kind === 'board-chip') {
        moveChip(dragData.fromBlock, dropData.blockId, dragData.chip.id);
      } else {
        addChip(dropData.blockId, chipFromPayload(dragData.payload));
      }
      return;
    }

    if (dropData.kind === 'context-target' && dragData.kind === 'external-chip') {
      contextualiseChip(dropData.blockId, dropData.targetChipId, chipFromPayload(dragData.payload));
    }
  }, [addChip, moveChip, contextualiseChip, chipFromPayload]);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    let node = (event.activatorEvent as PointerEvent)?.target as HTMLElement | null;
    if (node) {
      const root = node.closest<HTMLElement>('[role="button"]');
      if (root) node = root;
    }
    if (node) {
      setActiveDragHtml(node.outerHTML);
      setActiveDragSize({ width: node.offsetWidth, height: node.offsetHeight });
    }
  }, []);

  const handleDragCancel = useCallback((_event: DragCancelEvent) => {
    setActiveDragHtml(null);
    setActiveDragSize(null);
  }, []);

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

  const { sessionId, isCompleted, startedAt, completedAt, loading: sessionLoading, completeSession } = useSession();

  // Load saved board state when session is ready
  useEffect(() => {
    if (!sessionId || !user) return;

    const loadSaved = async () => {
      const { data } = await supabase
        .from('reasoning_board_state')
        .select('cards, written_diagnosis')
        .eq('session_id', sessionId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (data && data.cards) {
        try {
          const cards = data.cards as unknown as ReasoningBoardState;
          // Only load if it has the right shape
          if (cards.descriptive && cards.diagnostic && cards.predictive && cards.prescriptive) {
            loadBoard(cards, data.written_diagnosis || '');
          }
        } catch {
          // Invalid shape, start fresh
        }
      }
    };

    loadSaved();
  }, [sessionId, user, loadBoard]);

  // Auto-save
  const totalChips = useMemo(() => Object.values(board).reduce((s, arr) => s + arr.length, 0), [board]);

  const { saveStatus, forceSave, adjustmentsMade } = useAutoSave({
    sessionId,
    board,
    writtenDiagnosis,
    isCompleted,
  });

  // Submit
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [submitted, setSubmitted] = useState(isCompleted);

  useEffect(() => {
    setSubmitted(isCompleted);
  }, [isCompleted]);

  const { submit } = useSubmission({
    sessionId,
    startedAt,
    finalDecision: writtenDiagnosis,
    cardsOnBoardCount: totalChips,
    board,
    adjustmentsMade,
    usedAi,
    forceSave,
    completeSession,
  });

  const handleSubmit = useCallback(async () => {
    setShowSubmitDialog(false);
    await submit();
    setSubmitted(true);
    toast({ title: '✅ Submitted!', description: 'Your work has been submitted successfully. The simulation is now locked.' });
  }, [submit]);

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
            onSpendChange={submitted ? () => {} : updateChannelSpend}
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
  }, [channelSpend, updateChannelSpend, channelMetrics, totals, remainingBudget, submitted, shellCompareActive, shellSnapshotSpend, shellBaselineSpend, handleShellActivateCompare, handleShellCloseCompare]);

  if (sessionLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading your session…</p>
      </div>
    );
  }

  return (
    <>
      {/* Submitted banner */}
      {submitted && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-success/10 border-b border-success/30 px-4 py-2 text-center text-sm font-medium text-success">
          ✅ Your work has been submitted. The simulation is now locked.
        </div>
      )}

      {/* Top bar with user info */}
      <div className={`fixed ${submitted ? 'top-9' : 'top-0'} right-0 z-40 flex items-center gap-2 p-2`}>
        {!submitted && (
          <Button
            size="sm"
            variant="outline"
            onClick={handleChatWithAi}
            className="gap-1.5"
          >
            <MessageCircle className="h-3.5 w-3.5" />
            💬 Chat with AI Assistant
          </Button>
        )}
        {!submitted && totalChips > 0 && (
          <Button
            size="sm"
            variant="default"
            onClick={() => setShowSubmitDialog(true)}
            className="gap-1.5"
          >
            <Send className="h-3.5 w-3.5" />
            Submit
          </Button>
        )}
        <Button size="sm" variant="ghost" onClick={signOut} className="gap-1.5 text-muted-foreground">
          <LogOut className="h-3.5 w-3.5" />
          Sign Out
        </Button>
      </div>

      <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDragCancel={handleDragCancel}>
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
            updateChannelSpend={submitted ? (() => {}) as any : updateChannelSpend}
            channelMetrics={channelMetrics}
            totals={totals}
            remainingBudget={remainingBudget}
            hasUserModified={hasUserModified}
            totalSpent={totalSpent}
            onReset={submitted ? () => {} : resetSimulation}
          />
        }
        renderPanelContent={renderPanelContent}
      />

        <DragOverlay dropAnimation={null}>
          {activeDragHtml && activeDragSize ? (
            <div
              style={{
                width: activeDragSize.width,
                height: activeDragSize.height,
                opacity: 0.5,
                pointerEvents: 'none',
                filter: 'grayscale(20%)',
              }}
              dangerouslySetInnerHTML={{ __html: activeDragHtml }}
            />
          ) : null}
        </DragOverlay>
      </DndContext>

      <TutorialOverlay />
      <SaveIndicator status={saveStatus} />

      {/* Submit confirmation dialog */}
      <Dialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit your work?</DialogTitle>
            <DialogDescription>
              Once submitted, the simulation will be locked and you won't be able to make further changes.
              Make sure you're happy with your reasoning board and budget allocation.
            </DialogDescription>
          </DialogHeader>
          <div className="py-3 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Evidence cards placed:</span>
              <span className="font-medium">{totalChips}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total revenue:</span>
              <span className="font-medium">${totals.totalRevenue.toLocaleString()}</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSubmitDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>
              <Send className="h-4 w-4 mr-2" />
              Confirm Submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

const Index = () => {
  const { user, loading, role } = useAuth();

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (!user) {
    return <Auth />;
  }

  // Professors see a link to dashboard instead of the simulation
  if (role === 'professor') {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <p className="text-lg font-medium">Welcome, Professor!</p>
          <a href="/dashboard" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity">
            📊 Go to Dashboard
          </a>
        </div>
      </div>
    );
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
