import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { ViewSkeleton, EmptyState } from './PilotSkeletons';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import { AlertTriangle } from 'lucide-react';

interface Props {
  classId: string | null;
}

interface SubRow {
  final_tiktok_spend: number | null;
  final_instagram_spend: number | null;
  final_facebook_spend: number | null;
  final_newspaper_spend: number | null;
}

interface AllocEvent {
  session_id: string;
  channel: string;
  previous_value: number | null;
  new_value: number | null;
}

const DEFAULTS = { tiktok: 9000, instagram: 5500, facebook: 4500, newspaper: 1000 };

const CHANNELS = ['tiktok', 'instagram', 'facebook', 'newspaper'] as const;
const CHANNEL_LABELS: Record<string, string> = {
  tiktok: 'TikTok', instagram: 'Instagram', facebook: 'Facebook', newspaper: 'Newspaper',
};

async function getSessionIds(classId: string | null): Promise<string[]> {
  let q = supabase.from('sessions').select('id');
  if (classId) q = q.eq('class_id', classId);
  const { data } = await q;
  return (data ?? []).map((s) => s.id);
}

async function fetchSubs(sessionIds: string[]): Promise<SubRow[]> {
  if (!sessionIds.length) return [];
  const rows: SubRow[] = [];
  for (let i = 0; i < sessionIds.length; i += 100) {
    const chunk = sessionIds.slice(i, i + 100);
    const { data } = await supabase
      .from('submissions')
      .select('final_tiktok_spend, final_instagram_spend, final_facebook_spend, final_newspaper_spend')
      .in('session_id', chunk);
    if (data) rows.push(...(data as SubRow[]));
  }
  return rows;
}

async function fetchAllocEvents(sessionIds: string[]): Promise<AllocEvent[]> {
  if (!sessionIds.length) return [];
  const rows: AllocEvent[] = [];
  for (let i = 0; i < sessionIds.length; i += 100) {
    const chunk = sessionIds.slice(i, i + 100);
    const { data } = await supabase
      .from('allocation_events')
      .select('session_id, channel, previous_value, new_value')
      .in('session_id', chunk);
    if (data) rows.push(...(data as AllocEvent[]));
  }
  return rows;
}

type Category = 'fully' | 'partial' | 'incorrect' | 'nochange';

function categorize(r: SubRow): Category {
  const tk = r.final_tiktok_spend ?? DEFAULTS.tiktok;
  const ig = r.final_instagram_spend ?? DEFAULTS.instagram;
  const fb = r.final_facebook_spend ?? DEFAULTS.facebook;
  const np = r.final_newspaper_spend ?? DEFAULTS.newspaper;

  const isDefault = tk === DEFAULTS.tiktok && ig === DEFAULTS.instagram && fb === DEFAULTS.facebook && np === DEFAULTS.newspaper;
  if (isDefault) return 'nochange';

  const reducedTiktok = tk <= 9000;
  const increasedNewspaper = np >= 1000;
  if (reducedTiktok && increasedNewspaper) return 'fully';
  if (reducedTiktok || increasedNewspaper) return 'partial';
  return 'incorrect';
}

const DONUT_SEGMENTS: { key: Category; label: string; color: string }[] = [
  { key: 'fully', label: 'Fully correct', color: '#4A7C59' },
  { key: 'partial', label: 'Partially correct', color: '#D4A017' },
  { key: 'incorrect', label: 'Incorrect', color: '#C4622D' },
  { key: 'nochange', label: 'No change', color: '#888780' },
];

function bucketLabel(count: number): string {
  if (count === 0) return '0';
  if (count <= 2) return '1-2';
  if (count <= 5) return '3-5';
  if (count <= 9) return '6-9';
  return '10+';
}

const BUCKET_ORDER = ['0', '1-2', '3-5', '6-9', '10+'];

