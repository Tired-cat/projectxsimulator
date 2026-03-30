import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  PieChart, Pie, Cell, ScatterChart, Scatter, XAxis, YAxis, ZAxis,
  Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { useClassFilter } from '@/contexts/ClassFilterContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Bot, BotOff, Clock, Brain } from 'lucide-react';

interface EnrollmentRow { user_id: string; class_id: string }
interface SubmissionRow {
  user_id: string;
  reasoning_score: number;
  time_elapsed_seconds: number;
  used_ai: boolean;
}

const AI_COLOR = '#2563eb';
const NO_AI_COLOR = '#f97316';

export default function DashboardAiUsage() {
  const { classes, selectedClassId } = useClassFilter();
  const [enrollments, setEnrollments] = useState<EnrollmentRow[]>([]);
  const [submissions, setSubmissions] = useState<SubmissionRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [eRes, subRes] = await Promise.all([
      supabase.from('student_enrollments').select('user_id, class_id'),
      supabase.from('submissions').select('user_id, reasoning_score, time_elapsed_seconds, used_ai'),
    ]);
    if (eRes.data) setEnrollments(eRes.data);
    if (subRes.data) setSubmissions(subRes.data as SubmissionRow[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const enrollmentsByClass = useMemo(() => {
    const map = new Map<string, Set<string>>();
    enrollments.forEach(e => {
      if (!map.has(e.class_id)) map.set(e.class_id, new Set());
      map.get(e.class_id)!.add(e.user_id);
    });
    return map;
  }, [enrollments]);

  const enrolledUserIds = useMemo(() => {
    if (selectedClassId) return enrollmentsByClass.get(selectedClassId) ?? new Set<string>();
    return new Set(enrollments.map(e => e.user_id));
  }, [enrollments, enrollmentsByClass, selectedClassId]);

  const filteredSubs = useMemo(
    () => submissions.filter(s => enrolledUserIds.has(s.user_id)),
    [submissions, enrolledUserIds],
  );

  const comparisonMode = !selectedClassId && classes.length >= 2;

  // ─── Donut data ───
  const donutDataSets = useMemo(() => {
    const buildPie = (subs: SubmissionRow[]) => {
      const ai = subs.filter(s => s.used_ai).length;
      const noAi = subs.length - ai;
      const total = subs.length || 1;
      return {
        data: [
          { name: 'Used AI', value: ai },
          { name: 'No AI', value: noAi },
        ],
        total,
      };
    };

    if (comparisonMode) {
      return classes.map(cls => {
        const userIds = enrollmentsByClass.get(cls.id) ?? new Set<string>();
        const classSubs = submissions.filter(s => userIds.has(s.user_id));
        return { label: cls.name, ...buildPie(classSubs) };
      });
    }
    return [{ label: 'All', ...buildPie(filteredSubs) }];
  }, [filteredSubs, comparisonMode, classes, enrollmentsByClass, submissions]);

  // ─── Scatter data ───
  const scatterAi = useMemo(() =>
    filteredSubs.filter(s => s.used_ai).map(s => ({
      minutes: Math.round(s.time_elapsed_seconds / 60),
      score: s.reasoning_score,
    })),
    [filteredSubs],
  );
  const scatterNoAi = useMemo(() =>
    filteredSubs.filter(s => !s.used_ai).map(s => ({
      minutes: Math.round(s.time_elapsed_seconds / 60),
      score: s.reasoning_score,
    })),
    [filteredSubs],
  );

  // ─── Stat cards ───
  const stats = useMemo(() => {
    const aiSubs = filteredSubs.filter(s => s.used_ai);
    const noAiSubs = filteredSubs.filter(s => !s.used_ai);
    const avg = (arr: SubmissionRow[], key: 'reasoning_score' | 'time_elapsed_seconds') =>
      arr.length > 0 ? Math.round(arr.reduce((a, s) => a + s[key], 0) / arr.length) : 0;
    return {
      avgScoreAi: avg(aiSubs, 'reasoning_score'),
      avgScoreNoAi: avg(noAiSubs, 'reasoning_score'),
      avgTimeAi: Math.round(avg(aiSubs, 'time_elapsed_seconds') / 60),
      avgTimeNoAi: Math.round(avg(noAiSubs, 'time_elapsed_seconds') / 60),
    };
  }, [filteredSubs]);

  const COLORS = [AI_COLOR, NO_AI_COLOR];

  const renderDonut = (pieData: { name: string; value: number }[], total: number, label?: string) => (
    <div className="flex flex-col items-center">
      {label && <p className="text-sm font-medium text-muted-foreground mb-2">{label}</p>}
      <ResponsiveContainer width="100%" height={240}>
        <PieChart>
          <Pie
            data={pieData}
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={90}
            dataKey="value"
            label={({ name, value }) => `${name}: ${value} (${Math.round(value / total * 100)}%)`}
            labelLine
          >
            {pieData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
          </Pie>
          <Tooltip formatter={(value: number, name: string) => [`${value} (${Math.round(value / total * 100)}%)`, name]} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold font-[var(--font-heading)]">AI Usage</h2>

      {loading ? (
        <div className="grid gap-6">
          {[1, 2].map(i => <Card key={i}><CardContent className="pt-6"><Skeleton className="h-[260px] w-full" /></CardContent></Card>)}
        </div>
      ) : filteredSubs.length === 0 ? (
        <Card><CardContent className="pt-8 pb-8 text-center text-muted-foreground">No submission data yet.</CardContent></Card>
      ) : (
        <>
          {/* Chart 1: AI Adoption Donut(s) */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">AI Adoption</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`grid ${comparisonMode ? `grid-cols-${Math.min(donutDataSets.length, 3)}` : 'grid-cols-1'} gap-4`}>
                {donutDataSets.map((ds, i) => (
                  <div key={i}>{renderDonut(ds.data, ds.total, comparisonMode ? ds.label : undefined)}</div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Chart 2: AI Impact Scatter */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Impact of AI Usage on Time &amp; Score</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <ScatterChart margin={{ left: 10, right: 20, top: 10, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" dataKey="minutes" name="Time" unit=" min" tick={{ fontSize: 12 }}
                    label={{ value: 'Completion Time (min)', position: 'insideBottom', offset: -5, fontSize: 12 }} />
                  <YAxis type="number" dataKey="score" name="Score" domain={[0, 100]} tick={{ fontSize: 12 }}
                    label={{ value: 'Reasoning Score', angle: -90, position: 'insideLeft', offset: 10, fontSize: 12 }} />
                  <ZAxis range={[60, 60]} />
                  <Tooltip cursor={{ strokeDasharray: '3 3' }}
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0].payload;
                      return (
                        <div className="rounded-lg border border-border/50 bg-background px-3 py-2 text-xs shadow-xl">
                          <p className="text-muted-foreground">Score: <span className="text-foreground font-mono">{d.score}</span></p>
                          <p className="text-muted-foreground">Time: <span className="text-foreground font-mono">{d.minutes} min</span></p>
                        </div>
                      );
                    }}
                  />
                  <Legend />
                  <Scatter name="Used AI" data={scatterAi} fill={AI_COLOR} />
                  <Scatter name="No AI" data={scatterNoAi} fill={NO_AI_COLOR} />
                </ScatterChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Stat Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-5 pb-5 flex items-center gap-4">
                <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600"><Brain className="h-5 w-5" /></div>
                <div>
                  <p className="text-2xl font-bold">{stats.avgScoreAi}</p>
                  <p className="text-xs text-muted-foreground">Avg Score (AI)</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-5 pb-5 flex items-center gap-4">
                <div className="p-2.5 rounded-xl bg-orange-500/10 text-orange-600"><Brain className="h-5 w-5" /></div>
                <div>
                  <p className="text-2xl font-bold">{stats.avgScoreNoAi}</p>
                  <p className="text-xs text-muted-foreground">Avg Score (No AI)</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-5 pb-5 flex items-center gap-4">
                <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600"><Clock className="h-5 w-5" /></div>
                <div>
                  <p className="text-2xl font-bold">{stats.avgTimeAi} min</p>
                  <p className="text-xs text-muted-foreground">Avg Time (AI)</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-5 pb-5 flex items-center gap-4">
                <div className="p-2.5 rounded-xl bg-orange-500/10 text-orange-600"><Clock className="h-5 w-5" /></div>
                <div>
                  <p className="text-2xl font-bold">{stats.avgTimeNoAi} min</p>
                  <p className="text-xs text-muted-foreground">Avg Time (No AI)</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
