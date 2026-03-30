import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { RoleGuard } from "@/components/RoleGuard";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import AuthRedirect from "./pages/AuthRedirect";
import ProfessorDashboard from "./pages/ProfessorDashboard";
import AdminPanel from "./pages/AdminPanel";
import Unauthorized from "./pages/Unauthorized";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/auth-redirect" element={<AuthRedirect />} />
            <Route path="/unauthorized" element={<Unauthorized />} />

            {/* Student route */}
            <Route
              path="/"
              element={
                <RoleGuard allowed={['student']}>
                  <Index />
                </RoleGuard>
              }
            />

            {/* Professor routes */}
            <Route
              path="/dashboard/*"
              element={
                <RoleGuard allowed={['professor']}>
                  <ProfessorDashboard />
                </RoleGuard>
              }
            />

            {/* Admin route */}
            <Route
              path="/admin/*"
              element={
                <RoleGuard allowed={['admin']}>
                  <AdminPanel />
                </RoleGuard>
              }
            />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
