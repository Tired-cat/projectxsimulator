import { Routes, Route, Navigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import DashboardOverview from '@/pages/dashboard/DashboardOverview';
import DashboardEngagement from '@/pages/dashboard/DashboardEngagement';
import DashboardReasoning from '@/pages/dashboard/DashboardReasoning';
import DashboardAiUsage from '@/pages/dashboard/DashboardAiUsage';
import DashboardStudents from '@/pages/dashboard/DashboardStudents';

export default function ProfessorDashboard() {
  return (
    <DashboardLayout>
      <Routes>
        <Route index element={<DashboardOverview />} />
        <Route path="overview" element={<Navigate to="/dashboard" replace />} />
        <Route path="engagement" element={<DashboardEngagement />} />
        <Route path="reasoning" element={<DashboardReasoning />} />
        <Route path="ai-usage" element={<DashboardAiUsage />} />
        <Route path="students" element={<PlaceholderPage title="Students" />} />
      </Routes>
    </DashboardLayout>
  );
}
