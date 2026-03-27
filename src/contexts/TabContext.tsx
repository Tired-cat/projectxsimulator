import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import type { PanelId } from '@/types/workspaceTypes';

export type TabKind = 'home' | 'decisions' | 'reasoning' | 'panel';

export interface Tab {
  id: string;
  title: string;
  kind: TabKind;
  pinned: boolean;
  closable: boolean;
  // For panel tabs
  panelType?: PanelId;
}

export type SplitPane = 'left' | 'right';

/**
 * A split pane can display any tab (by tab id), not just panel ids.
 */
interface SplitState {
  enabled: boolean;
  leftTabId: string | null;
  rightTabId: string | null;
}

interface TabContextValue {
  // Tab state
  tabs: Tab[];
  activeTabId: string;

  // Split state
  split: SplitState;

  // Drag state (for panel cards dragged from grid)
  draggingPanelId: PanelId | null;
  setDraggingPanelId: (id: PanelId | null) => void;

  // Drag state for tabs being dragged in the tab strip
  draggingTabId: string | null;
  setDraggingTabId: (id: string | null) => void;

  // Tab actions
  openTab: (kind: TabKind, panelType?: PanelId, title?: string) => string;
  closeTab: (id: string) => void;
  setActiveTab: (id: string) => void;

  // Split actions
  disableSplit: () => void;

  // Add panel as tab (does NOT switch view)
  addPanelAsTab: (panelType: PanelId, title: string) => string;

  // Open panel in split pane (when dropping from card grid)
  activateSplitWithPanel: (panelId: PanelId, title: string, defaultLeftPanel?: PanelId) => void;
  openPanelInSplit: (panelType: PanelId, title: string, pane: SplitPane) => void;

  // Tab drag-to-split: open any tab in a split pane
  openTabInSplit: (tabId: string, pane: SplitPane) => void;
  activateSplitWithTabs: (leftTabId: string, rightTabId: string) => void;
}

const TabContext = createContext<TabContextValue | null>(null);

// Default pinned tabs
const DEFAULT_TABS: Tab[] = [
  { id: 'home', title: 'Home', kind: 'home', pinned: true, closable: false },
  { id: 'decisions', title: 'My Decisions', kind: 'decisions', pinned: true, closable: false },
  { id: 'reasoning', title: 'Reasoning Board', kind: 'reasoning', pinned: true, closable: false },
];

let tabIdCounter = 0;
function generateTabId(): string {
  return `panel-${++tabIdCounter}-${Date.now()}`;
}

