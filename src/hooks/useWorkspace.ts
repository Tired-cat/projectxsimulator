import { useState, useCallback, useMemo } from 'react';
import type { WorkspaceState, ViewTab, PanelId, DropTarget } from '@/types/workspaceTypes';
import { PANEL_DEFINITIONS } from '@/types/workspaceTypes';

const createEmptyPane = (id: 'left' | 'right') => ({
  id,
  activeTabId: null,
  tabs: [],
});

const initialState: WorkspaceState = {
  splitEnabled: false,
  leftPane: createEmptyPane('left'),
  rightPane: createEmptyPane('right'),
};

export function useWorkspace() {
  const [state, setState] = useState<WorkspaceState>(initialState);
  const [draggingPanel, setDraggingPanel] = useState<PanelId | null>(null);

  // Generate unique view ID
  const generateViewId = useCallback((panelId: PanelId) => {
    return `${panelId}-${Date.now()}`;
  }, []);

  // Add a view tab (clone panel to workspace)
  const addViewTab = useCallback((panelId: PanelId, target: DropTarget) => {
    const def = PANEL_DEFINITIONS[panelId];
    if (!def) return;

    const newTab: ViewTab = {
      id: generateViewId(panelId),
      panelId,
      title: def.title,
    };

    setState(prev => {
      if (target === 'split-left' || target === 'split-right') {
        const paneKey = target === 'split-left' ? 'leftPane' : 'rightPane';
        return {
          ...prev,
          splitEnabled: true,
          [paneKey]: {
            ...prev[paneKey],
            tabs: [...prev[paneKey].tabs, newTab],
            activeTabId: newTab.id,
          },
        };
      }

      // Default: add to left pane as tab
      return {
        ...prev,
        leftPane: {
          ...prev.leftPane,
          tabs: [...prev.leftPane.tabs, newTab],
          activeTabId: newTab.id,
        },
      };
    });
  }, [generateViewId]);

  // Close a view tab
  const closeTab = useCallback((tabId: string) => {
    setState(prev => {
      const updatePane = (pane: typeof prev.leftPane) => {
        const newTabs = pane.tabs.filter(t => t.id !== tabId);
        let newActiveId = pane.activeTabId;
        if (pane.activeTabId === tabId) {
          newActiveId = newTabs.length > 0 ? newTabs[newTabs.length - 1].id : null;
        }
        return { ...pane, tabs: newTabs, activeTabId: newActiveId };
      };

      const newLeft = updatePane(prev.leftPane);
      const newRight = updatePane(prev.rightPane);
      
      // Auto-disable split if both panes empty
      const shouldDisableSplit = newLeft.tabs.length === 0 && newRight.tabs.length === 0;

      return {
        ...prev,
        splitEnabled: shouldDisableSplit ? false : prev.splitEnabled,
        leftPane: newLeft,
        rightPane: newRight,
      };
    });
  }, []);

  // Set active tab in a pane
  const setActiveTab = useCallback((paneId: 'left' | 'right', tabId: string) => {
    setState(prev => ({
      ...prev,
      [paneId === 'left' ? 'leftPane' : 'rightPane']: {
        ...prev[paneId === 'left' ? 'leftPane' : 'rightPane'],
        activeTabId: tabId,
      },
    }));
  }, []);

  // Toggle split view
  const toggleSplit = useCallback(() => {
    setState(prev => ({ ...prev, splitEnabled: !prev.splitEnabled }));
  }, []);

  // Reset workspace (close all views)
  const resetWorkspace = useCallback(() => {
    setState(initialState);
  }, []);

  // Check if workspace has any views
  const hasViews = useMemo(() => {
    return state.leftPane.tabs.length > 0 || state.rightPane.tabs.length > 0;
  }, [state.leftPane.tabs.length, state.rightPane.tabs.length]);

  return {
    state,
    draggingPanel,
    setDraggingPanel,
    addViewTab,
    closeTab,
    setActiveTab,
    toggleSplit,
    resetWorkspace,
    hasViews,
  };
}
