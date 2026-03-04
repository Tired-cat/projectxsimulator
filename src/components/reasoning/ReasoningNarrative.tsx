import { useMemo } from 'react';
import { useReasoningBoard } from '@/contexts/ReasoningBoardContext';
import { QUADRANT_CONNECTORS } from '@/types/evidenceChip';
import type { EvidenceChip, ReasoningBlockId } from '@/types/evidenceChip';
import { Separator } from '@/components/ui/separator';

function seededRandom(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash) + seed.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) / 2147483647;
}

// ── At a Glance: data-referenced, uses labels & values directly ──

function formatEvidence(chip: EvidenceChip): string {
  const base = `${chip.label}: ${chip.value}`;
  if (chip.contextChip) {
    return `${base} (supported by ${chip.contextChip.label}: ${chip.contextChip.value})`;
  }
  return base;
}

const GLANCE_CONTRAST = ['while', 'whereas', 'compared to', 'in contrast to'];
const GLANCE_ADDITIVE = ['alongside', 'together with', 'which together with', 'reinforced by'];

function pickGlanceConnector(a: EvidenceChip, b: EvidenceChip): string {
  const contrast =
    (a.chipKind === 'delta-increase' && b.chipKind === 'delta-decrease') ||
    (a.chipKind === 'delta-decrease' && b.chipKind === 'delta-increase') ||
    (a.sourceId !== b.sourceId);
  const pool = contrast ? GLANCE_CONTRAST : GLANCE_ADDITIVE;
  return pool[Math.floor(seededRandom(a.id + b.id) * pool.length)];
}

const GLANCE_OPENERS: Record<ReasoningBlockId, string[]> = {
  descriptive: [
    'I noticed that [items], which stood out as significant.',
    'Looking at the data, I observed [items].',
    'One thing that caught my attention was [items].',
  ],
  diagnostic: [
    'I believed that [items] explained why this outcome occurred.',
    'Looking deeper, I concluded that [items] was the underlying cause.',
    'At this point, I thought [items] was the reason behind what I was seeing.',
  ],
  prescriptive: [
    'Given what I observed, I decided to act because of [items].',
    'Because of [items], I felt a change needed to be made.',
    'Taking [items] into account, I chose to adjust my strategy.',
  ],
  predictive: [
    'After adjusting my strategy, [items] suggests this trend will continue.',
    'Following my decision, [items] indicates things are shifting.',
    'Now that I\'ve made changes, [items] tells me what to expect going forward.',
  ],
};

function generateGlanceSentence(chips: EvidenceChip[], blockId: ReasoningBlockId): string {
  if (chips.length === 0) return '';
  let phrase: string;
  if (chips.length === 1) {
    phrase = formatEvidence(chips[0]);
  } else {
    const parts = [formatEvidence(chips[0])];
    for (let i = 1; i < chips.length; i++) {
      parts.push(`${pickGlanceConnector(chips[i - 1], chips[i])} ${formatEvidence(chips[i])}`);
    }
    phrase = parts.join(', ');
  }
  const templates = GLANCE_OPENERS[blockId];
  const idx = Math.floor(seededRandom(chips.map(c => c.id).join('-') + blockId) * templates.length);
  return templates[idx].replace('[items]', phrase);
}

// ── Full Reasoning Story: human, relationship-focused, no raw data ──

function chipsContrast(a: EvidenceChip, b: EvidenceChip): boolean {
  return (
    (a.chipKind === 'delta-increase' && b.chipKind === 'delta-decrease') ||
    (a.chipKind === 'delta-decrease' && b.chipKind === 'delta-increase') ||
    (a.sourceId !== b.sourceId)
  );
}

function describeChip(chip: EvidenceChip): string {
  const ch = chip.channelName || chip.label.split(' ')[0];
  const m = chip.metricName || 'performance';
  if (chip.chipKind === 'delta-increase') return `strong ${m} growth in ${ch}`;
  if (chip.chipKind === 'delta-decrease') return `declining ${m} in ${ch}`;
  if (chip.chipKind === 'baseline') return `the baseline ${m} level for ${ch}`;
  return `${ch}'s current ${m}`;
}

const STORY_CONTRAST = ['despite', 'whereas', 'however', 'in contrast to'];
const STORY_REINFORCE = ['consistent with', 'which aligns with', 'alongside', 'supported by'];

const STORY_OPENERS: Record<ReasoningBlockId, string[]> = {
  descriptive: [
    'Before making changes, I saw [insight].',
    'The data initially revealed [insight].',
    'What stood out to me first was [insight].',
  ],
  diagnostic: [
    'This led me to believe [insight] was driving the outcome.',
    'Digging deeper, I concluded [insight] was the root cause.',
    'I traced the issue back to [insight].',
  ],
  prescriptive: [
    'Based on this understanding, I chose to act on [insight].',
    'Recognising [insight], I decided a strategic shift was needed.',
    'Given [insight], I adjusted my approach accordingly.',
  ],
  predictive: [
    'Going forward, I expect [insight] to shape results.',
    'After acting, [insight] signals what comes next.',
    'Looking ahead, [insight] points to the likely trajectory.',
  ],
};

