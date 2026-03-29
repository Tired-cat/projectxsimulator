import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertCircle, ArrowLeft, UserPlus, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

// ⚠️ Change this to your admin email address
const ADMIN_EMAIL = 'admin@projectx.edu';

interface ProfessorProfile {
  id: string;
  display_name: string | null;
  email: string | null;
  created_at: string;
}

export default function AdminPanel() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [professors, setProfessors] = useState<ProfessorProfile[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviting, setInviting] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);

  const isAdmin = user?.email === ADMIN_EMAIL;

  const fetchProfessors = useCallback(async () => {
    setDataLoading(true);
    const { data } = await supabase
      .from('profiles')
      .select('id, display_name, email, created_at')
      .eq('role', 'professor');
    if (data) setProfessors(data);
    setDataLoading(false);
  }, []);

  useEffect(() => {
    if (isAdmin) fetchProfessors();
  }, [isAdmin, fetchProfessors]);

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    setInviting(true);

    // Create a placeholder auth user via signUp with a random password
    // The professor will reset their password on first login
    const tempPassword = crypto.randomUUID();
    const { data, error } = await supabase.auth.signUp({
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
      setInviteEmail('');
      setInviteName('');
      fetchProfessors();
    }
  };

  if (authLoading) {
    return <div className="h-screen flex items-center justify-center bg-background"><p className="text-muted-foreground">Loading…</p></div>;
  }

  if (!user || !isAdmin) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center space-y-4">
            <AlertCircle className="h-12 w-12 mx-auto text-destructive" />
            <p className="font-medium">Access denied. Admin only.</p>
            <Button variant="outline" onClick={() => navigate('/')}>Go Home</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Button size="icon" variant="ghost" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <Shield className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-bold font-[var(--font-heading)]">Admin Panel</h1>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* Invite Professor */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <UserPlus className="h-5 w-5" /> Invite Professor
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <Label className="text-xs text-muted-foreground">Email</Label>
                <Input
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="professor@university.edu"
                  type="email"
                />
              </div>
              <div className="flex-1">
                <Label className="text-xs text-muted-foreground">Display Name (optional)</Label>
                <Input
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  placeholder="Dr. Smith"
                />
              </div>
              <div className="flex items-end">
                <Button onClick={handleInvite} disabled={inviting || !inviteEmail.trim()}>
                  {inviting ? 'Inviting…' : 'Send Invite'}
                </Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              The professor will receive a verification email to set up their account.
            </p>
          </CardContent>
        </Card>

        {/* Professor List */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">All Professors</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {dataLoading ? (
              <div className="p-8 text-center text-muted-foreground">Loading…</div>
            ) : professors.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">No professors yet.</div>
            ) : (
              <ScrollArea className="max-h-[50vh]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Joined</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {professors.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">{p.display_name || '—'}</TableCell>
                        <TableCell>{p.email}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(p.created_at).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
