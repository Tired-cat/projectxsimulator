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

function formatEvidence(chip: EvidenceChip): string {
  const base = `${chip.label}: ${chip.value}`;
  if (chip.contextChip) {
    return `${base} (supported by ${chip.contextChip.label}: ${chip.contextChip.value})`;
  }
  return base;
}

const CONTRAST_CONNECTORS = ['while', 'whereas', 'compared to', 'in contrast to'];
const ADDITIVE_CONNECTORS = ['alongside', 'together with', 'and similarly', 'reinforced by'];

function pickConnector(chipA: EvidenceChip, chipB: EvidenceChip): string {
  const isContrast =
    (chipA.chipKind === 'delta-increase' && chipB.chipKind === 'delta-decrease') ||
    (chipA.chipKind === 'delta-decrease' && chipB.chipKind === 'delta-increase') ||
    (chipA.sourceId !== chipB.sourceId);
  const pool = isContrast ? CONTRAST_CONNECTORS : ADDITIVE_CONNECTORS;
  const idx = Math.floor(seededRandom(chipA.id + chipB.id) * pool.length);
  return pool[idx];
}

const SINGLE_OPENERS: Record<ReasoningBlockId, string[]> = {
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

function generateCombinedSentence(chips: EvidenceChip[], blockId: ReasoningBlockId): string {
  if (chips.length === 0) return '';

  let evidencePhrase: string;
  if (chips.length === 1) {
    evidencePhrase = formatEvidence(chips[0]);
  } else {
    const parts: string[] = [formatEvidence(chips[0])];
    for (let i = 1; i < chips.length; i++) {
      const connector = pickConnector(chips[i - 1], chips[i]);
      parts.push(`${connector} ${formatEvidence(chips[i])}`);
    }
    evidencePhrase = parts.join(', ');
  }

  const templates = SINGLE_OPENERS[blockId];
  const seedStr = chips.map(c => c.id).join('-') + blockId;
  const idx = Math.floor(seededRandom(seedStr) * templates.length);
  return templates[idx].replace('[items]', evidencePhrase);
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
