import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Trash2, UserPlus, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

interface EnrollmentRow {
  id: string;
  user_id: string;
  class_id: string;
  enrolled_at: string;
}
interface ProfileRow { id: string; email: string | null; display_name: string | null }
interface ClassRow { id: string; name: string; class_code: string }
interface SessionRow { user_id: string }
interface SubmissionRow { user_id: string }

export default function AdminStudents() {
  const [enrollments, setEnrollments] = useState<EnrollmentRow[]>([]);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [submissions, setSubmissions] = useState<SubmissionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [classFilter, setClassFilter] = useState('all');

  // Remove modal
  const [removeTarget, setRemoveTarget] = useState<{ enrollment: EnrollmentRow; email: string; className: string } | null>(null);
  const [removing, setRemoving] = useState(false);
  // Assign class
  const [assigningUserId, setAssigningUserId] = useState<string | null>(null);
  // Delete unenrolled student
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; email: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { session } = useAuth();

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [eRes, pRes, cRes, sRes, subRes] = await Promise.all([
      supabase.from('student_enrollments').select('id, user_id, class_id, enrolled_at'),
      supabase.from('profiles').select('id, email, display_name').eq('role', 'student'),
      supabase.from('classes').select('id, name, class_code'),
      supabase.from('sessions').select('user_id'),
      supabase.from('submissions').select('user_id'),
    ]);
    if (eRes.data) setEnrollments(eRes.data as EnrollmentRow[]);
    if (pRes.data) setProfiles(pRes.data);
    if (cRes.data) setClasses(cRes.data as ClassRow[]);
    if (sRes.data) setSessions(sRes.data as SessionRow[]);
    if (subRes.data) setSubmissions(subRes.data as SubmissionRow[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const profileMap = useMemo(() => {
    const m = new Map<string, ProfileRow>();
    profiles.forEach(p => m.set(p.id, p));
    return m;
  }, [profiles]);

  const classMap = useMemo(() => {
    const m = new Map<string, ClassRow>();
    classes.forEach(c => m.set(c.id, c));
    return m;
  }, [classes]);

  const sessionCounts = useMemo(() => {
    const m = new Map<string, number>();
    sessions.forEach(s => m.set(s.user_id, (m.get(s.user_id) || 0) + 1));
    return m;
  }, [sessions]);

  const submissionCounts = useMemo(() => {
    const m = new Map<string, number>();
    submissions.forEach(s => m.set(s.user_id, (m.get(s.user_id) || 0) + 1));
    return m;
  }, [submissions]);

  const enrolledUserIds = useMemo(() => new Set(enrollments.map(e => e.user_id)), [enrollments]);

  const unenrolledStudents = useMemo(() => {
    return profiles.filter(p => !enrolledUserIds.has(p.id));
  }, [profiles, enrolledUserIds]);

  const filtered = useMemo(() => {
    if (classFilter === 'all') return enrollments;
    return enrollments.filter(e => e.class_id === classFilter);
  }, [enrollments, classFilter]);

  const handleRemove = async () => {
    if (!removeTarget) return;
    setRemoving(true);
    const { error } = await supabase.from('student_enrollments').delete().eq('id', removeTarget.enrollment.id);
    setRemoving(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Student removed from class');
    setRemoveTarget(null);
    fetchData();
  };

  const handleDeleteStudent = async () => {
    if (!deleteTarget || !session?.access_token) return;
    setDeleting(true);
    try {
      const res = await supabase.functions.invoke('delete-user', {
        body: { user_id: deleteTarget.id },
      });
      if (res.error) throw res.error;
      toast.success(`${deleteTarget.email} deleted permanently`);
      setDeleteTarget(null);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete student');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) return <div className="space-y-4"><Skeleton className="h-10 w-full" /><Skeleton className="h-64 w-full" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold font-[var(--font-heading)] text-foreground">Students</h2>
        <Select value={classFilter} onValueChange={setClassFilter}>
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="All classes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All classes</SelectItem>
            {classes.map(c => (
              <SelectItem key={c.id} value={c.id}>{c.name} ({c.class_code})</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card className="border border-border">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Display name</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Enrolled</TableHead>
                  <TableHead className="text-center">Sessions</TableHead>
                  <TableHead className="text-center">Submitted</TableHead>
                  <TableHead className="w-[60px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                      No students enrolled yet.
                    </TableCell>
                  </TableRow>
                ) : filtered.map(e => {
                  const profile = profileMap.get(e.user_id);
                  const cls = classMap.get(e.class_id);
                  const sessCount = sessionCounts.get(e.user_id) || 0;
                  const subCount = submissionCounts.get(e.user_id) || 0;
                  return (
                    <TableRow key={e.id}>
                      <TableCell className="text-foreground">{profile?.email || '—'}</TableCell>
                      <TableCell className="text-muted-foreground">{profile?.display_name || '—'}</TableCell>
                      <TableCell>
                        <Badge className="bg-primary/15 text-primary border-primary/30 hover:bg-primary/20 font-mono text-xs">
                          {cls?.class_code || '—'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {new Date(e.enrolled_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary">{sessCount}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {subCount > 0 ? (
                          <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30">Yes</Badge>
                        ) : (
                          <Badge variant="secondary">No</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => setRemoveTarget({
                            enrollment: e,
                            email: profile?.email || 'this student',
                            className: cls?.name || 'this class',
                          })}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Unenrolled students section */}
      {unenrolledStudents.length > 0 && (
        <>
          <h3 className="text-lg font-semibold text-muted-foreground flex items-center gap-2">
            Registered but not enrolled
            <Badge variant="secondary" className="text-xs">{unenrolledStudents.length}</Badge>
          </h3>
          <Card className="border border-dashed border-border">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Display name</TableHead>
                      <TableHead>Assign to class</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {unenrolledStudents.map(p => (
                      <TableRow key={p.id}>
                        <TableCell className="text-foreground">{p.email || '—'}</TableCell>
                        <TableCell className="text-muted-foreground">{p.display_name || '—'}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Select
                              value=""
                              onValueChange={async (classId) => {
                                setAssigningUserId(p.id);
                                const { error } = await supabase
                                  .from('student_enrollments')
                                  .insert({ user_id: p.id, class_id: classId } as any);
                                setAssigningUserId(null);
                                if (error) {
                                  if (error.message.includes('duplicate') || error.message.includes('unique')) {
                                    toast.error('Student is already enrolled in this class');
                                  } else {
                                    toast.error(error.message);
                                  }
                                  return;
                                }
                                const cls = classMap.get(classId);
                                toast.success(`${p.email} enrolled in ${cls?.name || 'class'}`);
                                fetchData();
                              }}
                            >
                              <SelectTrigger className="w-[180px] h-8 text-xs" disabled={assigningUserId === p.id}>
                                <SelectValue placeholder={assigningUserId === p.id ? 'Enrolling…' : 'Select class'} />
                              </SelectTrigger>
                              <SelectContent>
                                {classes.map(c => (
                                  <SelectItem key={c.id} value={c.id}>
                                    {c.name} ({c.class_code})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className="bg-amber-500/15 text-amber-700 border-amber-500/30 text-xs">
                            Awaiting class code
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Remove confirmation */}
      <Dialog open={!!removeTarget} onOpenChange={o => { if (!o) setRemoveTarget(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-destructive">Remove student</DialogTitle>
            <DialogDescription>
              Remove <strong>{removeTarget?.email}</strong> from <strong>{removeTarget?.className}</strong>? Their session data will be preserved.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setRemoveTarget(null)}>Cancel</Button>
            <Button variant="destructive" className="flex-1" onClick={handleRemove} disabled={removing}>
              {removing ? 'Removing…' : 'Remove'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
