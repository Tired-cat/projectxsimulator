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

// Determine if two evidence items contrast or reinforce each other
function isContrastPair(a: EvidenceChip, b: EvidenceChip): boolean {
  if ((a.chipKind === 'delta-increase' && b.chipKind === 'delta-decrease') ||
      (a.chipKind === 'delta-decrease' && b.chipKind === 'delta-increase')) return true;
  if (a.sourceId !== b.sourceId) return true;
  return false;
}

const CONTRAST_RELATIONAL = ['despite', 'in contrast to', 'whereas', 'however, compared to', 'surprisingly, despite'];
const ADDITIVE_RELATIONAL = ['consistent with', 'which aligns with', 'further supported by', 'alongside'];

function pickRelational(seed: string, contrast: boolean): string {
  const pool = contrast ? CONTRAST_RELATIONAL : ADDITIVE_RELATIONAL;
  return pool[Math.floor(seededRandom(seed) * pool.length)];
}

// Generate a relational insight for a single chip (with or without context)
function generateChipInsight(chip: EvidenceChip, blockId: ReasoningBlockId): string {
  const primary = `${chip.label} (${chip.value})`;

  if (!chip.contextChip) {
    // Unpaired — simple observation
    return generateUnpairedSentence(primary, chip, blockId);
  }

  const ctx = chip.contextChip;
  const context = `${ctx.label} (${ctx.value})`;
  const contrast = isContrastPair(chip, ctx);
  const relational = pickRelational(chip.id + ctx.id, contrast);

  return generatePairedSentence(primary, context, relational, contrast, chip, ctx, blockId);
}

function generateUnpairedSentence(primary: string, chip: EvidenceChip, blockId: ReasoningBlockId): string {
  const templates: Record<ReasoningBlockId, string[]> = {
    descriptive: [
      `I noticed ${primary}, which stood out as a significant data point.`,
      `Looking at the data, ${primary} caught my attention as noteworthy.`,
    ],
    diagnostic: [
      `I believed ${primary} was a key factor explaining this outcome.`,
      `Looking deeper, ${primary} appeared to be driving what I was seeing.`,
    ],
    prescriptive: [
      `Given ${primary}, I felt a strategic adjustment was warranted.`,
      `Because of ${primary}, I decided a change needed to be made.`,
    ],
    predictive: [
      `After my adjustments, ${primary} suggests this trajectory will continue.`,
      `Following my decision, ${primary} indicates the impact is becoming visible.`,
    ],
  };
  const pool = templates[blockId];
  return pool[Math.floor(seededRandom(chip.id + blockId) * pool.length)];
}

function generatePairedSentence(
  primary: string, context: string, relational: string, contrast: boolean,
  chip: EvidenceChip, ctx: EvidenceChip, blockId: ReasoningBlockId
): string {
  const seed = chip.id + ctx.id + blockId;

  if (contrast) {
    const implications: Record<ReasoningBlockId, string[]> = {
      descriptive: [
        `${relational.charAt(0).toUpperCase() + relational.slice(1)} ${primary} showing strong performance, ${context} tells a different story, suggesting uneven distribution across channels.`,
        `${primary} appeared strong, ${relational} ${context}, which revealed an imbalance worth investigating.`,
      ],
      diagnostic: [
        `${relational.charAt(0).toUpperCase() + relational.slice(1)} ${primary}, ${context} moved in the opposite direction, suggesting these factors may be competing for the same outcome.`,
        `The gap between ${primary} and ${context} pointed to a deeper structural issue driving the disparity.`,
      ],
      prescriptive: [
        `${relational.charAt(0).toUpperCase() + relational.slice(1)} the strength of ${primary}, the weakness in ${context} indicated resources should be reallocated to maximise overall impact.`,
        `The contrast between ${primary} and ${context} made it clear that a targeted rebalancing was needed.`,
      ],
      predictive: [
        `${relational.charAt(0).toUpperCase() + relational.slice(1)} ${primary} trending positively, ${context} lagging behind suggests the gap will widen without intervention.`,
        `If ${primary} continues on this path while ${context} remains subdued, the divergence will likely intensify.`,
      ],
    };
    const pool = implications[blockId];
    return pool[Math.floor(seededRandom(seed) * pool.length)];
  } else {
    const implications: Record<ReasoningBlockId, string[]> = {
      descriptive: [
        `${primary}, ${relational} ${context}, painted a consistent picture of the current state.`,
        `Both ${primary} and ${context} reinforced the same observation, strengthening my confidence in this reading.`,
      ],
      diagnostic: [
        `${primary}, ${relational} ${context}, confirmed that these factors were working together to produce this outcome.`,
        `The alignment between ${primary} and ${context} suggested a shared underlying driver.`,
      ],
      prescriptive: [
        `${primary}, ${relational} ${context}, reinforced my conviction that doubling down on the current direction was the right call.`,
        `Because ${primary} and ${context} both pointed the same way, the strategic decision felt well-supported.`,
      ],
      predictive: [
        `${primary}, ${relational} ${context}, suggests momentum is building and the trend is likely to sustain.`,
        `With both ${primary} and ${context} aligned, the outlook appears stable and predictable.`,
      ],
    };
    const pool = implications[blockId];
    return pool[Math.floor(seededRandom(seed) * pool.length)];
  }
}

