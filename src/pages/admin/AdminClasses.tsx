import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Pencil, Check, Copy, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ClassRow {
  id: string;
  name: string;
  section_code: string;
  class_code: string;
  semester: string | null;
  year: number | null;
  instructor_id: string;
  created_at: string;
}
interface ProfileRow { id: string; display_name: string | null; email: string | null }
interface EnrollmentRow { class_id: string }
interface SessionRow { id: string; class_id: string | null }
interface SubmissionRow { session_id: string }

async function adminFetch(fnName: string, body: Record<string, unknown>) {
  const session = (await supabase.auth.getSession()).data.session;
  const res = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${fnName}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.access_token}`,
        'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
      body: JSON.stringify(body),
    }
  );
  const data = await res.json();
  return { ok: res.ok, data };
}

export default function AdminClasses() {
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [professors, setProfessors] = useState<ProfileRow[]>([]);
  const [enrollments, setEnrollments] = useState<EnrollmentRow[]>([]);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [submissions, setSubmissions] = useState<SubmissionRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Create modal
  const [createOpen, setCreateOpen] = useState(false);
  const [formName, setFormName] = useState('');
  const [formSection, setFormSection] = useState('');
  const [formSemester, setFormSemester] = useState('');
  const [formYear, setFormYear] = useState(new Date().getFullYear().toString());
  const [formProfessor, setFormProfessor] = useState('');
  const [formScenario, setFormScenario] = useState('scenario-1');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Success modal
  const [successCode, setSuccessCode] = useState<string | null>(null);
  const [codeCopied, setCodeCopied] = useState(false);

  // Edit modal
  const [editClass, setEditClass] = useState<ClassRow | null>(null);

  // Delete modal
  const [deleteClass, setDeleteClass] = useState<ClassRow | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [cRes, pRes, eRes, sRes, subRes] = await Promise.all([
      supabase.from('classes').select('id, name, section_code, class_code, semester, year, instructor_id, created_at').order('created_at', { ascending: false }),
      supabase.from('profiles').select('id, display_name, email').eq('role', 'professor'),
      supabase.from('student_enrollments').select('class_id'),
      supabase.from('sessions').select('id, class_id'),
      supabase.from('submissions').select('session_id'),
    ]);
    if (cRes.data) setClasses(cRes.data as ClassRow[]);
    if (pRes.data) setProfessors(pRes.data);
    if (eRes.data) setEnrollments(eRes.data as EnrollmentRow[]);
    if (sRes.data) setSessions(sRes.data as SessionRow[]);
    if (subRes.data) setSubmissions(subRes.data as SubmissionRow[]);
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

  // Build a set of session_ids that have submissions
  const sessionIdsWithSubs = useMemo(() => {
    const s = new Set<string>();
    submissions.forEach(sub => s.add(sub.session_id));
    return s;
  }, [submissions]);

  // Count submissions per class: session.class_id -> count of submissions for sessions in that class
  const submissionCounts = useMemo(() => {
    const m = new Map<string, number>();
    sessions.forEach(s => {
      if (s.class_id && sessionIdsWithSubs.has(s.id)) {
        m.set(s.class_id, (m.get(s.class_id) || 0) + 1);
      }
    });
    return m;
  }, [sessions, sessionIdsWithSubs]);

  const resetForm = () => {
    setFormName('');
    setFormSection('');
    setFormSemester('');
    setFormYear(new Date().getFullYear().toString());
    setFormProfessor('');
    setFormScenario('scenario-1');
    setFormError(null);
  };

  const handleCreate = async () => {
    if (!formName.trim() || !formSection.trim() || !formProfessor) return;
    setFormError(null);
    setSaving(true);
    try {
      const { ok, data } = await adminFetch('create-class', {
        name: formName.trim(),
        section_code: formSection.trim(),
        instructor_id: formProfessor,
        semester: formSemester.trim() || null,
        year: formYear || null,
      });
      setSaving(false);
      if (!ok || data?.error) {
        setFormError(data?.error || 'Failed to create class');
        return;
      }
      setCreateOpen(false);
      setSuccessCode(data.class_code);
      resetForm();
      fetchData();
    } catch {
      setSaving(false);
      setFormError('Network error');
    }
  };

  const openEdit = (c: ClassRow) => {
    setEditClass(c);
    setFormName(c.name);
    setFormSection(c.section_code);
    setFormSemester(c.semester || '');
    setFormYear(c.year?.toString() || '');
    setFormProfessor(c.instructor_id);
  };

  const handleEdit = async () => {
    if (!editClass || !formName.trim() || !formSection.trim() || !formProfessor) return;
    setSaving(true);
    const { error } = await supabase.from('classes').update({
      name: formName.trim(),
      section_code: formSection.trim(),
      semester: formSemester.trim() || null,
      year: formYear ? parseInt(formYear) : null,
      instructor_id: formProfessor,
    }).eq('id', editClass.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Class updated');
    setEditClass(null);
    resetForm();
    fetchData();
  };

  const handleDelete = async () => {
    if (!deleteClass) return;
    setDeleting(true);
    const { error } = await supabase.from('classes').delete().eq('id', deleteClass.id);
    setDeleting(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Class deleted');
    setDeleteClass(null);
    setDeleteConfirmText('');
    fetchData();
  };

  const copyCode = async (code: string) => {
    await navigator.clipboard.writeText(code);
    toast.success('Class code copied');
  };

  if (loading) return <div className="space-y-4"><Skeleton className="h-10 w-full" /><Skeleton className="h-64 w-full" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold font-[var(--font-heading)] text-foreground">Classes</h2>
        <Button onClick={() => { resetForm(); setCreateOpen(true); }} className="gap-1.5">
          <Plus className="h-4 w-4" /> Create class
        </Button>
      </div>

      {/* Classes Table */}
      <Card className="border border-border">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Class name</TableHead>
                  <TableHead>Professor</TableHead>
                  <TableHead>Section</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Semester</TableHead>
                  <TableHead className="text-center">Students</TableHead>
                  <TableHead className="text-center">Submissions</TableHead>
                  <TableHead>Scenario</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[80px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {classes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-12 text-muted-foreground">
                      No classes yet. Click "Create class" to add one.
                    </TableCell>
                  </TableRow>
                ) : classes.map(c => {
                  const enrolled = enrollCounts.get(c.id) || 0;
                  const subs = submissionCounts.get(c.id) || 0;
                  return (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium text-foreground">{c.name}</TableCell>
                      <TableCell className="text-muted-foreground">{profMap.get(c.instructor_id) || '—'}</TableCell>
                      <TableCell><Badge variant="outline">{c.section_code}</Badge></TableCell>
                      <TableCell>
                        <button
                          onClick={() => copyCode(c.class_code)}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-muted font-mono text-xs text-foreground hover:bg-muted/80 transition-colors cursor-pointer"
                          title="Click to copy"
                        >
                          {c.class_code}
                          <Copy className="h-3 w-3 text-muted-foreground" />
                        </button>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {[c.semester, c.year].filter(Boolean).join(' ') || '—'}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary">{enrolled}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary">{subs}</Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-muted-foreground">scenario-1</span>
                      </TableCell>
                      <TableCell>
                        {enrolled > 0 ? (
                          <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/20">Active</Badge>
                        ) : (
                          <Badge variant="secondary">Pending</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(c)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => { setDeleteClass(c); setDeleteConfirmText(''); }}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Create Class Modal */}
      <Dialog open={createOpen} onOpenChange={o => { setCreateOpen(o); if (!o) resetForm(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create class</DialogTitle>
            <DialogDescription>Set up a new class section. A unique join code will be generated automatically.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label>Professor *</Label>
              <Select value={formProfessor} onValueChange={setFormProfessor}>
                <SelectTrigger><SelectValue placeholder="Select professor" /></SelectTrigger>
                <SelectContent>
                  {professors.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.display_name || 'Unknown'} ({p.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Class name *</Label>
              <Input value={formName} onChange={e => setFormName(e.target.value)} placeholder="Principles of Marketing" />
            </div>
            <div className="space-y-1.5">
              <Label>Section code *</Label>
              <Input value={formSection} onChange={e => setFormSection(e.target.value)} placeholder="S01" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Semester</Label>
                <Input value={formSemester} onChange={e => setFormSemester(e.target.value)} placeholder="Spring 2026" />
              </div>
              <div className="space-y-1.5">
                <Label>Year</Label>
                <Input value={formYear} onChange={e => setFormYear(e.target.value)} placeholder="2026" type="number" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Scenario</Label>
              <Select value={formScenario} onValueChange={setFormScenario}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="scenario-1">LumbarPro (scenario-1)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {formError && <p className="text-sm text-destructive">{formError}</p>}
            <Button onClick={handleCreate} disabled={saving || !formName.trim() || !formSection.trim() || !formProfessor} className="w-full">
              {saving ? 'Creating…' : 'Create class'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Class Modal */}
      <Dialog open={!!editClass} onOpenChange={o => { if (!o) { setEditClass(null); resetForm(); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit class</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label>Professor *</Label>
              <Select value={formProfessor} onValueChange={setFormProfessor}>
                <SelectTrigger><SelectValue placeholder="Select professor" /></SelectTrigger>
                <SelectContent>
                  {professors.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.display_name || 'Unknown'} ({p.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Class name *</Label>
              <Input value={formName} onChange={e => setFormName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Section code *</Label>
              <Input value={formSection} onChange={e => setFormSection(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Semester</Label>
                <Input value={formSemester} onChange={e => setFormSemester(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Year</Label>
                <Input value={formYear} onChange={e => setFormYear(e.target.value)} type="number" />
              </div>
            </div>
            <Button onClick={handleEdit} disabled={saving || !formName.trim() || !formSection.trim() || !formProfessor} className="w-full">
              {saving ? 'Saving…' : 'Save changes'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      {deleteClass && (
        <Dialog open={!!deleteClass} onOpenChange={o => { if (!o) { setDeleteClass(null); setDeleteConfirmText(''); } }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-destructive">Delete class</DialogTitle>
              <DialogDescription>
                This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <p className="text-sm text-foreground">
                This class has <strong>{enrollCounts.get(deleteClass.id) || 0}</strong> enrolled students and <strong>{submissionCounts.get(deleteClass.id) || 0}</strong> submitted sessions.
              </p>
              <p className="text-sm text-muted-foreground">
                Deleting this class removes student enrollments but preserves all session data.
              </p>
              <div className="space-y-1.5">
                <Label>Type <span className="font-mono font-bold">{deleteClass.class_code}</span> to confirm</Label>
                <Input
                  value={deleteConfirmText}
                  onChange={e => setDeleteConfirmText(e.target.value)}
                  placeholder={deleteClass.class_code}
                />
              </div>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={deleting || deleteConfirmText !== deleteClass.class_code}
                className="w-full"
              >
                {deleting ? 'Deleting…' : 'Delete class'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Success Modal */}
      <Dialog open={!!successCode} onOpenChange={o => { if (!o) { setSuccessCode(null); setCodeCopied(false); } }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Check className="h-5 w-5 text-emerald-500" /> Class created
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2 text-center">
            <p className="text-sm text-muted-foreground">Students can join with this code:</p>
            <div className="flex items-center justify-center gap-3">
              <span className="text-3xl font-mono font-bold tracking-widest text-foreground">
                {successCode}
              </span>
              <Button
                size="icon"
                variant="outline"
                className="h-8 w-8"
                onClick={() => successCode && copyCode(successCode)}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <Button onClick={() => { setSuccessCode(null); setCodeCopied(false); }} className="w-full">
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
