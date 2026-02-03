import { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';

// ======== CORE TYPES ========

export interface PanelDefinition {
  id: string;
  title: string;
  icon?: LucideIcon;
  content: ReactNode;
  /** If true, panel cannot be closed/removed */
  permanent?: boolean;
}

export interface TabItem {
  panelId: string;
}

export interface TabGroup {
  tabs: TabItem[];
  activeTabId: string;
}

export interface Pane {
  id: 'pane-a' | 'pane-b';
  tabGroup: TabGroup;
}

/**
 * View-clone based workspace layout.
 * Panels are CLONED into dock views - originals always remain in grid.
 */
export interface WorkspaceLayout {
  /** Whether split view is active */
  splitMode: boolean;
  /** Left pane (primary dock area) */
  paneA: Pane;
  /** Right pane (only visible when splitMode is true) */
  paneB: Pane;
}

// ======== DRAG TYPES ========

export type DropZoneType = 
  | 'tab-bar-a'      // Drop into pane A's tab bar
  | 'tab-bar-b'      // Drop into pane B's tab bar
  | 'split-left'     // Create/use left split (clone)
  | 'split-right'    // Create/use right split (clone)
  | 'pane-content-a' // Drop into pane A content area
  | 'pane-content-b'; // Drop into pane B content area

export interface DragItem {
  panelId: string;
  sourceLocation: 'pane-a' | 'pane-b' | 'grid';
}

// ======== CONTEXT TYPES ========

export interface WorkspaceContextValue {
  /** Current layout state */
  layout: WorkspaceLayout;
  
  /** All registered panel definitions */
  panels: Map<string, PanelDefinition>;
  
  /** Register a panel definition */
  registerPanel: (panel: PanelDefinition) => void;
  
  /** Unregister a panel */
  unregisterPanel: (panelId: string) => void;
  
  /** Clone a panel into a dock view (never removes from grid) */
  clonePanelToView: (panelId: string, target: DropZoneType, insertIndex?: number) => void;
  
  /** Close a cloned view tab */
  closeViewTab: (paneId: 'pane-a' | 'pane-b', panelId: string) => void;
  
  /** Check if a panel has a clone in any dock view */
  isPanelInDock: (panelId: string) => boolean;
  
  /** Whether any panels are in dock views */
  hasDockedPanels: boolean;
  
  /** Set active tab in a pane */
  setActiveTab: (paneId: 'pane-a' | 'pane-b', tabId: string) => void;
  
  /** Toggle split mode */
  toggleSplitMode: () => void;
  
  /** Close split mode and merge panels */
  closeSplitMode: () => void;
  
  /** Reset to default layout (close all dock tabs) */
  resetLayout: () => void;
  
  /** Get panel by ID */
  getPanel: (panelId: string) => PanelDefinition | undefined;
  
  /** Currently dragging panel */
  draggingPanel: string | null;
  
  /** Set dragging panel */
  setDraggingPanel: (panelId: string | null) => void;
}

// ======== PERSISTENCE ========

export interface PersistedLayout {
  splitMode: boolean;
  paneA: { tabs: string[]; activeTabId: string };
  paneB: { tabs: string[]; activeTabId: string };
}
