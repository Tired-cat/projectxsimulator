import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { GraduationCap, BookOpen, Users, FileText, Copy, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Stats {
  professors: number;
  classes: number;
  enrollments: number;
  submissions: number;
}

interface ClassRow {
  id: string;
  name: string;
  class_code: string;
  section_code: string;
  professor_name: string;
  enrolled: number;
  submissions: number;
}

interface ActivityItem {
  id: string;
  type: 'professor_created' | 'class_created';
  label: string;
  detail: string;
  timestamp: string;
}

export default function AdminOverview() {
  const [stats, setStats] = useState<Stats>({ professors: 0, classes: 0, enrollments: 0, submissions: 0 });
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    await Promise.all([loadStats(), loadClasses(), loadActivity()]);
    setLoading(false);
  }

  async function loadStats() {
    const [profRes, classRes, enrollRes, subRes] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'professor'),
      supabase.from('classes').select('id', { count: 'exact', head: true }),
      supabase.from('student_enrollments').select('id', { count: 'exact', head: true }),
      supabase.from('submissions').select('id', { count: 'exact', head: true }),
    ]);
    setStats({
      professors: profRes.count ?? 0,
      classes: classRes.count ?? 0,
      enrollments: enrollRes.count ?? 0,
      submissions: subRes.count ?? 0,
    });
  }

  async function loadClasses() {
    // Get all classes with instructor profile
    const { data: classData } = await supabase
      .from('classes')
      .select('id, name, class_code, section_code, instructor_id')
      .order('created_at', { ascending: false });

    if (!classData || classData.length === 0) {
      setClasses([]);
      return;
    }

    // Get instructor names
    const instructorIds = [...new Set(classData.map(c => c.instructor_id))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, display_name, email')
      .in('id', instructorIds);

    const profileMap = new Map(
      (profiles ?? []).map(p => [p.id, p.display_name || p.email || 'Unknown'])
    );

    // Get enrollment counts per class
    const { data: enrollments } = await supabase
      .from('student_enrollments')
      .select('class_id');

    const enrollCountMap = new Map<string, number>();
    (enrollments ?? []).forEach(e => {
      enrollCountMap.set(e.class_id, (enrollCountMap.get(e.class_id) ?? 0) + 1);
    });

    // Get submission counts per class via sessions
    const classIds = classData.map(c => c.id);
    const { data: sessions } = await supabase
      .from('sessions')
      .select('id, class_id')
      .in('class_id', classIds);

    const sessionClassMap = new Map<string, string>();
    (sessions ?? []).forEach(s => {
      if (s.class_id) sessionClassMap.set(s.id, s.class_id);
    });

    const sessionIds = (sessions ?? []).map(s => s.id);
    let subCountMap = new Map<string, number>();
    if (sessionIds.length > 0) {
      const { data: subs } = await supabase
        .from('submissions')
        .select('session_id')
        .in('session_id', sessionIds);

      (subs ?? []).forEach(s => {
        const classId = sessionClassMap.get(s.session_id);
        if (classId) {
          subCountMap.set(classId, (subCountMap.get(classId) ?? 0) + 1);
        }
      });
    }

    setClasses(
      classData.map(c => ({
        id: c.id,
        name: c.name,
        class_code: c.class_code,
        section_code: c.section_code,
        professor_name: profileMap.get(c.instructor_id) ?? 'Unknown',
        enrolled: enrollCountMap.get(c.id) ?? 0,
        submissions: subCountMap.get(c.id) ?? 0,
      }))
    );
  }

  async function loadActivity() {
    // Professor accounts created
    const { data: profs } = await supabase
      .from('profiles')
      .select('id, display_name, email, created_at')
      .eq('role', 'professor')
      .order('created_at', { ascending: false })
      .limit(10);

    const profItems: ActivityItem[] = (profs ?? []).map(p => ({
      id: `prof-${p.id}`,
      type: 'professor_created' as const,
      label: 'Professor account created',
      detail: p.display_name || p.email || 'Unknown',
      timestamp: p.created_at,
    }));

    // Classes created
    const { data: cls } = await supabase
      .from('classes')
      .select('id, name, created_at')
      .order('created_at', { ascending: false })
      .limit(10);

    const classItems: ActivityItem[] = (cls ?? []).map(c => ({
      id: `class-${c.id}`,
      type: 'class_created' as const,
      label: 'Class created',
      detail: c.name,
      timestamp: c.created_at,
    }));

    // Merge and sort by timestamp, take 10
    const merged = [...profItems, ...classItems]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 10);

    setActivity(merged);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const statCards = [
    { label: 'Professors', value: stats.professors, icon: GraduationCap, color: 'text-[#6B4F8A]' },
    { label: 'Active classes', value: stats.classes, icon: BookOpen, color: 'text-primary' },
    { label: 'Enrolled students', value: stats.enrollments, icon: Users, color: 'text-[hsl(var(--warning))]' },
    { label: 'Submissions', value: stats.submissions, icon: FileText, color: 'text-[hsl(var(--success))]' },
  ];

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(s => (
          <Card key={s.label} className="border border-border">
            <CardContent className="pt-5 pb-4 px-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{s.label}</p>
                  <p className="text-2xl font-bold mt-1 text-foreground">{s.value}</p>
                </div>
                <s.icon className={cn('h-8 w-8 opacity-60', s.color)} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Active classes table */}
      <Card className="border border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold font-[var(--font-heading)] uppercase tracking-wide text-muted-foreground">
            Active classes
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {classes.length === 0 ? (
            <p className="text-sm text-muted-foreground px-5 pb-5">No classes yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Class name</th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Professor</th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Code</th>
                    <th className="text-center px-4 py-2.5 font-medium text-muted-foreground">Students</th>
                    <th className="text-center px-4 py-2.5 font-medium text-muted-foreground">Submissions</th>
                    <th className="text-center px-4 py-2.5 font-medium text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {classes.map(c => (
                    <tr key={c.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 font-medium text-foreground">{c.name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{c.professor_name}</td>
                      <td className="px-4 py-3">
                        <CopyableCode value={c.class_code} />
                      </td>
                      <td className="px-4 py-3 text-center">{c.enrolled}</td>
                      <td className="px-4 py-3 text-center">{c.submissions}</td>
                      <td className="px-4 py-3 text-center">
                        {c.enrolled > 0 ? (
                          <Badge variant="default" className="bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))] text-[11px]">
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[11px]">Pending</Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent activity */}
      <Card className="border border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold font-[var(--font-heading)] uppercase tracking-wide text-muted-foreground">
            Recent activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activity.length === 0 ? (
            <p className="text-sm text-muted-foreground">No recent activity.</p>
          ) : (
            <ul className="space-y-3">
              {activity.map(a => (
                <li key={a.id} className="flex items-start gap-3 text-sm">
                  <Badge
                    variant={a.type === 'professor_created' ? 'default' : 'secondary'}
                    className={cn(
                      'text-[10px] shrink-0 mt-0.5',
                      a.type === 'professor_created' && 'bg-[#6B4F8A] text-white'
                    )}
                  >
                    {a.type === 'professor_created' ? 'Account' : 'Class'}
                  </Badge>
                  <div className="flex-1 min-w-0">
                    <p className="text-foreground">{a.label}</p>
                    <p className="text-muted-foreground text-xs truncate">{a.detail}</p>
                  </div>
                  <time className="text-xs text-muted-foreground shrink-0 tabular-nums">
                    {formatRelative(a.timestamp)}
                  </time>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function CopyableCode({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <button
      onClick={copy}
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-muted font-mono text-xs text-foreground hover:bg-muted/80 transition-colors"
    >
      {value}
      {copied ? <Check className="h-3 w-3 text-[hsl(var(--success))]" /> : <Copy className="h-3 w-3 text-muted-foreground" />}
    </button>
  );
}

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}