export default function PilotAllocationDecisions({ classId }: Props) {
  const [subs, setSubs] = useState<SubRow[]>([]);
  const [allocEvents, setAllocEvents] = useState<AllocEvent[]>([]);
  const [sessionIds, setSessionIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const ids = await getSessionIds(classId);
      const [subData, allocData] = await Promise.all([fetchSubs(ids), fetchAllocEvents(ids)]);
      if (!cancelled) {
        setSessionIds(ids);
        setSubs(subData);
        setAllocEvents(allocData);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [classId]);

  const counts = useMemo(() => {
    const c = { fully: 0, partial: 0, incorrect: 0, nochange: 0 };
    subs.forEach((r) => { c[categorize(r)]++; });
    return c;
  }, [subs]);

  const total = subs.length;
  const pct = (n: number) => (total > 0 ? ((n / total) * 100).toFixed(1) : '0');
  const correctRate = total > 0 ? ((counts.fully / total) * 100).toFixed(0) : '0';

  const donutData = DONUT_SEGMENTS.map((s) => ({ name: s.label, value: counts[s.key], color: s.color }));

  const avgSpend = useMemo(() => {
    if (!total) return { tiktok: 0, instagram: 0, facebook: 0, newspaper: 0 };
    const sum = { tiktok: 0, instagram: 0, facebook: 0, newspaper: 0 };
    subs.forEach((r) => {
      sum.tiktok += r.final_tiktok_spend ?? DEFAULTS.tiktok;
      sum.instagram += r.final_instagram_spend ?? DEFAULTS.instagram;
      sum.facebook += r.final_facebook_spend ?? DEFAULTS.facebook;
      sum.newspaper += r.final_newspaper_spend ?? DEFAULTS.newspaper;
    });
    return {
      tiktok: Math.round(sum.tiktok / total),
      instagram: Math.round(sum.instagram / total),
      facebook: Math.round(sum.facebook / total),
      newspaper: Math.round(sum.newspaper / total),
    };
  }, [subs, total]);

  const barData = [
    { channel: 'TikTok', default: DEFAULTS.tiktok, avg: avgSpend.tiktok },
    { channel: 'Instagram', default: DEFAULTS.instagram, avg: avgSpend.instagram },
    { channel: 'Facebook', default: DEFAULTS.facebook, avg: avgSpend.facebook },
    { channel: 'Newspaper', default: DEFAULTS.newspaper, avg: avgSpend.newspaper },
  ];

  /* ── histogram data ──────────────────────────── */
  const histogramData = useMemo(() => {
    const perSession: Record<string, number> = {};
    sessionIds.forEach((id) => { perSession[id] = 0; });
    allocEvents.forEach((e) => { perSession[e.session_id] = (perSession[e.session_id] ?? 0) + 1; });
    const buckets: Record<string, number> = {};
    BUCKET_ORDER.forEach((b) => { buckets[b] = 0; });
    Object.values(perSession).forEach((cnt) => { buckets[bucketLabel(cnt)]++; });
    return BUCKET_ORDER.map((b) => ({ bucket: b, count: buckets[b] }));
  }, [allocEvents, sessionIds]);

  const zeroChangeSessions = histogramData.find((d) => d.bucket === '0')?.count ?? 0;

  /* ── per-channel direction ───────────────────── */
  const channelDirection = useMemo(() => {
    const result: Record<string, { increases: number; decreases: number }> = {};
    CHANNELS.forEach((ch) => { result[ch] = { increases: 0, decreases: 0 }; });
    allocEvents.forEach((e) => {
      const ch = e.channel.toLowerCase();
      if (!result[ch]) return;
      const prev = e.previous_value ?? 0;
      const next = e.new_value ?? 0;
      if (next > prev) result[ch].increases++;
      else if (next < prev) result[ch].decreases++;
    });
    return result;
  }, [allocEvents]);

  if (loading) {
    return <ViewSkeleton metrics charts={2} />;
  }

  if (total === 0) {
    return <EmptyState message="No data yet — this will populate once students start using the simulation." />;
  }

  return (
    <div className="space-y-6">
      {/* ── HEADLINE ─────────────────────────────── */}
      <Card className="border-0 bg-[#6B4F8A]/10">
        <CardContent className="py-8 text-center">
          <p className="text-[56px] font-bold leading-none" style={{ color: '#6B4F8A' }}>
            {correctRate}%
          </p>
          <p className="text-sm font-medium text-foreground mt-2">correct decision rate</p>
          <p className="text-xs text-muted-foreground mt-1">
            {counts.fully} of {total} completers reduced TikTok AND increased Newspaper vs. default
          </p>
        </CardContent>
      </Card>

      {/* ── 4 METRIC CARDS ───────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {DONUT_SEGMENTS.map((seg) => (
          <Card key={seg.key}>
            <CardContent className="py-4 text-center">
              <p className="text-2xl font-bold" style={{ color: seg.color }}>
                {pct(counts[seg.key])}%
              </p>
              <p className="text-xs text-muted-foreground mt-1">{seg.label}</p>
              <p className="text-[10px] text-muted-foreground">{counts[seg.key]} student{counts[seg.key] !== 1 ? 's' : ''}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── TWO CHARTS ───────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Donut */}
        <Card>
          <CardContent className="pt-5 pb-4">
            <h3 className="text-sm font-semibold text-foreground mb-4">Decision outcomes</h3>
            <div className="flex justify-center">
              <PieChart width={220} height={220}>
                <Pie
                  data={donutData}
                  dataKey="value"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={95}
                  paddingAngle={2}
                  stroke="none"
                >
                  {donutData.map((d, i) => (
                    <Cell key={i} fill={d.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => `${v} (${total > 0 ? ((v / total) * 100).toFixed(0) : 0}%)`} />
              </PieChart>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-3">
              {donutData.map((d) => (
                <div key={d.name} className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: d.color }} />
                  <span>{d.name}: {d.value} ({total > 0 ? ((d.value / total) * 100).toFixed(0) : 0}%)</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Grouped bar */}
        <Card>
          <CardContent className="pt-5 pb-4">
            <h3 className="text-sm font-semibold text-foreground mb-4">Default vs. class average allocation</h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={barData} barCategoryGap="20%">
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="channel" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} width={45} />
                <Tooltip formatter={(v: number) => `$${v.toLocaleString()}`} />
                <Bar dataKey="default" name="Default" fill="#888780" radius={[3, 3, 0, 0]} />
                <Bar dataKey="avg" name="Class average" fill="#6B4F8A" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <div className="flex items-center gap-4 mt-3 justify-center">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: '#888780' }} />
                Default
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: '#6B4F8A' }} />
                Class average
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── ALLOCATION CHANGES HISTOGRAM ─────────── */}
      <Card>
        <CardContent className="pt-5 pb-4">
          <h3 className="text-sm font-semibold text-foreground mb-4">How many allocation changes did students make?</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={histogramData} barCategoryGap="25%">
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis dataKey="bucket" tick={{ fontSize: 11 }} label={{ value: 'Changes per session', position: 'insideBottom', offset: -2, fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={35} />
              <Tooltip formatter={(v: number) => `${v} session${v !== 1 ? 's' : ''}`} />
              <Bar dataKey="count" fill="#6B4F8A" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          {zeroChangeSessions > 0 && (
            <div className="flex items-start gap-2 mt-3 p-3 rounded-md bg-amber-50 border border-amber-200">
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800">
                {zeroChangeSessions} student{zeroChangeSessions !== 1 ? 's' : ''} submitted with 0 changes (never adjusted the budget)
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── PER-CHANNEL DIRECTION ANALYSIS ────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {CHANNELS.map((ch) => {
          const d = channelDirection[ch];
          const maxVal = Math.max(d.increases, d.decreases, 1);
          const showTiktokFlag = ch === 'tiktok' && d.increases > d.decreases;
          const showNewspaperFlag = ch === 'newspaper' && d.decreases > d.increases;
          return (
            <Card key={ch}>
              <CardContent className="py-4">
                <h4 className="text-xs font-semibold text-foreground mb-3">{CHANNEL_LABELS[ch]}</h4>
                {/* mini bars */}
                <div className="space-y-2">
                  <div>
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-0.5">
                      <span>Decreases</span>
                      <span>{d.decreases}</span>
                    </div>
                    <div className="h-4 bg-muted/30 rounded overflow-hidden">
                      <div
                        className="h-full rounded"
                        style={{ width: `${(d.decreases / maxVal) * 100}%`, backgroundColor: '#C4622D' }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-0.5">
                      <span>Increases</span>
                      <span>{d.increases}</span>
                    </div>
                    <div className="h-4 bg-muted/30 rounded overflow-hidden">
                      <div
                        className="h-full rounded"
                        style={{ width: `${(d.increases / maxVal) * 100}%`, backgroundColor: '#4A7C59' }}
                      />
                    </div>
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground mt-2">
                  {d.decreases} decrease{d.decreases !== 1 ? 's' : ''} / {d.increases} increase{d.increases !== 1 ? 's' : ''} across all sessions
                </p>
                {showTiktokFlag && (
                  <div className="flex items-start gap-1.5 mt-2 p-2 rounded bg-amber-50 border border-amber-200">
                    <AlertTriangle className="h-3 w-3 text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-[10px] text-amber-800">More students increased TikTok than decreased it — students may have misread the data.</p>
                  </div>
                )}
                {showNewspaperFlag && (
                  <div className="flex items-start gap-1.5 mt-2 p-2 rounded bg-amber-50 border border-amber-200">
                    <AlertTriangle className="h-3 w-3 text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-[10px] text-amber-800">More students decreased Newspaper than increased it.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}