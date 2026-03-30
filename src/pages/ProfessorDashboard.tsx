import { Routes, Route, Navigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import DashboardOverview from '@/pages/dashboard/DashboardOverview';
import PlaceholderPage from '@/pages/dashboard/PlaceholderPage';

export default function ProfessorDashboard() {
  return (
    <DashboardLayout>
      <Routes>
        <Route index element={<DashboardOverview />} />
        <Route path="overview" element={<Navigate to="/dashboard" replace />} />
        <Route path="engagement" element={<PlaceholderPage title="Engagement" />} />
        <Route path="reasoning" element={<PlaceholderPage title="Reasoning Quality" />} />
        <Route path="ai-usage" element={<PlaceholderPage title="AI Usage" />} />
        <Route path="students" element={<PlaceholderPage title="Students" />} />
      </Routes>
    </DashboardLayout>
  );
}
