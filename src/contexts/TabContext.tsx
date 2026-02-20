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

interface SplitState {
  enabled: boolean;
  leftPanelId: PanelId | null;  // Panel shown in left pane
  rightPanelId: PanelId | null; // Panel shown in right pane (comparison)
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
  
  // Add panel as tab (does NOT switch view)
  addPanelAsTab: (panelType: PanelId, title: string) => string;
  // Open panel in split - enables split mode with left=current, right=dragged
  activateSplitWithPanel: (panelId: PanelId, title: string, defaultLeftPanel?: PanelId) => void;
  // Open panel in split pane (when already in split mode)
  openPanelInSplit: (panelType: PanelId, title: string, pane: SplitPane) => void;
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
    leftPanelId: null,
    rightPanelId: null,
  });
  const [draggingPanelId, setDraggingPanelId] = useState<PanelId | null>(null);

  const openTab = useCallback((kind: TabKind, panelType?: PanelId, title?: string): string => {
    if (kind === 'home' || kind === 'decisions' || kind === 'reasoning') {
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
    }));
  }, []);

  const disableSplit = useCallback(() => {
    setSplit({
      enabled: false,
      leftPanelId: null,
      rightPanelId: null,
    });
  }, []);

  // Activate split with a panel - used when dragging from normal mode
  const activateSplitWithPanel = useCallback((panelId: PanelId, title: string, defaultLeftPanel: PanelId = 'channel-performance') => {
    setSplit(prev => {
      if (prev.enabled) {
        // Already in split mode - just replace right pane
        return {
          ...prev,
          rightPanelId: panelId,
        };
      }
      // Enable split: left = default active panel, right = dragged panel
      return {
        enabled: true,
        leftPanelId: defaultLeftPanel,
        rightPanelId: panelId,
      };
    });
    
    // Switch to Decisions tab to see the split
    const decisionsTab = tabs.find(t => t.kind === 'decisions');
    if (decisionsTab) {
      setActiveTabIdState(decisionsTab.id);
    }
  }, [tabs]);

  // Add panel as tab WITHOUT activating it (silent creation)
  const addPanelAsTab = useCallback((panelType: PanelId, title: string): string => {
    // Check if tab already exists
    const existingTab = tabs.find(t => t.kind === 'panel' && t.panelType === panelType);
    if (existingTab) {
      return existingTab.id;
    }
    
    // Create new tab without activating
    const newId = generateTabId();
    const newTab: Tab = {
      id: newId,
      title,
      kind: 'panel',
      pinned: false,
      closable: true,
      panelType,
    };
    setTabs(prev => [...prev, newTab]);
    return newId;
  }, [tabs]);

  const openPanelInSplit = useCallback((panelType: PanelId, title: string, pane: SplitPane) => {
    // Set the panel directly in the specified pane
    setSplit(prev => ({
      enabled: true,
      leftPanelId: pane === 'left' ? panelType : prev.leftPanelId,
      rightPanelId: pane === 'right' ? panelType : prev.rightPanelId,
    }));
    
    // Switch to Decisions tab to see the split
    const decisionsTab = tabs.find(t => t.kind === 'decisions');
    if (decisionsTab) {
      setActiveTabIdState(decisionsTab.id);
    }
  }, [tabs]);

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
      addPanelAsTab,
      activateSplitWithPanel,
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