export function TabProvider({ children }: { children: ReactNode }) {
  const [tabs, setTabs] = useState<Tab[]>(DEFAULT_TABS);
  const [activeTabId, setActiveTabIdState] = useState<string>('home');
  const [split, setSplit] = useState<SplitState>({
    enabled: false,
    leftTabId: null,
    rightTabId: null,
  });
  const [draggingPanelId, setDraggingPanelId] = useState<PanelId | null>(null);
  const [draggingTabId, setDraggingTabId] = useState<string | null>(null);

  const openTab = useCallback((kind: TabKind, panelType?: PanelId, title?: string): string => {
    if (kind === 'home' || kind === 'decisions' || kind === 'reasoning') {
      const existingTab = tabs.find(t => t.kind === kind);
      if (existingTab) {
        setActiveTabIdState(existingTab.id);
        return existingTab.id;
      }
      return '';
    }

    const newId = generateTabId();
    const newTab: Tab = {
      id: newId,
      title: title || 'Panel',
      kind: 'panel',
      pinned: false,
      closable: true,
      panelType,
    };

    setTabs(prev => [...prev, newTab]);
    setActiveTabIdState(newId);
    return newId;
  }, [tabs]);

  const closeTab = useCallback((id: string) => {
    const tab = tabs.find(t => t.id === id);
    if (tab?.pinned) return;

    setTabs(prev => prev.filter(t => t.id !== id));

    // Remove from split if active
    setSplit(prev => {
      if (prev.leftTabId === id || prev.rightTabId === id) {
        const newLeft = prev.leftTabId === id ? null : prev.leftTabId;
        const newRight = prev.rightTabId === id ? null : prev.rightTabId;
        // If both panes empty, disable split
        if (!newLeft && !newRight) {
          return { enabled: false, leftTabId: null, rightTabId: null };
        }
        return { ...prev, leftTabId: newLeft, rightTabId: newRight };
      }
      return prev;
    });

    if (activeTabId === id) {
      const remaining = tabs.filter(t => t.id !== id);
      const decisions = remaining.find(t => t.kind === 'decisions');
      setActiveTabIdState(decisions?.id || remaining[0]?.id || 'home');
    }
  }, [tabs, activeTabId]);

  const handleSetActiveTab = useCallback((id: string) => {
    if (tabs.some(t => t.id === id)) {
      setActiveTabIdState(id);
    }
  }, [tabs]);

  const disableSplit = useCallback(() => {
    setSplit({ enabled: false, leftTabId: null, rightTabId: null });
  }, []);

  // Open a tab by id in a specific split pane
  const openTabInSplit = useCallback((tabId: string, pane: SplitPane) => {
    setSplit(prev => ({
      enabled: true,
      leftTabId: pane === 'left' ? tabId : prev.leftTabId,
      rightTabId: pane === 'right' ? tabId : prev.rightTabId,
    }));
  }, []);

  // Activate split with two specific tab ids
  const activateSplitWithTabs = useCallback((leftTabId: string, rightTabId: string) => {
    setSplit({ enabled: true, leftTabId, rightTabId });
  }, []);

  // Legacy: activate split from dragging a card panel
  const activateSplitWithPanel = useCallback((panelId: PanelId, title: string, defaultLeftPanel: PanelId = 'channel-performance') => {
    // Ensure we have a tab for the right panel
    let rightTabId: string;
    const existingRight = tabs.find(t => t.kind === 'panel' && t.panelType === panelId);
    if (existingRight) {
      rightTabId = existingRight.id;
    } else {
      const newId = generateTabId();
      const newTab: Tab = { id: newId, title, kind: 'panel', pinned: false, closable: true, panelType: panelId };
      setTabs(prev => [...prev, newTab]);
      rightTabId = newId;
    }

    // Left side: use decisions tab (which shows the card grid)
    setSplit(prev => ({
      enabled: true,
      leftTabId: prev.enabled ? prev.leftTabId : 'decisions',
      rightTabId,
    }));
  }, [tabs]);

  // Legacy: open a panel id in a split pane (from card drag-drop onto SplitWorkspace)
  const openPanelInSplit = useCallback((panelType: PanelId, title: string, pane: SplitPane) => {
    let tabId: string;
    const existingTab = tabs.find(t => t.kind === 'panel' && t.panelType === panelType);
    if (existingTab) {
      tabId = existingTab.id;
    } else {
      const newId = generateTabId();
      const newTab: Tab = { id: newId, title, kind: 'panel', pinned: false, closable: true, panelType };
      setTabs(prev => [...prev, newTab]);
      tabId = newId;
    }

    setSplit(prev => ({
      enabled: true,
      leftTabId: pane === 'left' ? tabId : prev.leftTabId,
      rightTabId: pane === 'right' ? tabId : prev.rightTabId,
    }));
  }, [tabs]);

  const addPanelAsTab = useCallback((panelType: PanelId, title: string): string => {
    const existingTab = tabs.find(t => t.kind === 'panel' && t.panelType === panelType);
    if (existingTab) return existingTab.id;

    const newId = generateTabId();
    const newTab: Tab = { id: newId, title, kind: 'panel', pinned: false, closable: true, panelType };
    setTabs(prev => [...prev, newTab]);
    return newId;
  }, [tabs]);

  return (
    <TabContext.Provider value={{
      tabs,
      activeTabId,
      split,
      draggingPanelId,
      setDraggingPanelId,
      draggingTabId,
      setDraggingTabId,
      openTab,
      closeTab,
      setActiveTab: handleSetActiveTab,
      disableSplit,
      addPanelAsTab,
      activateSplitWithPanel,
      activateSplitWithTabs,
      openTabInSplit,
      openPanelInSplit,
    }}>
      {children}
    </TabContext.Provider>
  );
}

export function useTabs() {
  const context = useContext(TabContext);
  if (!context) throw new Error('useTabs must be used within a TabProvider');
  return context;
}
