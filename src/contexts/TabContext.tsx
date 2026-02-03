import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export type TabKind = 'home' | 'decisions';

export interface Tab {
  id: string;
  title: string;
  kind: TabKind;
  pinned: boolean;
  closable: boolean;
}

interface TabContextValue {
  tabs: Tab[];
  activeTabId: string;
  openTab: (kind: TabKind) => void;
  closeTab: (id: string) => void;
  setActiveTab: (id: string) => void;
}

const TabContext = createContext<TabContextValue | null>(null);

// Default pinned tabs
const DEFAULT_TABS: Tab[] = [
  { id: 'home', title: 'Home', kind: 'home', pinned: true, closable: false },
  { id: 'decisions', title: 'My Decisions', kind: 'decisions', pinned: true, closable: false },
];

export function TabProvider({ children }: { children: ReactNode }) {
  const [tabs, setTabs] = useState<Tab[]>(DEFAULT_TABS);
  const [activeTabId, setActiveTabId] = useState<string>('home');

  const openTab = useCallback((kind: TabKind) => {
    // For now, just activate the existing tab of that kind
    const existingTab = tabs.find(t => t.kind === kind);
    if (existingTab) {
      setActiveTabId(existingTab.id);
    }
  }, [tabs]);

  const closeTab = useCallback((id: string) => {
    const tab = tabs.find(t => t.id === id);
    // Cannot close pinned tabs
    if (tab?.pinned) return;
    
    setTabs(prev => prev.filter(t => t.id !== id));
    
    // If closing active tab, switch to first available
    if (activeTabId === id) {
      const remaining = tabs.filter(t => t.id !== id);
      if (remaining.length > 0) {
        setActiveTabId(remaining[0].id);
      }
    }
  }, [tabs, activeTabId]);

  const handleSetActiveTab = useCallback((id: string) => {
    if (tabs.some(t => t.id === id)) {
      setActiveTabId(id);
    }
  }, [tabs]);

  return (
    <TabContext.Provider value={{
      tabs,
      activeTabId,
      openTab,
      closeTab,
      setActiveTab: handleSetActiveTab,
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
