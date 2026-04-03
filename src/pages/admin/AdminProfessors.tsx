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
import { UserPlus, Copy, Check, AlertTriangle, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface ProfileRow {
  id: string;
  display_name: string | null;
  email: string | null;
  institution: string | null;
  created_at: string;
}

interface ClassRow { id: string; instructor_id: string }

function generatePassword(): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghjkmnpqrstuvwxyz';
  const digits = '23456789';
  const special = '!@#$%&*?';
  const pick = (s: string) => s[Math.floor(Math.random() * s.length)];
  const required = [pick(upper), pick(lower), pick(digits), pick(special)];
  const all = upper + lower + digits;
  const rest = Array.from({ length: 6 }, () => pick(all));
  const chars = [...required, ...rest];
  for (let i = chars.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}

function getInitials(name: string | null): string {
  if (!name) return '??';
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('');
}

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

export default function AdminProfessors() {
  const [professors, setProfessors] = useState<ProfileRow[]>([]);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Create modal
  const [createOpen, setCreateOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [institution, setInstitution] = useState('RIT Dubai');
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Credentials modal
  const [credentialsOpen, setCredentialsOpen] = useState(false);
  const [credEmail, setCredEmail] = useState('');
  const [credPassword, setCredPassword] = useState('');
  const [copied, setCopied] = useState(false);

  // Delete modal
  const [deleteTarget, setDeleteTarget] = useState<ProfileRow | null>(null);
  const [deleteConfirmEmail, setDeleteConfirmEmail] = useState('');
  const [deleting, setDeleting] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [pRes, cRes] = await Promise.all([
      supabase.from('profiles').select('id, display_name, email, institution, created_at').eq('role', 'professor'),
      supabase.from('classes').select('id, instructor_id'),
    ]);
    if (pRes.data) setProfessors(pRes.data);
    if (cRes.data) setClasses(cRes.data as ClassRow[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const profRows = useMemo(() => {
    return professors.map(p => ({
      ...p,
      classesCount: classes.filter(c => c.instructor_id === p.id).length,
    }));
  }, [professors, classes]);

  // ── Create ──
  const handleCreate = async () => {
    const trimmedEmail = email.trim();
    const trimmedName = displayName.trim();
    if (!trimmedEmail || !trimmedName) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setFormError('Please enter a valid email address.');
      return;
    }
    setFormError(null);
    setCreating(true);
    const password = generatePassword();

    try {
      const { ok, data } = await adminFetch('create-professor', {
        email: trimmedEmail,
        display_name: trimmedName,
        institution: institution.trim() || 'RIT Dubai',
        password,
      });
      setCreating(false);
      if (!ok || data?.error) {
        const msg = data?.error || 'Failed to create account';
        setFormError(msg.toLowerCase().includes('already exists')
          ? 'An account with this email already exists.' : msg);
        return;
      }
    } catch {
      setCreating(false);
      setFormError('Network error');
      return;
    }

    setCreateOpen(false);
    setCredEmail(email.trim());
    setCredPassword(password);
    setCredentialsOpen(true);
    setEmail('');
    setDisplayName('');
    setInstitution('RIT Dubai');
    fetchData();
  };

  // ── Delete ──
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const { ok, data } = await adminFetch('delete-user', { user_id: deleteTarget.id });
      setDeleting(false);
      if (!ok || data?.error) {
        toast.error(data?.error || 'Failed to delete professor');
        return;
      }
      toast.success(`${deleteTarget.display_name || 'Professor'} has been removed.`);
      setDeleteTarget(null);
      setDeleteConfirmEmail('');
      fetchData();
    } catch {
      setDeleting(false);
      toast.error('Network error');
    }
  };

  const handleCopyAll = async () => {
    const text = `Email: ${credEmail}\nPassword: ${credPassword}\nLogin: ${window.location.origin}/auth`;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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

      {/* ── Professors Table ── */}
      <Card className="border border-border">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[280px]">Professor</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Institution</TableHead>
                  <TableHead className="text-center">Classes</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="w-[60px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {profRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                      No professors yet. Click "Create professor" to add one.
                    </TableCell>
                  </TableRow>
                ) : profRows.map(p => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-[#6B4F8A]/15 text-[#6B4F8A] flex items-center justify-center text-xs font-semibold shrink-0">
                          {getInitials(p.display_name)}
                        </div>
                        <span className="font-medium text-foreground">{p.display_name || '—'}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{p.email}</TableCell>
                    <TableCell className="text-muted-foreground">{p.institution || '—'}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary">{p.classesCount}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground tabular-nums text-sm">
                      {p.created_at ? new Date(p.created_at).toISOString().slice(0, 10) : '—'}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge className="bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))] text-[11px]">
                        Active
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-destructive/70 hover:text-destructive hover:bg-destructive/10"
                        onClick={() => { setDeleteTarget(p); setDeleteConfirmEmail(''); }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* ── Create Professor Modal ── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create professor account</DialogTitle>
            <DialogDescription>A login-ready account will be created with a generated password.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="prof-email">University email *</Label>
              <Input id="prof-email" type="email" value={email} onChange={e => { setEmail(e.target.value); setFormError(null); }} placeholder="professor@university.edu" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="prof-name">Display name *</Label>
              <Input id="prof-name" value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Dr. Jane Smith" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="prof-inst">Institution</Label>
              <Input id="prof-inst" value={institution} onChange={e => setInstitution(e.target.value)} placeholder="RIT Dubai" />
            </div>
            {formError && (
              <p className="text-sm text-destructive flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />{formError}
              </p>
            )}
            <Button onClick={handleCreate} disabled={creating || !email.trim() || !displayName.trim()} className="w-full">
              {creating ? 'Creating account…' : 'Create account'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Credentials Modal ── */}
      <Dialog open={credentialsOpen} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md" onPointerDownOutside={e => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Check className="h-5 w-5 text-[hsl(var(--success))]" />Account created
            </DialogTitle>
            <DialogDescription>Copy these credentials now. The password will not be shown again.</DialogDescription>
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
              <Button onClick={() => { setCredentialsOpen(false); setCredEmail(''); setCredPassword(''); setCopied(false); }} className="flex-1">
                Done — I've copied the credentials
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation Modal ── */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) { setDeleteTarget(null); setDeleteConfirmEmail(''); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" /> Delete professor
            </DialogTitle>
            <DialogDescription>
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {deleteTarget && (
            <div className="space-y-4 pt-2">
              <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-1">
                <p className="text-sm font-medium text-foreground">{deleteTarget.display_name}</p>
                <p className="text-sm text-muted-foreground">{deleteTarget.email}</p>
              </div>

              <div className="flex items-start gap-2 p-3 rounded-md bg-destructive/5 border border-destructive/20">
                <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground">
                  This will remove their login access. Their classes, student enrollments, and all session data will be preserved.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="delete-confirm" className="text-xs text-muted-foreground">
                  Type <strong className="text-foreground font-mono">{deleteTarget.email}</strong> to confirm
                </Label>
                <Input
                  id="delete-confirm"
                  value={deleteConfirmEmail}
                  onChange={e => setDeleteConfirmEmail(e.target.value)}
                  placeholder={deleteTarget.email || ''}
                  className="font-mono text-sm"
                />
              </div>

              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={deleting || deleteConfirmEmail !== deleteTarget.email}
                className="w-full"
              >
                {deleting ? 'Deleting…' : 'Delete professor'}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
