import { supabase } from '@/integrations/supabase/client';

const SESSION_TABLES = [
  'submissions',
  'post_simulation_reflections',
  'reasoning_board_state',
  'ai_feedback_events',
  'allocation_events',
  'board_events',
  'navigation_events',
  'tutorial_events',
  'resets',
] as const;

const PAGE = 1000;

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

async function fetchBySessions(table: string, ids: string[]) {
  const rows: any[] = [];
  for (let i = 0; i < ids.length; i += 200) {
    const chunk = ids.slice(i, i + 200);
    rows.push(...(await fetchAll(table, (q) => q.in('session_id', chunk))));
  }
  return rows;
}

function flatten(rows: any[]) {
  return rows.map((r) => {
    const o: Record<string, any> = {};
    for (const [k, v] of Object.entries(r)) {
      const s = v !== null && typeof v === 'object' ? JSON.stringify(v) : v;
      o[k] = typeof s === 'string' && s.length > 32000 ? s.slice(0, 32000) + '…' : s;
    }
    return o;
  });
}

export async function downloadPilotData(classId: string | null, label: string) {
  const XLSX = await import('xlsx');

  const sessions = await fetchAll('sessions', classId ? (q) => q.eq('class_id', classId) : undefined);
  const enrollments = await fetchAll('student_enrollments', classId ? (q) => q.eq('class_id', classId) : undefined);
  const userIds = [...new Set([...enrollments.map((e) => e.user_id), ...sessions.map((s) => s.user_id)])];
  const profilesAll = await fetchAll('profiles');
  const profiles = profilesAll.filter((p) => userIds.includes(p.id));
  const classes = await fetchAll('classes', classId ? (q) => q.eq('id', classId) : undefined);

  const ids = sessions.map((s) => s.id);
  const sheets: Record<string, any[]> = { classes, students: profiles, enrollments, sessions };
  for (const t of SESSION_TABLES) {
    sheets[t] = ids.length ? await fetchBySessions(t, ids) : [];
  }

  const wb = XLSX.utils.book_new();
  for (const [name, rows] of Object.entries(sheets)) {
    const ws = rows.length ? XLSX.utils.json_to_sheet(flatten(rows)) : XLSX.utils.aoa_to_sheet([['No data']]);
    XLSX.utils.book_append_sheet(wb, ws, name.slice(0, 31));
  }
  const date = new Date().toISOString().slice(0, 10);
  const safe = label.replace(/[^a-z0-9]+/gi, '_').slice(0, 40);
  XLSX.writeFile(wb, `pilot_data_${safe}_${date}.xlsx`);
}
