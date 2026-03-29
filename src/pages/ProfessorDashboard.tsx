import { useState, useEffect, useMemo, useCallback } from 'react';
import { BarChart, Bar, ScatterChart, Scatter, PieChart, Pie, XAxis, YAxis, ZAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid, Legend } from 'recharts';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { LogOut, Download, Users, CheckCircle, Clock, AlertCircle, ArrowLeft, RefreshCw, Zap, BookOpen, Shield, Copy, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Json } from '@/integrations/supabase/types';
import { ClassSwitcher } from '@/components/dashboard/ClassSwitcher';
import { AddClassDialog } from '@/components/dashboard/AddClassDialog';
import { toast } from 'sonner';

// ─── Types ───────────────────────────────────────────────────────
interface Profile {
  id: string;
  display_name: string | null;
  email: string | null;
}

interface SessionRow {
  id: string;
  user_id: string;
  started_at: string;
  completed_at: string | null;
  is_completed: boolean;
}

interface BoardRow {
  session_id: string;
  user_id: string;
  cards: Json;
  adjustments_made: number;
  written_diagnosis: string | null;
  current_step: number;
  step_1_completed: boolean;
  step_2_completed: boolean;
  step_3_completed: boolean;
  last_active_at: string;
}

interface SubmissionRow {
  session_id: string;
  user_id: string;
  final_decision: string;
  cards_on_board_count: number;
  time_elapsed_seconds: number;
  submitted_at: string;
  step_1_text: string | null;
  step_2_chips: Json | null;
  step_3_reflection: string | null;
  reasoning_score: number;
  used_ai: boolean;
}

interface StudentRecord {
  userId: string;
  name: string;
  email: string;
  status: 'Not Started' | 'In Progress' | 'Submitted';
  currentStep: number;
  timeSpent: number;
  cardsOnBoard: number;
  adjustments: number;
  reasoningScore: number;
  finalDecision: string | null;
  submittedAt: string | null;
  // detail fields
  writtenDiagnosis: string | null;
  step1Text: string | null;
  step2Chips: Json | null;
  step3Reflection: string | null;
  sessionStartedAt: string | null;
  lastActiveAt: string | null;
}

