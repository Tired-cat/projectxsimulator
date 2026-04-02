import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Copy, Check } from 'lucide-react';
import { toast } from 'sonner';

interface ClassRow {
  id: string;
  name: string;
  section_code: string;
  class_code: string;
  instructor_id: string;
}
interface ProfileRow { id: string; display_name: string | null; email: string | null }
interface EnrollmentRow { class_id: string }

export default function AdminClassCodes() {
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [professors, setProfessors] = useState<ProfileRow[]>([]);
  const [enrollments, setEnrollments] = useState<EnrollmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [cRes, pRes, eRes] = await Promise.all([
      supabase.from('classes').select('id, name, section_code, class_code, instructor_id').order('created_at', { ascending: false }),
      supabase.from('profiles').select('id, display_name, email').eq('role', 'professor'),
      supabase.from('student_enrollments').select('class_id'),
    ]);
    if (cRes.data) setClasses(cRes.data as ClassRow[]);
    if (pRes.data) setProfessors(pRes.data);
    if (eRes.data) setEnrollments(eRes.data as EnrollmentRow[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const profMap = useMemo(() => {
    const m = new Map<string, string>();
    professors.forEach(p => m.set(p.id, p.display_name || p.email || '—'));
    return m;
  }, [professors]);

  const enrollCounts = useMemo(() => {
    const m = new Map<string, number>();
    enrollments.forEach(e => m.set(e.class_id, (m.get(e.class_id) || 0) + 1));
    return m;
  }, [enrollments]);

  const copyCode = async (classId: string, code: string) => {
    await navigator.clipboard.writeText(code);
    toast.success('Code copied');
    setCopiedId(classId);
    setTimeout(() => setCopiedId(null), 1500);
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-64 w-full rounded-xl" />)}
      </div>
    );
  }

  if (classes.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 rounded-lg border border-dashed border-border">
        <p className="text-muted-foreground text-sm">No classes yet. Create one from the Classes page.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold font-[var(--font-heading)] text-foreground">Class Codes</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {classes.map(c => {
          const enrolled = enrollCounts.get(c.id) || 0;
          const isCopied = copiedId === c.id;
          return (
            <Card key={c.id} className="border border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                  {c.name}
                  <span className="text-xs font-normal text-muted-foreground">({c.section_code})</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center py-4">
                  <p className="font-mono font-bold tracking-[0.3em] text-foreground" style={{ fontSize: '2.25rem' }}>
                    {c.class_code}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Students enter this code when they first log in
                  </p>
                </div>
                <Button
                  className="w-full gap-2"
                  variant={isCopied ? 'secondary' : 'default'}
                  onClick={() => copyCode(c.id, c.class_code)}
                >
                  {isCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {isCopied ? 'Copied!' : 'Copy code'}
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  {enrolled} student{enrolled !== 1 ? 's' : ''} enrolled · {profMap.get(c.instructor_id) || '—'}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
