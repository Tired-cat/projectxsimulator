import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Pencil } from 'lucide-react';
import { toast } from 'sonner';

interface ClassRow { id: string; name: string; section_code: string; semester: string | null; year: number | null; instructor_id: string }
interface ProfileRow { id: string; display_name: string | null; email: string | null }
interface EnrollmentRow { class_id: string }

export default function AdminClasses() {
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [professors, setProfessors] = useState<ProfileRow[]>([]);
  const [enrollments, setEnrollments] = useState<EnrollmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editClass, setEditClass] = useState<ClassRow | null>(null);

  // form fields
  const [formName, setFormName] = useState('');
  const [formSection, setFormSection] = useState('');
  const [formSemester, setFormSemester] = useState('');
  const [formYear, setFormYear] = useState('');
  const [formProfessor, setFormProfessor] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [cRes, pRes, eRes] = await Promise.all([
      supabase.from('classes').select('id, name, section_code, semester, year, instructor_id'),
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

  const resetForm = () => {
    setFormName(''); setFormSection(''); setFormSemester(''); setFormYear(''); setFormProfessor('');
  };

  const openEdit = (c: ClassRow) => {
    setEditClass(c);
    setFormName(c.name);
    setFormSection(c.section_code);
    setFormSemester(c.semester || '');
    setFormYear(c.year?.toString() || '');
    setFormProfessor(c.instructor_id);
  };

  const handleCreate = async () => {
    if (!formName.trim() || !formSection.trim() || !formProfessor) return;
    setSaving(true);
    const { error } = await supabase.from('classes').insert({
      name: formName.trim(),
      section_code: formSection.trim(),
      semester: formSemester.trim() || null,
      year: formYear ? parseInt(formYear) : null,
      instructor_id: formProfessor,
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Class created');
    resetForm(); setCreateOpen(false); fetchData();
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
    setEditClass(null); resetForm(); fetchData();
  };

  const ClassForm = ({ onSubmit, submitLabel }: { onSubmit: () => void; submitLabel: string }) => (
    <div className="space-y-3 pt-2">
      <div><Label>Class Name *</Label><Input value={formName} onChange={e => setFormName(e.target.value)} placeholder="Marketing 101" /></div>
      <div><Label>Section Code *</Label><Input value={formSection} onChange={e => setFormSection(e.target.value)} placeholder="SEC-A" /></div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label>Semester</Label><Input value={formSemester} onChange={e => setFormSemester(e.target.value)} placeholder="Fall" /></div>
        <div><Label>Year</Label><Input value={formYear} onChange={e => setFormYear(e.target.value)} placeholder="2026" type="number" /></div>
      </div>
      <div>
        <Label>Professor *</Label>
        <Select value={formProfessor} onValueChange={setFormProfessor}>
          <SelectTrigger><SelectValue placeholder="Select professor" /></SelectTrigger>
          <SelectContent>
            {professors.map(p => (
              <SelectItem key={p.id} value={p.id}>{p.display_name || p.email}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button onClick={onSubmit} disabled={saving || !formName.trim() || !formSection.trim() || !formProfessor} className="w-full">
        {saving ? 'Saving…' : submitLabel}
      </Button>
    </div>
  );

  if (loading) return <div className="space-y-4"><Skeleton className="h-10 w-full" /><Skeleton className="h-64 w-full" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold font-heading text-foreground">Classes</h2>
        <Dialog open={createOpen} onOpenChange={o => { setCreateOpen(o); if (!o) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="gap-1.5"><Plus className="h-4 w-4" /> Create Class</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Class</DialogTitle></DialogHeader>
            <ClassForm onSubmit={handleCreate} submitLabel="Create Class" />
          </DialogContent>
        </Dialog>
      </div>

      {/* Edit dialog */}
      <Dialog open={!!editClass} onOpenChange={o => { if (!o) { setEditClass(null); resetForm(); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Class</DialogTitle></DialogHeader>
          <ClassForm onSubmit={handleEdit} submitLabel="Save Changes" />
        </DialogContent>
      </Dialog>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Class Name</TableHead>
                <TableHead>Section</TableHead>
                <TableHead>Semester</TableHead>
                <TableHead>Year</TableHead>
                <TableHead>Professor</TableHead>
                <TableHead>Students</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {classes.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground">No classes found</TableCell></TableRow>
              ) : classes.map(c => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell><Badge variant="outline">{c.section_code}</Badge></TableCell>
                  <TableCell>{c.semester || '—'}</TableCell>
                  <TableCell>{c.year || '—'}</TableCell>
                  <TableCell>{profMap.get(c.instructor_id) || '—'}</TableCell>
                  <TableCell>{enrollCounts.get(c.id) || 0}</TableCell>
                  <TableCell>
                    <Button size="sm" variant="ghost" onClick={() => openEdit(c)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
