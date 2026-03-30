import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

interface ProfileRow { id: string; display_name: string | null; email: string | null }
interface ClassRow { id: string; name: string; instructor_id: string }
interface EnrollmentRow { user_id: string; class_id: string }
interface SubmissionRow { user_id: string; reasoning_score: number; time_elapsed_seconds: number; used_ai: boolean }

interface ComparisonRow {
  professorName: string;
  className: string;
  totalStudents: number;
  avgScore: number;
  avgTimeMin: number;
  aiUsagePct: number;
}

export default function AdminComparison() {
  const [professors, setProfessors] = useState<ProfileRow[]>([]);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [enrollments, setEnrollments] = useState<EnrollmentRow[]>([]);
  const [submissions, setSubmissions] = useState<SubmissionRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [pRes, cRes, eRes, sRes] = await Promise.all([
      supabase.from('profiles').select('id, display_name, email').eq('role', 'professor'),
      supabase.from('classes').select('id, name, instructor_id'),
      supabase.from('student_enrollments').select('user_id, class_id'),
      supabase.from('submissions').select('user_id, reasoning_score, time_elapsed_seconds, used_ai'),
    ]);
    if (pRes.data) setProfessors(pRes.data);
    if (cRes.data) setClasses(cRes.data as ClassRow[]);
    if (eRes.data) setEnrollments(eRes.data);
    if (sRes.data) setSubmissions(sRes.data as SubmissionRow[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const rows: ComparisonRow[] = useMemo(() => {
    const profMap = new Map<string, string>();
    professors.forEach(p => profMap.set(p.id, p.display_name || p.email || '—'));

    return classes.map(cls => {
      const classEnrollments = enrollments.filter(e => e.class_id === cls.id);
      const studentIds = new Set(classEnrollments.map(e => e.user_id));
      const subs = submissions.filter(s => studentIds.has(s.user_id));

      const avgScore = subs.length ? Math.round(subs.reduce((s, x) => s + x.reasoning_score, 0) / subs.length) : 0;
      const avgTime = subs.length ? Math.round(subs.reduce((s, x) => s + x.time_elapsed_seconds, 0) / subs.length / 60) : 0;
      const aiPct = subs.length ? Math.round((subs.filter(s => s.used_ai).length / subs.length) * 100) : 0;

      return {
        professorName: profMap.get(cls.instructor_id) || '—',
        className: cls.name,
        totalStudents: studentIds.size,
        avgScore,
        avgTimeMin: avgTime,
        aiUsagePct: aiPct,
      };
    });
  }, [professors, classes, enrollments, submissions]);

  if (loading) return <div className="space-y-4"><Skeleton className="h-10 w-full" /><Skeleton className="h-64 w-full" /></div>;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold font-heading text-foreground">Cross-Professor Comparison</h2>
      <Card>
        <CardHeader><CardTitle>Performance by Class</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Professor</TableHead>
                <TableHead>Class</TableHead>
                <TableHead>Students</TableHead>
                <TableHead>Avg Score</TableHead>
                <TableHead>Avg Time (min)</TableHead>
                <TableHead>% AI Usage</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-12 text-muted-foreground">No data</TableCell></TableRow>
              ) : rows.map((r, i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium">{r.professorName}</TableCell>
                  <TableCell>{r.className}</TableCell>
                  <TableCell>{r.totalStudents}</TableCell>
                  <TableCell>
                    <Badge className={r.avgScore < 40 ? 'bg-destructive/20 text-destructive' : r.avgScore > 70 ? 'bg-emerald-500/20 text-emerald-700' : 'bg-yellow-500/20 text-yellow-700'}>
                      {r.avgScore}
                    </Badge>
                  </TableCell>
                  <TableCell>{r.avgTimeMin}</TableCell>
                  <TableCell>{r.aiUsagePct}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
