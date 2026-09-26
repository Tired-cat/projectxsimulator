import { supabase } from '@/integrations/supabase/client';

const PAGE = 1000;
const QUADS = ['descriptive', 'diagnostic', 'prescriptive', 'predictive'] as const;

async function fetchAll(table: string, filter?: (q: any) => any) {
  const rows: any[] = [];
  for (let from = 0; ; from += PAGE) {
    let q = (supabase.from as any)(table).select('*').range(from, from + PAGE - 1);
    if (filter) q = filter(q);
    const { data, error } = await q;
    if (error) throw new Error(`${table}: ${error.message}`);
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE) break;
  }
  return rows;
}

async function bySessions(table: string, ids: string[]) {
  const rows: any[] = [];
  for (let i = 0; i < ids.length; i += 200) {
    const chunk = ids.slice(i, i + 200);
    rows.push(...(await fetchAll(table, (q) => q.in('session_id', chunk))));
  }
  return rows;
}

const pct = (n: number, d: number) => (d > 0 ? +((n / d) * 100).toFixed(1) : 0);
const minutesBetween = (a: string, b: string) => (new Date(b).getTime() - new Date(a).getTime()) / 60000;
const avg = (xs: number[]) => (xs.length ? +(xs.reduce((a, b) => a + b, 0) / xs.length).toFixed(1) : null);
const groupBy = <T,>(rows: T[], key: (r: T) => string) => {
  const m = new Map<string, T[]>();
  rows.forEach((r) => { const k = key(r); if (!m.has(k)) m.set(k, []); m.get(k)!.push(r); });
  return m;
};

function chipsOf(cards: any): any[] {
  if (!cards || typeof cards !== 'object') return [];
  if (Array.isArray(cards)) return cards;
  const out: any[] = [];
  for (const [q, arr] of Object.entries(cards)) if (Array.isArray(arr)) arr.forEach((c: any) => out.push({ ...c, _quadrant: q }));
  return out;
}
const hasAnno = (c: any) => c && typeof c.annotation === 'string' && c.annotation.trim().length > 0;

function tableDecision(sub: any): string | null {
  if (!sub) return null;
  const tkCorrect = (sub.final_tiktok_spend ?? 9000) <= 9000;
  const npCorrect = (sub.final_newspaper_spend ?? 1000) >= 1000;
  const tkDefault = sub.final_tiktok_spend === 9000 || sub.final_tiktok_spend == null;
  const npDefault = sub.final_newspaper_spend === 1000 || sub.final_newspaper_spend == null;
  if (tkCorrect && npCorrect) return 'Correct';
  if (tkDefault && npDefault) return 'No change';
  if (tkCorrect || npCorrect) return 'Partial';
  return 'Incorrect';
}

function getStatus(p: number, t: number, invert?: boolean) {
  if (invert) return p < t ? 'Confirmed' : p < t + 5 ? 'Borderline' : 'Under threshold';
  return p > t ? 'Confirmed' : p >= t - 5 ? 'Borderline' : 'Under threshold';
}

const DURATION_BUCKETS = ['<20m', '20-30m', '30-45m', '45-60m', '60-90m', '90+m'];
const bucket = (m: number) => (m < 20 ? '<20m' : m < 30 ? '20-30m' : m < 45 ? '30-45m' : m < 60 ? '45-60m' : m < 90 ? '60-90m' : '90+m');
const TAB_LABEL: Record<string, string> = {
  home: 'Home', my_decisions: 'My Decisions', decisions: 'My Decisions', reasoning_board: 'Reasoning Board', reasoning: 'Reasoning Board',
};

function cell(v: any) {
  if (v === null || v === undefined) return '';
  const s = typeof v === 'object' ? JSON.stringify(v) : v;
  return typeof s === 'string' && s.length > 32000 ? s.slice(0, 32000) + '…' : s;
}

