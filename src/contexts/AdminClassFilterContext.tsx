import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ClassOption {
  id: string;
  name: string;
  class_code: string;
  section_code: string;
}

interface AdminClassFilterValue {
  classId: string | null; // null = all classes
  setClassId: (id: string | null) => void;
  classes: ClassOption[];
  loading: boolean;
}

const AdminClassFilterContext = createContext<AdminClassFilterValue | null>(null);

export function AdminClassFilterProvider({ children }: { children: ReactNode }) {
  const [classId, setClassId] = useState<string | null>(null);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('classes')
      .select('id, name, class_code')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (data) setClasses(data as ClassOption[]);
        setLoading(false);
      });
  }, []);

  return (
    <AdminClassFilterContext.Provider value={{ classId, setClassId, classes, loading }}>
      {children}
    </AdminClassFilterContext.Provider>
  );
}

export function useAdminClassFilter() {
  const ctx = useContext(AdminClassFilterContext);
  if (!ctx) throw new Error('useAdminClassFilter must be used within AdminClassFilterProvider');
  return ctx;
}
