import { useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  GraduationCap,
  Users,
  BookOpen,
  KeyRound,
  BarChart3,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const sections = [
  {
    label: 'OVERVIEW',
    items: [
      { title: 'Overview', path: '/admin', icon: LayoutDashboard },
    ],
  },
  {
    label: 'ACCOUNTS',
    items: [
      { title: 'Professors', path: '/admin/professors', icon: GraduationCap },
      { title: 'Students', path: '/admin/students', icon: Users },
    ],
  },
  {
    label: 'CLASSES',
    items: [
      { title: 'Classes', path: '/admin/classes', icon: BookOpen },
      { title: 'Class codes', path: '/admin/class-codes', icon: KeyRound },
    ],
  },
  {
    label: 'DATA',
    items: [
      { title: 'Pilot dashboard', path: '/admin/pilot', icon: BarChart3 },
    ],
  },
];

const dangerItem = { title: 'System / danger', path: '/admin/system', icon: AlertTriangle };

export function AdminSidebar() {
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path: string) => {
    if (path === '/admin') return location.pathname === '/admin';
    return location.pathname.startsWith(path);
  };

  return (
    <aside className="w-[200px] min-w-[200px] h-screen sticky top-0 flex flex-col border-r border-border bg-[hsl(40,28%,95%)]">
      {/* Logo / title */}
      <div className="px-4 pt-5 pb-4 border-b border-border">
        <h1 className="text-base font-bold font-[var(--font-heading)] text-foreground tracking-tight">
          Project X
        </h1>
        <p className="text-[11px] text-muted-foreground mt-0.5">Admin control centre</p>
      </div>

      {/* Navigation sections */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
        {sections.map((section) => (
          <div key={section.label}>
            <p className="px-2 mb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
              {section.label}
            </p>
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const active = isActive(item.path);
                return (
                  <li key={item.path}>
                    <button
                      onClick={() => navigate(item.path)}
                      className={cn(
                        'w-full flex items-center gap-2.5 px-2 py-1.5 rounded-md text-[13px] transition-colors text-left',
                        'hover:bg-muted/60',
                        active && 'bg-[hsl(270,25%,95%)] border-l-2 border-[#6B4F8A] pl-[6px] font-medium text-foreground',
                        !active && 'text-muted-foreground border-l-2 border-transparent'
                      )}
                    >
                      <item.icon className={cn('h-4 w-4 shrink-0', active ? 'text-[#6B4F8A]' : 'text-muted-foreground/70')} />
                      <span>{item.title}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Danger link at bottom */}
      <div className="px-2 pb-4 mt-auto">
        <button
          onClick={() => navigate(dangerItem.path)}
          className={cn(
            'w-full flex items-center gap-2.5 px-2 py-1.5 rounded-md text-[13px] transition-colors text-left',
            'hover:bg-destructive/10',
            isActive(dangerItem.path)
              ? 'bg-destructive/10 border-l-2 border-destructive pl-[6px] font-medium text-destructive'
              : 'text-destructive/80 border-l-2 border-transparent'
          )}
        >
          <dangerItem.icon className="h-4 w-4 shrink-0" />
          <span>{dangerItem.title}</span>
        </button>
      </div>
    </aside>
  );
}
