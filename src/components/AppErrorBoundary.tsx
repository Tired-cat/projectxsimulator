import React, { type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, LogIn, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

interface AppErrorBoundaryProps {
  children: ReactNode;
}

interface AppErrorBoundaryState {
  hasError: boolean;
}

export class AppErrorBoundary extends React.Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = {
    hasError: false,
  };

  static getDerivedStateFromError(): AppErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('App crash caught by boundary:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoToLogin = () => {
    window.location.href = '/auth';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <Card className="w-full max-w-lg border-border shadow-lg">
            <CardHeader className="text-center space-y-3">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <CardTitle>Something went wrong</CardTitle>
                <CardDescription>
                  The page failed to load correctly. You can reload safely or go back to login instead of getting a blank screen.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Button onClick={this.handleReload} className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Reload page
              </Button>
              <Button variant="outline" onClick={this.handleGoToLogin} className="gap-2">
                <LogIn className="h-4 w-4" />
                Go to login
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
