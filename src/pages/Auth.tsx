import { useState } from 'react';
import { useAuthContext } from '@/contexts/AuthContext';
import type { AppRole } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { LogIn, UserPlus, GraduationCap, BookOpen } from 'lucide-react';

export default function Auth() {
  const { signIn, signUp } = useAuthContext();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState<AppRole>('student');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) {
          toast({ title: 'Login failed', description: error.message, variant: 'destructive' });
        }
      } else {
        const { error } = await signUp(email, password, role, displayName);
        if (error) {
          toast({ title: 'Sign up failed', description: error.message, variant: 'destructive' });
        } else {
          toast({
            title: 'Check your email',
            description: 'We sent you a verification link. Please verify your email to continue.',
          });
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-border/60 shadow-lg">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <GraduationCap className="w-6 h-6 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">
            LumbarPro Simulator
          </CardTitle>
          <CardDescription>
            {isLogin ? 'Sign in to continue your simulation' : 'Create an account to get started'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="displayName">Display Name</Label>
                <Input
                  id="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your name"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@university.edu"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>

            {!isLogin && (
              <div className="space-y-2">
                <Label>I am a…</Label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setRole('student')}
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                      role === 'student'
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-border hover:border-primary/40'
                    }`}
                  >
                    <BookOpen className="w-5 h-5" />
                    <span className="text-sm font-medium">Student</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole('professor')}
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                      role === 'professor'
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-border hover:border-primary/40'
                    }`}
                  >
                    <GraduationCap className="w-5 h-5" />
                    <span className="text-sm font-medium">Professor</span>
                  </button>
                </div>
              </div>
            )}

            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {isLogin ? 'Signing in…' : 'Creating account…'}
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  {isLogin ? <LogIn className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                  {isLogin ? 'Sign In' : 'Create Account'}
                </span>
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
