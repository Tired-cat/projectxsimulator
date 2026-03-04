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

// Describe a chip's metric naturally without raw data strings
function describeChip(chip: EvidenceChip): string {
  const channel = chip.channelName || chip.sourceId || 'this channel';
  const metric = chip.metricName || extractMetric(chip.label);

  if (chip.chipKind === 'delta-increase') return `${channel}'s rising ${metric}`;
  if (chip.chipKind === 'delta-decrease') return `${channel}'s declining ${metric}`;
  if (chip.chipKind === 'baseline') return `${channel}'s baseline ${metric}`;
  if (chip.chipKind === 'product') return `${channel}'s ${metric} performance`;
  return `${channel}'s ${metric}`;
}

function extractMetric(label: string): string {
  const lower = label.toLowerCase();
  if (lower.includes('revenue')) return 'revenue';
  if (lower.includes('profit')) return 'profit';
  if (lower.includes('spend')) return 'spend';
  if (lower.includes('click')) return 'clicks';
  if (lower.includes('view')) return 'views';
  if (lower.includes('sales') || lower.includes('units')) return 'sales';
  // Fallback: use the label portion after any channel name
  const parts = label.split(' ');
  return parts.length > 1 ? parts.slice(1).join(' ').toLowerCase() : 'performance';
}

// Describe a chip with its context naturally
function describeChipWithContext(chip: EvidenceChip): string {
  const main = describeChip(chip);
  if (!chip.contextChip) return main;
  const ctx = describeChip(chip.contextChip);
  return `${main} alongside ${ctx}`;
}

// Assess whether the chip conveys high/strong or low/weak magnitude
function toneSuffix(chip: EvidenceChip): string {
  if (chip.chipKind === 'delta-increase') return 'strong';
  if (chip.chipKind === 'delta-decrease') return 'weak';
  return 'notable';
}

const CONTRAST_CONNECTORS = ['while', 'whereas', 'yet', 'but'];
const ADDITIVE_CONNECTORS = ['alongside', 'together with', 'coupled with', 'and'];

function pickConnector(chipA: EvidenceChip, chipB: EvidenceChip): string {
  const isContrast =
    (chipA.chipKind === 'delta-increase' && chipB.chipKind === 'delta-decrease') ||
    (chipA.chipKind === 'delta-decrease' && chipB.chipKind === 'delta-increase') ||
    (chipA.sourceId !== chipB.sourceId);
  const pool = isContrast ? CONTRAST_CONNECTORS : ADDITIVE_CONNECTORS;
  const idx = Math.floor(seededRandom(chipA.id + chipB.id) * pool.length);
  return pool[idx];
}

const SINGLE_TEMPLATES: Record<ReasoningBlockId, string[]> = {
  descriptive: [
    '[items] caught my attention.',
    'I noticed [items] stood out.',
    '[items] was worth paying attention to.',
  ],
  diagnostic: [
    'I think [items] helps explain why this happened.',
    'Looking deeper, [items] seemed to be a key driver.',
    '[items] appeared to be behind the outcome I was seeing.',
  ],
  prescriptive: [
    'Based on [items], I decided a change was needed.',
    '[items] made it clear I should adjust my approach.',
    'Given [items], I chose to shift my strategy.',
  ],
  predictive: [
    'Going forward, [items] suggests this trend will continue.',
    'Based on [items], I expect to see a shift.',
    '[items] tells me what to watch for next.',
  ],
};

function generateCombinedSentence(chips: EvidenceChip[], blockId: ReasoningBlockId): string {
  if (chips.length === 0) return '';

  let evidencePhrase: string;
  if (chips.length === 1) {
    evidencePhrase = describeChipWithContext(chips[0]);
  } else {
    const parts: string[] = [describeChipWithContext(chips[0])];
    for (let i = 1; i < chips.length; i++) {
      const connector = pickConnector(chips[i - 1], chips[i]);
      parts.push(`${connector} ${describeChipWithContext(chips[i])}`);
    }
    evidencePhrase = parts.join(' ');
  }

  const templates = SINGLE_TEMPLATES[blockId];
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
