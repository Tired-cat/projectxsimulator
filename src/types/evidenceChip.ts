// Evidence chips — draggable data points from the dashboard
export interface EvidenceChip {
  id: string;
  label: string;
  value: string;
  context: string;
  sourceId: string;
  createdAt: number;
  // Delta metadata for smart reasoning labels
  chipKind?: 'metric' | 'delta-increase' | 'delta-decrease' | 'baseline' | 'product';
  channelName?: string;
  metricName?: string;
  deltaValue?: number;
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
    id: 'prescriptive',
    title: 'Prescriptive',
    question: 'What should we do?',
    color: 'hsl(142 71% 45%)',
    bgColor: 'hsl(142 71% 45% / 0.08)',
  },
  {
    id: 'predictive',
    title: 'Predictive',
    question: 'What will happen next if…?',
    color: 'hsl(271 81% 56%)',
    bgColor: 'hsl(271 81% 56% / 0.08)',
  },
];

// Narrative templates per quadrant
export const NARRATIVE_TEMPLATES: Record<ReasoningBlockId, string[]> = {
  descriptive: [
    'Before making any changes, I noticed that [evidence], which stood out to me as significant.',
    'Looking at the original data, I observed that [evidence].',
    'At the start, one thing that caught my attention was that [evidence].',
    'Before I adjusted anything, the data was showing me that [evidence], which I felt was worth noting.',
  ],
  diagnostic: [
    'Before making any changes, I believed that [evidence] explained why this outcome occurred.',
    'Looking at the original numbers, I concluded that [evidence] was the underlying cause.',
    'At this point, I thought that [evidence] was the reason behind what I was seeing.',
    'Before adjusting, I felt that [evidence] is what had caused this situation.',
  ],
  prescriptive: [
    'Given what I observed, I decided to act because of [evidence].',
    'Because of [evidence], I felt that a change needed to be made.',
    'Taking [evidence] into account, I chose to adjust my strategy.',
    'I made a decision to intervene based on [evidence].',
  ],
  predictive: [
    'After adjusting my strategy, the data now shows [evidence], which suggests this trend will continue.',
    'Following my decision, I can see that [evidence] indicates things are shifting.',
    'Now that I\'ve made changes, [evidence] tells me what I can expect going forward.',
    'After acting, the new data showing [evidence] suggests the impact of my decision is becoming visible.',
  ],
};

export function generateNarrativeSentence(
  chip: EvidenceChip,
  blockId: ReasoningBlockId,
  sentenceIndex: number
): string {
  const templates = NARRATIVE_TEMPLATES[blockId];
  const template = templates[Math.floor(Math.random() * templates.length)];
  const evidence = `${chip.label}: ${chip.value}`;
  const sentence = template.replace('[evidence]', evidence);

  if (sentenceIndex === 0) return sentence;
  if (sentenceIndex === 1) return `Then, ${sentence.charAt(0).toLowerCase()}${sentence.slice(1)}`;
  return `Following that, ${sentence.charAt(0).toLowerCase()}${sentence.slice(1)}`;
}

// Generate smart insight text based on chip metadata and target reasoning block
export function getSmartInsight(chip: EvidenceChip, blockId: ReasoningBlockId): string | null {
  const channel = chip.channelName;
  const metric = chip.metricName || 'spending';
  const delta = chip.deltaValue;

  if (!channel) return null;

  switch (blockId) {
    case 'descriptive':
      if (chip.chipKind === 'delta-increase')
        return `${channel} ${metric} increased by ${Math.abs(delta ?? 0).toLocaleString()}`;
      if (chip.chipKind === 'delta-decrease')
        return `${channel} ${metric} decreased by ${Math.abs(delta ?? 0).toLocaleString()}`;
      if (chip.chipKind === 'baseline')
        return `${channel} baseline ${metric}: ${chip.value}`;
      return `${channel} ${metric} is ${chip.value}`;

    case 'diagnostic':
      if (chip.chipKind === 'delta-increase')
        return `Spending was increased on ${channel}, driving higher ${metric}`;
      if (chip.chipKind === 'delta-decrease')
        return `Spending was reduced on ${channel}, lowering ${metric}`;
      return `Investigate why ${channel} ${metric} is at ${chip.value}`;

    case 'predictive':
      if (chip.chipKind === 'delta-increase')
        return `If ${channel} spending continues to increase, ${metric} will likely grow further`;
      if (chip.chipKind === 'delta-decrease')
        return `If ${channel} spending stays reduced, expect lower ${metric} going forward`;
      return `Continuing current ${channel} allocation may keep ${metric} at ${chip.value}`;

    case 'prescriptive':
      if (chip.chipKind === 'delta-increase')
        return `Increase spending in ${channel} — positive ${metric} impact observed`;
      if (chip.chipKind === 'delta-decrease')
        return `Reallocate budget away from ${channel} to better-performing channels`;
      return `Review ${channel} allocation for optimal ${metric}`;

    default:
      return null;
  }
}

let chipCounter = 0;
export function createEvidenceChip(
  label: string,
  value: string,
  context: string,
  sourceId: string,
  extra?: Partial<Pick<EvidenceChip, 'chipKind' | 'channelName' | 'metricName' | 'deltaValue'>>
): EvidenceChip {
  return {
    id: `chip-${++chipCounter}-${Date.now()}`,
    label,
    value,
    context,
    sourceId,
    createdAt: Date.now(),
    ...extra,
  };
}
