import { Routes, Route } from 'react-router-dom';
import { AdminLayout } from '@/components/admin/AdminLayout';
import AdminOverview from '@/pages/admin/AdminOverview';
import AdminProfessors from '@/pages/admin/AdminProfessors';
import AdminStudents from '@/pages/admin/AdminStudents';
import AdminClasses from '@/pages/admin/AdminClasses';
import AdminClassCodes from '@/pages/admin/AdminClassCodes';
import AdminComparison from '@/pages/admin/AdminComparison';
import AdminExport from '@/pages/admin/AdminExport';
import AdminPilot from '@/pages/admin/AdminPilot';
import AdminSystem from '@/pages/admin/AdminSystem';

export default function AdminPanel() {
  return (
    <AdminLayout>
      <Routes>
        <Route index element={<AdminOverview />} />
        <Route path="professors" element={<AdminProfessors />} />
        <Route path="students" element={<AdminStudents />} />
        <Route path="classes" element={<AdminClasses />} />
        <Route path="class-codes" element={<AdminClassCodes />} />
        <Route path="comparison" element={<AdminComparison />} />
        <Route path="export" element={<AdminExport />} />
        <Route path="pilot" element={<AdminPilot />} />
        <Route path="system" element={<AdminSystem />} />
      </Routes>
    </AdminLayout>
  );
}
