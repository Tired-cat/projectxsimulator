import React, { type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, LogIn, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

interface AppErrorBoundaryProps {
  children: ReactNode;
}

interface AppErrorBoundaryState {
  error: Error | null;
  hasError: boolean;
  isChunkError: boolean;
}

const CHUNK_RELOAD_KEY = 'projectx-chunk-reload';
const CHUNK_RELOAD_WINDOW_MS = 30000;

function normalizeError(input: unknown): Error {
  if (input instanceof Error) return input;
  if (typeof input === 'string') return new Error(input);
  if (input && typeof input === 'object' && 'message' in input && typeof (input as { message?: unknown }).message === 'string') {
    return new Error((input as { message: string }).message);
  }
  return new Error('Unknown application error');
}

function isChunkLoadError(error: Error): boolean {
  const message = `${error.name} ${error.message}`.toLowerCase();
  return (
    message.includes('failed to fetch dynamically imported module') ||
    message.includes('importing a module script failed') ||
    message.includes('dynamically imported module') ||
    message.includes('chunkloaderror') ||
    message.includes('loading chunk') ||
    message.includes('module script')
  );
}

function shouldAutoReloadChunkError() {
  try {
    const raw = window.sessionStorage.getItem(CHUNK_RELOAD_KEY);
    const current = raw ? JSON.parse(raw) as { count?: number; at?: number } : {};
    const lastAt = current.at ?? 0;
    const count = Date.now() - lastAt > CHUNK_RELOAD_WINDOW_MS ? 0 : (current.count ?? 0);

    if (count >= 1) return false;

    window.sessionStorage.setItem(CHUNK_RELOAD_KEY, JSON.stringify({ count: count + 1, at: Date.now() }));
    return true;
  } catch {
    return false;
  }
}

export class AppErrorBoundary extends React.Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = {
    error: null,
    hasError: false,
    isChunkError: false,
  };

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    const normalized = normalizeError(error);
    return {
      error: normalized,
      hasError: true,
      isChunkError: isChunkLoadError(normalized),
    };
  }

  componentDidMount() {
    window.addEventListener('error', this.handleWindowError);
    window.addEventListener('unhandledrejection', this.handleUnhandledRejection);
  }

  componentWillUnmount() {
    window.removeEventListener('error', this.handleWindowError);
    window.removeEventListener('unhandledrejection', this.handleUnhandledRejection);
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('App crash caught by boundary:', error, errorInfo);
  }

  handleWindowError = (event: ErrorEvent) => {
    this.captureError(event.error ?? new Error(event.message || 'Window error'));
  };

  handleUnhandledRejection = (event: PromiseRejectionEvent) => {
    this.captureError(event.reason);
  };

  captureError = (input: unknown) => {
    const error = normalizeError(input);
    const chunkError = isChunkLoadError(error);

    if (chunkError && shouldAutoReloadChunkError()) {
      window.location.reload();
      return;
    }

    this.setState({
      error,
      hasError: true,
      isChunkError: chunkError,
    });
  };

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
                <CardTitle>{this.state.isChunkError ? 'Page update failed to load' : 'Something went wrong'}</CardTitle>
                <CardDescription>
                  {this.state.isChunkError
                    ? 'A page module failed while loading. The app will try one safe reload, and if it still fails you can reload manually or go back to login.'
                    : 'The page failed to load correctly. You can reload safely or go back to login instead of getting a blank screen.'}
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
