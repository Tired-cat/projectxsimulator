import { Routes, Route } from 'react-router-dom';
import { AdminLayout } from '@/components/admin/AdminLayout';
import AdminProfessors from '@/pages/admin/AdminProfessors';
import AdminClasses from '@/pages/admin/AdminClasses';
import AdminComparison from '@/pages/admin/AdminComparison';
import AdminExport from '@/pages/admin/AdminExport';

export default function AdminPanel() {
  return (
    <AdminLayout>
      <Routes>
        <Route index element={<AdminProfessors />} />
        <Route path="classes" element={<AdminClasses />} />
        <Route path="comparison" element={<AdminComparison />} />
        <Route path="export" element={<AdminExport />} />
      </Routes>
    </AdminLayout>
  );
}
