import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useClassFilter } from '@/contexts/ClassFilterContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { CheckCircle, XCircle, ArrowUpDown, Search } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

interface EnrollmentRow { user_id: string; class_id: string }
interface ProfileRow { id: string; display_name: string | null; email: string | null }
interface SubmissionRow {
  user_id: string;
  session_id: string;
  reasoning_score: number;
  time_elapsed_seconds: number;
  used_ai: boolean;
  submitted_at: string;
  step_1_text: string | null;
  step_2_chips: any;
  step_3_reflection: string | null;
  final_decision: string;
}
interface BoardStateRow {
  session_id: string;
  user_id: string;
  adjustments_made: number;
  written_diagnosis: string | null;
}
interface StudentResponseRow {
  student_identifier: string;
  class_id: string;
  simulation_id: string;
  decisions: any;
}

interface StudentRecord {
  userId: string;
  name: string;
  email: string;
  classId: string;
  className: string;
  sectionCode: string;
  submittedAt: string;
  adjustments: number;
  reasoningScore: number;
  step1: boolean;
  step2: boolean;
  step3: boolean;
  usedAi: boolean;
  timeMinutes: number;
  // detail fields
  step1Text: string | null;
  step2Chips: any[];
  step3Reflection: string | null;
  writtenDiagnosis: string | null;
  finalDecision: string;
  decisions: any | null;
}

type SortKey = 'name' | 'className' | 'sectionCode' | 'submittedAt' | 'adjustments' | 'reasoningScore' | 'timeMinutes' | 'usedAi';

