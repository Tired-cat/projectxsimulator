import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ShieldOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export default function Unauthorized() {
  const navigate = useNavigate();
  const { signOut } = useAuth();

  const handleBackToLogin = async () => {
    await signOut();
    navigate('/auth', { replace: true });
  };

  return (
    <div className="h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full">
        <CardContent className="pt-6 text-center space-y-4">
          <ShieldOff className="h-12 w-12 mx-auto text-destructive" />
          <h1 className="text-xl font-bold">Access Denied</h1>
          <p className="text-muted-foreground text-sm">
            You don't have permission to access this page.
          </p>
          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={() => navigate('/')}>
              Go Home
            </Button>
            <Button onClick={handleBackToLogin}>
              Back to Login
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
