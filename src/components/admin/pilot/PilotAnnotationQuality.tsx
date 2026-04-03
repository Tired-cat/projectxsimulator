import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { ViewSkeleton } from './PilotSkeletons';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { FileText, CheckCircle, AlertTriangle } from 'lucide-react';

interface Props { classId: string | null; }

interface RbsRow {
  session_id: string;
  cards: Record<string, { evidence_id?: string; annotation?: string }[]>;
}

interface SubRow {
  session_id: string;
  final_tiktok_spend: number | null;
  final_newspaper_spend: number | null;
}

const QUADRANTS = ['descriptive', 'diagnostic', 'prescriptive', 'predictive'] as const;
const QUAD_LABELS: Record<string, string> = { descriptive: 'Descriptive', diagnostic: 'Diagnostic', prescriptive: 'Prescriptive', predictive: 'Predictive' };
const QUAD_COLORS: Record<string, string> = { descriptive: '#D4A017', diagnostic: '#C4622D', prescriptive: '#4A7C59', predictive: '#6B4F8A' };

function wc(s: string | undefined | null): number {
  if (!s || typeof s !== 'string') return 0;
  return s.trim().split(/\s+/).filter(Boolean).length;
}

function isCorrect(sub: SubRow): boolean {
  return (sub.final_tiktok_spend != null && sub.final_tiktok_spend < 9000) &&
         (sub.final_newspaper_spend != null && sub.final_newspaper_spend > 1000);
}

type Chip = { evidence_id?: string; sourceId?: string; annotation?: string; quadrant: string };

function extractChips(row: RbsRow): Chip[] {
  const chips: Chip[] = [];
  if (!row.cards || typeof row.cards !== 'object') return chips;
  for (const q of QUADRANTS) {
    const arr = row.cards[q];
    if (!Array.isArray(arr)) continue;
    for (const c of arr) {
      if (c && typeof c === 'object') chips.push({ ...c, quadrant: q });
    }
  }
  return chips;
}

