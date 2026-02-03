import { useState, useCallback, useEffect, useMemo } from 'react';
import type { 
  WorkspaceLayout, 
  PanelDefinition, 
  DropZoneType, 
  PersistedLayout,
  Pane,
  TabGroup
} from '@/types/dockingTypes';

const STORAGE_KEY = 'workspace-layout';

// Default layout factory
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
    },
    workspaceTabs: [],
    activeWorkspaceTab: null
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
    },
    workspaceTabs: layout.workspaceTabs.map(t => t.panelId),
    activeWorkspaceTab: layout.activeWorkspaceTab
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
    },
    workspaceTabs: persisted.workspaceTabs.map(id => ({ panelId: id })),
    activeWorkspaceTab: persisted.activeWorkspaceTab
  };
}

export function useWorkspaceLayout(defaultPanelIds: string[] = []) {
  const [panels, setPanels] = useState<Map<string, PanelDefinition>>(new Map());
  const [layout, setLayout] = useState<WorkspaceLayout>(() => {
    const persisted = loadPersistedLayout();
    if (persisted) {
      return restoreLayout(persisted);
    }
    // Create default with provided panel IDs in pane A
    const defaultLayout = createDefaultLayout();
    defaultLayout.paneA.tabGroup.tabs = defaultPanelIds.map(id => ({ panelId: id }));
    defaultLayout.paneA.tabGroup.activeTabId = defaultPanelIds[0] || '';
    return defaultLayout;
  });
  
  const [draggingPanel, setDraggingPanel] = useState<string | null>(null);

  // Persist layout on changes
  useEffect(() => {
    persistLayout(layout);
  }, [layout]);

  // Register a panel
  const registerPanel = useCallback((panel: PanelDefinition) => {
    setPanels(prev => {
      const next = new Map(prev);
      next.set(panel.id, panel);
      return next;
    });
    
    // If panel not in any location, add to pane A
    setLayout(prev => {
      const existsInA = prev.paneA.tabGroup.tabs.some(t => t.panelId === panel.id);
      const existsInB = prev.paneB.tabGroup.tabs.some(t => t.panelId === panel.id);
      const existsInWorkspace = prev.workspaceTabs.some(t => t.panelId === panel.id);
      
      if (!existsInA && !existsInB && !existsInWorkspace) {
        return {
          ...prev,
          paneA: {
            ...prev.paneA,
            tabGroup: {
              tabs: [...prev.paneA.tabGroup.tabs, { panelId: panel.id }],
              activeTabId: prev.paneA.tabGroup.activeTabId || panel.id
            }
          }
        };
      }
      return prev;
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

  // Helper to remove panel from all locations
  const removePanelFromAll = (layout: WorkspaceLayout, panelId: string): WorkspaceLayout => {
    const filterTabs = (tabs: { panelId: string }[]) => tabs.filter(t => t.panelId !== panelId);
    
    const newPaneA: Pane = {
      ...layout.paneA,
      tabGroup: {
        tabs: filterTabs(layout.paneA.tabGroup.tabs),
        activeTabId: layout.paneA.tabGroup.activeTabId === panelId
          ? filterTabs(layout.paneA.tabGroup.tabs)[0]?.panelId || ''
          : layout.paneA.tabGroup.activeTabId
      }
    };
    
    const newPaneB: Pane = {
      ...layout.paneB,
      tabGroup: {
        tabs: filterTabs(layout.paneB.tabGroup.tabs),
        activeTabId: layout.paneB.tabGroup.activeTabId === panelId
          ? filterTabs(layout.paneB.tabGroup.tabs)[0]?.panelId || ''
          : layout.paneB.tabGroup.activeTabId
      }
    };
    
    const newWorkspaceTabs = filterTabs(layout.workspaceTabs);
    
    return {
      ...layout,
      paneA: newPaneA,
      paneB: newPaneB,
      workspaceTabs: newWorkspaceTabs,
      activeWorkspaceTab: layout.activeWorkspaceTab === panelId
        ? newWorkspaceTabs[0]?.panelId || null
        : layout.activeWorkspaceTab
    };
  };

  // Move panel to target location
  const movePanel = useCallback((panelId: string, target: DropZoneType, insertIndex?: number) => {
    setLayout(prev => {
      // First remove from current location
      let next = removePanelFromAll(prev, panelId);
      
      const tab = { panelId };
      
      switch (target) {
        case 'tab-bar-a':
        case 'pane-content-a':
        case 'split-left': {
          const tabs = [...next.paneA.tabGroup.tabs];
          if (insertIndex !== undefined) {
            tabs.splice(insertIndex, 0, tab);
          } else {
            tabs.push(tab);
          }
          next = {
            ...next,
            paneA: {
              ...next.paneA,
              tabGroup: { tabs, activeTabId: panelId }
            }
          };
          break;
        }
        
        case 'tab-bar-b':
        case 'pane-content-b':
        case 'split-right': {
          const tabs = [...next.paneB.tabGroup.tabs];
          if (insertIndex !== undefined) {
            tabs.splice(insertIndex, 0, tab);
          } else {
            tabs.push(tab);
          }
          next = {
            ...next,
            splitMode: true, // Auto-enable split mode
            paneB: {
              ...next.paneB,
              tabGroup: { tabs, activeTabId: panelId }
            }
          };
          break;
        }
        
        case 'workspace-tabs': {
          next = {
            ...next,
            workspaceTabs: [...next.workspaceTabs, tab],
            activeWorkspaceTab: panelId
          };
          break;
        }
      }
      
      return next;
    });
  }, []);

  // Set active tab
  const setActiveTab = useCallback((paneId: 'pane-a' | 'pane-b' | 'workspace', tabId: string) => {
    setLayout(prev => {
      if (paneId === 'workspace') {
        return { ...prev, activeWorkspaceTab: tabId };
      }
      
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

  // Close split mode and merge panels
  const closeSplitMode = useCallback(() => {
    setLayout(prev => {
      // Move all pane B tabs to pane A
      const mergedTabs = [
        ...prev.paneA.tabGroup.tabs,
        ...prev.paneB.tabGroup.tabs
      ];
      
      return {
        ...prev,
        splitMode: false,
        paneA: {
          ...prev.paneA,
          tabGroup: {
            tabs: mergedTabs,
            activeTabId: prev.paneA.tabGroup.activeTabId || mergedTabs[0]?.panelId || ''
          }
        },
        paneB: {
          ...prev.paneB,
          tabGroup: { tabs: [], activeTabId: '' }
        }
      };
    });
  }, []);

  // Reset to default layout
  const resetLayout = useCallback(() => {
    const allPanelIds = Array.from(panels.keys());
    const defaultLayout = createDefaultLayout();
    defaultLayout.paneA.tabGroup.tabs = allPanelIds.map(id => ({ panelId: id }));
    defaultLayout.paneA.tabGroup.activeTabId = allPanelIds[0] || '';
    setLayout(defaultLayout);
    localStorage.removeItem(STORAGE_KEY);
  }, [panels]);

  // Get panel by ID
  const getPanel = useCallback((panelId: string) => {
    return panels.get(panelId);
  }, [panels]);

  return {
    layout,
    panels,
    registerPanel,
    unregisterPanel,
    movePanel,
    setActiveTab,
    toggleSplitMode,
    closeSplitMode,
    resetLayout,
    getPanel,
    draggingPanel,
    setDraggingPanel
  };
}
