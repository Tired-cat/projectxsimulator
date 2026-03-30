import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminExport() {
  const [exporting, setExporting] = useState(false);

  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      const [subRes, eRes, pRes, cRes, bRes] = await Promise.all([
        supabase.from('submissions').select('user_id, session_id, reasoning_score, time_elapsed_seconds, used_ai, step_1_text, step_3_reflection, final_decision'),
        supabase.from('student_enrollments').select('user_id, class_id'),
        supabase.from('profiles').select('id, display_name, email, role'),
        supabase.from('classes').select('id, name, section_code, instructor_id'),
        supabase.from('reasoning_board_state').select('session_id, adjustments_made'),
      ]);

      const submissions = subRes.data || [];
      const enrollments = eRes.data || [];
      const profiles = pRes.data || [];
      const classes = cRes.data || [];
      const boards = bRes.data || [];

      const profMap = new Map(profiles.map(p => [p.id, p]));
      const classMap = new Map(classes.map(c => [c.id, c]));
      const boardMap = new Map(boards.map(b => [b.session_id, b]));

      // Build enrollment lookup: user_id -> class_id
      const enrollMap = new Map<string, string>();
      enrollments.forEach(e => enrollMap.set(e.user_id, e.class_id));

      const headers = ['student_name', 'student_email', 'class', 'section', 'professor', 'reasoning_score', 'time_elapsed_seconds', 'used_ai', 'adjustments_made', 'step_1_text', 'step_3_reflection', 'final_decision'];
      
      const rows = submissions.map(sub => {
        const student = profMap.get(sub.user_id);
        const classId = enrollMap.get(sub.user_id);
        const cls = classId ? classMap.get(classId) : null;
        const prof = cls ? profMap.get(cls.instructor_id) : null;
        const board = boardMap.get(sub.session_id);

        return [
          student?.display_name || '',
          student?.email || '',
          cls?.name || '',
          cls?.section_code || '',
          prof?.display_name || prof?.email || '',
          sub.reasoning_score,
          sub.time_elapsed_seconds,
          sub.used_ai,
          board?.adjustments_made || 0,
          `"${(sub.step_1_text || '').replace(/"/g, '""')}"`,
          `"${(sub.step_3_reflection || '').replace(/"/g, '""')}"`,
          `"${(sub.final_decision || '').replace(/"/g, '""')}"`,
        ].join(',');
      });

      const csv = [headers.join(','), ...rows].join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `projectx-submissions-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('CSV exported successfully');
    } catch (err) {
      toast.error('Export failed');
    }
    setExporting(false);
  }, []);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold font-heading text-foreground">Export Data</h2>
      <Card>
        <CardHeader>
          <CardTitle>Export All Submissions as CSV</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Download a comprehensive CSV containing all student submissions with their class, professor, reasoning scores, time elapsed, AI usage, slider adjustments, step responses, and final decisions.
          </p>
          <Button onClick={handleExport} disabled={exporting} className="gap-2">
            <Download className="h-4 w-4" />
            {exporting ? 'Exporting…' : 'Download CSV'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
