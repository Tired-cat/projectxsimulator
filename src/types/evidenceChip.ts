// Evidence chips - draggable data points from the dashboard
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
  // Contextualisation - a second chip attached as supporting evidence
  contextChip?: EvidenceChip | null;
}

export type ReasoningBlockId = 'descriptive' | 'diagnostic' | 'predictive' | 'prescriptive';

export type ReasoningBoardState = Record<ReasoningBlockId, EvidenceChip[]>;

export const REASONING_SEQUENCE: ReasoningBlockId[] = [
  'descriptive',
  'diagnostic',
  'predictive',
  'prescriptive',
];

export const BLOCK_PREREQUISITE: Record<ReasoningBlockId, ReasoningBlockId | null> = {
  descriptive: null,
  diagnostic: 'descriptive',
  predictive: 'diagnostic',
  prescriptive: 'predictive',
};

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
    question: 'What will happen next if...?',
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

// Single evidence templates (no context)
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
    "Now that I've made changes, [evidence] tells me what I can expect going forward.",
    'After acting, the new data showing [evidence] suggests the impact of my decision is becoming visible.',
  ],
};

// Paired evidence templates (with context chip)
export const PAIRED_NARRATIVE_TEMPLATES: Record<ReasoningBlockId, string[]> = {
  descriptive: [
    'Before making any changes, I noticed that [evidence], and when I looked at [context] alongside it, this stood out as significant.',
    'Looking at the original data, I observed that [evidence], which together with [context] caught my attention.',
    'At the start, [evidence] alone told one story, but pairing it with [context] revealed something more important.',
    'Before adjusting anything, I saw that [evidence], and [context] helped me understand the full picture.',
  ],
  diagnostic: [
    'Before making changes, I believed that [evidence] combined with [context] explained why this outcome occurred.',
    'Looking deeper, I concluded that [evidence] was the surface issue, but [context] revealed the real cause.',
    'At this point I thought [evidence] was significant, and [context] confirmed why this situation existed.',
    'Before adjusting, [evidence] pointed to the problem, and [context] helped me understand what was driving it.',
  ],
  prescriptive: [
    'Given that [evidence] showed one thing and [context] showed another, I decided a change needed to be made.',
    'Because [evidence] combined with [context] painted a clear picture, I chose to adjust my strategy.',
    'Taking both [evidence] and [context] into account, I made a decision to act.',
    'The combination of [evidence] and [context] led me to conclude that intervention was necessary.',
  ],
  predictive: [
    'After adjusting my strategy, [evidence] alongside [context] suggests this change will have a meaningful impact.',
    'Following my decision, seeing both [evidence] and [context] indicates things are shifting in the right direction.',
    "Now that I've acted, [evidence] combined with [context] tells me what I can expect going forward.",
    'After making changes, the relationship between [evidence] and [context] suggests my decision is taking effect.',
  ],
};

// Quadrant-specific connectors for the full story
export const QUADRANT_CONNECTORS: Record<ReasoningBlockId, string> = {
  descriptive: '', // stands alone
  diagnostic: 'This led me to question... ',
  predictive: 'After acting, ',
  prescriptive: 'As a result, ',
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
        return `Increase spending in ${channel} - positive ${metric} impact observed`;
      if (chip.chipKind === 'delta-decrease')
        return `Reallocate budget away from ${channel} to better-performing channels`;
      return `Review ${channel} allocation for optimal ${metric}`;

    default:
      return null;
  }
}

export function createEvidenceChip(
  label: string,
  value: string,
  context: string,
  sourceId: string,
  extra?: Partial<Pick<EvidenceChip, 'chipKind' | 'channelName' | 'metricName' | 'deltaValue'>>
): EvidenceChip {
  return {
    id: `chip-${crypto.randomUUID()}`,
    label,
    value,
    context,
    sourceId,
    createdAt: Date.now(),
    ...extra,
  };
}

