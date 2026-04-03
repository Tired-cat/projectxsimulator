import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

async function adminFetch(fnName: string, body: Record<string, unknown>) {
  const session = (await supabase.auth.getSession()).data.session;
  const res = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${fnName}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session?.access_token}`,
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
      body: JSON.stringify(body),
    },
  );
  const data = await res.json();
  return { ok: res.ok, data };
}

function DangerSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="border-destructive/30 bg-destructive/5">
      <CardHeader className="pb-2">
        <CardTitle className="text-base text-destructive">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">{children}</CardContent>
    </Card>
  );
}

export default function AdminSystem() {
  // 1 — Delete professor
  const [profEmail, setProfEmail] = useState('');
  const [profBusy, setProfBusy] = useState(false);

  // 2 — Delete class
  const [classCode, setClassCode] = useState('');
  const [classBusy, setClassBusy] = useState(false);

  // 3 — Remove student from class
  const [removeStudentEmail, setRemoveStudentEmail] = useState('');
  const [removeClassCode, setRemoveClassCode] = useState('');
  const [removeBusy, setRemoveBusy] = useState(false);

  // 4 — Hard delete student
  const [hardEmail, setHardEmail] = useState('');
  const [hardConfirm, setHardConfirm] = useState('');
  const [hardBusy, setHardBusy] = useState(false);

  const handleDeleteProfessor = async () => {
    setProfBusy(true);
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', profEmail.trim())
      .eq('role', 'professor')
      .maybeSingle();
    if (!profile) {
      toast.error('No professor found with that email');
      setProfBusy(false);
      return;
    }
    const { ok, data } = await adminFetch('delete-user', { user_id: profile.id });
    setProfBusy(false);
    if (!ok) { toast.error(data?.error || 'Failed'); return; }
    toast.success('Professor account deleted');
    setProfEmail('');
  };

  const handleDeleteClass = async () => {
    setClassBusy(true);
    const { data: cls } = await supabase
      .from('classes')
      .select('id')
      .ilike('class_code', classCode.trim())
      .maybeSingle();
    if (!cls) {
      toast.error('No class found with that code');
      setClassBusy(false);
      return;
    }
    const { error } = await supabase.from('classes').delete().eq('id', cls.id);
    setClassBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Class deleted');
    setClassCode('');
  };

  const handleRemoveStudent = async () => {
    setRemoveBusy(true);
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', removeStudentEmail.trim())
      .maybeSingle();
    if (!profile) {
      toast.error('No student found with that email');
      setRemoveBusy(false);
      return;
    }
    const { data: cls } = await supabase
      .from('classes')
      .select('id')
      .ilike('class_code', removeClassCode.trim())
      .maybeSingle();
    if (!cls) {
      toast.error('No class found with that code');
      setRemoveBusy(false);
      return;
    }
    const { error } = await supabase
      .from('student_enrollments')
      .delete()
      .eq('user_id', profile.id)
      .eq('class_id', cls.id);
    setRemoveBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Student removed from class');
    setRemoveStudentEmail('');
    setRemoveClassCode('');
  };

  const handleHardDelete = async () => {
    setHardBusy(true);
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', hardEmail.trim())
      .maybeSingle();
    if (!profile) {
      toast.error('No account found with that email');
      setHardBusy(false);
      return;
    }
    const { ok, data } = await adminFetch('delete-user', { user_id: profile.id });
    setHardBusy(false);
    if (!ok) { toast.error(data?.error || 'Failed'); return; }
    toast.success('Student account permanently deleted');
    setHardEmail('');
    setHardConfirm('');
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold font-[var(--font-heading)] text-foreground">System / Danger zone</h2>

      <div className="flex items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/10 p-4">
        <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
        <p className="text-sm text-destructive font-medium">
          Actions in this section are irreversible. Read each warning carefully before proceeding.
        </p>
      </div>

      <div className="space-y-4">
        {/* 1 — Delete professor */}
        <DangerSection
          title="Delete professor account"
          description="Removes login access only. Classes, enrollments, and all session data are preserved."
        >
          <div className="space-y-1.5">
            <Label>Professor email</Label>
            <Input
              value={profEmail}
              onChange={e => setProfEmail(e.target.value)}
              placeholder="professor@university.edu"
              type="email"
            />
          </div>
          <Button
            variant="destructive"
            disabled={profBusy || !profEmail.trim()}
            onClick={handleDeleteProfessor}
            className="w-full"
          >
            {profBusy ? 'Deleting…' : 'Delete professor account'}
          </Button>
        </DangerSection>

        {/* 2 — Delete class */}
        <DangerSection
          title="Delete a class"
          description="Removes the class and all student enrollments. Session data is preserved but no longer linked to a class."
        >
          <div className="space-y-1.5">
            <Label>Class code</Label>
            <Input
              value={classCode}
              onChange={e => setClassCode(e.target.value.toUpperCase().slice(0, 4))}
              placeholder="e.g. AB3K"
              className="font-mono"
              maxLength={4}
            />
          </div>
          <Button
            variant="destructive"
            disabled={classBusy || classCode.trim().length !== 4}
            onClick={handleDeleteClass}
            className="w-full"
          >
            {classBusy ? 'Deleting…' : 'Delete class'}
          </Button>
        </DangerSection>

        {/* 3 — Remove student from class */}
        <DangerSection
          title="Remove student from class"
          description="Removes the enrollment only. Student account and all session data are preserved."
        >
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Student email</Label>
              <Input
                value={removeStudentEmail}
                onChange={e => setRemoveStudentEmail(e.target.value)}
                placeholder="student@edu"
                type="email"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Class code</Label>
              <Input
                value={removeClassCode}
                onChange={e => setRemoveClassCode(e.target.value.toUpperCase().slice(0, 4))}
                placeholder="AB3K"
                className="font-mono"
                maxLength={4}
              />
            </div>
          </div>
          <Button
            variant="destructive"
            disabled={removeBusy || !removeStudentEmail.trim() || removeClassCode.trim().length !== 4}
            onClick={handleRemoveStudent}
            className="w-full"
          >
            {removeBusy ? 'Removing…' : 'Remove student from class'}
          </Button>
        </DangerSection>

        {/* 4 — Hard delete student */}
        <DangerSection
          title="Hard delete student account"
          description="Permanently deletes the student account AND all their sessions, board events, submissions, and related data. This cannot be undone."
        >
          <div className="space-y-1.5">
            <Label>Student email</Label>
            <Input
              value={hardEmail}
              onChange={e => setHardEmail(e.target.value)}
              placeholder="student@edu"
              type="email"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Type <span className="font-mono font-bold">DELETE</span> to confirm</Label>
            <Input
              value={hardConfirm}
              onChange={e => setHardConfirm(e.target.value)}
              placeholder="DELETE"
            />
          </div>
          <Button
            variant="destructive"
            disabled={hardBusy || !hardEmail.trim() || hardConfirm !== 'DELETE'}
            onClick={handleHardDelete}
            className="w-full"
          >
            {hardBusy ? 'Deleting…' : 'Permanently delete student'}
          </Button>
        </DangerSection>
      </div>
    </div>
  );
}
