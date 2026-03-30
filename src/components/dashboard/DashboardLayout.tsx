import { ReactNode } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { DashboardSidebar } from './DashboardSidebar';
import { DashboardTopBar } from './DashboardTopBar';
import { ClassFilterProvider } from '@/contexts/ClassFilterContext';

export function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <ClassFilterProvider>
      <SidebarProvider>
        <div className="min-h-screen flex w-full bg-background">
          <DashboardSidebar />
          <div className="flex-1 flex flex-col">
            <DashboardTopBar />
            <main className="flex-1 p-6">
              {children}
            </main>
          </div>
        </div>
      </SidebarProvider>
    </ClassFilterProvider>
  );
}
