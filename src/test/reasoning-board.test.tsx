import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ReasoningBoardProvider, useReasoningBoard } from '@/contexts/ReasoningBoardContext';
import { TabProvider, useTabs } from '@/contexts/TabContext';
import { ReasoningBoard } from '@/components/reasoning/ReasoningBoard';
import { SimulationShell } from '@/components/simulation/SimulationShell';
import type { EvidenceChip } from '@/types/evidenceChip';
import type { PanelId } from '@/types/workspaceTypes';

type BoardApi = ReturnType<typeof useReasoningBoard>;
type TabsApi = ReturnType<typeof useTabs>;

function makeChip(
  id: string,
  overrides: Partial<EvidenceChip> = {}
): EvidenceChip {
  return {
    id,
    label: 'Test Evidence',
    value: '$100',
    context: 'Test context',
    sourceId: 'test-source',
    createdAt: 1,
    ...overrides,
  };
}

function BoardCapture({ onCapture }: { onCapture: (api: BoardApi) => void }) {
  const api = useReasoningBoard();
  onCapture(api);
  return null;
}

function TabsCapture({ onCapture }: { onCapture: (api: TabsApi) => void }) {
  const api = useTabs();
  onCapture(api);
  return null;
}

function renderBoardOnly() {
  let boardApi: BoardApi | null = null;

  const utils = render(
    <ReasoningBoardProvider>
      <BoardCapture onCapture={(api) => { boardApi = api; }} />
      <ReasoningBoard />
    </ReasoningBoardProvider>
  );

  return {
    ...utils,
    getBoardApi: () => {
      if (!boardApi) throw new Error('Board API not captured');
      return boardApi;
    },
  };
}

function renderSimulationShell() {
  let boardApi: BoardApi | null = null;
  let tabsApi: TabsApi | null = null;

  const renderPanelContent = (panelId: PanelId) => (
    <div data-testid={`panel-${panelId}`}>Panel {panelId}</div>
  );

  const utils = render(
    <TabProvider>
      <ReasoningBoardProvider>
        <TabsCapture onCapture={(api) => { tabsApi = api; }} />
        <BoardCapture onCapture={(api) => { boardApi = api; }} />
        <SimulationShell
          homeContent={<div data-testid="home-content">Home Content</div>}
          decisionsContent={<div data-testid="decisions-content">Decisions Content</div>}
          renderPanelContent={renderPanelContent}
        />
      </ReasoningBoardProvider>
    </TabProvider>
  );

  return {
    ...utils,
    getBoardApi: () => {
      if (!boardApi) throw new Error('Board API not captured');
      return boardApi;
    },
    getTabsApi: () => {
      if (!tabsApi) throw new Error('Tabs API not captured');
      return tabsApi;
    },
  };
}

function getBlockDropZoneByTitle(title: string): HTMLElement {
  const titleNode = screen.getAllByText(title)[0];
  const block = titleNode.parentElement?.parentElement?.parentElement;
  if (!block) throw new Error(`Could not find block container for "${title}"`);
  return block as HTMLElement;
}