// ─── Helpers ─────────────────────────────────────────────────────
function fmtDuration(seconds: number): string {
  if (!seconds) return '—';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function fmtTime(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString();
}

function countCards(cards: Json): number {
  if (!cards || typeof cards !== 'object') return 0;
  const obj = cards as Record<string, unknown[]>;
  return Object.values(obj).reduce((sum, arr) => sum + (Array.isArray(arr) ? arr.length : 0), 0);
}

// ⚠️ Change this to your admin email
const ADMIN_EMAIL = 'admin@projectx.edu';

interface ClassRow {
  id: string;
  name: string;
  section_code: string;
  class_code: string;
}

interface SimulationRow {
  id: string;
  class_id: string;
  status: string;
  created_at: string;
}

// ─── Component ───────────────────────────────────────────────────
export default function ProfessorDashboard() {
  const { user, role, signOut, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [boards, setBoards] = useState<BoardRow[]>([]);
  const [submissions, setSubmissions] = useState<SubmissionRow[]>([]);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [simulations, setSimulations] = useState<SimulationRow[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [codeCopied, setCodeCopied] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<StudentRecord | null>(null);

  const isAdmin = user?.email === ADMIN_EMAIL;

  // ─── Fetch all data ──────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    setDataLoading(true);
    const [pRes, sRes, bRes, subRes, cRes, simRes] = await Promise.all([
      supabase.from('profiles').select('id, display_name, email').eq('role', 'student'),
      supabase.from('sessions').select('*'),
      supabase.from('reasoning_board_state').select('session_id, user_id, cards, adjustments_made, written_diagnosis, current_step, step_1_completed, step_2_completed, step_3_completed, last_active_at'),
      supabase.from('submissions').select('session_id, user_id, final_decision, cards_on_board_count, time_elapsed_seconds, submitted_at, step_1_text, step_2_chips, step_3_reflection, reasoning_score, used_ai'),
      supabase.from('classes').select('id, name, section_code, class_code'),
      supabase.from('simulations').select('id, class_id, status, created_at'),
    ]);
    if (pRes.data) setProfiles(pRes.data);
    if (sRes.data) setSessions(sRes.data as SessionRow[]);
    if (bRes.data) setBoards(bRes.data as unknown as BoardRow[]);
    if (subRes.data) setSubmissions(subRes.data as unknown as SubmissionRow[]);
    if (cRes.data) setClasses(cRes.data as ClassRow[]);
    if (simRes.data) setSimulations(simRes.data as unknown as SimulationRow[]);
    setDataLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ─── Realtime subscriptions ──────────────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel('professor-dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sessions' }, () => fetchAll())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reasoning_board_state' }, () => fetchAll())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'submissions' }, () => fetchAll())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchAll]);

  // ─── Build student records ───────────────────────────────────
  const students: StudentRecord[] = useMemo(() => {
    return profiles.map((p) => {
      const session = sessions.find((s) => s.user_id === p.id);
      const board = boards.find((b) => b.user_id === p.id);
      const submission = submissions.find((s) => s.user_id === p.id);

      let status: StudentRecord['status'] = 'Not Started';
      if (submission) status = 'Submitted';
      else if (session) status = 'In Progress';

      const timeSpent = submission
        ? submission.time_elapsed_seconds
        : session
          ? Math.floor((Date.now() - new Date(session.started_at).getTime()) / 1000)
          : 0;

      return {
        userId: p.id,
        name: p.display_name || p.email || 'Unknown',
        email: p.email || '',
        status,
        currentStep: board?.current_step ?? 1,
        timeSpent,
        cardsOnBoard: submission ? submission.cards_on_board_count : board ? countCards(board.cards) : 0,
        adjustments: board?.adjustments_made ?? 0,
        reasoningScore: submission?.reasoning_score ?? 0,
        finalDecision: submission?.final_decision ?? null,
        submittedAt: submission?.submitted_at ?? null,
        writtenDiagnosis: board?.written_diagnosis ?? null,
        step1Text: submission?.step_1_text ?? null,
        step2Chips: submission?.step_2_chips ?? null,
        step3Reflection: submission?.step_3_reflection ?? null,
        sessionStartedAt: session?.started_at ?? null,
        lastActiveAt: board?.last_active_at ?? null,
      };
    });
  }, [profiles, sessions, boards, submissions]);

  // ─── Stats ───────────────────────────────────────────────────
  const stats = useMemo(() => ({
    total: students.length,
    submitted: students.filter((s) => s.status === 'Submitted').length,
    inProgress: students.filter((s) => s.status === 'In Progress').length,
    notStarted: students.filter((s) => s.status === 'Not Started').length,
  }), [students]);

  // ─── CSV Export ──────────────────────────────────────────────
  const exportCsv = useCallback(() => {
    const headers = ['Name', 'Email', 'Status', 'Current Step', 'Time Spent (s)', 'Cards on Board', 'Adjustments', 'Final Decision', 'Submitted At'];
    const rows = students.map((s) => [
      s.name, s.email, s.status, s.currentStep, s.timeSpent, s.cardsOnBoard, s.adjustments,
      s.finalDecision ?? '', s.submittedAt ?? '',
    ]);
    const csv = [headers, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `student-submissions-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [students]);

  const triggerSimulation = useCallback(async () => {
    if (!selectedClassId || !user) return;
    const { error } = await supabase.from('simulations').insert({
      class_id: selectedClassId,
      status: 'active',
    });
    if (error) {
      toast.error('Failed to trigger simulation');
    } else {
      toast.success('Simulation triggered!');
      fetchAll();
    }
  }, [selectedClassId, user, fetchAll]);

  const activeSimsForClass = useMemo(() => {
    if (!selectedClassId) return simulations.filter(s => s.status === 'active').length;
    return simulations.filter(s => s.class_id === selectedClassId && s.status === 'active').length;
  }, [simulations, selectedClassId]);

  // ─── Guards ──────────────────────────────────────────────────
  if (authLoading) {
    return <div className="h-screen flex items-center justify-center bg-background"><p className="text-muted-foreground">Loading…</p></div>;
  }
  if (!user || role !== 'professor') {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center space-y-4">
            <AlertCircle className="h-12 w-12 mx-auto text-destructive" />
            <p className="font-medium">Access denied. This page is for professors only.</p>
            <Button variant="outline" onClick={() => navigate('/')}>Go to Simulation</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ─── Status badge ────────────────────────────────────────────
  const statusBadge = (status: StudentRecord['status']) => {
    const map: Record<string, string> = {
      'Submitted': 'bg-success/15 text-success border-success/30',
      'In Progress': 'bg-warning/15 text-warning border-warning/30',
      'Not Started': 'bg-muted text-muted-foreground border-border',
    };
    return <Badge variant="outline" className={map[status]}>{status}</Badge>;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold font-[var(--font-heading)]">📊 Professor Dashboard</h1>
            <Badge variant="secondary" className="text-xs">Live</Badge>
          </div>
          <div className="flex items-center gap-2">
            <ClassSwitcher classes={classes} selectedClassId={selectedClassId} onSelect={setSelectedClassId} />
            <AddClassDialog onClassAdded={fetchAll} />
            <Button size="sm" variant="outline" onClick={fetchAll} className="gap-1.5">
              <RefreshCw className="h-3.5 w-3.5" /> Refresh
            </Button>
            <Button size="sm" variant="outline" onClick={exportCsv} className="gap-1.5">
              <Download className="h-3.5 w-3.5" /> Export CSV
            </Button>
            {isAdmin && (
              <Button size="sm" variant="outline" onClick={() => navigate('/admin')} className="gap-1.5">
                <Shield className="h-3.5 w-3.5" /> Admin
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={signOut} className="gap-1.5 text-muted-foreground">
              <LogOut className="h-3.5 w-3.5" /> Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* ─── Class KPI Cards ────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="pt-4 pb-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10"><BookOpen className="h-5 w-5 text-primary" /></div>
              <div><p className="text-2xl font-bold">{classes.length}</p><p className="text-xs text-muted-foreground">Classes</p></div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10"><Users className="h-5 w-5 text-primary" /></div>
              <div><p className="text-2xl font-bold">{stats.total}</p><p className="text-xs text-muted-foreground">Total Students</p></div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/10"><CheckCircle className="h-5 w-5 text-success" /></div>
              <div><p className="text-2xl font-bold">{stats.submitted}</p><p className="text-xs text-muted-foreground">Submitted</p></div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-warning/10"><Clock className="h-5 w-5 text-warning" /></div>
              <div><p className="text-2xl font-bold">{stats.inProgress}</p><p className="text-xs text-muted-foreground">In Progress</p></div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-accent/10"><Zap className="h-5 w-5 text-accent-foreground" /></div>
              <div><p className="text-2xl font-bold">{activeSimsForClass}</p><p className="text-xs text-muted-foreground">Active Sims</p></div>
            </CardContent>
          </Card>
        </div>

        {/* ─── Simulation Launcher + Class Code ─────────────── */}
        {selectedClassId && (() => {
          const selectedClass = classes.find(c => c.id === selectedClassId);
          return (
            <Card>
              <CardContent className="pt-4 pb-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">
                      Managing: <strong>{selectedClass?.name}</strong>
                      {' — '}{selectedClass?.section_code}
                    </p>
                    <p className="text-xs text-muted-foreground">{activeSimsForClass} active simulation(s)</p>
                  </div>
                  <Button onClick={triggerSimulation} className="gap-1.5">
                    <Zap className="h-4 w-4" /> Trigger Simulation
                  </Button>
                </div>
                {/* Class Code */}
                <div className="flex items-center justify-center gap-3 py-3 rounded-lg bg-muted/50 border border-border">
                  <span className="text-sm text-muted-foreground">Class Code:</span>
                  <span className="text-3xl font-mono font-bold tracking-[0.3em] text-primary">
                    {(selectedClass as any)?.class_code ?? '—'}
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="gap-1"
                    onClick={async () => {
                      const code = (selectedClass as any)?.class_code;
                      if (code) {
                        await navigator.clipboard.writeText(code);
                        setCodeCopied(true);
                        toast.success('Class code copied!');
                        setTimeout(() => setCodeCopied(false), 2000);
                      }
                    }}
                  >
                    {codeCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    {codeCopied ? 'Copied' : 'Copy'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })()}

        {/* ─── Student Table ──────────────────────────────────── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Student Progress</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {dataLoading ? (
              <div className="p-8 text-center text-muted-foreground">Loading student data…</div>
            ) : students.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">No students enrolled yet.</div>
            ) : (
              <ScrollArea className="max-h-[60vh]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-center">Step</TableHead>
                      <TableHead className="text-right">Time</TableHead>
                      <TableHead className="text-right">Cards</TableHead>
                      <TableHead className="text-right">Adjustments</TableHead>
                      <TableHead>Final Decision</TableHead>
                      <TableHead>Submitted</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {students.map((s) => (
                      <TableRow
                        key={s.userId}
                        className="cursor-pointer hover:bg-accent/10"
                        onClick={() => setSelectedStudent(s)}
                      >
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">{s.name}</p>
                            <p className="text-xs text-muted-foreground">{s.email}</p>
                          </div>
                        </TableCell>
                        <TableCell>{statusBadge(s.status)}</TableCell>
                        <TableCell className="text-center">
                          {s.status === 'In Progress' ? <span className="font-mono">{s.currentStep}/3</span> : '—'}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">{fmtDuration(s.timeSpent)}</TableCell>
                        <TableCell className="text-right font-mono">{s.cardsOnBoard}</TableCell>
                        <TableCell className="text-right font-mono">{s.adjustments}</TableCell>
                        <TableCell className="max-w-[200px] truncate text-sm">{s.finalDecision ?? '—'}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{fmtTime(s.submittedAt)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* ─── Hypothesis Testing Chart ───────────────────────── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Hypothesis Testing — Slider Adjustments</CardTitle>
          </CardHeader>
          <CardContent>
            {(() => {
              const buckets = [
                { label: '1–2 (Guessing)', min: 1, max: 2 },
                { label: '3–5 (Basic Testing)', min: 3, max: 5 },
                { label: '6–10 (Active Exploration)', min: 6, max: 10 },
                { label: '11+ (Deep Analysis)', min: 11, max: Infinity },
              ];
              const adjustmentValues = students
                .map(s => s.adjustments)
                .filter(v => v > 0);
              const chartData = buckets.map(b => ({
                name: b.label,
                students: adjustmentValues.filter(v => v >= b.min && v <= b.max).length,
              }));
              return adjustmentValues.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No adjustment data yet.</p>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={chartData} layout="vertical" margin={{ left: 20, right: 20, top: 5, bottom: 5 }}>
                    <XAxis type="number" allowDecimals={false} />
                    <YAxis type="category" dataKey="name" width={180} tick={{ fontSize: 13 }} />
                    <Tooltip formatter={(value: number) => [`${value} student${value !== 1 ? 's' : ''}`, 'Count']} />
                    <Bar dataKey="students" radius={[0, 4, 4, 0]} fill="#0d9488" />
                  </BarChart>
                </ResponsiveContainer>
              );
            })()}
          </CardContent>
        </Card>

        {/* ─── AI Usage Pie Chart ────────────────────────────── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Student AI Usage</CardTitle>
          </CardHeader>
          <CardContent>
            {(() => {
              const submitted = students.filter(s => s.status === 'Submitted');
              if (submitted.length === 0) {
                return <p className="text-center text-muted-foreground py-8">No submitted students yet.</p>;
              }
              const usedAiCount = submissions.filter(s => s.used_ai).length;
              const didNotCount = submitted.length - usedAiCount;
              const total = submitted.length;
              const pieData = [
                { name: 'Used AI Assistant', value: usedAiCount },
                { name: 'Did Not Use AI', value: didNotCount },
              ];
              const COLORS = ['#0d9488', '#f97316'];
              return (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value} (${Math.round((value / total) * 100)}%)`}
                      labelLine
                    >
                      {pieData.map((_, i) => (
                        <Cell key={i} fill={COLORS[i]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number, name: string) => [
                        `${value} student${value !== 1 ? 's' : ''} (${Math.round((value / total) * 100)}%)`,
                        name,
                      ]}
                    />
                    <Legend
                      formatter={(value: string) => {
                        const entry = pieData.find(d => d.name === value);
                        const pct = entry ? Math.round((entry.value / total) * 100) : 0;
                        return `${value} (${pct}%)`;
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              );
            })()}
          </CardContent>
        </Card>

        {/* ─── Completion Time vs Reasoning Score ─────────────── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Completion Time vs. Reasoning Score</CardTitle>
          </CardHeader>
          <CardContent>
            {(() => {
              const scatterData = students
                .filter(s => s.status === 'Submitted')
                .map(s => ({
                  name: s.name,
                  minutes: Math.round(s.timeSpent / 60),
                  score: s.reasoningScore,
                }));
              return scatterData.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No submitted students yet.</p>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <ScatterChart margin={{ left: 10, right: 20, top: 10, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" dataKey="minutes" name="Completion Time" unit=" min" tick={{ fontSize: 12 }} label={{ value: 'Completion Time (minutes)', position: 'insideBottom', offset: -5, fontSize: 12 }} />
                    <YAxis type="number" dataKey="score" name="Reasoning Score" domain={[0, 100]} tick={{ fontSize: 12 }} label={{ value: 'Reasoning Score (0–100)', angle: -90, position: 'insideLeft', offset: 10, fontSize: 12 }} />
                    <ZAxis range={[60, 60]} />
                    <Tooltip
                      cursor={{ strokeDasharray: '3 3' }}
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const d = payload[0].payload;
                        return (
                          <div className="rounded-lg border border-border/50 bg-background px-3 py-2 text-xs shadow-xl">
                            <p className="font-medium mb-1">{d.name}</p>
                            <p className="text-muted-foreground">Score: <span className="text-foreground font-mono">{d.score}</span></p>
                            <p className="text-muted-foreground">Time: <span className="text-foreground font-mono">{d.minutes} min</span></p>
                          </div>
                        );
                      }}
                    />
                    <Scatter data={scatterData} fill="#0d9488" />
                  </ScatterChart>
                </ResponsiveContainer>
              );
            })()}
          </CardContent>
        </Card>

        {/* ─── AI Impact on Time & Score ──────────────────────── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Impact of AI Usage on Time &amp; Score</CardTitle>
          </CardHeader>
          <CardContent>
            {(() => {
              const submitted = students.filter(s => s.status === 'Submitted');
              if (submitted.length === 0) {
                return <p className="text-center text-muted-foreground py-8">No submitted students yet.</p>;
              }
              const usedAiData = submissions.filter(s => s.used_ai).map(s => {
                const profile = profiles.find(p => p.id === s.user_id);
                return { name: profile?.display_name || profile?.email || 'Unknown', minutes: Math.round(s.time_elapsed_seconds / 60), score: s.reasoning_score };
              });
              const noAiData = submissions.filter(s => !s.used_ai).map(s => {
                const profile = profiles.find(p => p.id === s.user_id);
                return { name: profile?.display_name || profile?.email || 'Unknown', minutes: Math.round(s.time_elapsed_seconds / 60), score: s.reasoning_score };
              });
              const CustomTooltip = ({ active, payload }: any) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload;
                return (
                  <div className="rounded-lg border border-border/50 bg-background px-3 py-2 text-xs shadow-xl">
                    <p className="font-medium mb-1">{d.name}</p>
                    <p className="text-muted-foreground">Score: <span className="text-foreground font-mono">{d.score}</span></p>
                    <p className="text-muted-foreground">Time: <span className="text-foreground font-mono">{d.minutes} min</span></p>
                  </div>
                );
              };
              return (
                <ResponsiveContainer width="100%" height={300}>
                  <ScatterChart margin={{ left: 10, right: 20, top: 10, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" dataKey="minutes" name="Completion Time" unit=" min" tick={{ fontSize: 12 }} label={{ value: 'Completion Time (minutes)', position: 'insideBottom', offset: -5, fontSize: 12 }} />
                    <YAxis type="number" dataKey="score" name="Reasoning Score" domain={[0, 100]} tick={{ fontSize: 12 }} label={{ value: 'Reasoning Score (0–100)', angle: -90, position: 'insideLeft', offset: 10, fontSize: 12 }} />
                    <ZAxis range={[60, 60]} />
                    <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />
                    <Legend />
                    <Scatter name="Used AI" data={usedAiData} fill="#0d9488" />
                    <Scatter name="Did Not Use AI" data={noAiData} fill="#f97316" />
                  </ScatterChart>
                </ResponsiveContainer>
              );
            })()}
          </CardContent>
        </Card>
      </main>

      {/* ─── Student Detail Dialog ────────────────────────────── */}
      <Dialog open={!!selectedStudent} onOpenChange={(open) => !open && setSelectedStudent(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {selectedStudent && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {selectedStudent.name}
                  {statusBadge(selectedStudent.status)}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-5 mt-2">
                {/* Timeline */}
                <section>
                  <h3 className="text-sm font-semibold text-foreground mb-2">📅 Session Timeline</h3>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <p><strong>Started:</strong> {fmtTime(selectedStudent.sessionStartedAt)}</p>
                    <p><strong>Last Active:</strong> {fmtTime(selectedStudent.lastActiveAt)}</p>
                    <p><strong>Submitted:</strong> {fmtTime(selectedStudent.submittedAt)}</p>
                    <p><strong>Time Spent:</strong> {fmtDuration(selectedStudent.timeSpent)}</p>
                  </div>
                </section>

                <Separator />

                {/* Step 1 */}
                <section>
                  <h3 className="text-sm font-semibold text-foreground mb-2">📝 Step 1 — Written Diagnosis</h3>
                  <div className="bg-muted rounded-lg p-3 text-sm whitespace-pre-wrap">
                    {selectedStudent.step1Text || selectedStudent.writtenDiagnosis || <span className="text-muted-foreground italic">No diagnosis written yet.</span>}
                  </div>
                </section>

                <Separator />

                {/* Step 2 */}
                <section>
                  <h3 className="text-sm font-semibold text-foreground mb-2">🧩 Step 2 — Evidence Chips</h3>
                  {selectedStudent.step2Chips && Array.isArray(selectedStudent.step2Chips) && (selectedStudent.step2Chips as unknown[]).length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {(selectedStudent.step2Chips as Array<{ label?: string; value?: string }>).map((chip, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          {chip.label ?? chip.value ?? JSON.stringify(chip)}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">No chips evaluated yet.</p>
                  )}
                  <p className="mt-2 text-xs text-muted-foreground">
                    Cards on board: <strong>{selectedStudent.cardsOnBoard}</strong> · Adjustments: <strong>{selectedStudent.adjustments}</strong>
                  </p>
                </section>

                <Separator />

                {/* Step 3 */}
                <section>
                  <h3 className="text-sm font-semibold text-foreground mb-2">💭 Step 3 — Narrative Reflection</h3>
                  <div className="bg-muted rounded-lg p-3 text-sm whitespace-pre-wrap">
                    {selectedStudent.step3Reflection || <span className="text-muted-foreground italic">No reflection written yet.</span>}
                  </div>
                </section>

                <Separator />

                {/* Final Decision */}
                <section>
                  <h3 className="text-sm font-semibold text-foreground mb-2">🎯 Final Decision</h3>
                  <div className="bg-muted rounded-lg p-3 text-sm whitespace-pre-wrap">
                    {selectedStudent.finalDecision || <span className="text-muted-foreground italic">No final decision yet.</span>}
                  </div>
                </section>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