// Multi-chip weaving connectors
const MULTI_CONTRAST = ['while', 'whereas', 'in contrast,'];
const MULTI_ADDITIVE = ['alongside this,', 'similarly,', 'reinforcing this,'];

function generateCombinedSentence(chips: EvidenceChip[], blockId: ReasoningBlockId): string {
  if (chips.length === 0) return '';
  if (chips.length === 1) return generateChipInsight(chips[0], blockId);

  // Generate individual insights, then weave them
  const insights = chips.map(c => generateChipInsight(c, blockId));
  const parts: string[] = [insights[0]];
  for (let i = 1; i < insights.length; i++) {
    const contrast = isContrastPair(chips[i - 1], chips[i]);
    const pool = contrast ? MULTI_CONTRAST : MULTI_ADDITIVE;
    const connector = pool[Math.floor(seededRandom(chips[i - 1].id + chips[i].id + 'multi') * pool.length)];
    // Lowercase the next insight's first char and prepend connector
    const next = insights[i].charAt(0).toLowerCase() + insights[i].slice(1);
    parts.push(`${connector} ${next}`);
  }
  return parts.join(' ');
}

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

  // One combined sentence per quadrant
  const quadrantSentences = useMemo(() => {
    const result: Record<ReasoningBlockId, string> = {
      descriptive: '', diagnostic: '', prescriptive: '', predictive: '',
    };
    for (const blockId of BLOCK_ORDER) {
      if (board[blockId].length > 0) {
        result[blockId] = generateCombinedSentence(board[blockId], blockId);
      }
    }
    return result;
  }, [board]);

  const storySentences = useMemo(() => {
    const sentences: { text: string; blockId: ReasoningBlockId }[] = [];
    for (const blockId of BLOCK_ORDER) {
      const sentence = quadrantSentences[blockId];
      if (!sentence) continue;
      const connector = QUADRANT_CONNECTORS[blockId];
      let text: string;
      if (connector) {
        text = connector + sentence.charAt(0).toLowerCase() + sentence.slice(1);
      } else {
        text = sentence;
      }
      sentences.push({ text, blockId });
    }
    return sentences;
  }, [quadrantSentences]);

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
                  isEmpty
                    ? 'border-border/40 bg-muted/20'
                    : `${colors.border} ${colors.bg}`
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
                              <span className="text-muted-foreground ml-1">
                                + {chip.contextChip.label}
                              </span>
                            )}
                          </span>
                        </div>
                      ))}
                    </div>
                    {quadrantSentences[blockId] && (
                      <div className={`leading-relaxed ${colors.text} opacity-80`}>
                        {quadrantSentences[blockId]}
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="px-3">
        <Separator />
      </div>

      {/* Full Reasoning Story */}
      <div className="p-3 pt-2">
        <h3 className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-2">
          My Full Reasoning Story
        </h3>
        <div className="max-h-[120px] overflow-y-auto pr-1">
          <p className="text-[11px] leading-relaxed">
            {storySentences.map((entry, i) => {
              const colors = BLOCK_COLORS[entry.blockId];
              return (
                <span key={i} className={colors.text}>
                  {entry.text}{' '}
                </span>
              );
            })}
          </p>
        </div>
      </div>
    </div>
  );
}