export default function DashboardStudents() {
  const { classes, selectedClassId } = useClassFilter();
  const [enrollments, setEnrollments] = useState<EnrollmentRow[]>([]);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [submissions, setSubmissions] = useState<SubmissionRow[]>([]);
  const [boardStates, setBoardStates] = useState<BoardStateRow[]>([]);
  const [studentResponses, setStudentResponses] = useState<StudentResponseRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState<string>('all');
  const [aiFilter, setAiFilter] = useState<string>('all');
  const [scoreFilter, setScoreFilter] = useState<string>('all');
  const [sortKey, setSortKey] = useState<SortKey>('submittedAt');
  const [sortAsc, setSortAsc] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<StudentRecord | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [eRes, pRes, subRes, bRes, srRes] = await Promise.all([
      supabase.from('student_enrollments').select('user_id, class_id'),
      supabase.from('profiles').select('id, display_name, email').eq('role', 'student'),
      supabase.from('submissions').select('user_id, session_id, reasoning_score, time_elapsed_seconds, used_ai, submitted_at, step_1_text, step_2_chips, step_3_reflection, final_decision'),
      supabase.from('reasoning_board_state').select('session_id, user_id, adjustments_made, written_diagnosis'),
      supabase.from('student_responses').select('student_identifier, class_id, simulation_id, decisions'),
    ]);
    if (eRes.data) setEnrollments(eRes.data);
    if (pRes.data) setProfiles(pRes.data);
    if (subRes.data) setSubmissions(subRes.data as SubmissionRow[]);
    if (bRes.data) setBoardStates(bRes.data as BoardStateRow[]);
    if (srRes.data) setStudentResponses(srRes.data as StudentResponseRow[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const classMap = useMemo(() => {
    const m = new Map<string, { name: string; section: string }>();
    classes.forEach(c => m.set(c.id, { name: c.name, section: c.section_code }));
    return m;
  }, [classes]);

  const classIds = useMemo(() => new Set(classes.map(c => c.id)), [classes]);

  const records: StudentRecord[] = useMemo(() => {
    const profileMap = new Map<string, ProfileRow>();
    profiles.forEach(p => profileMap.set(p.id, p));

    const boardMap = new Map<string, BoardStateRow>();
    boardStates.forEach(b => boardMap.set(b.session_id, b));

    const responseMap = new Map<string, StudentResponseRow>();
    studentResponses.forEach(sr => responseMap.set(sr.student_identifier + ':' + sr.class_id, sr));

    const enrolledUsers = enrollments.filter(e => classIds.has(e.class_id));

    const result: StudentRecord[] = [];
    for (const enrollment of enrolledUsers) {
      if (selectedClassId && enrollment.class_id !== selectedClassId) continue;
      const profile = profileMap.get(enrollment.user_id);
      if (!profile) continue;

      const sub = submissions.find(s => s.user_id === enrollment.user_id);
      const board = sub ? boardMap.get(sub.session_id) : boardStates.find(b => b.user_id === enrollment.user_id);
      const resp = responseMap.get(enrollment.user_id + ':' + enrollment.class_id);
      const cls = classMap.get(enrollment.class_id);

      const chips = Array.isArray(sub?.step_2_chips) ? sub.step_2_chips : [];

      result.push({
        userId: enrollment.user_id,
        name: profile.display_name || profile.email || 'Unknown',
        email: profile.email || '',
        classId: enrollment.class_id,
        className: cls?.name || '',
        sectionCode: cls?.section || '',
        submittedAt: sub?.submitted_at || '',
        adjustments: board?.adjustments_made || 0,
        reasoningScore: sub?.reasoning_score || 0,
        step1: !!sub?.step_1_text,
        step2: chips.length > 0,
        step3: !!sub?.step_3_reflection,
        usedAi: sub?.used_ai || false,
        timeMinutes: Math.round((sub?.time_elapsed_seconds || 0) / 60),
        step1Text: sub?.step_1_text || null,
        step2Chips: chips,
        step3Reflection: sub?.step_3_reflection || null,
        writtenDiagnosis: board?.written_diagnosis || null,
        finalDecision: sub?.final_decision || '',
        decisions: resp?.decisions || null,
      });
    }
    return result;
  }, [enrollments, profiles, submissions, boardStates, studentResponses, classIds, selectedClassId, classMap]);

  const filtered = useMemo(() => {
    let list = records;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(r => r.name.toLowerCase().includes(q));
    }
    if (classFilter !== 'all') list = list.filter(r => r.classId === classFilter);
    if (aiFilter === 'yes') list = list.filter(r => r.usedAi);
    if (aiFilter === 'no') list = list.filter(r => !r.usedAi);
    if (scoreFilter === 'low') list = list.filter(r => r.reasoningScore < 40);
    if (scoreFilter === 'mid') list = list.filter(r => r.reasoningScore >= 40 && r.reasoningScore <= 70);
    if (scoreFilter === 'high') list = list.filter(r => r.reasoningScore > 70);
    return list;
  }, [records, search, classFilter, aiFilter, scoreFilter]);

  const sorted = useMemo(() => {
    const copy = [...filtered];
    copy.sort((a, b) => {
      let cmp = 0;
      const av = a[sortKey], bv = b[sortKey];
      if (typeof av === 'string' && typeof bv === 'string') cmp = av.localeCompare(bv);
      else if (typeof av === 'boolean' && typeof bv === 'boolean') cmp = (av ? 1 : 0) - (bv ? 1 : 0);
      else cmp = (av as number) - (bv as number);
      return sortAsc ? cmp : -cmp;
    });
    return copy;
  }, [filtered, sortKey, sortAsc]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(true); }
  };

  const SortHeader = ({ label, col }: { label: string; col: SortKey }) => (
    <TableHead className="cursor-pointer select-none whitespace-nowrap" onClick={() => handleSort(col)}>
      <span className="inline-flex items-center gap-1">
        {label}
        <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
      </span>
    </TableHead>
  );

  const scoreBadge = (score: number) => {
    if (score < 40) return <Badge variant="destructive">{score}</Badge>;
    if (score <= 70) return <Badge className="bg-yellow-500/20 text-yellow-700 border-yellow-300">{score}</Badge>;
    return <Badge className="bg-emerald-500/20 text-emerald-700 border-emerald-300">{score}</Badge>;
  };

  const chipQuadrantBadge = (quadrant: string) => {
    const colors: Record<string, string> = {
      descriptive: 'bg-blue-100 text-blue-700',
      diagnostic: 'bg-purple-100 text-purple-700',
      predictive: 'bg-amber-100 text-amber-700',
      prescriptive: 'bg-emerald-100 text-emerald-700',
    };
    return <Badge className={colors[quadrant] || 'bg-muted text-muted-foreground'}>{quadrant}</Badge>;
  };

  const decisionBarData = useMemo(() => {
    if (!selectedStudent?.decisions) return [];
    const d = selectedStudent.decisions as Record<string, number>;
    return Object.entries(d).map(([channel, amount]) => ({ channel, amount }));
  }, [selectedStudent]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold font-heading text-foreground">Students</h2>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={classFilter} onValueChange={setClassFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Class" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Classes</SelectItem>
            {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={aiFilter} onValueChange={setAiFilter}>
          <SelectTrigger className="w-[130px]"><SelectValue placeholder="AI Usage" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="yes">Used AI</SelectItem>
            <SelectItem value="no">No AI</SelectItem>
          </SelectContent>
        </Select>
        <Select value={scoreFilter} onValueChange={setScoreFilter}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Score" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Scores</SelectItem>
            <SelectItem value="low">&lt; 40</SelectItem>
            <SelectItem value="mid">40–70</SelectItem>
            <SelectItem value="high">70+</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <SortHeader label="Student Name" col="name" />
                <SortHeader label="Class" col="className" />
                <SortHeader label="Section" col="sectionCode" />
                <SortHeader label="Submitted" col="submittedAt" />
                <SortHeader label="Adjustments" col="adjustments" />
                <SortHeader label="Score" col="reasoningScore" />
                <TableHead>Step 1</TableHead>
                <TableHead>Step 2</TableHead>
                <TableHead>Step 3</TableHead>
                <SortHeader label="AI" col="usedAi" />
                <SortHeader label="Time" col="timeMinutes" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} className="text-center py-12 text-muted-foreground">
                    No students found
                  </TableCell>
                </TableRow>
              ) : sorted.map(r => (
                <TableRow
                  key={r.userId + r.classId}
                  className="cursor-pointer"
                  onClick={() => setSelectedStudent(r)}
                >
                  <TableCell className="font-medium">{r.name}</TableCell>
                  <TableCell>{r.className}</TableCell>
                  <TableCell>{r.sectionCode}</TableCell>
                  <TableCell className="whitespace-nowrap">
                    {r.submittedAt ? new Date(r.submittedAt).toLocaleDateString() : '—'}
                  </TableCell>
                  <TableCell>{r.adjustments}</TableCell>
                  <TableCell>{scoreBadge(r.reasoningScore)}</TableCell>
                  <TableCell>{r.step1 ? <CheckCircle className="h-4 w-4 text-emerald-500" /> : <XCircle className="h-4 w-4 text-muted-foreground/40" />}</TableCell>
                  <TableCell>{r.step2 ? <CheckCircle className="h-4 w-4 text-emerald-500" /> : <XCircle className="h-4 w-4 text-muted-foreground/40" />}</TableCell>
                  <TableCell>{r.step3 ? <CheckCircle className="h-4 w-4 text-emerald-500" /> : <XCircle className="h-4 w-4 text-muted-foreground/40" />}</TableCell>
                  <TableCell>{r.usedAi ? <Badge>Yes</Badge> : <Badge variant="outline">No</Badge>}</TableCell>
                  <TableCell>{r.timeMinutes} min</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Detail Sheet */}
      <Sheet open={!!selectedStudent} onOpenChange={open => !open && setSelectedStudent(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {selectedStudent && (
            <>
              <SheetHeader>
                <SheetTitle>{selectedStudent.name}</SheetTitle>
                <SheetDescription>
                  {selectedStudent.className} · {selectedStudent.sectionCode}
                  {selectedStudent.submittedAt && ` · Submitted ${new Date(selectedStudent.submittedAt).toLocaleDateString()}`}
                </SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                {/* Score + Time */}
                <div className="flex gap-3 items-center flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Score:</span>
                    {scoreBadge(selectedStudent.reasoningScore)}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Time:</span>
                    <Badge variant="outline">{selectedStudent.timeMinutes} min</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">AI:</span>
                    {selectedStudent.usedAi ? <Badge>Yes</Badge> : <Badge variant="outline">No</Badge>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Adjustments:</span>
                    <Badge variant="secondary">{selectedStudent.adjustments}</Badge>
                  </div>
                </div>

                {/* Budget Decisions */}
                {decisionBarData.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Budget Decisions</h4>
                    <div className="h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={decisionBarData} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" tickFormatter={v => `$${v.toLocaleString()}`} />
                          <YAxis type="category" dataKey="channel" width={100} />
                          <Tooltip formatter={(v: number) => `$${v.toLocaleString()}`} />
                          <Bar dataKey="amount" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {/* Step 1 */}
                <div>
                  <h4 className="text-sm font-semibold mb-1 flex items-center gap-2">
                    Step 1 — Initial Observation
                    {selectedStudent.step1 ? <CheckCircle className="h-4 w-4 text-emerald-500" /> : <XCircle className="h-4 w-4 text-muted-foreground/40" />}
                  </h4>
                  <p className="text-sm text-muted-foreground bg-muted/50 rounded-md p-3">
                    {selectedStudent.step1Text || 'No response submitted.'}
                  </p>
                </div>

                {/* Step 2 */}
                <div>
                  <h4 className="text-sm font-semibold mb-1 flex items-center gap-2">
                    Step 2 — Evidence Chips
                    {selectedStudent.step2 ? <CheckCircle className="h-4 w-4 text-emerald-500" /> : <XCircle className="h-4 w-4 text-muted-foreground/40" />}
                  </h4>
                  {selectedStudent.step2Chips.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {selectedStudent.step2Chips.map((chip: any, i: number) => (
                        <div key={i} className="flex items-center gap-1.5 bg-muted/50 rounded-md px-2.5 py-1.5 text-xs">
                          <span>{chip.label || chip.text || `Chip ${i + 1}`}</span>
                          {chip.quadrant && chipQuadrantBadge(chip.quadrant)}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No evidence chips placed.</p>
                  )}
                </div>

                {/* Step 3 */}
                <div>
                  <h4 className="text-sm font-semibold mb-1 flex items-center gap-2">
                    Step 3 — Reflection
                    {selectedStudent.step3 ? <CheckCircle className="h-4 w-4 text-emerald-500" /> : <XCircle className="h-4 w-4 text-muted-foreground/40" />}
                  </h4>
                  <p className="text-sm text-muted-foreground bg-muted/50 rounded-md p-3">
                    {selectedStudent.step3Reflection || 'No reflection submitted.'}
                  </p>
                </div>

                {/* Written Diagnosis */}
                <div>
                  <h4 className="text-sm font-semibold mb-1">Written Diagnosis</h4>
                  <p className="text-sm text-muted-foreground bg-muted/50 rounded-md p-3">
                    {selectedStudent.writtenDiagnosis || 'No diagnosis written.'}
                  </p>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
