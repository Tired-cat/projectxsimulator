import { createContext, useContext, ReactNode } from 'react';
import { useWorkspaceLayout } from '@/hooks/useWorkspaceLayout';
import type { WorkspaceContextValue } from '@/types/dockingTypes';

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

interface WorkspaceProviderProps {
  children: ReactNode;
}

export function WorkspaceProvider({ children }: WorkspaceProviderProps) {
  const workspace = useWorkspaceLayout();
  
  return (
    <WorkspaceContext.Provider value={workspace}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace(): WorkspaceContextValue {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
}
