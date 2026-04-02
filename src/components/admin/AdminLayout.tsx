import { ReactNode } from 'react';
import { AdminSidebar } from './AdminSidebar';
import { AdminTopBar } from './AdminTopBar';

export function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex w-full bg-background">
      <AdminSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <AdminTopBar />
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
