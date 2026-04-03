import { useState, useEffect, useMemo, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { useClassFilter } from '@/contexts/ClassFilterContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { Json } from '@/integrations/supabase/types';

interface EnrollmentRow { user_id: string; class_id: string }
interface BoardRow { user_id: string; adjustments_made: number }
interface SubmissionRow {
  user_id: string;
  time_elapsed_seconds: number;
  step_1_text: string | null;
  step_2_chips: Json | null;
  step_3_reflection: string | null;
}

const ADJUSTMENT_BUCKETS = [
  { label: '1–2 (Guessing)', min: 1, max: 2 },
  { label: '3–5 (Basic Testing)', min: 3, max: 5 },
  { label: '6–10 (Active Exploration)', min: 6, max: 10 },
  { label: '11+ (Deep Analysis)', min: 11, max: Infinity },
];

const TIME_BUCKETS = [
  { label: '<10 min', min: 0, max: 10 },
  { label: '10–20 min', min: 10, max: 20 },
  { label: '20–30 min', min: 20, max: 30 },
  { label: '30+ min', min: 30, max: Infinity },
];

const BAR_COLOR = 'hsl(150, 18%, 45%)';

export default function DashboardEngagement() {
  const { selectedClassId } = useClassFilter();
  const [enrollments, setEnrollments] = useState<EnrollmentRow[]>([]);
  const [boards, setBoards] = useState<BoardRow[]>([]);
  const [submissions, setSubmissions] = useState<SubmissionRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [eRes, bRes, subRes] = await Promise.all([
      supabase.from('student_enrollments').select('user_id, class_id'),
      supabase.from('reasoning_board_state').select('user_id, adjustments_made'),
      supabase.from('submissions').select('user_id, time_elapsed_seconds, step_1_text, step_2_chips, step_3_reflection'),
    ]);
    if (eRes.data) setEnrollments(eRes.data);
    if (bRes.data) setBoards(bRes.data as BoardRow[]);
    if (subRes.data) setSubmissions(subRes.data as SubmissionRow[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Filter by class
  const enrolledUserIds = useMemo(() => {
    const filtered = selectedClassId
      ? enrollments.filter(e => e.class_id === selectedClassId)
      : enrollments;
    return new Set(filtered.map(e => e.user_id));
  }, [enrollments, selectedClassId]);

  const filteredBoards = useMemo(() => boards.filter(b => enrolledUserIds.has(b.user_id)), [boards, enrolledUserIds]);
  const filteredSubmissions = useMemo(() => submissions.filter(s => enrolledUserIds.has(s.user_id)), [submissions, enrolledUserIds]);

  // Chart 1: Slider Adjustments
  const adjustmentData = useMemo(() => {
    const values = filteredBoards.map(b => b.adjustments_made).filter(v => v > 0);
    return ADJUSTMENT_BUCKETS.map(b => ({
      name: b.label,
      students: values.filter(v => v >= b.min && v <= b.max).length,
    }));
  }, [filteredBoards]);

  // Chart 2: Time to Submit
  const timeData = useMemo(() => {
    const minutes = filteredSubmissions.map(s => Math.round(s.time_elapsed_seconds / 60));
    return TIME_BUCKETS.map(b => ({
      name: b.label,
      students: minutes.filter(m => m >= b.min && (b.max === Infinity ? true : m < b.max)).length,
    }));
  }, [filteredSubmissions]);

  // Chart 3: Step Completion
  const stepData = useMemo(() => {
    const total = filteredSubmissions.length;
    if (total === 0) return [];
    const s1 = filteredSubmissions.filter(s => s.step_1_text !== null).length;
    const s2 = filteredSubmissions.filter(s => s.step_2_chips !== null && Array.isArray(s.step_2_chips) && (s.step_2_chips as unknown[]).length > 0).length;
    const s3 = filteredSubmissions.filter(s => s.step_3_reflection !== null).length;
    return [
      { name: 'Step 1 — Diagnosis', completed: Math.round(s1 / total * 100), count: s1, total },
      { name: 'Step 2 — Evidence', completed: Math.round(s2 / total * 100), count: s2, total },
      { name: 'Step 3 — Reflection', completed: Math.round(s3 / total * 100), count: s3, total },
    ];
  }, [filteredSubmissions]);

  const noData = filteredBoards.length === 0 && filteredSubmissions.length === 0;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold font-[var(--font-heading)]">Engagement</h2>

      {loading ? (
        <div className="grid gap-6">
          {[1, 2, 3].map(i => (
            <Card key={i}><CardContent className="pt-6"><Skeleton className="h-[220px] w-full" /></CardContent></Card>
          ))}
        </div>
      ) : noData ? (
        <Card>
          <CardContent className="pt-8 pb-8 text-center text-muted-foreground">
            No engagement data yet. Students need to start the simulation first.
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Chart 1: Slider Adjustments */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Hypothesis Testing — Slider Adjustments</CardTitle>
            </CardHeader>
            <CardContent>
              {adjustmentData.every(d => d.students === 0) ? (
                <p className="text-center text-muted-foreground py-8">No adjustment data yet.</p>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={adjustmentData} layout="vertical" margin={{ left: 20, right: 20, top: 5, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                    <XAxis type="number" allowDecimals={false} />
                    <YAxis type="category" dataKey="name" width={180} tick={{ fontSize: 13 }} />
                    <Tooltip formatter={(value: number) => [`${value} student${value !== 1 ? 's' : ''}`, 'Count']} />
                    <Bar dataKey="students" radius={[0, 6, 6, 0]} fill={BAR_COLOR} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Chart 2: Time to Submit */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Time to Submit Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              {filteredSubmissions.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No submitted students yet.</p>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={timeData} margin={{ left: 10, right: 20, top: 5, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 13 }} />
                    <YAxis allowDecimals={false} />
                    <Tooltip formatter={(value: number) => [`${value} student${value !== 1 ? 's' : ''}`, 'Count']} />
                    <Bar dataKey="students" radius={[6, 6, 0, 0]} fill={BAR_COLOR} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Chart 3: Tutorial Step Completion */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Tutorial Step Completion</CardTitle>
            </CardHeader>
            <CardContent>
              {stepData.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No submitted students yet.</p>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={stepData} layout="vertical" margin={{ left: 20, right: 30, top: 5, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                    <XAxis type="number" domain={[0, 100]} unit="%" />
                    <YAxis type="category" dataKey="name" width={160} tick={{ fontSize: 13 }} />
                    <Tooltip
                      formatter={(value: number, _name: string, entry: any) => [
                        `${value}% (${entry.payload.count}/${entry.payload.total})`,
                        'Completed',
                      ]}
                    />
                    <Bar dataKey="completed" radius={[0, 6, 6, 0]} fill={BAR_COLOR}>
                      {stepData.map((_, i) => (
                        <Cell key={i} fill={i === 0 ? BAR_COLOR : i === 1 ? 'hsl(35, 70%, 55%)' : 'hsl(270, 15%, 60%)'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
