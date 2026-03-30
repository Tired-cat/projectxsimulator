import { useState, useEffect, useMemo, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { useClassFilter } from '@/contexts/ClassFilterContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle, XCircle } from 'lucide-react';
import type { Json } from '@/integrations/supabase/types';

interface EnrollmentRow { user_id: string; class_id: string }
interface ProfileRow { id: string; display_name: string | null; email: string | null }
interface SubmissionRow {
  user_id: string;
  reasoning_score: number;
  time_elapsed_seconds: number;
  used_ai: boolean;
  step_1_text: string | null;
  step_2_chips: Json | null;
  step_3_reflection: string | null;
}

const SCORE_BUCKETS = Array.from({ length: 10 }, (_, i) => ({
  label: `${i * 10}–${i * 10 + 10}`,
  min: i * 10,
  max: i * 10 + 10,
}));

const QUADRANTS = ['descriptive', 'diagnostic', 'predictive', 'prescriptive'] as const;
const QUADRANT_COLORS: Record<string, string> = {
  descriptive: 'hsl(150, 18%, 45%)',
  diagnostic: 'hsl(35, 70%, 55%)',
  predictive: 'hsl(270, 15%, 60%)',
  prescriptive: 'hsl(0, 55%, 55%)',
};

function fmtDuration(seconds: number): string {
  if (!seconds) return '—';
  const m = Math.floor(seconds / 60);
  return m > 0 ? `${m}m` : `${seconds}s`;
}

export default function DashboardReasoning() {
  const { classes, selectedClassId } = useClassFilter();
  const [enrollments, setEnrollments] = useState<EnrollmentRow[]>([]);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [submissions, setSubmissions] = useState<SubmissionRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [eRes, pRes, subRes] = await Promise.all([
      supabase.from('student_enrollments').select('user_id, class_id'),
      supabase.from('profiles').select('id, display_name, email').eq('role', 'student'),
      supabase.from('submissions').select('user_id, reasoning_score, time_elapsed_seconds, used_ai, step_1_text, step_2_chips, step_3_reflection'),
    ]);
    if (eRes.data) setEnrollments(eRes.data);
    if (pRes.data) setProfiles(pRes.data);
    if (subRes.data) setSubmissions(subRes.data as SubmissionRow[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Class filtering helpers
  const enrollmentsByClass = useMemo(() => {
    const map = new Map<string, Set<string>>();
    enrollments.forEach(e => {
      if (!map.has(e.class_id)) map.set(e.class_id, new Set());
      map.get(e.class_id)!.add(e.user_id);
    });
    return map;
  }, [enrollments]);

  const enrolledUserIds = useMemo(() => {
    if (selectedClassId) {
      return enrollmentsByClass.get(selectedClassId) ?? new Set<string>();
    }
    return new Set(enrollments.map(e => e.user_id));
  }, [enrollments, enrollmentsByClass, selectedClassId]);

  const filteredSubmissions = useMemo(
    () => submissions.filter(s => enrolledUserIds.has(s.user_id)),
    [submissions, enrolledUserIds],
  );

  // Determine comparison mode
  const comparisonMode = !selectedClassId && classes.length >= 2;

  // ─── Chart 1: Score Distribution ───
  const scoreChartData = useMemo(() => {
    if (comparisonMode) {
      return SCORE_BUCKETS.map(b => {
        const row: Record<string, number | string> = { name: b.label };
        classes.forEach(cls => {
          const userIds = enrollmentsByClass.get(cls.id) ?? new Set<string>();
          const classSubs = submissions.filter(s => userIds.has(s.user_id));
          row[cls.name] = classSubs.filter(s => s.reasoning_score >= b.min && s.reasoning_score < b.max).length;
        });
        return row;
      });
    }
    return SCORE_BUCKETS.map(b => ({
      name: b.label,
      students: filteredSubmissions.filter(s => s.reasoning_score >= b.min && s.reasoning_score < b.max).length,
    }));
  }, [filteredSubmissions, comparisonMode, classes, enrollmentsByClass, submissions]);

  // ─── Chart 2: Evidence Cards Per Quadrant ───
  const quadrantChartData = useMemo(() => {
    const parseChips = (chips: Json | null): Record<string, number> => {
      const counts: Record<string, number> = { descriptive: 0, diagnostic: 0, predictive: 0, prescriptive: 0 };
      if (!chips || !Array.isArray(chips)) return counts;
      (chips as Array<{ context?: string }>).forEach(chip => {
        const ctx = chip?.context?.toLowerCase() ?? '';
        for (const q of QUADRANTS) {
          if (ctx.includes(q)) { counts[q]++; break; }
        }
      });
      return counts;
    };

    if (comparisonMode) {
      return QUADRANTS.map(q => {
        const row: Record<string, number | string> = { name: q.charAt(0).toUpperCase() + q.slice(1) };
        classes.forEach(cls => {
          const userIds = enrollmentsByClass.get(cls.id) ?? new Set<string>();
          const classSubs = submissions.filter(s => userIds.has(s.user_id));
          const total = classSubs.reduce((a, s) => a + parseChips(s.step_2_chips)[q], 0);
          row[cls.name] = classSubs.length > 0 ? Math.round(total / classSubs.length * 10) / 10 : 0;
        });
        return row;
      });
    }

    const totals: Record<string, number> = { descriptive: 0, diagnostic: 0, predictive: 0, prescriptive: 0 };
    filteredSubmissions.forEach(s => {
      const c = parseChips(s.step_2_chips);
      QUADRANTS.forEach(q => { totals[q] += c[q]; });
    });
    const n = filteredSubmissions.length || 1;
    return QUADRANTS.map(q => ({
      name: q.charAt(0).toUpperCase() + q.slice(1),
      avg: Math.round(totals[q] / n * 10) / 10,
    }));
  }, [filteredSubmissions, comparisonMode, classes, enrollmentsByClass, submissions]);

  // ─── At-Risk Students (score < 60) ───
  const atRiskStudents = useMemo(() => {
    return filteredSubmissions
      .filter(s => s.reasoning_score < 60)
      .map(s => {
        const profile = profiles.find(p => p.id === s.user_id);
        const enrollment = enrollments.find(e => e.user_id === s.user_id);
        const cls = enrollment ? classes.find(c => c.id === enrollment.class_id) : null;
        return {
          userId: s.user_id,
          name: profile?.display_name || profile?.email || 'Unknown',
          className: cls?.name ?? '—',
          score: s.reasoning_score,
          time: s.time_elapsed_seconds,
          usedAi: s.used_ai,
          step1: s.step_1_text !== null,
          step2: s.step_2_chips !== null && Array.isArray(s.step_2_chips) && (s.step_2_chips as unknown[]).length > 0,
          step3: s.step_3_reflection !== null,
        };
      })
      .sort((a, b) => a.score - b.score);
  }, [filteredSubmissions, profiles, enrollments, classes]);

  const CLASS_COLORS = ['hsl(150, 18%, 45%)', 'hsl(35, 70%, 55%)', 'hsl(270, 15%, 60%)', 'hsl(0, 55%, 55%)', 'hsl(200, 50%, 50%)'];

  const scoreBadge = (score: number) => {
    if (score < 40) return <Badge variant="outline" className="bg-destructive/15 text-destructive border-destructive/30 font-mono">{score}</Badge>;
    return <Badge variant="outline" className="bg-warning/15 text-warning border-warning/30 font-mono">{score}</Badge>;
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold font-[var(--font-heading)]">Reasoning Quality</h2>

      {loading ? (
        <div className="grid gap-6">
          {[1, 2, 3].map(i => (
            <Card key={i}><CardContent className="pt-6"><Skeleton className="h-[240px] w-full" /></CardContent></Card>
          ))}
        </div>
      ) : (
        <>
          {/* Chart 1: Reasoning Score Distribution */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Reasoning Score Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              {filteredSubmissions.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No submitted students yet.</p>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={scoreChartData} margin={{ left: 10, right: 20, top: 5, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} label={{ value: 'Score Range', position: 'insideBottom', offset: -2, fontSize: 12 }} />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    {comparisonMode ? (
                      classes.map((cls, i) => (
                        <Bar key={cls.id} dataKey={cls.name} fill={CLASS_COLORS[i % CLASS_COLORS.length]} radius={[4, 4, 0, 0]} />
                      ))
                    ) : (
                      <Bar dataKey="students" fill="hsl(150, 18%, 45%)" radius={[6, 6, 0, 0]} />
                    )}
                    {comparisonMode && <Legend />}
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Chart 2: Evidence Cards Per Quadrant */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Evidence Cards Per Quadrant (Avg per Student)</CardTitle>
            </CardHeader>
            <CardContent>
              {filteredSubmissions.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No submitted students yet.</p>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={quadrantChartData} margin={{ left: 10, right: 20, top: 5, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 13 }} />
                    <YAxis allowDecimals />
                    <Tooltip />
                    {comparisonMode ? (
                      classes.map((cls, i) => (
                        <Bar key={cls.id} dataKey={cls.name} fill={CLASS_COLORS[i % CLASS_COLORS.length]} radius={[4, 4, 0, 0]} />
                      ))
                    ) : (
                      <Bar dataKey="avg" radius={[6, 6, 0, 0]}>
                        {quadrantChartData.map((entry, i) => {
                          const q = QUADRANTS[i];
                          return <rect key={q} fill={QUADRANT_COLORS[q]} />;
                        })}
                      </Bar>
                    )}
                    {comparisonMode && <Legend />}
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* At-Risk Students Table */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">At-Risk Students (Score &lt; 60)</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {atRiskStudents.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">No at-risk students found.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Class</TableHead>
                      <TableHead className="text-center">Score</TableHead>
                      <TableHead className="text-right">Time</TableHead>
                      <TableHead className="text-center">AI</TableHead>
                      <TableHead className="text-center">S1</TableHead>
                      <TableHead className="text-center">S2</TableHead>
                      <TableHead className="text-center">S3</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {atRiskStudents.map((s) => (
                      <TableRow key={s.userId}>
                        <TableCell className="font-medium">{s.name}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{s.className}</TableCell>
                        <TableCell className="text-center">{scoreBadge(s.score)}</TableCell>
                        <TableCell className="text-right font-mono text-sm">{fmtDuration(s.time)}</TableCell>
                        <TableCell className="text-center">
                          {s.usedAi ? <CheckCircle className="h-4 w-4 text-primary mx-auto" /> : <XCircle className="h-4 w-4 text-muted-foreground/40 mx-auto" />}
                        </TableCell>
                        <TableCell className="text-center">
                          {s.step1 ? <CheckCircle className="h-4 w-4 text-primary mx-auto" /> : <XCircle className="h-4 w-4 text-muted-foreground/40 mx-auto" />}
                        </TableCell>
                        <TableCell className="text-center">
                          {s.step2 ? <CheckCircle className="h-4 w-4 text-primary mx-auto" /> : <XCircle className="h-4 w-4 text-muted-foreground/40 mx-auto" />}
                        </TableCell>
                        <TableCell className="text-center">
                          {s.step3 ? <CheckCircle className="h-4 w-4 text-primary mx-auto" /> : <XCircle className="h-4 w-4 text-muted-foreground/40 mx-auto" />}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