export function isEvidenceChip(candidate: unknown): candidate is EvidenceChip {
  if (!candidate || typeof candidate !== 'object') return false;
  const chip = candidate as EvidenceChip;
  return (
    typeof chip.id === 'string' &&
    typeof chip.label === 'string' &&
    typeof chip.value === 'string' &&
    typeof chip.context === 'string' &&
    typeof chip.sourceId === 'string' &&
    typeof chip.createdAt === 'number'
  );
}

export function parseEvidenceChip(raw: string): EvidenceChip | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return isEvidenceChip(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function isSemanticallySameEvidence(a: EvidenceChip, b: EvidenceChip): boolean {
  return (
    a.sourceId === b.sourceId &&
    a.label === b.label &&
    a.value === b.value &&
    a.context === b.context
  );
}

export function isDuplicateChip(chips: EvidenceChip[], incoming: EvidenceChip): boolean {
  return chips.some(existing => existing.id === incoming.id || isSemanticallySameEvidence(existing, incoming));
}

function inferChannelToken(chip: EvidenceChip): string | null {
  if (chip.channelName) return chip.channelName.toLowerCase();
  const text = `${chip.label} ${chip.context} ${chip.sourceId}`.toLowerCase();
  const channels = ['tiktok', 'instagram', 'facebook', 'newspaper'];
  return channels.find(channel => text.includes(channel)) ?? null;
}

function duplicateIssuesInBlock(chips: EvidenceChip[], blockId: ReasoningBlockId): string[] {
  const seen = new Set<string>();
  const issues: string[] = [];

  for (const chip of chips) {
    const key = `${chip.sourceId}|${chip.label}|${chip.value}|${chip.context}`;
    if (seen.has(key)) {
      issues.push(`Duplicate evidence found in ${blockId}.`);
      break;
    }
    seen.add(key);
  }

  return issues;
}

export interface ReasoningBoardValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateReasoningBoard(board: ReasoningBoardState): ReasoningBoardValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const blockId of REASONING_SEQUENCE) {
    if (board[blockId].length === 0) {
      errors.push(`${blockId} is empty.`);
    }
  }

  for (const blockId of REASONING_SEQUENCE) {
    const prerequisite = BLOCK_PREREQUISITE[blockId];
    if (prerequisite && board[blockId].length > 0 && board[prerequisite].length === 0) {
      errors.push(`${blockId} has evidence before ${prerequisite}.`);
    }
  }

  for (const blockId of REASONING_SEQUENCE) {
    errors.push(...duplicateIssuesInBlock(board[blockId], blockId));
  }

  const evidenceUsage = new Map<string, Set<ReasoningBlockId>>();
  for (const blockId of REASONING_SEQUENCE) {
    for (const chip of board[blockId]) {
      const key = `${chip.sourceId}|${chip.label}|${chip.value}|${chip.context}`;
      const blocks = evidenceUsage.get(key) ?? new Set<ReasoningBlockId>();
      blocks.add(blockId);
      evidenceUsage.set(key, blocks);
    }
  }
  for (const [, blocks] of evidenceUsage) {
    if (blocks.size >= 3) {
      warnings.push('The same evidence is reused across most blocks; reasoning may be shallow.');
      break;
    }
  }

  const diagnosticChannels = new Set(
    board.diagnostic.map(inferChannelToken).filter((value): value is string => Boolean(value))
  );
  const prescriptiveChannels = new Set(
    board.prescriptive.map(inferChannelToken).filter((value): value is string => Boolean(value))
  );
  if (diagnosticChannels.size > 0 && prescriptiveChannels.size > 0) {
    const overlap = [...prescriptiveChannels].some(channel => diagnosticChannels.has(channel));
    if (!overlap) {
      warnings.push('Prescriptive actions do not clearly address diagnosed channels.');
    }
  }

  if (board.predictive.length > 0 && board.prescriptive.length === 0) {
    warnings.push('Predictive evidence exists without a matching prescriptive action.');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}
