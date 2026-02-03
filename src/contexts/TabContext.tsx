import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import type { PanelId } from '@/types/workspaceTypes';

export type TabKind = 'home' | 'decisions' | 'panel';

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
  
  // Drag state
  draggingPanelId: PanelId | null;
  setDraggingPanelId: (id: PanelId | null) => void;
  
  // Tab actions
  openTab: (kind: TabKind, panelType?: PanelId, title?: string) => string;
  closeTab: (id: string) => void;
  setActiveTab: (id: string) => void;
  
  // Split actions
  enableSplit: () => void;
  disableSplit: () => void;
  setPaneTab: (pane: SplitPane, tabId: string) => void;
  
  // Convenience: open panel as tab and activate
  openPanelAsTab: (panelType: PanelId, title: string) => void;
  // Convenience: open panel in split pane
  openPanelInSplit: (panelType: PanelId, title: string, pane: SplitPane) => void;
}

const TabContext = createContext<TabContextValue | null>(null);

// Default pinned tabs
const DEFAULT_TABS: Tab[] = [
  { id: 'home', title: 'Home', kind: 'home', pinned: true, closable: false },
  { id: 'decisions', title: 'My Decisions', kind: 'decisions', pinned: true, closable: false },
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

  const openTab = useCallback((kind: TabKind, panelType?: PanelId, title?: string): string => {
    if (kind === 'home' || kind === 'decisions') {
      // For built-in tabs, just activate
      const existingTab = tabs.find(t => t.kind === kind);
      if (existingTab) {
        setActiveTabIdState(existingTab.id);
        return existingTab.id;
      }
      return '';
    }
    
    // Create new panel tab
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
    // Cannot close pinned tabs
    if (tab?.pinned) return;
    
    setTabs(prev => prev.filter(t => t.id !== id));
    
    // If closing a tab in split, update split state
    setSplit(prev => {
      const newSplit = { ...prev };
      if (prev.leftTabId === id) newSplit.leftTabId = null;
      if (prev.rightTabId === id) newSplit.rightTabId = null;
      // If both panes empty, disable split
      if (!newSplit.leftTabId && !newSplit.rightTabId) {
        newSplit.enabled = false;
      }
      return newSplit;
    });
    
    // If closing active tab, switch to decisions or first available
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

  const enableSplit = useCallback(() => {
    setSplit(prev => ({
      ...prev,
      enabled: true,
      // Default left pane to current active if it's a panel
      leftTabId: prev.leftTabId || (tabs.find(t => t.id === activeTabId && t.kind === 'panel')?.id || null),
    }));
  }, [tabs, activeTabId]);

  const disableSplit = useCallback(() => {
    setSplit({
      enabled: false,
      leftTabId: null,
      rightTabId: null,
    });
  }, []);

  const setPaneTab = useCallback((pane: SplitPane, tabId: string) => {
    setSplit(prev => ({
      ...prev,
      [pane === 'left' ? 'leftTabId' : 'rightTabId']: tabId,
    }));
  }, []);

  const openPanelAsTab = useCallback((panelType: PanelId, title: string) => {
    openTab('panel', panelType, title);
  }, [openTab]);

  const openPanelInSplit = useCallback((panelType: PanelId, title: string, pane: SplitPane) => {
    const newTabId = openTab('panel', panelType, title);
    setSplit(prev => ({
      enabled: true,
      leftTabId: pane === 'left' ? newTabId : (prev.leftTabId || activeTabId),
      rightTabId: pane === 'right' ? newTabId : prev.rightTabId,
    }));
  }, [openTab, activeTabId]);

  return (
    <TabContext.Provider value={{
      tabs,
      activeTabId,
      split,
      draggingPanelId,
      setDraggingPanelId,
      openTab,
      closeTab,
      setActiveTab: handleSetActiveTab,
      enableSplit,
      disableSplit,
      setPaneTab,
      openPanelAsTab,
      openPanelInSplit,
    }}>
      {children}
    </TabContext.Provider>
  );
}

export function useTabs() {
  const context = useContext(TabContext);
  if (!context) {
    throw new Error('useTabs must be used within a TabProvider');
  }
  return context;
}