export async function downloadPresentedPilotData(classId: string | null, label: string) {
  const XLSX = await import('xlsx');

  const sessions = await fetchAll('sessions', classId ? (q) => q.eq('class_id', classId) : undefined);
  const enrollments = await fetchAll('student_enrollments', classId ? (q) => q.eq('class_id', classId) : undefined);
  const profiles = await fetchAll('profiles');
  const emailOf = new Map(profiles.map((p) => [p.id, p.email ?? '']));
  const ids = sessions.map((s) => s.id);
  const [subs, refl, boards, ai, alloc, bevents, nav, tut, resets] = ids.length
    ? await Promise.all(['submissions', 'post_simulation_reflections', 'reasoning_board_state', 'ai_feedback_events', 'allocation_events', 'board_events', 'navigation_events', 'tutorial_events', 'resets'].map((t) => bySessions(t, ids)))
    : [[], [], [], [], [], [], [], [], []];

  const subBy = new Map(subs.map((s) => [s.session_id, s]));
  const reflBy = new Map(refl.map((r) => [r.session_id, r]));
  const boardBy = new Map(boards.map((b) => [b.session_id, b]));
  const aiBy = groupBy(ai, (r: any) => r.session_id);
  const allocBy = groupBy(alloc, (r: any) => r.session_id);
  const bevBy = groupBy(bevents, (r: any) => r.session_id);
  const navBy = groupBy(nav, (r: any) => r.session_id);
  const resetBy = groupBy(resets, (r: any) => r.session_id);
  const total = sessions.length;
  const totalSubs = subBy.size;

  const sheets: Record<string, any[][]> = {};
  const add = (name: string, ...blocks: [string, any[]][]) => {
    const aoa: any[][] = [[`${name} — ${label}`], [`Generated ${new Date().toLocaleString()}`], []];
    for (const [title, rows] of blocks) {
      aoa.push([title]);
      if (!rows.length) aoa.push(['No data']);
      else {
        const cols = Object.keys(rows[0]);
        aoa.push(cols);
        rows.forEach((r) => aoa.push(cols.map((c) => cell(r[c]))));
      }
      aoa.push([]);
    }
    sheets[name] = aoa;
  };

  // ── Pilot health
  const completed = sessions.filter((s) => s.is_completed);
  const durations = completed.filter((s) => s.completed_at && s.started_at).map((s) => minutesBetween(s.started_at, s.completed_at));
  const distinct = (rows: any[]) => new Set(rows.map((r) => r.session_id)).size;
  const reasoningVisited = new Set([
    ...nav.filter((n) => n.tab === 'reasoning').map((n) => n.session_id),
    ...bevents.filter((b) => b.event_type === 'drag_to_board').map((b) => b.session_id),
  ]);
  const annotatedSessions = new Set(boards.filter((b) => chipsOf(b.cards).some(hasAnno)).map((b) => b.session_id));
  const enrolledCount = enrollments.length;
  const funnel = [
    ['Enrolled', enrolledCount],
    ['Session started', total],
    ['Visited My Decisions', distinct(nav.filter((n) => n.tab === 'decisions'))],
    ['Made allocation change', distinct(alloc)],
    ['Visited Reasoning Board', reasoningVisited.size],
    ['Placed ≥1 card', distinct(bevents.filter((b) => b.event_type === 'drag_to_board'))],
    ['Added ≥1 annotation', annotatedSessions.size],
    ['Requested AI feedback', distinct(ai)],
    ['Submitted', subs.length],
  ].map(([step, count]) => ({ Step: step, Students: count, '% of enrolled': pct(count as number, enrolledCount) }));
  const abandon: Record<string, number> = { Home: 0, 'My Decisions': 0, 'Reasoning Board': 0, 'Never navigated': 0 };
  sessions.filter((s) => !s.is_completed).forEach((s) => {
    const last = [...(navBy.get(s.id) ?? [])].sort((a, b) => (a.entered_at < b.entered_at ? 1 : -1))[0];
    const l = last ? TAB_LABEL[last.tab] ?? last.tab : 'Never navigated';
    abandon[l] = (abandon[l] ?? 0) + 1;
  });
  add('Pilot health',
    ['Stat cards', [
      { Metric: 'Enrolled students', Value: enrolledCount },
      { Metric: 'Sessions started', Value: total },
      { Metric: 'Completed sessions', Value: completed.length, Note: `${pct(completed.length, total)}% completion` },
      { Metric: 'Avg duration (min)', Value: avg(durations) ?? '—' },
      { Metric: 'Submissions', Value: subs.length },
    ]],
    ['Engagement funnel', funnel],
    ['Duration distribution', DURATION_BUCKETS.map((b) => ({ Bucket: b, Sessions: durations.filter((d) => bucket(d) === b).length }))],
    ['Where incomplete sessions stopped', Object.entries(abandon).filter(([, c]) => c > 0).map(([Tab, Sessions]) => ({ Tab, Sessions }))],
  );

  // ── Reasoning board
  const quadStats = QUADS.map((q) => {
    const counts = subs.map((s) => s[`${q}_card_count`] ?? 0);
    return { Quadrant: q, 'Total cards': counts.reduce((a, b) => a + b, 0), 'Avg per submission': avg(counts) ?? 0, 'Submissions with ≥1': counts.filter((c) => c > 0).length, '% empty': pct(counts.filter((c) => c === 0).length, counts.length) };
  });
  const evCounts = new Map<string, { n: number; quads: Record<string, number> }>();
  bevents.filter((b) => b.event_type === 'drag_to_board' && b.evidence_id).forEach((b) => {
    const e = evCounts.get(b.evidence_id) ?? { n: 0, quads: {} };
    e.n++; e.quads[b.quadrant ?? '—'] = (e.quads[b.quadrant ?? '—'] ?? 0) + 1;
    evCounts.set(b.evidence_id, e);
  });
  const firsts = new Map<string, any>();
  bevents.filter((b) => b.event_type === 'drag_to_board').forEach((b) => {
    const ex = firsts.get(b.session_id);
    if (!ex || (b.sequence_number ?? 1e9) < (ex.sequence_number ?? 1e9)) firsts.set(b.session_id, b);
  });
  const firstCounts = groupBy([...firsts.values()], (b: any) => b.evidence_id ?? '—');
  add('Reasoning board',
    ['Quadrant usage (from submissions)', quadStats],
    ['Filled quadrants per submission', [0, 1, 2, 3, 4].map((n) => ({ 'Quadrants filled': n, Submissions: subs.filter((s) => QUADS.filter((q) => (s[`${q}_card_count`] ?? 0) > 0).length === n).length }))],
    ['Evidence dragged to board', [...evCounts.entries()].sort((a, b) => b[1].n - a[1].n).map(([id, e]) => ({ Evidence: id, Drags: e.n, 'By quadrant': Object.entries(e.quads).map(([q, n]) => `${q}: ${n}`).join(', ') }))],
    ['First item dragged', [...firstCounts.entries()].map(([Evidence, r]) => ({ Evidence, Students: r.length }))],
    ['Board resets', [{ 'Sessions with reset': resetBy.size, 'Total resets': resets.length }]],
  );

  // ── Annotation quality
  const allChips = boards.flatMap((b) => chipsOf(b.cards).map((c) => ({ ...c, session_id: b.session_id })));
  const annoPerSession = boards.map((b) => chipsOf(b.cards).filter(hasAnno).length);
  add('Annotation quality',
    ['Summary', [
      { Metric: 'Boards', Value: boards.length },
      { Metric: 'Chips on boards', Value: allChips.length },
      { Metric: 'Chips with annotation', Value: allChips.filter(hasAnno).length, Note: `${pct(allChips.filter(hasAnno).length, allChips.length)}%` },
      { Metric: 'Boards with ≥1 annotation', Value: annotatedSessions.size },
      { Metric: 'Avg annotations per board', Value: avg(annoPerSession) ?? 0 },
      { Metric: 'Avg annotation length (words)', Value: avg(allChips.filter(hasAnno).map((c) => c.annotation.trim().split(/\s+/).length)) ?? 0 },
    ]],
    ['By quadrant', QUADS.map((q) => { const cs = allChips.filter((c) => c._quadrant === q); return { Quadrant: q, Chips: cs.length, Annotated: cs.filter(hasAnno).length, '% annotated': pct(cs.filter(hasAnno).length, cs.length) }; })],
    ['Annotations per board', [0, 1, 2, 3, 4, 5].map((n) => ({ Annotations: n === 5 ? '5+' : n, Boards: annoPerSession.filter((a) => (n === 5 ? a >= 5 : a === n)).length }))],
    ['All annotations', allChips.filter(hasAnno).map((c) => ({ Student: emailOf.get(sessions.find((s) => s.id === c.session_id)?.user_id) ?? '', Quadrant: c._quadrant, Evidence: c.label ?? c.id ?? '', Annotation: c.annotation, 'Decision (table rule)': tableDecision(subBy.get(c.session_id)) ?? '—' }))],
  );

  // ── Allocation decisions
  const ch = ['tiktok', 'instagram', 'facebook', 'newspaper'];
  const decCounts = groupBy(subs, (s: any) => tableDecision(s) ?? '—');
  add('Allocation decisions',
    ['Decision outcomes', [...decCounts.entries()].map(([Outcome, r]) => ({ Outcome, Submissions: r.length, '%': pct(r.length, subs.length) }))],
    ['Final spend by channel', ch.map((c) => { const v = subs.map((s) => s[`final_${c}_spend`]).filter((x) => x != null); return { Channel: c, 'Avg ($)': avg(v) ?? 0, 'Min ($)': v.length ? Math.min(...v) : '', 'Max ($)': v.length ? Math.max(...v) : '' }; })],
    ['Allocation changes per session', [{ 'Total changes': alloc.length, 'Sessions with changes': allocBy.size, 'Avg per session': avg(sessions.map((s) => allocBy.get(s.id)?.length ?? 0)) ?? 0 }]],
    ['Changes by channel', ch.map((c) => ({ Channel: c, Changes: alloc.filter((a) => a.channel?.toLowerCase().includes(c)).length }))],
  );

  // ── Feature usage
  const productMix = new Set(bevents.filter((b) => b.evidence_type === 'product_mix').map((b) => b.session_id));
  add('Feature usage', ['Features', [
    ['Tutorial opened', sessions.filter((s) => s.tutorial_opened).length],
    ['Tutorial completed', sessions.filter((s) => s.tutorial_completed).length],
    ['Used product mix evidence', productMix.size],
    ['Placed ≥1 card', distinct(bevents.filter((b) => b.event_type === 'drag_to_board'))],
    ['Added annotation', annotatedSessions.size],
    ['Wrote diagnosis', boards.filter((b) => b.written_diagnosis?.trim()).length],
    ['Requested AI feedback', aiBy.size],
    ['Made allocation change', allocBy.size],
    ['Submitted', totalSubs],
    ['Completed reflection', reflBy.size],
    ['Reported using outside AI', refl.filter((r) => r.used_ai).length],
  ].map(([Feature, n]) => ({ Feature, Sessions: n, '% of sessions': pct(n as number, total) }))]);

  // ── AI feedback
  const actions = groupBy(ai, (r: any) => r.post_feedback_action ?? 'none');
  const changedAfter = ai.filter((r) => QUADS.some((q) => r[`${q}_cards_after`] != null && r[`${q}_cards_after`] !== r[`${q}_cards_before`]) || (r.tiktok_spend_after != null && r.tiktok_spend_after !== r.tiktok_spend_before) || (r.newspaper_spend_after != null && r.newspaper_spend_after !== r.newspaper_spend_before));
  add('AI feedback',
    ['Summary', [
      { Metric: 'Feedback requests', Value: ai.length },
      { Metric: 'Sessions that requested', Value: aiBy.size, Note: `${pct(aiBy.size, total)}% of sessions` },
      { Metric: 'Requests followed by a change', Value: changedAfter.length, Note: `${pct(changedAfter.length, ai.length)}%` },
      { Metric: 'Avg time adjusting (s)', Value: avg(ai.map((r) => r.time_adjusting_seconds).filter((x) => x != null)) ?? '—' },
    ]],
    ['Action after feedback', [...actions.entries()].map(([Action, r]) => ({ Action, Count: r.length }))],
    ['Before → after per request', ai.map((r) => ({
      Student: emailOf.get(r.user_id) ?? '', Round: r.feedback_round, Action: r.post_feedback_action ?? '',
      ...Object.fromEntries(QUADS.map((q) => [q, `${r[`${q}_cards_before`] ?? ''} → ${r[`${q}_cards_after`] ?? ''}`])),
      TikTok: `${r.tiktok_spend_before ?? ''} → ${r.tiktok_spend_after ?? ''}`, Newspaper: `${r.newspaper_spend_before ?? ''} → ${r.newspaper_spend_after ?? ''}`,
    }))],
  );

  // ── Struggle signals (same rules as dashboard)
  const sessRB = new Set(nav.filter((r) => r.tab === 'reasoning_board' || r.tab === 'reasoning').map((r) => r.session_id));
  const sessMD = new Set(nav.filter((r) => r.tab === 'my_decisions' || r.tab === 'decisions').map((r) => r.session_id));
  const rstCounts = new Map<string, number>();
  resets.filter((r) => r.reset_type === 'board_reset').forEach((r) => rstCounts.set(r.session_id, (rstCounts.get(r.session_id) ?? 0) + 1));
  const sessWithBoard = new Set(bevents.map((r) => r.session_id));
  const firstDrag = new Map<string, { seq: number; eid: string }>();
  bevents.forEach((r) => {
    if (r.sequence_number == null || !r.evidence_id) return;
    const ex = firstDrag.get(r.session_id);
    if (!ex || r.sequence_number < ex.seq) firstDrag.set(r.session_id, { seq: r.sequence_number, eid: r.evidence_id });
  });
  const rbsForSubs = boards.filter((b) => subBy.has(b.session_id));
  const safe = (n: number, d: number) => (d > 0 ? (n / d) * 100 : 0);
  const issues: [string, number, number, string, boolean?][] = [
    ['Never reached Reasoning Board', safe(total - sessRB.size, total), 10, 'P1'],
    ['Left Predictive quadrant empty', safe(subs.filter((s) => s.predictive_card_count === 0).length, totalSubs), 35, 'P1'],
    ['Board reset 2+ times', safe([...rstCounts.values()].filter((c) => c >= 2).length, total), 15, 'P2'],
    ['Submitted with 0 allocation changes', safe([...subBy.keys()].filter((s) => !allocBy.has(s)).length, totalSubs), 10, 'P2'],
    ['Never visited My Decisions', safe(total - sessMD.size, total), 15, 'P2'],
    ['Views item dragged first (framing trap)', safe([...firstDrag.values()].filter((v) => v.eid.includes('_views')).length, sessWithBoard.size), 30, 'P1'],
    ['Pro Chair TikTok never dragged (BUG-02)', safe(new Set(bevents.filter((r) => r.evidence_id === 'pro_chair_tiktok').map((r) => r.session_id)).size, sessWithBoard.size), 5, 'P1', true],
    ['Never added a Contextual Note', safe([...sessWithBoard].filter((s) => !annotatedSessions.has(s)).length, sessWithBoard.size), 50, 'P2'],
    ['Written diagnosis empty at submission', rbsForSubs.length ? safe(rbsForSubs.filter((r) => !r.written_diagnosis?.trim()).length, rbsForSubs.length) : totalSubs > 0 ? 100 : 0, 60, 'P2'],
  ];
  const tabTime = groupBy(nav, (n: any) => TAB_LABEL[n.tab] ?? n.tab);
  add('Struggle signals',
    ['Issues', issues.map(([Issue, p, t, Priority, inv]) => ({ Issue, '% affected': +p.toFixed(1), 'Threshold %': t, Status: getStatus(p, t, inv), Priority }))],
    ['Time per tab', [...tabTime.entries()].map(([Tab, r]) => ({ Tab, Visits: r.length, 'Total minutes': +(r.reduce((a, b) => a + (b.time_spent_seconds ?? 0), 0) / 60).toFixed(1), 'Avg seconds per visit': avg(r.map((x) => x.time_spent_seconds ?? 0)) ?? 0 }))],
    ['Resets', [{ 'Sessions with reset': resetBy.size, '% of sessions': pct(resetBy.size, total), 'Total resets': resets.length, 'Cards cleared': resets.reduce((a, r) => a + (r.cards_cleared ?? 0), 0) }]],
  );

  // ── Per-student table + details (same best-session rule as dashboard)
  const best = new Map<string, any>();
  sessions.forEach((s) => {
    const ex = best.get(s.user_id);
    if (!ex || (s.is_completed && !ex.is_completed) || (s.is_completed === ex.is_completed && s.started_at > ex.started_at)) best.set(s.user_id, s);
  });
  const userIds = [...new Set(enrollments.map((e) => e.user_id))];
  const table: any[] = [];
  const details: any[] = [];
  const timeline: any[] = [];
  for (const uid of userIds) {
    const email = emailOf.get(uid) ?? '';
    const s = best.get(uid);
    const sub = s ? subBy.get(s.id) : null;
    const board = s ? boardBy.get(s.id) : null;
    const chips = chipsOf(board?.cards);
    const tutorial = s?.tutorial_completed ? 'Completed' : s?.tutorial_opened ? 'Abandoned' : 'Skipped';
    const dur = s?.completed_at && s?.started_at ? +minutesBetween(s.started_at, s.completed_at).toFixed(1) : null;
    const cards = sub ? QUADS.reduce((a, q) => a + (sub[`${q}_card_count`] ?? 0), 0) : null;
    const quads = sub ? QUADS.filter((q) => (sub[`${q}_card_count`] ?? 0) > 0).length : null;
    const aiRows = s ? (aiBy.get(s.id) ?? []).sort((a, b) => a.feedback_round - b.feedback_round) : [];
    table.push({
      Email: email, 'Duration (min)': dur ?? '—', Tutorial: tutorial, Cards: cards ?? '—', Quadrants: quads ?? '—',
      Annotations: s ? chips.filter(hasAnno).length : '—', Diagnosis: s ? (board?.written_diagnosis?.trim() ? 'Yes' : 'No') : '—',
      'Alloc changes': s ? allocBy.get(s.id)?.length ?? 0 : 0, Feedback: aiRows.length ? 'Yes' : 'No', Decision: tableDecision(sub) ?? '—',
    });
    if (!s) { details.push({ Email: email, Session: 'No session' }); continue; }
    const r = reflBy.get(s.id);
    const navRows = navBy.get(s.id) ?? [];
    const tabSecs = groupBy(navRows, (n: any) => TAB_LABEL[n.tab] ?? n.tab);
    details.push({
      Email: email, 'Session ID': s.id, Started: s.started_at, Completed: s.completed_at ?? '', 'Duration (min)': dur ?? '—',
      'Submitted at': sub?.submitted_at ?? '—', Tutorial: tutorial, 'Decision (detail badge)': !sub ? 'Not submitted' : tableDecision(sub) === 'No change' ? 'Correct' : tableDecision(sub),
      'Cards placed': cards ?? 0, 'Quadrants filled': quads ?? 0, Annotations: chips.filter(hasAnno).length,
      'Final TikTok': sub?.final_tiktok_spend ?? '', 'Final Instagram': sub?.final_instagram_spend ?? '', 'Final Facebook': sub?.final_facebook_spend ?? '', 'Final Newspaper': sub?.final_newspaper_spend ?? '',
      ...Object.fromEntries(QUADS.map((q) => [`Board: ${q}`, chips.filter((c) => c._quadrant === q).map((c) => `${c.label ?? c.id}${hasAnno(c) ? ` — note: ${c.annotation.trim()}` : ''}`).join(' | ')])),
      'Written diagnosis': board?.written_diagnosis ?? '', 'Reasoning story': sub?.generated_story ?? '',
      'Allocation changes': allocBy.get(s.id)?.length ?? 0, 'AI feedback rounds': aiRows.length,
      'AI feedback text': aiRows.map((a) => `Round ${a.feedback_round}: ${a.ai_feedback_text ?? ''} [action: ${a.post_feedback_action ?? '—'}]`).join('\n\n'),
      'Time per tab (s)': [...tabSecs.entries()].map(([t, rs]) => `${t}: ${rs.reduce((a, b) => a + (b.time_spent_seconds ?? 0), 0)}`).join(', '),
      'Board resets': resetBy.get(s.id)?.length ?? 0,
      'Reflection Q1': r?.q1_reasoning_genuine ?? '', 'Reflection Q2': r?.q2_framework_clarity ?? '', 'Reflection Q3': r?.q3_story_vs_thinking ?? '',
      'Reflection Q4': r?.q4_feedback_impact ?? '', 'Reflection Q5': r?.q5_comparison ?? '', 'Used AI': r ? (r.used_ai ? 'Yes' : 'No') : '', 'AI chat link': r?.ai_chat_link ?? '',
      'Reflection submitted': r?.submitted_at ?? 'Not completed',
    });
    (allocBy.get(s.id) ?? []).forEach((a) => timeline.push({ Email: email, Time: a.created_at, Type: 'Budget move', Detail: `${a.channel}: ${a.previous_value} → ${a.new_value}`, Seq: a.sequence_number }));
    (bevBy.get(s.id) ?? []).forEach((b) => timeline.push({ Email: email, Time: b.created_at, Type: `Board: ${b.event_type}`, Detail: `${b.evidence_id ?? ''}${b.quadrant ? ` → ${b.quadrant}` : ''}`, Seq: b.sequence_number }));
    aiRows.forEach((a) => timeline.push({ Email: email, Time: a.requested_at, Type: 'AI feedback', Detail: `Round ${a.feedback_round} — ${a.post_feedback_action ?? ''}`, Seq: '' }));
    navRows.forEach((n) => timeline.push({ Email: email, Time: n.entered_at, Type: 'Tab visit', Detail: `${TAB_LABEL[n.tab] ?? n.tab} (${n.time_spent_seconds ?? 0}s)`, Seq: n.visit_number }));
  }
  timeline.sort((a, b) => (a.Email === b.Email ? (a.Time < b.Time ? -1 : 1) : a.Email < b.Email ? -1 : 1));
  add('Per-student table', ['Students', table.sort((a, b) => a.Email.localeCompare(b.Email))]);
  add('Student details', ['One row per student', details]);
  add('Student timeline', ['Events in order', timeline]);

  const wb = XLSX.utils.book_new();
  for (const [name, aoa] of Object.entries(sheets)) XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoa), name.slice(0, 31));
  const date = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `pilot_dashboard_${label.replace(/[^a-z0-9]+/gi, '_').slice(0, 40)}_${date}.xlsx`);
}