function generateStorySentence(chips: EvidenceChip[], blockId: ReasoningBlockId): string {
  if (chips.length === 0) return '';

  let insight: string;
  if (chips.length === 1) {
    let base = describeChip(chips[0]);
    if (chips[0].contextChip) {
      const ctxChip = chips[0].contextChip;
      const contrast = chipsContrast(chips[0], ctxChip);
      const pool = contrast ? STORY_CONTRAST : STORY_REINFORCE;
      const word = pool[Math.floor(seededRandom(chips[0].id + 'ctx') * pool.length)];
      base = `${base}, ${word} ${describeChip(ctxChip)}`;
    }
    insight = base;
  } else {
    const parts = [describeChip(chips[0])];
    for (let i = 1; i < chips.length; i++) {
      const contrast = chipsContrast(chips[i - 1], chips[i]);
      const pool = contrast ? STORY_CONTRAST : STORY_REINFORCE;
      const word = pool[Math.floor(seededRandom(chips[i - 1].id + chips[i].id) * pool.length)];
      parts.push(`${word} ${describeChip(chips[i])}`);
    }
    insight = parts.join(', ');
  }

  const templates = STORY_OPENERS[blockId];
  const idx = Math.floor(seededRandom(chips.map(c => c.id).join('-') + blockId + 'story') * templates.length);
  return templates[idx].replace('[insight]', insight);
}

// ── Layout ──

const BLOCK_ORDER: ReasoningBlockId[] = ['descriptive', 'diagnostic', 'prescriptive', 'predictive'];

const BLOCK_COLORS: Record<ReasoningBlockId, { text: string; bg: string; border: string; label: string }> = {
  descriptive: { text: 'text-muted-foreground', bg: 'bg-muted/40', border: 'border-border', label: 'Descriptive' },
  diagnostic: { text: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500/8', border: 'border-amber-500/30', label: 'Diagnostic' },
  prescriptive: { text: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/8', border: 'border-emerald-500/30', label: 'Prescriptive' },
  predictive: { text: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-500/8', border: 'border-violet-500/30', label: 'Predictive' },
};

export function ReasoningNarrative() {
  const { board } = useReasoningBoard();
  const totalChips = BLOCK_ORDER.reduce((s, id) => s + board[id].length, 0);

  // At a Glance: data-referenced sentences
  const glanceSentences = useMemo(() => {
    const result: Record<ReasoningBlockId, string> = { descriptive: '', diagnostic: '', prescriptive: '', predictive: '' };
    for (const id of BLOCK_ORDER) {
      if (board[id].length > 0) result[id] = generateGlanceSentence(board[id], id);
    }
    return result;
  }, [board]);

  // Full Story: relationship-focused sentences
  const storySentences = useMemo(() => {
    const sentences: { text: string; blockId: ReasoningBlockId }[] = [];
    for (const blockId of BLOCK_ORDER) {
      const sentence = generateStorySentence(board[blockId], blockId);
      if (!sentence) continue;
      const connector = QUADRANT_CONNECTORS[blockId];
      const text = connector
        ? connector + sentence.charAt(0).toLowerCase() + sentence.slice(1)
        : sentence;
      sentences.push({ text, blockId });
    }
    return sentences;
  }, [board]);

  if (totalChips === 0) return null;

  return (
    <div className="flex-shrink-0 border-t border-border">
      {/* At a Glance */}
      <div className="p-3 pb-2">
        <h3 className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-2">
          At a Glance
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {BLOCK_ORDER.map((blockId) => {
            const colors = BLOCK_COLORS[blockId];
            const chips = board[blockId];
            const isEmpty = chips.length === 0;

            return (
              <div
                key={blockId}
                className={`rounded-lg border p-2 text-[10px] transition-all ${
                  isEmpty ? 'border-border/40 bg-muted/20' : `${colors.border} ${colors.bg}`
                }`}
              >
                <div className={`font-bold mb-1 ${isEmpty ? 'text-muted-foreground/50' : colors.text}`}>
                  {colors.label}
                </div>
                {isEmpty ? (
                  <p className="text-muted-foreground/40 italic">Nothing added yet</p>
                ) : (
                  <>
                    <div className="space-y-0.5 mb-1.5">
                      {chips.map((chip) => (
                        <div key={chip.id} className="flex items-center gap-1">
                          <span className="w-1 h-1 rounded-full bg-current opacity-40 flex-shrink-0" />
                          <span className="truncate text-foreground/80">
                            {chip.label}: <strong>{chip.value}</strong>
                            {chip.contextChip && (
                              <span className="text-muted-foreground ml-1">+ {chip.contextChip.label}</span>
                            )}
                          </span>
                        </div>
                      ))}
                    </div>
                    {glanceSentences[blockId] && (
                      <div className={`leading-relaxed ${colors.text} opacity-80`}>
                        {glanceSentences[blockId]}
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="px-3"><Separator /></div>

      {/* Full Reasoning Story */}
      <div className="p-3 pt-2">
        <h3 className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-2">
          My Full Reasoning Story
        </h3>
        <div className="max-h-[120px] overflow-y-auto pr-1">
          <p className="text-[11px] leading-relaxed">
            {storySentences.map((entry, i) => (
              <span key={i} className={BLOCK_COLORS[entry.blockId].text}>
                {entry.text}{' '}
              </span>
            ))}
          </p>
        </div>
      </div>
    </div>
  );
}
