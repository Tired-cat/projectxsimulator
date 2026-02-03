import { useState, useCallback, useEffect } from 'react';
import type { 
  WorkspaceLayout, 
  PanelDefinition, 
  DropZoneType, 
  PersistedLayout,
  Pane
} from '@/types/dockingTypes';

const STORAGE_KEY = 'workspace-layout-v2';

// Default layout factory - starts EMPTY (no cloned views)
function createDefaultLayout(): WorkspaceLayout {
  return {
    splitMode: false,
    paneA: {
      id: 'pane-a',
      tabGroup: { tabs: [], activeTabId: '' }
    },
    paneB: {
      id: 'pane-b',
      tabGroup: { tabs: [], activeTabId: '' }
    }
  };
}

// Persist layout to localStorage
function persistLayout(layout: WorkspaceLayout): void {
  const persisted: PersistedLayout = {
    splitMode: layout.splitMode,
    paneA: {
      tabs: layout.paneA.tabGroup.tabs.map(t => t.panelId),
      activeTabId: layout.paneA.tabGroup.activeTabId
    },
    paneB: {
      tabs: layout.paneB.tabGroup.tabs.map(t => t.panelId),
      activeTabId: layout.paneB.tabGroup.activeTabId
    }
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(persisted));
}

// Load layout from localStorage
function loadPersistedLayout(): PersistedLayout | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored) as PersistedLayout;
    }
  } catch (e) {
    console.warn('Failed to load persisted layout:', e);
  }
  return null;
}

// Restore layout from persisted data
function restoreLayout(persisted: PersistedLayout): WorkspaceLayout {
  return {
    splitMode: persisted.splitMode,
    paneA: {
      id: 'pane-a',
      tabGroup: {
        tabs: persisted.paneA.tabs.map(id => ({ panelId: id })),
        activeTabId: persisted.paneA.activeTabId
      }
    },
    paneB: {
      id: 'pane-b',
      tabGroup: {
        tabs: persisted.paneB.tabs.map(id => ({ panelId: id })),
        activeTabId: persisted.paneB.activeTabId
      }
    }
  };
}

