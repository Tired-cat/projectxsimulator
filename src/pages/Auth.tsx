import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { GraduationCap, BookOpen, Shield } from 'lucide-react';

const ADMIN_EMAIL = 'ashwonsouq@gmail.com';

export default function Auth() {
  const { user, signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('student');
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [classCode, setClassCode] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const resetFields = () => {
    setEmail('');
    setPassword('');
    setDisplayName('');
    setClassCode('');
    setIsSignUp(false);
  };

  const handleStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    if (isSignUp) {
      // Validate class code first
      if (!classCode.trim()) {
        toast({ title: 'Class code required', description: 'Please enter the 4-digit class code from your professor.', variant: 'destructive' });
        setSubmitting(false);
        return;
      }

      const { data: classData, error: classError } = await supabase
        .from('classes')
        .select('id, name')
        .eq('class_code', classCode.trim())
        .maybeSingle();

      if (classError || !classData) {
        toast({ title: 'Invalid class code', description: 'No class found with that code. Please check with your professor.', variant: 'destructive' });
        setSubmitting(false);
        return;
      }

      const { error } = await signUp(email, password, 'student', displayName);
      if (error) {
        toast({ title: 'Sign up failed', description: error, variant: 'destructive' });
      } else {
        // Enroll after signup — we need to wait for auth state, so store class info
        localStorage.setItem('pending_enrollment_class_id', classData.id);
        toast({ title: 'Check your email', description: `A confirmation link has been sent. You'll be enrolled in "${classData.name}" after verifying.` });
      }
    } else {
      // Sign in — if class code provided, validate and enroll
      const { error } = await signIn(email, password);
      if (error) {
        toast({ title: 'Sign in failed', description: error, variant: 'destructive' });
      } else if (classCode.trim()) {
        // Try to enroll in the class after login
        const { data: classData } = await supabase
          .from('classes')
          .select('id, name')
          .eq('class_code', classCode.trim())
          .maybeSingle();

        if (classData) {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            await supabase.from('student_enrollments').upsert(
              { user_id: user.id, class_id: classData.id } as any,
              { onConflict: 'user_id,class_id' }
            );
            toast({ title: 'Enrolled!', description: `You've been added to "${classData.name}".` });
          }
        }
      }
    }

    setSubmitting(false);
  };

  const handleProfessorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    if (isSignUp) {
      const { error } = await signUp(email, password, 'professor', displayName);
      if (error) {
        toast({ title: 'Sign up failed', description: error, variant: 'destructive' });
      } else {
        toast({ title: 'Check your email', description: 'A confirmation link has been sent to your email address.' });
      }
    } else {
      const { error } = await signIn(email, password);
      if (error) {
        toast({ title: 'Sign in failed', description: error, variant: 'destructive' });
      }
    }

    setSubmitting(false);
  };

  const handleAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    if (email.trim().toLowerCase() !== ADMIN_EMAIL) {
      toast({ title: 'Access denied', description: 'Only the designated admin can sign in here.', variant: 'destructive' });
      setSubmitting(false);
      return;
    }

    const { error } = await signIn(email, password);
    if (error) {
      toast({ title: 'Sign in failed', description: error, variant: 'destructive' });
    }

    setSubmitting(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md border-border shadow-lg">
        <CardHeader className="text-center space-y-2 pb-2">
          <CardTitle className="text-2xl">ProjectX Simulator</CardTitle>
          <CardDescription>Sign in to continue</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); resetFields(); }}>
            <TabsList className="grid w-full grid-cols-3 mb-4">
              <TabsTrigger value="student" className="gap-1.5 text-xs">
                <GraduationCap className="h-3.5 w-3.5" /> Student
              </TabsTrigger>
              <TabsTrigger value="professor" className="gap-1.5 text-xs">
                <BookOpen className="h-3.5 w-3.5" /> Professor
              </TabsTrigger>
              <TabsTrigger value="admin" className="gap-1.5 text-xs">
                <Shield className="h-3.5 w-3.5" /> Admin
              </TabsTrigger>
            </TabsList>

            {/* ─── STUDENT TAB ─── */}
            <TabsContent value="student">
              <form onSubmit={handleStudentSubmit} className="space-y-3">
                {isSignUp && (
                  <div className="space-y-1.5">
                    <Label htmlFor="s-name">Full Name</Label>
                    <Input id="s-name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Your full name" required />
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label htmlFor="s-email">University Email</Label>
                  <Input id="s-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@university.edu" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="s-pass">Password</Label>
                  <Input id="s-pass" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="s-code">Class Code</Label>
                  <Input
                    id="s-code"
                    value={classCode}
                    onChange={(e) => setClassCode(e.target.value)}
                    placeholder="e.g. 4821"
                    maxLength={4}
                    className="text-center text-lg tracking-widest font-mono"
                    required={isSignUp}
                  />
                  <p className="text-xs text-muted-foreground">Enter the 4-digit code from your professor</p>
                </div>
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? 'Please wait…' : isSignUp ? 'Create Account' : 'Sign In'}
                </Button>
              </form>
              <div className="mt-4 text-center">
                <button onClick={() => setIsSignUp(!isSignUp)} className="text-sm text-muted-foreground hover:text-foreground transition-colors underline underline-offset-4">
                  {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
                </button>
              </div>
            </TabsContent>

            {/* ─── PROFESSOR TAB ─── */}
            <TabsContent value="professor">
              <form onSubmit={handleProfessorSubmit} className="space-y-3">
                {isSignUp && (
                  <div className="space-y-1.5">
                    <Label htmlFor="p-name">Display Name</Label>
                    <Input id="p-name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Dr. Smith" />
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label htmlFor="p-email">Email</Label>
                  <Input id="p-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="professor@university.edu" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="p-pass">Password</Label>
                  <Input id="p-pass" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
                </div>
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? 'Please wait…' : isSignUp ? 'Create Account' : 'Sign In'}
                </Button>
              </form>
              <div className="mt-4 text-center">
                <button onClick={() => setIsSignUp(!isSignUp)} className="text-sm text-muted-foreground hover:text-foreground transition-colors underline underline-offset-4">
                  {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
                </button>
              </div>
            </TabsContent>

            {/* ─── ADMIN TAB ─── */}
            <TabsContent value="admin">
              <form onSubmit={handleAdminSubmit} className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="a-email">Admin Email</Label>
                  <Input id="a-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@projectx.edu" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="a-pass">Password</Label>
                  <Input id="a-pass" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
                </div>
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? 'Please wait…' : 'Sign In'}
                </Button>
              </form>
              <p className="text-xs text-muted-foreground text-center mt-3">
                Admin access is restricted to authorized personnel only.
              </p>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
