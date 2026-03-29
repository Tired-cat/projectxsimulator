import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface ClassOption {
  id: string;
  name: string;
  section_code: string;
}

interface ClassSwitcherProps {
  classes: ClassOption[];
  selectedClassId: string | null;
  onSelect: (classId: string | null) => void;
}

export function ClassSwitcher({ classes, selectedClassId, onSelect }: ClassSwitcherProps) {
  return (
    <Select
      value={selectedClassId ?? 'all'}
      onValueChange={(v) => onSelect(v === 'all' ? null : v)}
    >
      <SelectTrigger className="w-[240px]">
        <SelectValue placeholder="All Classes" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All Classes</SelectItem>
        {classes.map((c) => (
          <SelectItem key={c.id} value={c.id}>
            {c.name} — {c.section_code}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
