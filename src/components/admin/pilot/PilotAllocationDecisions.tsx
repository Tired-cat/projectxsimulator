import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';

interface Props {
  classId: string | null;
}

interface SubRow {
  final_tiktok_spend: number | null;
  final_instagram_spend: number | null;
  final_facebook_spend: number | null;
  final_newspaper_spend: number | null;
}

const DEFAULTS = { tiktok: 9000, instagram: 5500, facebook: 4500, newspaper: 1000 };

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

type Category = 'fully' | 'partial' | 'incorrect' | 'nochange';

function categorize(r: SubRow): Category {
  const tk = r.final_tiktok_spend ?? DEFAULTS.tiktok;
  const ig = r.final_instagram_spend ?? DEFAULTS.instagram;
  const fb = r.final_facebook_spend ?? DEFAULTS.facebook;
  const np = r.final_newspaper_spend ?? DEFAULTS.newspaper;

  const isDefault = tk === DEFAULTS.tiktok && ig === DEFAULTS.instagram && fb === DEFAULTS.facebook && np === DEFAULTS.newspaper;
  if (isDefault) return 'nochange';

  const reducedTiktok = tk < 9000;
  const increasedNewspaper = np > 1000;
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

export default function PilotAllocationDecisions({ classId }: Props) {
  const [subs, setSubs] = useState<SubRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const ids = await getSessionIds(classId);
      const data = await fetchSubs(ids);
      if (!cancelled) { setSubs(data); setLoading(false); }
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

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-sm text-muted-foreground">Loading allocation data…</div>;
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
            {/* legend */}
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
            {/* legend */}
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
    </div>
  );
}
