import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { UserPlus } from 'lucide-react';
import { toast } from 'sonner';

interface ProfileRow { id: string; display_name: string | null; email: string | null; institution: string | null }
interface EnrollmentRow { user_id: string; class_id: string }
interface ClassRow { id: string; instructor_id: string }
interface SubmissionRow { user_id: string; reasoning_score: number }

export default function AdminProfessors() {
  const [professors, setProfessors] = useState<ProfileRow[]>([]);
  const [enrollments, setEnrollments] = useState<EnrollmentRow[]>([]);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [submissions, setSubmissions] = useState<SubmissionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteInstitution, setInviteInstitution] = useState('');
  const [inviting, setInviting] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [pRes, eRes, cRes, sRes] = await Promise.all([
      supabase.from('profiles').select('id, display_name, email, institution').eq('role', 'professor'),
      supabase.from('student_enrollments').select('user_id, class_id'),
      supabase.from('classes').select('id, instructor_id'),
      supabase.from('submissions').select('user_id, reasoning_score'),
    ]);
    if (pRes.data) setProfessors(pRes.data);
    if (eRes.data) setEnrollments(eRes.data);
    if (cRes.data) setClasses(cRes.data as ClassRow[]);
    if (sRes.data) setSubmissions(sRes.data as SubmissionRow[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const profStats = useMemo(() => {
    return professors.map(p => {
      const profClasses = classes.filter(c => c.instructor_id === p.id);
      const classIds = new Set(profClasses.map(c => c.id));
      const studentIds = new Set(enrollments.filter(e => classIds.has(e.class_id)).map(e => e.user_id));
      const studentSubs = submissions.filter(s => studentIds.has(s.user_id));
      const avgScore = studentSubs.length > 0
        ? Math.round(studentSubs.reduce((sum, s) => sum + s.reasoning_score, 0) / studentSubs.length)
        : 0;
      return {
        ...p,
        classesCount: profClasses.length,
        totalStudents: studentIds.size,
        avgScore,
      };
    });
  }, [professors, classes, enrollments, submissions]);

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    setInviting(true);
    const tempPassword = crypto.randomUUID();
    const { error } = await supabase.auth.signUp({
      email: inviteEmail.trim(),
      password: tempPassword,
      options: {
        data: {
          role: 'professor',
          display_name: inviteName.trim() || inviteEmail.split('@')[0],
        },
      },
    });
    setInviting(false);
    if (error) {
      toast.error(`Invite failed: ${error.message}`);
    } else {
      toast.success(`Professor invite sent to ${inviteEmail}`);
      setInviteEmail(''); setInviteName(''); setInviteInstitution('');
      setDialogOpen(false);
      fetchData();
    }
  };

  if (loading) return <div className="space-y-4"><Skeleton className="h-10 w-full" /><Skeleton className="h-64 w-full" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold font-heading text-foreground">Professor Management</h2>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-1.5"><UserPlus className="h-4 w-4" /> Create Professor</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Invite Professor</DialogTitle></DialogHeader>
            <div className="space-y-3 pt-2">
              <div><Label>Email *</Label><Input value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="professor@university.edu" type="email" /></div>
              <div><Label>Display Name</Label><Input value={inviteName} onChange={e => setInviteName(e.target.value)} placeholder="Dr. Smith" /></div>
              <div><Label>Institution</Label><Input value={inviteInstitution} onChange={e => setInviteInstitution(e.target.value)} placeholder="University of ..." /></div>
              <Button onClick={handleInvite} disabled={inviting || !inviteEmail.trim()} className="w-full">
                {inviting ? 'Inviting…' : 'Send Invite'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Institution</TableHead>
                <TableHead>Classes</TableHead>
                <TableHead>Students</TableHead>
                <TableHead>Avg Score</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {profStats.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-12 text-muted-foreground">No professors found</TableCell></TableRow>
              ) : profStats.map(p => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.display_name || '—'}</TableCell>
                  <TableCell>{p.email}</TableCell>
                  <TableCell>{p.institution || '—'}</TableCell>
                  <TableCell><Badge variant="secondary">{p.classesCount}</Badge></TableCell>
                  <TableCell>{p.totalStudents}</TableCell>
                  <TableCell>{p.avgScore}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
