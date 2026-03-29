import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';

interface AddClassDialogProps {
  onClassAdded: () => void;
}

export function AddClassDialog({ onClassAdded }: AddClassDialogProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'single' | 'bulk'>('single');
  const [name, setName] = useState('');
  const [sectionCode, setSectionCode] = useState('');
  const [bulkText, setBulkText] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSingleSubmit = async () => {
    if (!user || !name.trim() || !sectionCode.trim()) return;
    setLoading(true);
    const { error } = await supabase.from('classes').insert({
      name: name.trim(),
      section_code: sectionCode.trim(),
      instructor_id: user.id,
    });
    setLoading(false);
    if (error) {
      toast.error('Failed to create class');
    } else {
      toast.success('Class created!');
      setName('');
      setSectionCode('');
      setOpen(false);
      onClassAdded();
    }
  };

  const handleBulkSubmit = async () => {
    if (!user || !bulkText.trim()) return;
    setLoading(true);
    const lines = bulkText.trim().split('\n').filter(Boolean);
    const rows = lines.map((line) => {
      const [n, s] = line.split(',').map((x) => x.trim());
      return { name: n || 'Untitled', section_code: s || 'N/A', instructor_id: user.id };
    });
    const { error } = await supabase.from('classes').insert(rows);
    setLoading(false);
    if (error) {
      toast.error('Failed to create classes');
    } else {
      toast.success(`${rows.length} class(es) created!`);
      setBulkText('');
      setOpen(false);
      onClassAdded();
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <Plus className="h-3.5 w-3.5" /> Add Class
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Class</DialogTitle>
        </DialogHeader>
        <div className="flex gap-2 mb-4">
          <Button size="sm" variant={mode === 'single' ? 'default' : 'outline'} onClick={() => setMode('single')}>
            Single
          </Button>
          <Button size="sm" variant={mode === 'bulk' ? 'default' : 'outline'} onClick={() => setMode('bulk')}>
            Bulk (CSV)
          </Button>
        </div>

        {mode === 'single' ? (
          <div className="space-y-3">
            <div>
              <Label>Class Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Marketing 101" />
            </div>
            <div>
              <Label>Section Code</Label>
              <Input value={sectionCode} onChange={(e) => setSectionCode(e.target.value)} placeholder="MKT-101-A" />
            </div>
            <Button onClick={handleSingleSubmit} disabled={loading || !name.trim() || !sectionCode.trim()} className="w-full">
              {loading ? 'Creating…' : 'Create Class'}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <Label>One class per line: Name, Section Code</Label>
              <Textarea
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                placeholder={"Marketing 101, MKT-101-A\nDigital Marketing, MKT-201-B"}
                rows={5}
              />
            </div>
            <Button onClick={handleBulkSubmit} disabled={loading || !bulkText.trim()} className="w-full">
              {loading ? 'Creating…' : 'Create All'}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
