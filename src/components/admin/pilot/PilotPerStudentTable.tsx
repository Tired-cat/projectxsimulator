import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { ChevronLeft, ChevronRight, ArrowUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import StudentDetailPanel from './StudentDetailPanel';

interface Props {
  classId: string | null;
  selectedSessionId: string | null;
  onSelectSession: (sessionId: string | null) => void;
}

interface StudentRow {
  sessionId: string | null;
  email: string;
  durationMin: number | null;
  tutorial: 'Completed' | 'Abandoned' | 'Skipped';
  cards: number | null;
  quadrants: number | null;
  contextualise: number | null;
  allocChanges: number;
  feedback: boolean;
  decision: 'Correct' | 'Partial' | 'Incorrect' | 'No change' | null;
}

type SortKey = keyof StudentRow;
type SortDir = 'asc' | 'desc';

const PAGE_SIZE = 20;

export default function PilotPerStudentTable({ classId, selectedSessionId, onSelectSession }: Props) {
  const [rows, setRows] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(true);

  // filters
  const [decisionFilter, setDecisionFilter] = useState('all');
  const [tutorialFilter, setTutorialFilter] = useState('all');
  const [feedbackFilter, setFeedbackFilter] = useState('all');
  const [search, setSearch] = useState('');

  // sort
  const [sortKey, setSortKey] = useState<SortKey>('email');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  // pagination
  const [page, setPage] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);

      // 1. Get enrolled students for class
      let enrollQ = supabase.from('student_enrollments').select('user_id, class_id');
      if (classId) enrollQ = enrollQ.eq('class_id', classId);
      const { data: enrollData } = await enrollQ;
      const enrollments = enrollData ?? [];
      const enrolledUserIds = [...new Set(enrollments.map((e) => e.user_id))];

      if (enrolledUserIds.length === 0) {
        if (!cancelled) { setRows([]); setLoading(false); }
        return;
      }

      // 2. Fetch profiles for enrolled users
      const profiles = new Map<string, string>();
      for (let i = 0; i < enrolledUserIds.length; i += 100) {
        const chunk = enrolledUserIds.slice(i, i + 100);
        const { data } = await supabase.from('profiles').select('id, email').in('id', chunk);
        (data ?? []).forEach((p) => profiles.set(p.id, p.email ?? ''));
      }

      // 3. Fetch sessions for class
      let sessQ = supabase.from('sessions').select('id, user_id, started_at, completed_at, is_completed, tutorial_opened, tutorial_completed');
      if (classId) sessQ = sessQ.eq('class_id', classId);
      const { data: sessData } = await sessQ;
      const sessions = sessData ?? [];

      // Map user_id -> session (use latest if multiple)
      const userSessions = new Map<string, typeof sessions[0]>();
      sessions.forEach((s) => {
        const existing = userSessions.get(s.user_id);
        if (!existing || s.started_at > existing.started_at) {
          userSessions.set(s.user_id, s);
        }
      });

      const sessionIds = sessions.map((s) => s.id);

      // 4. Fetch submissions, allocation_events, ai_feedback_events
      const cq = async <T,>(fn: (ids: string[]) => any, ids: string[]): Promise<T[]> => {
        const res: T[] = [];
        for (let i = 0; i < ids.length; i += 100) {
          const { data } = await fn(ids.slice(i, i + 100));
          if (data) res.push(...(data as T[]));
        }
        return res;
      };

      const [subRows, allocRows, feedbackRows] = await Promise.all([
        cq<{
          session_id: string;
          descriptive_card_count: number; diagnostic_card_count: number;
          prescriptive_card_count: number; predictive_card_count: number;
          contextualise_pairs_count: number;
          final_tiktok_spend: number | null; final_newspaper_spend: number | null;
        }>((ids) => supabase.from('submissions').select(
          'session_id, descriptive_card_count, diagnostic_card_count, prescriptive_card_count, predictive_card_count, contextualise_pairs_count, final_tiktok_spend, final_newspaper_spend'
        ).in('session_id', ids), sessionIds),
        cq<{ session_id: string }>((ids) => supabase.from('allocation_events').select('session_id').in('session_id', ids), sessionIds),
        cq<{ session_id: string }>((ids) => supabase.from('ai_feedback_events').select('session_id').in('session_id', ids), sessionIds),
      ]);

      // Index by session_id
      const subMap = new Map<string, typeof subRows[0]>();
      subRows.forEach((s) => subMap.set(s.session_id, s));

      const allocCounts = new Map<string, number>();
      allocRows.forEach((a) => allocCounts.set(a.session_id, (allocCounts.get(a.session_id) ?? 0) + 1));

      const feedbackSessions = new Set(feedbackRows.map((f) => f.session_id));

      // 5. Build rows — one per enrolled user
      const result: StudentRow[] = enrolledUserIds.map((userId) => {
        const email = profiles.get(userId) ?? '';
        const session = userSessions.get(userId);

        if (!session) {
          return {
            sessionId: null, email,
            durationMin: null, tutorial: 'Skipped' as const,
            cards: null, quadrants: null, contextualise: null,
            allocChanges: 0, feedback: false, decision: null,
          };
        }

        // Tutorial
        let tutorial: StudentRow['tutorial'] = 'Skipped';
        if (session.tutorial_completed) tutorial = 'Completed';
        else if (session.tutorial_opened) tutorial = 'Abandoned';

        // Duration
        let durationMin: number | null = null;
        if (session.completed_at && session.started_at) {
          durationMin = +((new Date(session.completed_at).getTime() - new Date(session.started_at).getTime()) / 60000).toFixed(1);
        }

        const sub = subMap.get(session.id);
        let cards: number | null = null;
        let quadrants: number | null = null;
        let contextualise: number | null = null;
        let decision: StudentRow['decision'] = null;

        if (sub) {
          cards = sub.descriptive_card_count + sub.diagnostic_card_count + sub.prescriptive_card_count + sub.predictive_card_count;
          quadrants = [sub.descriptive_card_count, sub.diagnostic_card_count, sub.prescriptive_card_count, sub.predictive_card_count].filter((c) => c > 0).length;
          contextualise = sub.contextualise_pairs_count;

          const tkCorrect = (sub.final_tiktok_spend ?? 9000) < 9000;
          const npCorrect = (sub.final_newspaper_spend ?? 1000) > 1000;
          const tkDefault = sub.final_tiktok_spend === 9000 || sub.final_tiktok_spend == null;
          const npDefault = sub.final_newspaper_spend === 1000 || sub.final_newspaper_spend == null;

          if (tkCorrect && npCorrect) decision = 'Correct';
          else if (tkDefault && npDefault) decision = 'No change';
          else if (tkCorrect || npCorrect) decision = 'Partial';
          else decision = 'Incorrect';
        }

        return {
          sessionId: session.id, email, durationMin, tutorial,
          cards, quadrants, contextualise,
          allocChanges: allocCounts.get(session.id) ?? 0,
          feedback: feedbackSessions.has(session.id),
          decision,
        };
      });

      if (!cancelled) { setRows(result); setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [classId]);

  // Reset page when filters change
  useEffect(() => { setPage(0); }, [decisionFilter, tutorialFilter, feedbackFilter, search, sortKey, sortDir]);

  // Filtered + sorted rows
  const filtered = useMemo(() => {
    let r = [...rows];

    if (search) {
      const q = search.toLowerCase();
      r = r.filter((row) => row.email.toLowerCase().includes(q));
    }
    if (decisionFilter !== 'all') {
      const map: Record<string, StudentRow['decision']> = { correct: 'Correct', partial: 'Partial', incorrect: 'Incorrect', nochange: 'No change' };
      r = r.filter((row) => row.decision === map[decisionFilter]);
    }
    if (tutorialFilter === 'completed') r = r.filter((row) => row.tutorial === 'Completed');
    else if (tutorialFilter === 'skipped') r = r.filter((row) => row.tutorial === 'Skipped' || row.tutorial === 'Abandoned');
    if (feedbackFilter === 'used') r = r.filter((row) => row.feedback);
    else if (feedbackFilter === 'skipped') r = r.filter((row) => !row.feedback);

    // Sort
    r.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === 'string' && typeof bv === 'string') return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
      if (typeof av === 'number' && typeof bv === 'number') return sortDir === 'asc' ? av - bv : bv - av;
      if (typeof av === 'boolean' && typeof bv === 'boolean') return sortDir === 'asc' ? (av ? 1 : 0) - (bv ? 1 : 0) : (bv ? 1 : 0) - (av ? 1 : 0);
      return 0;
    });

    return r;
  }, [rows, search, decisionFilter, tutorialFilter, feedbackFilter, sortKey, sortDir]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const pageRows = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const showFrom = filtered.length > 0 ? page * PAGE_SIZE + 1 : 0;
  const showTo = Math.min((page + 1) * PAGE_SIZE, filtered.length);

  const toggleSort = useCallback((key: SortKey) => {
    if (sortKey === key) setSortDir((d) => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  }, [sortKey]);

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-sm text-muted-foreground">Loading student data…</div>;
  }

  const DECISION_COLORS: Record<string, string> = {
    Correct: '#4A7C59', Partial: '#D4A017', Incorrect: '#C4622D', 'No change': '#888780',
  };
  const TUTORIAL_COLORS: Record<string, string> = {
    Completed: '#6B4F8A', Abandoned: '#D4A017', Skipped: '#888780',
  };

  const COLUMNS: { key: SortKey; label: string; align?: string }[] = [
    { key: 'email', label: 'Student' },
    { key: 'durationMin', label: 'Duration', align: 'right' },
    { key: 'tutorial', label: 'Tutorial', align: 'center' },
    { key: 'cards', label: 'Cards', align: 'right' },
    { key: 'quadrants', label: 'Quadrants', align: 'center' },
    { key: 'contextualise', label: 'Contextualise', align: 'right' },
    { key: 'allocChanges', label: 'Alloc. changes', align: 'right' },
    { key: 'feedback', label: 'Feedback', align: 'center' },
    { key: 'decision', label: 'Decision', align: 'center' },
  ];

  return (
    <div className="space-y-4">
      {/* ── FILTERS ──────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={decisionFilter} onValueChange={setDecisionFilter}>
          <SelectTrigger className="w-[160px] h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All outcomes</SelectItem>
            <SelectItem value="correct">Correct only</SelectItem>
            <SelectItem value="partial">Partial</SelectItem>
            <SelectItem value="incorrect">Incorrect</SelectItem>
            <SelectItem value="nochange">No change</SelectItem>
          </SelectContent>
        </Select>

        <Select value={tutorialFilter} onValueChange={setTutorialFilter}>
          <SelectTrigger className="w-[170px] h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All tutorials</SelectItem>
            <SelectItem value="completed">Tutorial completed</SelectItem>
            <SelectItem value="skipped">Tutorial skipped</SelectItem>
          </SelectContent>
        </Select>

        <Select value={feedbackFilter} onValueChange={setFeedbackFilter}>
          <SelectTrigger className="w-[160px] h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All feedback</SelectItem>
            <SelectItem value="used">Used feedback</SelectItem>
            <SelectItem value="skipped">Skipped feedback</SelectItem>
          </SelectContent>
        </Select>

        <Input
          placeholder="Search email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-[200px] h-8 text-xs"
        />
      </div>

      {/* ── TABLE ────────────────────────────────── */}
      <Card>
        <CardContent className="pt-4 pb-3 px-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  {COLUMNS.map((col) => (
                    <th
                      key={col.key}
                      className={cn(
                        'py-2 px-3 font-semibold text-muted-foreground whitespace-nowrap cursor-pointer hover:text-foreground transition-colors select-none',
                        col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                      )}
                      onClick={() => toggleSort(col.key)}
                    >
                      <span className="inline-flex items-center gap-1">
                        {col.label}
                        <ArrowUpDown className={cn('h-3 w-3', sortKey === col.key ? 'text-foreground' : 'text-muted-foreground/40')} />
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pageRows.length === 0 ? (
                  <tr><td colSpan={9} className="py-8 text-center text-muted-foreground">No students match the current filters.</td></tr>
                ) : pageRows.map((row, i) => {
                  const isSelected = row.sessionId != null && row.sessionId === selectedSessionId;
                  return (
                    <tr
                      key={row.sessionId ?? `no-session-${i}`}
                      className={cn(
                        'border-b border-border/30 last:border-0 cursor-pointer transition-colors',
                        'hover:bg-muted/40',
                        isSelected && 'bg-[#6B4F8A]/5 border-l-2 border-l-[#6B4F8A]'
                      )}
                      onClick={() => row.sessionId && onSelectSession(isSelected ? null : row.sessionId)}
                    >
                      <td className="py-2 px-3 font-medium text-foreground max-w-[200px] truncate" title={row.email}>
                        {row.email.length > 28 ? row.email.slice(0, 28) + '…' : row.email}
                      </td>
                      <td className="py-2 px-3 text-right text-muted-foreground">
                        {row.durationMin != null ? `${row.durationMin}m` : '—'}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <span
                          className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold text-white"
                          style={{ backgroundColor: TUTORIAL_COLORS[row.tutorial] }}
                        >
                          {row.tutorial}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-right text-muted-foreground">{row.cards ?? '—'}</td>
                      <td className="py-2 px-3 text-center text-muted-foreground">{row.quadrants != null ? `${row.quadrants}/4` : '—'}</td>
                      <td className="py-2 px-3 text-right text-muted-foreground">{row.contextualise ?? '—'}</td>
                      <td className="py-2 px-3 text-right text-muted-foreground">{row.sessionId ? row.allocChanges : '—'}</td>
                      <td className="py-2 px-3 text-center">
                        {row.sessionId == null ? '—' : (
                          <span className={cn('font-medium', row.feedback ? 'text-[#4A7C59]' : 'text-muted-foreground')}>
                            {row.feedback ? 'Yes' : 'No'}
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-center">
                        {row.decision ? (
                          <span className="font-bold" style={{ color: DECISION_COLORS[row.decision] }}>{row.decision}</span>
                        ) : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* ── PAGINATION ───────────────────────── */}
          <div className="flex items-center justify-between px-3 pt-3">
            <p className="text-xs text-muted-foreground">
              Showing {showFrom}–{showTo} of {filtered.length} student{filtered.length !== 1 ? 's' : ''}
            </p>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)} className="h-7 px-2">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-xs text-muted-foreground px-2">
                {page + 1} / {Math.max(totalPages, 1)}
              </span>
              <Button variant="ghost" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)} className="h-7 px-2">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── DETAIL PANEL ─────────────────────────── */}
      {selectedSessionId && (
        <StudentDetailPanel
          sessionId={selectedSessionId}
          onClose={() => onSelectSession(null)}
        />
      )}
    </div>
  );
}
