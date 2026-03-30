import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface ClassOption {
  id: string;
  name: string;
  section_code: string;
  class_code: string;
}

interface ClassFilterContextValue {
  classes: ClassOption[];
  selectedClassId: string | null;
  setSelectedClassId: (id: string | null) => void;
  loading: boolean;
  refetchClasses: () => Promise<void>;
}

const ClassFilterContext = createContext<ClassFilterContextValue | null>(null);

export function ClassFilterProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refetchClasses = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from('classes')
      .select('id, name, section_code, class_code');
    if (data) setClasses(data);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    refetchClasses();
  }, [refetchClasses]);

  return (
    <ClassFilterContext.Provider value={{ classes, selectedClassId, setSelectedClassId, loading, refetchClasses }}>
      {children}
    </ClassFilterContext.Provider>
  );
}

export function useClassFilter() {
  const ctx = useContext(ClassFilterContext);
  if (!ctx) throw new Error('useClassFilter must be used within ClassFilterProvider');
  return ctx;
}