export default function PilotAnnotationQuality({ classId }: Props) {
  const [rbsRows, setRbsRows] = useState<RbsRow[]>([]);
  const [subs, setSubs] = useState<SubRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      let sq = supabase.from('sessions').select('id');
      if (classId) sq = sq.eq('class_id', classId);
      const { data: sessData } = await sq;
      const ids = (sessData ?? []).map((s) => s.id);
      if (!ids.length) { if (!cancelled) { setRbsRows([]); setSubs([]); setLoading(false); } return; }

      const rbs: RbsRow[] = [];
      const subRows: SubRow[] = [];
      const fetchRbs = async () => {
        for (let i = 0; i < ids.length; i += 100) {
          const { data } = await supabase.from('reasoning_board_state').select('session_id, cards').in('session_id', ids.slice(i, i + 100));
          if (data) rbs.push(...(data as RbsRow[]));
        }
      };
      const fetchSubs = async () => {
        for (let i = 0; i < ids.length; i += 100) {
          const { data } = await supabase.from('submissions').select('session_id, final_tiktok_spend, final_newspaper_spend').in('session_id', ids.slice(i, i + 100));
          if (data) subRows.push(...(data as SubRow[]));
        }
      };
      await Promise.all([fetchRbs(), fetchSubs()]);
      if (!cancelled) { setRbsRows(rbs); setSubs(subRows); setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [classId]);

  // All annotations across all sessions
  const allAnnotations = useMemo(() => {
    const result: { session_id: string; evidence_id: string; annotation: string; quadrant: string; words: number }[] = [];
    for (const row of rbsRows) {
      for (const chip of extractChips(row)) {
        const evidenceKey = chip.evidence_id || chip.sourceId;
        if (chip.annotation && chip.annotation.trim().length > 0 && evidenceKey) {
          result.push({ session_id: row.session_id, evidence_id: evidenceKey, annotation: chip.annotation, quadrant: chip.quadrant, words: wc(chip.annotation) });
        }
      }
    }
    return result;
  }, [rbsRows]);

  // ── Metric 1: Avg annotation length
  const avgLength = useMemo(() => {
    if (!allAnnotations.length) return 0;
    return Math.round(allAnnotations.reduce((s, a) => s + a.words, 0) / allAnnotations.length);
  }, [allAnnotations]);

  // ── Metric 2: Most annotated quadrant
  const mostAnnotatedQuadrant = useMemo((): string | null => {
    if (!allAnnotations.length) return null;
    const qCounts: Record<string, number[]> = {};
    for (const q of QUADRANTS) qCounts[q] = [];
    for (const row of rbsRows) {
      const chips = extractChips(row);
      for (const q of QUADRANTS) {
        const count = chips.filter((c) => c.quadrant === q && c.annotation && c.annotation.trim().length > 0).length;
        qCounts[q].push(count);
      }
    }
    let best: string = QUADRANTS[0];
    let bestAvg = 0;
    for (const q of QUADRANTS) {
      const arr = qCounts[q];
      const avg = arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
      if (avg > bestAvg) { bestAvg = avg; best = q; }
    }
    return best;
  }, [allAnnotations, rbsRows]);

  // ── Metric 3: Students with 3+ annotations
  const pctThreePlus = useMemo(() => {
    if (!rbsRows.length) return 0;
    const sessAnnCounts = new Map<string, number>();
    for (const a of allAnnotations) {
      sessAnnCounts.set(a.session_id, (sessAnnCounts.get(a.session_id) ?? 0) + 1);
    }
    const threePlus = [...sessAnnCounts.values()].filter((c) => c >= 3).length;
    return Math.round((threePlus / rbsRows.length) * 100);
  }, [allAnnotations, rbsRows]);

  // ── Chart 1: Most annotated evidence items
  const topEvidence = useMemo(() => {
    const counts = new Map<string, number>();
    for (const a of allAnnotations) {
      counts.set(a.evidence_id, (counts.get(a.evidence_id) ?? 0) + 1);
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([id, count]) => ({ evidence_id: id, count }));
  }, [allAnnotations]);

  // ── Chart 2: Annotation completeness vs correct decision
  const completenessData = useMemo(() => {
    const subMap = new Map(subs.map((s) => [s.session_id, s]));
    const sessAnnCounts = new Map<string, number>();
    for (const row of rbsRows) sessAnnCounts.set(row.session_id, 0);
    for (const a of allAnnotations) sessAnnCounts.set(a.session_id, (sessAnnCounts.get(a.session_id) ?? 0) + 1);

    const groups = [
      { label: '0 annotations', filter: (c: number) => c === 0, fill: '#888780' },
      { label: '1-2 annotations', filter: (c: number) => c >= 1 && c <= 2, fill: '#D4A017' },
      { label: '3+ annotations', filter: (c: number) => c >= 3, fill: '#4A7C59' },
    ];

    return groups.map((g) => {
      const sessionIds = [...sessAnnCounts.entries()].filter(([, c]) => g.filter(c)).map(([sid]) => sid);
      const withSub = sessionIds.filter((sid) => subMap.has(sid));
      const correct = withSub.filter((sid) => isCorrect(subMap.get(sid)!)).length;
      const rate = withSub.length > 0 ? Math.round((correct / withSub.length) * 100) : 0;
      return { group: g.label, rate, fill: g.fill, n: withSub.length };
    });
  }, [rbsRows, allAnnotations, subs]);

  const threePlusRate = completenessData.find((d) => d.group === '3+ annotations')?.rate ?? 0;
  const zeroRate = completenessData.find((d) => d.group === '0 annotations')?.rate ?? 0;
  const oneToTwoRate = completenessData.find((d) => d.group === '1-2 annotations')?.rate ?? 0;
  const threePlusHighest = threePlusRate > zeroRate && threePlusRate > oneToTwoRate;
  const ratesFlat = Math.abs(threePlusRate - zeroRate) <= 10 && Math.abs(threePlusRate - oneToTwoRate) <= 10;

  // ── Chart 3: Avg annotation length by quadrant
  const quadLengthData = useMemo(() => {
    return QUADRANTS.map((q) => {
      const qAnns = allAnnotations.filter((a) => a.quadrant === q);
      const avg = qAnns.length > 0 ? Math.round(qAnns.reduce((s, a) => s + a.words, 0) / qAnns.length) : 0;
      return { quadrant: QUAD_LABELS[q], avg, fill: QUAD_COLORS[q] };
    });
  }, [allAnnotations]);

  if (loading) return <ViewSkeleton metrics charts={3} />;

  if (!rbsRows.length) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-12 text-center">
          <FileText className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No reasoning board data available. Annotation quality metrics will populate once students use the simulation.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── METRIC CARDS ── */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="py-4 text-center">
            <FileText className="h-5 w-5 mx-auto mb-2" style={{ color: '#6B4F8A' }} />
            <p className="text-2xl font-bold" style={{ color: '#6B4F8A' }}>{avgLength} words avg</p>
            <p className="text-xs text-muted-foreground mt-1">Avg annotation length</p>
            <p className="text-[10px] text-muted-foreground">{allAnnotations.length} total annotations</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 text-center">
            {mostAnnotatedQuadrant ? (
              <>
                <div className="w-5 h-5 rounded-full mx-auto mb-2" style={{ backgroundColor: QUAD_COLORS[mostAnnotatedQuadrant] }} />
                <p className="text-2xl font-bold" style={{ color: QUAD_COLORS[mostAnnotatedQuadrant] }}>{QUAD_LABELS[mostAnnotatedQuadrant]}</p>
              </>
            ) : (
              <p className="text-2xl font-bold text-muted-foreground">—</p>
            )}
            <p className="text-xs text-muted-foreground mt-1">Most annotated quadrant</p>
            <p className="text-[10px] text-muted-foreground">highest avg annotations per student</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 text-center">
            <CheckCircle className="h-5 w-5 mx-auto mb-2" style={{ color: '#4A7C59' }} />
            <p className="text-2xl font-bold" style={{ color: '#4A7C59' }}>{pctThreePlus}%</p>
            <p className="text-xs text-muted-foreground mt-1">Students with 3+ annotations</p>
            <p className="text-[10px] text-muted-foreground">depth of engagement</p>
          </CardContent>
        </Card>
      </div>

      {/* ── CHART 1: Most annotated evidence ── */}
      <Card>
        <CardContent className="pt-5 pb-4">
          <h3 className="text-sm font-semibold text-foreground mb-1">Most annotated evidence items</h3>
          <p className="text-[10px] text-muted-foreground mb-4">These are the data points students felt needed explanation</p>
          {topEvidence.length === 0 ? (
            <p className="text-xs text-muted-foreground py-8 text-center">No annotations found.</p>
          ) : (
            <div style={{ height: topEvidence.length * 40 + 80 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topEvidence} layout="vertical" barCategoryGap="20%">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis dataKey="evidence_id" type="category" tick={{ fontSize: 10 }} width={160} />
                  <Tooltip formatter={(v: number) => `${v} annotations`} />
                  <Bar dataKey="count" name="Annotations" fill="#6B4F8A" radius={[0, 3, 3, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── CHART 2: Annotation completeness vs correct decision ── */}
      <Card>
        <CardContent className="pt-5 pb-4">
          <h3 className="text-sm font-semibold text-foreground mb-4">Does annotating more chips lead to better decisions?</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={completenessData} barCategoryGap="25%">
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis dataKey="group" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={(v: number) => `${v}%`} tick={{ fontSize: 11 }} width={40} domain={[0, 100]} />
              <Tooltip formatter={(v: number) => `${v}%`} />
              <Bar dataKey="rate" name="Correct decision %" radius={[3, 3, 0, 0]}>
                {completenessData.map((d, i) => <Cell key={i} fill={d.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <p className="text-[10px] text-muted-foreground mt-3 text-center">
            0 annotations: {zeroRate}% (n={completenessData[0]?.n ?? 0}) · 1–2: {oneToTwoRate}% (n={completenessData[1]?.n ?? 0}) · 3+: {threePlusRate}% (n={completenessData[2]?.n ?? 0})
          </p>
          {threePlusHighest && (
            <div className="flex items-start gap-2 mt-3 p-3 rounded-md bg-[#4A7C59]/10 border border-[#4A7C59]/20">
              <CheckCircle className="h-4 w-4 shrink-0 mt-0.5" style={{ color: '#4A7C59' }} />
              <p className="text-xs" style={{ color: '#4A7C59' }}>Students who annotated 3+ chips had the highest correct decision rate — annotations correlate with better reasoning.</p>
            </div>
          )}
          {ratesFlat && !threePlusHighest && (
            <div className="flex items-start gap-2 mt-3 p-3 rounded-md bg-amber-50 border border-amber-200">
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800">Annotation count is not correlated with correct decisions — consider whether annotation quality matters more than quantity.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── CHART 3: Avg annotation length by quadrant ── */}
      <Card>
        <CardContent className="pt-5 pb-4">
          <h3 className="text-sm font-semibold text-foreground mb-1">Where do students write the most?</h3>
          <p className="text-[10px] text-muted-foreground mb-4">Longer annotations suggest more uncertainty or more complex reasoning in that step</p>
          <div style={{ height: 180 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={quadLengthData} barCategoryGap="25%">
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="quadrant" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} width={35} />
                <Tooltip formatter={(v: number) => `${v} words`} />
                <Bar dataKey="avg" name="Avg words" radius={[3, 3, 0, 0]}>
                  {quadLengthData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}