describe('Tier 1 - Component Logic', () => {
  it('1. each reasoning block renders independently with no shared state leakage', () => {
    const { getBoardApi } = renderBoardOnly();
    const chip = makeChip('chip-independent', { label: 'Descriptive Only' });

    act(() => {
      getBoardApi().addChip('descriptive', chip);
    });

    const board = getBoardApi().board;
    expect(board.descriptive).toHaveLength(1);
    expect(board.diagnostic).toHaveLength(0);
    expect(board.predictive).toHaveLength(0);
    expect(board.prescriptive).toHaveLength(0);
  });

  it('2. a block accepts evidence input and stores it correctly', () => {
    const { getBoardApi } = renderBoardOnly();
    const chip = makeChip('chip-drop', { label: 'Dropped Evidence' });
    const rawChip = JSON.stringify(chip);
    const diagnosticBlock = getBlockDropZoneByTitle('Diagnostic');
    const descriptiveBlock = getBlockDropZoneByTitle('Descriptive');

    fireEvent.dragOver(diagnosticBlock, {
      dataTransfer: {
        types: ['application/evidence-chip'],
      },
    });

    fireEvent.drop(diagnosticBlock, {
      dataTransfer: {
        getData: (key: string) => (key === 'application/evidence-chip' ? rawChip : ''),
      },
    });

    // Diagnostic is locked before Descriptive has evidence.
    expect(getBoardApi().board.diagnostic).toHaveLength(0);

    fireEvent.dragOver(descriptiveBlock, {
      dataTransfer: {
        types: ['application/evidence-chip'],
      },
    });

    fireEvent.drop(descriptiveBlock, {
      dataTransfer: {
        getData: (key: string) => (key === 'application/evidence-chip' ? rawChip : ''),
      },
    });

    expect(getBoardApi().board.descriptive).toHaveLength(1);
    expect(getBoardApi().board.descriptive[0].id).toBe('chip-drop');
  });

  it('3. clearing one block does not affect others', () => {
    const { getBoardApi } = renderBoardOnly();

    act(() => {
      getBoardApi().addChip('descriptive', makeChip('chip-d1', { label: 'D1' }));
      getBoardApi().addChip('diagnostic', makeChip('chip-g1', { label: 'G1' }));
    });

    act(() => {
      getBoardApi().removeChip('descriptive', 'chip-d1');
    });

    const board = getBoardApi().board;
    expect(board.descriptive).toHaveLength(0);
    expect(board.diagnostic).toHaveLength(1);
    expect(board.diagnostic[0].id).toBe('chip-g1');
  });

  it('4. block labels (Descriptive, Diagnostic, Predictive, Prescriptive) are stable', () => {
    renderBoardOnly();

    expect(screen.getAllByText('Descriptive').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Diagnostic').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Predictive').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Prescriptive').length).toBeGreaterThan(0);
  });

  it('5. Reasoning Board renders correctly inside the Split View pane', () => {
    const { getTabsApi } = renderSimulationShell();

    act(() => {
      getTabsApi().activateSplitWithTabs('reasoning', 'home');
    });

    expect(screen.getByText('Left: Reasoning Board')).toBeInTheDocument();
    expect(screen.getByText('Right: Home')).toBeInTheDocument();
    expect(screen.getAllByText('Descriptive').length).toBeGreaterThan(0);
  });
});

describe('Tier 2 - State & Data Flow', () => {
  it('6. evidence sent to a block persists across tab switches', () => {
    const { getBoardApi, getTabsApi } = renderSimulationShell();

    act(() => {
      getTabsApi().setActiveTab('reasoning');
      getBoardApi().addChip('descriptive', makeChip('chip-persist', { label: 'Persist me' }));
      getTabsApi().setActiveTab('home');
      getTabsApi().setActiveTab('reasoning');
    });

    expect(getBoardApi().board.descriptive).toHaveLength(1);
    expect(getBoardApi().board.descriptive[0].id).toBe('chip-persist');
  });

  it('7. evidence is scoped to the correct block (not broadcast to all)', () => {
    const { getBoardApi } = renderSimulationShell();

    act(() => {
      getBoardApi().addChip('predictive', makeChip('chip-predictive', { label: 'Forecast Evidence' }));
    });

    const board = getBoardApi().board;
    expect(board.predictive).toHaveLength(1);
    expect(board.descriptive).toHaveLength(0);
    expect(board.diagnostic).toHaveLength(0);
    expect(board.prescriptive).toHaveLength(0);
  });

  it('8. Reasoning Board state does not reset when the other pane changes', () => {
    const { getBoardApi, getTabsApi } = renderSimulationShell();

    act(() => {
      getTabsApi().activateSplitWithTabs('reasoning', 'home');
      getBoardApi().addChip('diagnostic', makeChip('chip-cross-pane', { label: 'Cross-pane stable' }));
      getTabsApi().openTabInSplit('decisions', 'right');
    });

    expect(getBoardApi().board.diagnostic).toHaveLength(1);
    expect(getBoardApi().board.diagnostic[0].id).toBe('chip-cross-pane');
  });

  it('9. Tab state (TabProvider) does not interfere with Reasoning Board state', () => {
    const { getBoardApi, getTabsApi } = renderSimulationShell();
    let panelTabId = '';

    act(() => {
      getBoardApi().addChip('prescriptive', makeChip('chip-tab-isolation', { label: 'Tab isolated evidence' }));
      panelTabId = getTabsApi().openTab('panel', 'product-mix', 'Product Mix');
      getTabsApi().setActiveTab(panelTabId);
      getTabsApi().closeTab(panelTabId);
      getTabsApi().setActiveTab('reasoning');
    });

    expect(getBoardApi().board.prescriptive).toHaveLength(1);
    expect(getBoardApi().board.prescriptive[0].id).toBe('chip-tab-isolation');
  });
});

