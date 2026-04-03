import { useState, useEffect, useMemo } from 'react';
import { useAdminClassFilter } from '@/contexts/AdminClassFilterContext';
import { supabase } from '@/integrations/supabase/client';
import PilotHealth from '@/components/admin/pilot/PilotHealth';
import PilotReasoningBoard from '@/components/admin/pilot/PilotReasoningBoard';
import PilotAllocationDecisions from '@/components/admin/pilot/PilotAllocationDecisions';
import PilotFeatureUsage from '@/components/admin/pilot/PilotFeatureUsage';
import PilotAiFeedback from '@/components/admin/pilot/PilotAiFeedback';
import PilotStruggleSignals from '@/components/admin/pilot/PilotStruggleSignals';
import PilotPerStudentTable from '@/components/admin/pilot/PilotPerStudentTable';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { Users } from 'lucide-react';

/* ── tab definitions ────────────────────────────── */
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

/* ── placeholder per-tab content ────────────────── */
function TabPlaceholder({ tab }: { tab: PilotTab }) {
  return (
    <div className="flex items-center justify-center h-64 rounded-lg border border-dashed border-border bg-muted/20">
      <p className="text-sm text-muted-foreground">
        <span className="font-medium text-foreground">{tab}</span> — content coming soon
      </p>
    </div>
  );
}

/* ── main component ─────────────────────────────── */
export default function AdminPilot() {
  const { classId, setClassId, classes, loading: classesLoading } = useAdminClassFilter();
  const [activeTab, setActiveTab] = useState<PilotTab>('Pilot health');
  const [studentCount, setStudentCount] = useState<number | null>(null);
  

  /* fetch student count for selected class */
  useEffect(() => {
    async function fetchCount() {
      if (!classId) {
        // all classes — count distinct users enrolled
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

  /* build the label for the selected class */
  const selectedLabel = useMemo(() => {
    if (!classId) return 'All classes';
    const cls = classes.find((c) => c.id === classId);
    if (!cls) return 'All classes';
    return `${cls.name} — ${cls.section_code} (${cls.class_code})`;
  }, [classId, classes]);

  return (
    <div className="space-y-0 -m-6">
      {/* ── secondary top bar ────────────────────── */}
      <div className="flex items-center justify-between gap-4 px-6 py-3 border-b border-border bg-[hsl(40,28%,97%)]">
        <div>
          <h2 className="text-lg font-bold font-[var(--font-heading)] text-foreground leading-tight">
            {activeTab}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">Pilot analytics dashboard</p>
        </div>

        <div className="flex items-center gap-3">
          {/* student count badge */}
          {studentCount !== null && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 px-2.5 py-1 rounded-md">
              <Users className="h-3.5 w-3.5" />
              <span>{studentCount} student{studentCount !== 1 ? 's' : ''}</span>
            </div>
          )}

          {/* class filter */}
          <Select
            value={classId ?? '__all__'}
            onValueChange={(v) => setClassId(v === '__all__' ? null : v)}
          >
            <SelectTrigger className="w-[260px] h-8 text-xs">
              <SelectValue placeholder="All classes" />
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

      {/* ── horizontal tab bar ───────────────────── */}
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

      {/* ── content area ─────────────────────────── */}
      <div className="p-6">
        {activeTab === 'Pilot health' ? (
          <PilotHealth classId={classId} />
        ) : activeTab === 'Reasoning board' ? (
          <PilotReasoningBoard classId={classId} />
        ) : activeTab === 'Allocation decisions' ? (
          <PilotAllocationDecisions classId={classId} />
        ) : activeTab === 'Feature usage' ? (
          <PilotFeatureUsage classId={classId} />
        ) : activeTab === 'AI feedback' ? (
          <PilotAiFeedback classId={classId} />
        ) : activeTab === 'Struggle signals' ? (
          <PilotStruggleSignals classId={classId} />
        ) : activeTab === 'Per-student table' ? (
          <PilotPerStudentTable classId={classId} />
        ) : (
          <TabPlaceholder tab={activeTab} />
        )}
      </div>
    </div>
  );
}
