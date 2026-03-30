import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useClassFilter } from '@/contexts/ClassFilterContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Users, Brain, Clock, Bot } from 'lucide-react';
import type { Json } from '@/integrations/supabase/types';

interface EnrollmentRow { user_id: string; class_id: string }
interface SubmissionRow { user_id: string; reasoning_score: number; time_elapsed_seconds: number; used_ai: boolean }
interface SessionRow { user_id: string }

export default function DashboardOverview() {
  const { classes, selectedClassId } = useClassFilter();
  const [enrollments, setEnrollments] = useState<EnrollmentRow[]>([]);
  const [submissions, setSubmissions] = useState<SubmissionRow[]>([]);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [eRes, subRes, sesRes] = await Promise.all([
      supabase.from('student_enrollments').select('user_id, class_id'),
      supabase.from('submissions').select('user_id, reasoning_score, time_elapsed_seconds, used_ai'),
      supabase.from('sessions').select('user_id'),
    ]);
    if (eRes.data) setEnrollments(eRes.data);
    if (subRes.data) setSubmissions(subRes.data as SubmissionRow[]);
    if (sesRes.data) setSessions(sesRes.data as SessionRow[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Filter enrollments by selected class
  const filteredEnrollments = useMemo(() => {
    if (!selectedClassId) return enrollments;
    return enrollments.filter(e => e.class_id === selectedClassId);
  }, [enrollments, selectedClassId]);

  const enrolledUserIds = useMemo(() => new Set(filteredEnrollments.map(e => e.user_id)), [filteredEnrollments]);

  const filteredSubmissions = useMemo(() => {
    return submissions.filter(s => enrolledUserIds.has(s.user_id));
  }, [submissions, enrolledUserIds]);

  // Summary stats
  const stats = useMemo(() => {
    const totalStudents = enrolledUserIds.size;
    const subs = filteredSubmissions;
    const avgScore = subs.length > 0
      ? Math.round(subs.reduce((a, s) => a + s.reasoning_score, 0) / subs.length)
      : 0;
    const avgTime = subs.length > 0
      ? Math.round(subs.reduce((a, s) => a + s.time_elapsed_seconds, 0) / subs.length / 60 * 10) / 10
      : 0;
    const pctAi = subs.length > 0
      ? Math.round(subs.filter(s => s.used_ai).length / subs.length * 100)
      : 0;
    return { totalStudents, avgScore, avgTime, pctAi };
  }, [enrolledUserIds, filteredSubmissions]);

  // Class comparison table (when All Classes selected and 2+ classes)
  const classComparison = useMemo(() => {
    if (selectedClassId || classes.length < 2) return null;
    return classes.map(cls => {
      const classEnrollments = enrollments.filter(e => e.class_id === cls.id);
      const userIds = new Set(classEnrollments.map(e => e.user_id));
      const classSubs = submissions.filter(s => userIds.has(s.user_id));
      const studentCount = userIds.size;
      const avgScore = classSubs.length > 0
        ? Math.round(classSubs.reduce((a, s) => a + s.reasoning_score, 0) / classSubs.length)
        : 0;
      const avgTime = classSubs.length > 0
        ? Math.round(classSubs.reduce((a, s) => a + s.time_elapsed_seconds, 0) / classSubs.length / 60 * 10) / 10
        : 0;
      const pctAi = classSubs.length > 0
        ? Math.round(classSubs.filter(s => s.used_ai).length / classSubs.length * 100)
        : 0;
      return { name: cls.name, sectionCode: cls.section_code, studentCount, avgScore, avgTime, pctAi };
    });
  }, [selectedClassId, classes, enrollments, submissions]);

  const summaryCards = [
    { label: 'Total Students', value: stats.totalStudents, icon: Users, color: 'bg-primary/10 text-primary' },
    { label: 'Avg Reasoning Score', value: stats.avgScore, icon: Brain, color: 'bg-success/10 text-success' },
    { label: 'Avg Completion Time', value: `${stats.avgTime} min`, icon: Clock, color: 'bg-warning/10 text-warning' },
    { label: '% Used AI', value: `${stats.pctAi}%`, icon: Bot, color: 'bg-accent/10 text-accent-foreground' },
  ];

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">Loading overview…</div>;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold font-[var(--font-heading)]">Overview</h2>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map((card) => (
          <Card key={card.label}>
            <CardContent className="pt-5 pb-5 flex items-center gap-4">
              <div className={`p-2.5 rounded-xl ${card.color}`}>
                <card.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{card.value}</p>
                <p className="text-xs text-muted-foreground">{card.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Class Comparison Table */}
      {classComparison && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Class Comparison</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Class</TableHead>
                  <TableHead className="text-right">Students</TableHead>
                  <TableHead className="text-right">Avg Score</TableHead>
                  <TableHead className="text-right">Avg Time (min)</TableHead>
                  <TableHead className="text-right">% Used AI</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {classComparison.map((row) => (
                  <TableRow key={row.name}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{row.name}</p>
                        <p className="text-xs text-muted-foreground">{row.sectionCode}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono">{row.studentCount}</TableCell>
                    <TableCell className="text-right font-mono">{row.avgScore}</TableCell>
                    <TableCell className="text-right font-mono">{row.avgTime}</TableCell>
                    <TableCell className="text-right font-mono">{row.pctAi}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
