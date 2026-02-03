import { useState, useCallback, useEffect } from 'react';
import type { 
  WorkspaceLayout, 
  PanelDefinition, 
  DropZoneType, 
  PersistedLayout,
  Pane
} from '@/types/dockingTypes';

const STORAGE_KEY = 'workspace-layout';

// Default layout factory - starts EMPTY (no auto-docked panels)
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
    activeWorkspaceTab: null,
    // Track which panels are docked (removed from their normal grid position)
    dockedPanelIds: []
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
    activeWorkspaceTab: layout.activeWorkspaceTab,
    dockedPanelIds: layout.dockedPanelIds
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
    activeWorkspaceTab: persisted.activeWorkspaceTab,
    dockedPanelIds: persisted.dockedPanelIds || []
  };
}

export function useWorkspaceLayout() {
  const [panels, setPanels] = useState<Map<string, PanelDefinition>>(new Map());
  const [layout, setLayout] = useState<WorkspaceLayout>(() => {
    const persisted = loadPersistedLayout();
    if (persisted) {
      return restoreLayout(persisted);
    }
    // Start with empty layout - no auto-docked panels
    return createDefaultLayout();
  });
  
  const [draggingPanel, setDraggingPanel] = useState<string | null>(null);

  // Persist layout on changes
  useEffect(() => {
    persistLayout(layout);
  }, [layout]);

  // Register a panel - DOES NOT auto-dock, just stores the definition
  const registerPanel = useCallback((panel: PanelDefinition) => {
    setPanels(prev => {
      // Only update if panel doesn't exist or has changed title/icon
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
    // NO auto-adding to tabs - panels live in grid by default
  }, []);

  // Unregister a panel
  const unregisterPanel = useCallback((panelId: string) => {
    setPanels(prev => {
      const next = new Map(prev);
      next.delete(panelId);
      return next;
    });
  }, []);

  // Check if a panel is currently docked (in any dock location)
  const isPanelDocked = useCallback((panelId: string): boolean => {
    return layout.dockedPanelIds.includes(panelId);
  }, [layout.dockedPanelIds]);

  // Helper to remove panel from all dock locations
  const removePanelFromAllDocks = (layout: WorkspaceLayout, panelId: string): WorkspaceLayout => {
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
        : layout.activeWorkspaceTab,
      dockedPanelIds: layout.dockedPanelIds.filter(id => id !== panelId)
    };
  };

  // Dock a panel to a target location (moves it from grid to dock)
  const dockPanel = useCallback((panelId: string, target: DropZoneType, insertIndex?: number) => {
    setLayout(prev => {
      // First remove from any current dock location
      let next = removePanelFromAllDocks(prev, panelId);
      
      const tab = { panelId };
      
      // Add to dockedPanelIds if not already there
      const newDockedIds = next.dockedPanelIds.includes(panelId)
        ? next.dockedPanelIds
        : [...next.dockedPanelIds, panelId];
      
      next = { ...next, dockedPanelIds: newDockedIds };
      
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
            splitMode: true, // Auto-enable split mode when docking to right
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

  // Undock a panel (return it to the grid)
  const undockPanel = useCallback((panelId: string) => {
    setLayout(prev => removePanelFromAllDocks(prev, panelId));
  }, []);

  // Move panel between dock locations (panel must already be docked)
  const movePanel = useCallback((panelId: string, target: DropZoneType, insertIndex?: number) => {
    // If not docked, dock it; otherwise just move within docks
    dockPanel(panelId, target, insertIndex);
  }, [dockPanel]);

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

  // Reset to default layout (undock all panels)
  const resetLayout = useCallback(() => {
    setLayout(createDefaultLayout());
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  // Get panel by ID
  const getPanel = useCallback((panelId: string) => {
    return panels.get(panelId);
  }, [panels]);

  // Check if any panels are docked
  const hasDockedPanels = layout.dockedPanelIds.length > 0;

  return {
    layout,
    panels,
    registerPanel,
    unregisterPanel,
    movePanel,
    dockPanel,
    undockPanel,
    isPanelDocked,
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