export function useWorkspaceLayout() {
  const [panels, setPanels] = useState<Map<string, PanelDefinition>>(new Map());
  const [layout, setLayout] = useState<WorkspaceLayout>(() => {
    const persisted = loadPersistedLayout();
    if (persisted) {
      return restoreLayout(persisted);
    }
    return createDefaultLayout();
  });
  
  const [draggingPanel, setDraggingPanel] = useState<string | null>(null);

  // Persist layout on changes
  useEffect(() => {
    persistLayout(layout);
  }, [layout]);

  // Register a panel definition
  const registerPanel = useCallback((panel: PanelDefinition) => {
    setPanels(prev => {
      const existing = prev.get(panel.id);
      if (existing && existing.title === panel.title && existing.icon === panel.icon) {
        // Just update content without creating new Map reference
        existing.content = panel.content;
        return prev;
      }
      const next = new Map(prev);
      next.set(panel.id, panel);
      return next;
    });
  }, []);

  // Unregister a panel
  const unregisterPanel = useCallback((panelId: string) => {
    setPanels(prev => {
      const next = new Map(prev);
      next.delete(panelId);
      return next;
    });
  }, []);

  // Check if a panel is currently in any dock view
  const isPanelInDock = useCallback((panelId: string): boolean => {
    const inPaneA = layout.paneA.tabGroup.tabs.some(t => t.panelId === panelId);
    const inPaneB = layout.paneB.tabGroup.tabs.some(t => t.panelId === panelId);
    return inPaneA || inPaneB;
  }, [layout.paneA.tabGroup.tabs, layout.paneB.tabGroup.tabs]);

  // Clone a panel into a dock view (original stays in grid)
  const clonePanelToView = useCallback((panelId: string, target: DropZoneType, insertIndex?: number) => {
    setLayout(prev => {
      const tab = { panelId };
      
      switch (target) {
        case 'tab-bar-a':
        case 'pane-content-a':
        case 'split-left': {
          // Check if already exists in pane A
          if (prev.paneA.tabGroup.tabs.some(t => t.panelId === panelId)) {
            // Just activate it
            return {
              ...prev,
              paneA: {
                ...prev.paneA,
                tabGroup: { ...prev.paneA.tabGroup, activeTabId: panelId }
              }
            };
          }
          
          const tabs = [...prev.paneA.tabGroup.tabs];
          if (insertIndex !== undefined) {
            tabs.splice(insertIndex, 0, tab);
          } else {
            tabs.push(tab);
          }
          return {
            ...prev,
            paneA: {
              ...prev.paneA,
              tabGroup: { tabs, activeTabId: panelId }
            }
          };
        }
        
        case 'tab-bar-b':
        case 'pane-content-b':
        case 'split-right': {
          // Check if already exists in pane B
          if (prev.paneB.tabGroup.tabs.some(t => t.panelId === panelId)) {
            // Just activate it and ensure split mode
            return {
              ...prev,
              splitMode: true,
              paneB: {
                ...prev.paneB,
                tabGroup: { ...prev.paneB.tabGroup, activeTabId: panelId }
              }
            };
          }
          
          const tabs = [...prev.paneB.tabGroup.tabs];
          if (insertIndex !== undefined) {
            tabs.splice(insertIndex, 0, tab);
          } else {
            tabs.push(tab);
          }
          return {
            ...prev,
            splitMode: true, // Auto-enable split mode
            paneB: {
              ...prev.paneB,
              tabGroup: { tabs, activeTabId: panelId }
            }
          };
        }
      }
      
      return prev;
    });
  }, []);

  // Close a cloned view tab (does NOT affect original in grid)
  const closeViewTab = useCallback((paneId: 'pane-a' | 'pane-b', panelId: string) => {
    setLayout(prev => {
      const paneKey = paneId === 'pane-a' ? 'paneA' : 'paneB';
      const pane = prev[paneKey];
      
      const newTabs = pane.tabGroup.tabs.filter(t => t.panelId !== panelId);
      const newActiveId = pane.tabGroup.activeTabId === panelId
        ? newTabs[0]?.panelId || ''
        : pane.tabGroup.activeTabId;
      
      return {
        ...prev,
        [paneKey]: {
          ...pane,
          tabGroup: { tabs: newTabs, activeTabId: newActiveId }
        }
      };
    });
  }, []);

  // Set active tab
  const setActiveTab = useCallback((paneId: 'pane-a' | 'pane-b', tabId: string) => {
    setLayout(prev => {
      const paneKey = paneId === 'pane-a' ? 'paneA' : 'paneB';
      return {
        ...prev,
        [paneKey]: {
          ...prev[paneKey],
          tabGroup: {
            ...prev[paneKey].tabGroup,
            activeTabId: tabId
          }
        }
      };
    });
  }, []);

  // Toggle split mode
  const toggleSplitMode = useCallback(() => {
    setLayout(prev => ({ ...prev, splitMode: !prev.splitMode }));
  }, []);

  // Close split mode and clear pane B
  const closeSplitMode = useCallback(() => {
    setLayout(prev => ({
      ...prev,
      splitMode: false,
      paneB: {
        ...prev.paneB,
        tabGroup: { tabs: [], activeTabId: '' }
      }
    }));
  }, []);

  // Reset to default layout (close all dock views)
  const resetLayout = useCallback(() => {
    setLayout(createDefaultLayout());
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  // Get panel by ID
  const getPanel = useCallback((panelId: string) => {
    return panels.get(panelId);
  }, [panels]);

  // Check if any panels are in dock views
  const hasDockedPanels = layout.paneA.tabGroup.tabs.length > 0 || layout.paneB.tabGroup.tabs.length > 0;

  return {
    layout,
    panels,
    registerPanel,
    unregisterPanel,
    clonePanelToView,
    closeViewTab,
    isPanelInDock,
    hasDockedPanels,
    setActiveTab,
    toggleSplitMode,
    closeSplitMode,
    resetLayout,
    getPanel,
    draggingPanel,
    setDraggingPanel
  };
}
