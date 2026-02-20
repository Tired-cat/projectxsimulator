// Evidence chips — draggable data points from the dashboard
export interface EvidenceChip {
  id: string;
  label: string;
  value: string;
  context: string;
  sourceId: string;
  createdAt: number;
}

export type ReasoningBlockId = 'descriptive' | 'diagnostic' | 'predictive' | 'prescriptive';

export type ReasoningBoardState = Record<ReasoningBlockId, EvidenceChip[]>;

export const REASONING_BLOCKS: {
  id: ReasoningBlockId;
  title: string;
  question: string;
  color: string;
  bgColor: string;
}[] = [
  {
    id: 'descriptive',
    title: 'Descriptive',
    question: 'What happened?',
    color: 'hsl(var(--primary))',
    bgColor: 'hsl(var(--primary) / 0.08)',
  },
  {
    id: 'diagnostic',
    title: 'Diagnostic',
    question: 'Why did it happen?',
    color: 'hsl(38 92% 50%)',
    bgColor: 'hsl(38 92% 50% / 0.08)',
  },
  {
    id: 'predictive',
    title: 'Predictive',
    question: 'What will happen next if…?',
    color: 'hsl(271 81% 56%)',
    bgColor: 'hsl(271 81% 56% / 0.08)',
  },
  {
    id: 'prescriptive',
    title: 'Prescriptive',
    question: 'What should we do?',
    color: 'hsl(142 71% 45%)',
    bgColor: 'hsl(142 71% 45% / 0.08)',
  },
];

let chipCounter = 0;
export function createEvidenceChip(
  label: string,
  value: string,
  context: string,
  sourceId: string
): EvidenceChip {
  return {
    id: `chip-${++chipCounter}-${Date.now()}`,
    label,
    value,
    context,
    sourceId,
    createdAt: Date.now(),
  };
}
