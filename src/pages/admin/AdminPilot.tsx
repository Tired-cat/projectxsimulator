import { Suspense, lazy, useState, useEffect, useMemo } from 'react';
import { useAdminClassFilter } from '@/contexts/AdminClassFilterContext';
import { supabase } from '@/integrations/supabase/client';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { Users } from 'lucide-react';
import { RouteLoader } from '@/components/RouteLoader';

const PilotHealth = lazy(() => import('@/components/admin/pilot/PilotHealth'));
const PilotReasoningBoard = lazy(() => import('@/components/admin/pilot/PilotReasoningBoard'));
const PilotAllocationDecisions = lazy(() => import('@/components/admin/pilot/PilotAllocationDecisions'));
const PilotFeatureUsage = lazy(() => import('@/components/admin/pilot/PilotFeatureUsage'));
const PilotAiFeedback = lazy(() => import('@/components/admin/pilot/PilotAiFeedback'));
const PilotStruggleSignals = lazy(() => import('@/components/admin/pilot/PilotStruggleSignals'));
const PilotPerStudentTable = lazy(() => import('@/components/admin/pilot/PilotPerStudentTable'));

const TABS = [
  'Pilot health',
  'Reasoning board',
  'Allocation decisions',
  'Feature usage',
  'AI feedback',
  'Struggle signals',
  'Per-student table',
] as const;

type PilotTab = (typeof TABS)[number];

function TabPlaceholder({ tab }: { tab: PilotTab }) {
  return (
    <div className="flex items-center justify-center h-64 rounded-lg border border-dashed border-border bg-muted/20">
      <p className="text-sm text-muted-foreground">
        <span className="font-medium text-foreground">{tab}</span> — content coming soon
      </p>
    </div>
  );
}

export default function AdminPilot() {
  const { classId, setClassId, classes } = useAdminClassFilter();
  const [activeTab, setActiveTab] = useState<PilotTab>('Pilot health');
  const [studentCount, setStudentCount] = useState<number | null>(null);

  useEffect(() => {
    async function fetchCount() {
      if (!classId) {
        const { count } = await supabase
          .from('student_enrollments')
          .select('*', { count: 'exact', head: true });
        setStudentCount(count ?? 0);
      } else {
        const { count } = await supabase
          .from('student_enrollments')
          .select('*', { count: 'exact', head: true })
          .eq('class_id', classId);
        setStudentCount(count ?? 0);
      }
    }
    fetchCount();
  }, [classId]);

  const selectedLabel = useMemo(() => {
    if (!classId) return 'All classes';
    const cls = classes.find((c) => c.id === classId);
    if (!cls) return 'All classes';
    return `${cls.name} — ${cls.section_code} (${cls.class_code})`;
  }, [classId, classes]);

  // Track which tabs have been visited so we mount them lazily but keep them alive
  const [visitedTabs, setVisitedTabs] = useState<Set<PilotTab>>(new Set(['Pilot health']));

  useEffect(() => {
    setVisitedTabs((prev) => {
      if (prev.has(activeTab)) return prev;
      return new Set(prev).add(activeTab);
    });
  }, [activeTab]);

  return (
    <div className="space-y-0 -m-6">
      <div className="flex items-center justify-between gap-4 px-6 py-3 border-b border-border bg-[hsl(40,28%,97%)]">
        <div>
          <h2 className="text-lg font-bold font-[var(--font-heading)] text-foreground leading-tight">
            {activeTab}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">Pilot analytics dashboard</p>
        </div>

        <div className="flex items-center gap-3">
          {studentCount !== null && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 px-2.5 py-1 rounded-md">
              <Users className="h-3.5 w-3.5" />
              <span>{studentCount} student{studentCount !== 1 ? 's' : ''}</span>
            </div>
          )}

          <Select
            value={classId ?? '__all__'}
            onValueChange={(v) => setClassId(v === '__all__' ? null : v)}
          >
            <SelectTrigger className="w-[260px] h-8 text-xs">
              <SelectValue placeholder={selectedLabel} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All classes</SelectItem>
              {classes.map((cls) => (
                <SelectItem key={cls.id} value={cls.id}>
                  {cls.name} — {cls.section_code} ({cls.class_code})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="border-b border-border bg-background px-6">
        <div className="flex gap-0 overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                'px-4 py-2.5 text-xs font-medium whitespace-nowrap transition-colors relative',
                'hover:text-foreground',
                activeTab === tab
                  ? 'text-foreground after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-[#6B4F8A] after:rounded-t'
                  : 'text-muted-foreground'
              )}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="p-6">
        <Suspense fallback={<RouteLoader label="Loading pilot analytics…" />}>
          {visitedTabs.has('Pilot health') && <div className={activeTab !== 'Pilot health' ? 'hidden' : ''}><PilotHealth classId={classId} /></div>}
          {visitedTabs.has('Reasoning board') && <div className={activeTab !== 'Reasoning board' ? 'hidden' : ''}><PilotReasoningBoard classId={classId} /></div>}
          {visitedTabs.has('Allocation decisions') && <div className={activeTab !== 'Allocation decisions' ? 'hidden' : ''}><PilotAllocationDecisions classId={classId} /></div>}
          {visitedTabs.has('Feature usage') && <div className={activeTab !== 'Feature usage' ? 'hidden' : ''}><PilotFeatureUsage classId={classId} /></div>}
          {visitedTabs.has('AI feedback') && <div className={activeTab !== 'AI feedback' ? 'hidden' : ''}><PilotAiFeedback classId={classId} /></div>}
          {visitedTabs.has('Struggle signals') && <div className={activeTab !== 'Struggle signals' ? 'hidden' : ''}><PilotStruggleSignals classId={classId} /></div>}
          {visitedTabs.has('Per-student table') && <div className={activeTab !== 'Per-student table' ? 'hidden' : ''}><PilotPerStudentTable classId={classId} /></div>}
        </Suspense>
      </div>
    </div>
  );
}