describe('Tier 3 - Cross-Pane & Layout', () => {
  it('10. Split View renders both panes at 50/50 without overlap', () => {
    const { container, getTabsApi } = renderSimulationShell();

    act(() => {
      getTabsApi().activateSplitWithTabs('home', 'reasoning');
    });

    const splitGrid = container.querySelector('.grid.grid-cols-2');
    expect(splitGrid).toBeInTheDocument();
    expect(splitGrid?.children).toHaveLength(2);
    expect(screen.getByText('Left: Home')).toBeInTheDocument();
    expect(screen.getByText('Right: Reasoning Board')).toBeInTheDocument();
  });

  it('11. Reasoning Board does not break when the opposite pane has no content', () => {
    const { getTabsApi } = renderSimulationShell();

    act(() => {
      getTabsApi().openTabInSplit('reasoning', 'left');
    });

    expect(screen.getByText('Left: Reasoning Board')).toBeInTheDocument();
    expect(screen.getByText('Right Pane')).toBeInTheDocument();
    expect(screen.getAllByText('Descriptive').length).toBeGreaterThan(0);
  });

  it('12. resize or layout shift does not corrupt block content', () => {
    const { getBoardApi, getTabsApi } = renderSimulationShell();

    act(() => {
      getBoardApi().addChip('descriptive', makeChip('chip-layout-shift', { label: 'Layout shift evidence' }));
      getTabsApi().activateSplitWithTabs('reasoning', 'home');
    });

    act(() => {
      window.dispatchEvent(new Event('resize'));
      getTabsApi().openTabInSplit('decisions', 'right');
      getTabsApi().disableSplit();
    });

    expect(getBoardApi().board.descriptive).toHaveLength(1);
    expect(getBoardApi().board.descriptive[0].id).toBe('chip-layout-shift');
  });
});

describe('Tier 4 - Edge Cases', () => {
  it('13. Reasoning Board handles zero evidence gracefully', () => {
    renderBoardOnly();

    expect(screen.getByText(/Click/i)).toBeInTheDocument();
    expect(screen.getAllByText('Drop evidence here').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Locked')).toHaveLength(3);
  });

  it('14. duplicate evidence added to the same block does not create duplicates', () => {
    const { getBoardApi } = renderBoardOnly();
    const duplicateChip = makeChip('dup-chip', { label: 'Duplicate Chip' });

    act(() => {
      getBoardApi().addChip('descriptive', duplicateChip);
      getBoardApi().addChip('descriptive', duplicateChip);
    });

    expect(getBoardApi().board.descriptive).toHaveLength(1);
  });

  it('15. very long evidence text does not break block layout', () => {
    const { container, getBoardApi } = renderBoardOnly();
    const longLabel = 'VeryLongEvidenceLabel_'.repeat(20);
    const longContext = 'VeryLongContext_'.repeat(30);

    act(() => {
      getBoardApi().addChip('diagnostic', makeChip('long-chip', {
        label: longLabel,
        value: '$12345678901234567890',
        context: longContext,
      }));
    });

    expect(getBoardApi().board.diagnostic).toHaveLength(1);
    expect(screen.getAllByText(new RegExp(longLabel.slice(0, 20))).length).toBeGreaterThan(0);
    expect(container.querySelectorAll('.truncate').length).toBeGreaterThan(0);
  });
});
