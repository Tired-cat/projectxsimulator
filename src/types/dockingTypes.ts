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

export interface WorkspaceLayout {
  /** Whether split view is active */
  splitMode: boolean;
  /** Left pane (always exists) */
  paneA: Pane;
  /** Right pane (only used when splitMode is true) */
  paneB: Pane;
  /** Panels that have been "torn out" to the top workspace tabs */
  workspaceTabs: TabItem[];
  /** Active workspace tab (if any) */
  activeWorkspaceTab: string | null;
  /** IDs of panels that are currently docked (removed from grid) */
  dockedPanelIds: string[];
}

// ======== DRAG TYPES ========

export type DropZoneType = 
  | 'tab-bar-a'      // Drop into pane A's tab bar
  | 'tab-bar-b'      // Drop into pane B's tab bar
  | 'split-left'     // Create/use left split
  | 'split-right'    // Create/use right split
  | 'workspace-tabs' // Tear out to workspace tabs
  | 'pane-content-a' // Drop into pane A content area
  | 'pane-content-b'; // Drop into pane B content area

export interface DragItem {
  panelId: string;
  sourceLocation: 'pane-a' | 'pane-b' | 'workspace-tabs' | 'grid';
}

// ======== CONTEXT TYPES ========

export interface WorkspaceContextValue {
  /** Current layout state */
  layout: WorkspaceLayout;
  
  /** All registered panel definitions */
  panels: Map<string, PanelDefinition>;
  
  /** Register a panel definition (does NOT auto-dock) */
  registerPanel: (panel: PanelDefinition) => void;
  
  /** Unregister a panel */
  unregisterPanel: (panelId: string) => void;
  
  /** Dock a panel to a specific location (moves from grid to dock) */
  dockPanel: (panelId: string, target: DropZoneType, insertIndex?: number) => void;
  
  /** Undock a panel (return to grid) */
  undockPanel: (panelId: string) => void;
  
  /** Move a panel between dock locations */
  movePanel: (panelId: string, target: DropZoneType, insertIndex?: number) => void;
  
  /** Check if a panel is currently docked */
  isPanelDocked: (panelId: string) => boolean;
  
  /** Whether any panels are docked */
  hasDockedPanels: boolean;
  
  /** Set active tab in a pane */
  setActiveTab: (paneId: 'pane-a' | 'pane-b' | 'workspace', tabId: string) => void;
  
  /** Toggle split mode */
  toggleSplitMode: () => void;
  
  /** Close split mode and merge panels */
  closeSplitMode: () => void;
  
  /** Reset to default layout (undock all) */
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
  workspaceTabs: string[];
  activeWorkspaceTab: string | null;
  dockedPanelIds: string[];
}
