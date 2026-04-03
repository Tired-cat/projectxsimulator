import { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { RouteLoader } from '@/components/RouteLoader';

const AdminOverview = lazy(() => import('@/pages/admin/AdminOverview'));
const AdminProfessors = lazy(() => import('@/pages/admin/AdminProfessors'));
const AdminStudents = lazy(() => import('@/pages/admin/AdminStudents'));
const AdminClasses = lazy(() => import('@/pages/admin/AdminClasses'));
const AdminClassCodes = lazy(() => import('@/pages/admin/AdminClassCodes'));
const AdminComparison = lazy(() => import('@/pages/admin/AdminComparison'));
const AdminExport = lazy(() => import('@/pages/admin/AdminExport'));
const AdminPilot = lazy(() => import('@/pages/admin/AdminPilot'));
const AdminSystem = lazy(() => import('@/pages/admin/AdminSystem'));

export default function AdminPanel() {
  return (
    <AdminLayout>
      <Suspense fallback={<RouteLoader label="Loading admin page…" />}>
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
      </Suspense>
    </AdminLayout>
  );
}
