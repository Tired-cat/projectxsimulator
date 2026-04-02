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
import { UserPlus, Copy, Check, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

interface ProfileRow { id: string; display_name: string | null; email: string | null; institution: string | null }
interface EnrollmentRow { user_id: string; class_id: string }
interface ClassRow { id: string; instructor_id: string }
interface SubmissionRow { user_id: string; reasoning_score: number }

// Generate a random password: 10 chars, uppercase, lowercase, digits, 1 special char.
// Excludes ambiguous characters: 0, O, l, 1, I
function generatePassword(): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghjkmnpqrstuvwxyz';
  const digits = '23456789';
  const special = '!@#$%&*?';

  const pick = (s: string) => s[Math.floor(Math.random() * s.length)];

  // Guarantee at least one of each category
  const required = [pick(upper), pick(lower), pick(digits), pick(special)];
  const all = upper + lower + digits;
  const rest = Array.from({ length: 6 }, () => pick(all));

  // Shuffle
  const chars = [...required, ...rest];
  for (let i = chars.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}

export default function AdminProfessors() {
  const [professors, setProfessors] = useState<ProfileRow[]>([]);
  const [enrollments, setEnrollments] = useState<EnrollmentRow[]>([]);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [submissions, setSubmissions] = useState<SubmissionRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Create professor modal state
  const [createOpen, setCreateOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [institution, setInstitution] = useState('RIT Dubai');
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Credentials modal state
  const [credentialsOpen, setCredentialsOpen] = useState(false);
  const [credEmail, setCredEmail] = useState('');
  const [credPassword, setCredPassword] = useState('');
  const [copied, setCopied] = useState(false);

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
      return { ...p, classesCount: profClasses.length, totalStudents: studentIds.size, avgScore };
    });
  }, [professors, classes, enrollments, submissions]);

  const handleCreate = async () => {
    if (!email.trim() || !displayName.trim()) return;
    setFormError(null);
    setCreating(true);

    const password = generatePassword();

    const { data, error } = await supabase.functions.invoke('create-professor', {
      body: {
        email: email.trim(),
        display_name: displayName.trim(),
        institution: institution.trim() || 'RIT Dubai',
        password,
      },
    });

    setCreating(false);

    if (error || data?.error) {
      const msg = data?.error || error?.message || 'Failed to create account';
      if (msg.toLowerCase().includes('already exists')) {
        setFormError('An account with this email already exists.');
      } else {
        setFormError(msg);
      }
      return;
    }

    // Success — close create modal, open credentials modal
    setCreateOpen(false);
    setCredEmail(email.trim());
    setCredPassword(password);
    setCredentialsOpen(true);

    // Reset form
    setEmail('');
    setDisplayName('');
    setInstitution('RIT Dubai');
    fetchData();
  };

  const handleCopyAll = async () => {
    const loginUrl = `${window.location.origin}/auth`;
    const text = `Email: ${credEmail}\nPassword: ${credPassword}\nLogin: ${loginUrl}`;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCredentialsDone = () => {
    setCredentialsOpen(false);
    setCredEmail('');
    setCredPassword('');
    setCopied(false);
  };

  if (loading) return <div className="space-y-4"><Skeleton className="h-10 w-full" /><Skeleton className="h-64 w-full" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold font-[var(--font-heading)] text-foreground">Professors</h2>
        <Button onClick={() => { setFormError(null); setCreateOpen(true); }} className="gap-1.5">
          <UserPlus className="h-4 w-4" /> Create professor
        </Button>
      </div>

      <Card className="border border-border">
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

      {/* Create Professor Modal */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create professor account</DialogTitle>
            <DialogDescription>
              A login-ready account will be created with a generated password.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="prof-email">University email *</Label>
              <Input
                id="prof-email"
                type="email"
                value={email}
                onChange={e => { setEmail(e.target.value); setFormError(null); }}
                placeholder="professor@university.edu"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="prof-name">Display name *</Label>
              <Input
                id="prof-name"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                placeholder="Dr. Jane Smith"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="prof-inst">Institution</Label>
              <Input
                id="prof-inst"
                value={institution}
                onChange={e => setInstitution(e.target.value)}
                placeholder="RIT Dubai"
              />
            </div>

            {formError && (
              <p className="text-sm text-destructive flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                {formError}
              </p>
            )}

            <Button
              onClick={handleCreate}
              disabled={creating || !email.trim() || !displayName.trim()}
              className="w-full"
            >
              {creating ? 'Creating account…' : 'Create account'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Credentials Modal */}
      <Dialog open={credentialsOpen} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md" onPointerDownOutside={e => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Check className="h-5 w-5 text-[hsl(var(--success))]" />
              Account created
            </DialogTitle>
            <DialogDescription>
              Copy these credentials now. The password will not be shown again.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
              <div>
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Email</p>
                <p className="text-sm font-mono text-foreground mt-0.5">{credEmail}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Password</p>
                <p className="text-sm font-mono text-foreground mt-0.5">{credPassword}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Login URL</p>
                <p className="text-sm font-mono text-foreground mt-0.5 break-all">{window.location.origin}/auth</p>
              </div>
            </div>

            <div className="flex items-start gap-2 p-3 rounded-md bg-[hsl(var(--warning))/0.1] border border-[hsl(var(--warning))/0.3]">
              <AlertTriangle className="h-4 w-4 text-[hsl(var(--warning))] shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground">
                <strong className="text-foreground">Copy these credentials now.</strong> The password will not be shown again.
              </p>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={handleCopyAll} className="flex-1 gap-1.5">
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? 'Copied!' : 'Copy all'}
              </Button>
              <Button onClick={handleCredentialsDone} className="flex-1">
                Done — I've copied the credentials
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
