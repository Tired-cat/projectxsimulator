import { useMemo } from 'react';
import { useReasoningBoard } from '@/contexts/ReasoningBoardContext';
import { REASONING_BLOCKS, generateNarrativeSentence } from '@/types/evidenceChip';
import type { EvidenceChip, ReasoningBlockId } from '@/types/evidenceChip';
import { Separator } from '@/components/ui/separator';

// Stable sentence per chip+block using chip id as seed
function seededRandom(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash) + seed.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) / 2147483647;
}

function generateStableSentence(chip: EvidenceChip, blockId: ReasoningBlockId, sentenceIndex: number): string {
  const { NARRATIVE_TEMPLATES } = require('@/types/evidenceChip');
  const templates = NARRATIVE_TEMPLATES[blockId] as string[];
  const idx = Math.floor(seededRandom(chip.id + blockId) * templates.length);
  const template = templates[idx];
  const evidence = `${chip.label}: ${chip.value}`;
  const sentence = template.replace('[evidence]', evidence);

  if (sentenceIndex === 0) return sentence;
  if (sentenceIndex === 1) return `Then, ${sentence.charAt(0).toLowerCase()}${sentence.slice(1)}`;
  return `Following that, ${sentence.charAt(0).toLowerCase()}${sentence.slice(1)}`;
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

  // Derive all sentences from current board state
  const allSentences = useMemo(() => {
    const sentences: { text: string; blockId: ReasoningBlockId }[] = [];
    let globalIndex = 0;
    for (const blockId of BLOCK_ORDER) {
      for (const chip of board[blockId]) {
        sentences.push({
          text: generateStableSentence(chip, blockId, globalIndex),
          blockId,
        });
        globalIndex++;
      }
    }
    return sentences;
  }, [board]);

  // Per-block sentences for At a Glance cards
  const blockSentences = useMemo(() => {
    const result: Record<ReasoningBlockId, string[]> = {
      descriptive: [], diagnostic: [], prescriptive: [], predictive: [],
    };
    for (const blockId of BLOCK_ORDER) {
      board[blockId].forEach((chip, i) => {
        result[blockId].push(generateStableSentence(chip, blockId, i));
      });
    }
    return result;
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
            const sentences = blockSentences[blockId];
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
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className={`leading-relaxed ${colors.text} opacity-80`}>
                      {sentences.join(' ')}
                    </div>
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
            {allSentences.map((entry, i) => {
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
