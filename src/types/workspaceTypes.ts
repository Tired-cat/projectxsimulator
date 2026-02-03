// Minimal workspace types for drag-to-tab and split views

export type PanelId = 
  | 'channel-performance'
  | 'product-mix'
  | 'goal-tracker'
  | 'hints'
  | 'assumptions';

export interface PanelDefinition {
  id: PanelId;
  title: string;
  icon: string; // Lucide icon name
}

export interface ViewTab {
  id: string; // Unique view instance ID
  panelId: PanelId;
  title: string;
}

export interface SplitPane {
  id: 'left' | 'right';
  activeTabId: string | null;
  tabs: ViewTab[];
}

export interface WorkspaceState {
  // null = no split, single pane mode
  splitEnabled: boolean;
  leftPane: SplitPane;
  rightPane: SplitPane;
}

export type DropTarget = 'tab' | 'split-left' | 'split-right';

export const PANEL_DEFINITIONS: Record<PanelId, PanelDefinition> = {
  'channel-performance': { id: 'channel-performance', title: 'Channel Performance', icon: 'BarChart3' },
  'product-mix': { id: 'product-mix', title: 'Product Mix', icon: 'PieChart' },
  'goal-tracker': { id: 'goal-tracker', title: 'Goal Tracker', icon: 'DollarSign' },
  'hints': { id: 'hints', title: 'Hints & Tips', icon: 'AlertCircle' },
  'assumptions': { id: 'assumptions', title: 'Assumptions', icon: 'Settings' },
};
