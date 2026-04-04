import { Suspense, lazy } from 'react';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { RoleGuard } from '@/components/RoleGuard';
import { RouteLoader } from '@/components/RouteLoader';

const Index = lazy(() => import('./pages/Index'));
const Auth = lazy(() => import('./pages/Auth'));
const AuthRedirect = lazy(() => import('./pages/AuthRedirect'));
const ProfessorDashboard = lazy(() => import('./pages/ProfessorDashboard'));
const AdminPanel = lazy(() => import('./pages/AdminPanel'));
const Enroll = lazy(() => import('./pages/Enroll'));
const Unauthorized = lazy(() => import('./pages/Unauthorized'));
const NotFound = lazy(() => import('./pages/NotFound'));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route
              path="/auth"
              element={
                <Suspense fallback={<RouteLoader fullScreen />}>
                  <Auth />
                </Suspense>
              }
            />
            <Route
              path="/auth-redirect"
              element={
                <Suspense fallback={<RouteLoader fullScreen />}>
                  <AuthRedirect />
                </Suspense>
              }
            />
            <Route
              path="/unauthorized"
              element={
                <Suspense fallback={<RouteLoader fullScreen />}>
                  <Unauthorized />
                </Suspense>
              }
            />
            <Route
              path="/enroll"
              element={
                <Suspense fallback={<RouteLoader fullScreen />}>
                  <Enroll />
                </Suspense>
              }
            />
            <Route
              path="/"
              element={
                <RoleGuard allowed={['student']}>
                  <Suspense fallback={<RouteLoader fullScreen />}>
                    <Index />
                  </Suspense>
                </RoleGuard>
              }
            />
            <Route
              path="/dashboard/*"
              element={
                <RoleGuard allowed={['professor']}>
                  <Suspense fallback={<RouteLoader fullScreen />}>
                    <ProfessorDashboard />
                  </Suspense>
                </RoleGuard>
              }
            />
            <Route
              path="/admin/*"
              element={
                <RoleGuard allowed={['admin']}>
                  <Suspense fallback={<RouteLoader fullScreen />}>
                    <AdminPanel />
                  </Suspense>
                </RoleGuard>
              }
            />
            <Route
              path="*"
              element={
                <Suspense fallback={<RouteLoader fullScreen />}>
                  <NotFound />
                </Suspense>
              }
            />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
