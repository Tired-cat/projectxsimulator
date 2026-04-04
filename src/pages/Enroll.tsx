import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useEnrollmentCheck } from '@/hooks/useEnrollmentCheck';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { GraduationCap } from 'lucide-react';

export default function Enroll() {
  const { user, role, loading } = useAuth();
  const { enrolled, loading: enrollLoading } = useEnrollmentCheck(user?.id, role);
  const navigate = useNavigate();

  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const normalize = (v: string) => v.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);

  if (loading || (user && role === null) || enrollLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Loading…</p>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;
  if (role !== 'student') return <Navigate to="/auth-redirect" replace />;
  if (enrolled) return <Navigate to="/" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const normalized = normalize(code.trim());

    if (normalized.length < 4) {
      setError('Please enter a 4-character class code.');
      return;
    }

    setSubmitting(true);

    // Look up class
    const { data: classRows, error: lookupErr } = await supabase
      .rpc('lookup_class_by_code', { _class_code: normalized });

    const classData = classRows?.[0] ?? null;

    if (lookupErr) {
      setError('Connection error. Please check your internet and try again.');
      setSubmitting(false);
      return;
    }

    if (!classData) {
      setError('Class code not found. Check with your professor.');
      setSubmitting(false);
      return;
    }

    // Insert enrollment
    const { error: insertErr } = await supabase
      .from('student_enrollments')
      .upsert(
        { user_id: user.id, class_id: classData.id } as any,
        { onConflict: 'user_id,class_id' }
      );

    if (insertErr) {
      setError('Something went wrong. Please try again.');
      setSubmitting(false);
      return;
    }

    navigate('/', { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md border-border shadow-lg">
        <CardHeader className="text-center space-y-2 pb-2">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <GraduationCap className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">Enter your class code</CardTitle>
          <CardDescription>Your professor will have given you a 4-character code.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              value={code}
              onChange={(e) => { setCode(normalize(e.target.value)); setError(''); }}
              placeholder="e.g. 4821"
              maxLength={4}
              className="text-center text-2xl tracking-[0.3em] font-mono h-14"
              autoFocus
            />

            {error && (
              <p className="text-sm text-destructive text-center">{error}</p>
            )}

            <Button type="submit" className="w-full" disabled={submitting || code.length < 4}>
              {submitting ? 'Joining…' : 'Join class'}
            </Button>

            <p className="text-xs text-muted-foreground text-center">
              Contact your professor if you don't have a code.
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
