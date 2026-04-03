import { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { RouteLoader } from '@/components/RouteLoader';

const DashboardOverview = lazy(() => import('@/pages/dashboard/DashboardOverview'));
const DashboardEngagement = lazy(() => import('@/pages/dashboard/DashboardEngagement'));
const DashboardReasoning = lazy(() => import('@/pages/dashboard/DashboardReasoning'));
const DashboardAiUsage = lazy(() => import('@/pages/dashboard/DashboardAiUsage'));
const DashboardStudents = lazy(() => import('@/pages/dashboard/DashboardStudents'));

export default function ProfessorDashboard() {
  return (
    <DashboardLayout>
      <Suspense fallback={<RouteLoader label="Loading dashboard…" />}>
        <Routes>
          <Route index element={<DashboardOverview />} />
          <Route path="overview" element={<Navigate to="/dashboard" replace />} />
          <Route path="engagement" element={<DashboardEngagement />} />
          <Route path="reasoning" element={<DashboardReasoning />} />
          <Route path="ai-usage" element={<DashboardAiUsage />} />
          <Route path="students" element={<DashboardStudents />} />
        </Routes>
      </Suspense>
    </DashboardLayout>
  );
}
