import { useMemo } from 'react';
import { useReasoningBoard } from '@/contexts/ReasoningBoardContext';
import { QUADRANT_CONNECTORS } from '@/types/evidenceChip';
import type { EvidenceChip, ReasoningBlockId } from '@/types/evidenceChip';
import { cn } from '@/lib/utils';

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

// ── Full Reasoning Story: value-derived, relationship-focused, no raw data ──

/** Extract a numeric value from a chip's value string or deltaValue */
function extractNumeric(chip: EvidenceChip): number | null {
  if (chip.deltaValue != null) return chip.deltaValue;
  const cleaned = chip.value.replace(/[$£€,%\s]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

/** Analyse the actual numeric relationship between two chips */
function analyseRelationship(a: EvidenceChip, b: EvidenceChip): {
  isContrast: boolean;
  magnitude: 'similar' | 'moderate' | 'considerable' | 'vast';
  aHigher: boolean;
} {
  const numA = extractNumeric(a);
  const numB = extractNumeric(b);

  if (numA == null || numB == null) {
    // Fallback: use chipKind if numbers unavailable
    const isContrast =
      (a.chipKind === 'delta-increase' && b.chipKind === 'delta-decrease') ||
      (a.chipKind === 'delta-decrease' && b.chipKind === 'delta-increase');
    return { isContrast, magnitude: 'moderate', aHigher: true };
  }

  const absA = Math.abs(numA);
  const absB = Math.abs(numB);
  const max = Math.max(absA, absB);
  const ratio = max === 0 ? 1 : Math.abs(absA - absB) / max;

  // Direction analysis: are they moving the same way?
  const sameDirection = (numA >= 0 && numB >= 0) || (numA < 0 && numB < 0);
  const isContrast = !sameDirection || ratio > 0.4;

  let magnitude: 'similar' | 'moderate' | 'considerable' | 'vast';
  if (ratio < 0.15) magnitude = 'similar';
  else if (ratio < 0.5) magnitude = 'moderate';
  else if (ratio < 0.8) magnitude = 'considerable';
  else magnitude = 'vast';

  return { isContrast, magnitude, aHigher: absA >= absB };
}

const STORY_CONTRAST_WORDS = ['despite', 'whereas', 'yet', 'however', 'in contrast to'];
const STORY_REINFORCE_WORDS = ['consistent with', 'which aligns with', 'alongside', 'further supported by'];

function channelOf(chip: EvidenceChip): string {
  return chip.channelName || chip.label.split(' ')[0];
}

function metricOf(chip: EvidenceChip): string {
  return chip.metricName || 'performance';
}

/** Build a single-chip description (no context) */
function describeChipAlone(chip: EvidenceChip): string {
  const ch = channelOf(chip);
  const m = metricOf(chip);
  if (chip.chipKind === 'delta-increase') return `strong ${m} growth in ${ch}`;
  if (chip.chipKind === 'delta-decrease') return `declining ${m} in ${ch}`;
  if (chip.chipKind === 'baseline') return `the baseline ${m} level for ${ch}`;
  return `${ch}'s current ${m}`;
}

/** Build a relationship sentence between a chip and its context chip */
function describeRelationship(chip: EvidenceChip, ctx: EvidenceChip, seed: string): string {
  const rel = analyseRelationship(chip, ctx);
  const chA = channelOf(chip);
  const chB = channelOf(ctx);
  const mA = metricOf(chip);
  const mB = metricOf(ctx);

  if (rel.isContrast) {
    const word = STORY_CONTRAST_WORDS[Math.floor(seededRandom(seed) * STORY_CONTRAST_WORDS.length)];
    const higher = rel.aHigher ? chA : chB;
    const lower = rel.aHigher ? chB : chA;
    const higherM = rel.aHigher ? mA : mB;
    const lowerM = rel.aHigher ? mB : mA;

    if (rel.magnitude === 'vast')
      return `${word} ${higher} driving ${rel.magnitude === 'vast' ? 'far' : ''} more ${higherM} than ${lower}, this gap suggests the ${lowerM} allocation may need rethinking`;
    if (rel.magnitude === 'considerable')
      return `${word} ${higher} generating considerably stronger ${higherM} than ${lower}, the disparity in ${lowerM} warrants attention`;
    return `${word} ${higher}'s ${higherM} outpacing ${lower}'s ${lowerM}, the difference points to an imbalance worth investigating`;
  } else {
    const word = STORY_REINFORCE_WORDS[Math.floor(seededRandom(seed) * STORY_REINFORCE_WORDS.length)];
    if (rel.magnitude === 'similar')
      return `${chA}'s ${mA}, ${word} ${chB}'s ${mB}, showing a consistent pattern across both channels`;
    return `${chA}'s ${mA} trending in the same direction as ${chB}'s ${mB}, ${word} the broader trend`;
  }
}

/** Build a relationship sentence between two standalone chips (no context relationship) */
function describePairRelationship(a: EvidenceChip, b: EvidenceChip, seed: string): string {
  const rel = analyseRelationship(a, b);
  const chA = channelOf(a);
  const chB = channelOf(b);
  const mA = metricOf(a);
  const mB = metricOf(b);

  if (rel.isContrast) {
    const word = STORY_CONTRAST_WORDS[Math.floor(seededRandom(seed) * STORY_CONTRAST_WORDS.length)];
    const higher = rel.aHigher ? chA : chB;
    const lower = rel.aHigher ? chB : chA;
    const higherM = rel.aHigher ? mA : mB;
    const lowerM = rel.aHigher ? mB : mA;
    return `${word} ${higher}'s ${higherM} significantly differing from ${lower}'s ${lowerM}`;
  } else {
    const word = STORY_REINFORCE_WORDS[Math.floor(seededRandom(seed) * STORY_REINFORCE_WORDS.length)];
    return `${chA}'s ${mA}, ${word} ${chB}'s ${mB}`;
  }
}

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
    const chip = chips[0];
    if (chip.contextChip) {
      insight = describeRelationship(chip, chip.contextChip, chip.id + 'ctx');
    } else {
      insight = describeChipAlone(chip);
    }
  } else {
    // Weave multiple chips using value-derived relationships
    const parts: string[] = [describeChipAlone(chips[0])];
    for (let i = 1; i < chips.length; i++) {
      parts.push(describePairRelationship(chips[i - 1], chips[i], chips[i - 1].id + chips[i].id));
    }
    insight = parts.join(', ');
  }

  const templates = STORY_OPENERS[blockId];
  const idx = Math.floor(seededRandom(chips.map(c => c.id).join('-') + blockId + 'story') * templates.length);
  return templates[idx].replace('[insight]', insight);
}

// ── Layout ──

const BLOCK_ORDER: ReasoningBlockId[] = ['descriptive', 'diagnostic', 'predictive', 'prescriptive'];

const BLOCK_STYLE: Record<ReasoningBlockId, { label: string; accent: string; tint: string }> = {
  descriptive: { label: 'Descriptive', accent: '#D4A017', tint: 'rgba(212, 160, 23, 0.09)' },
  diagnostic: { label: 'Diagnostic', accent: '#C4622D', tint: 'rgba(196, 98, 45, 0.09)' },
  predictive: { label: 'Predictive', accent: '#6B4F8A', tint: 'rgba(107, 79, 138, 0.09)' },
  prescriptive: { label: 'Prescriptive', accent: '#4A7C59', tint: 'rgba(74, 124, 89, 0.09)' },
};

export function ReasoningNarrative() {
  const { board } = useReasoningBoard();

  // At a Glance: data-referenced sentences
  const glanceSentences = useMemo(() => {
    const result: Record<ReasoningBlockId, string> = { descriptive: '', diagnostic: '', predictive: '', prescriptive: '' };
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

  return (
    <div className="flex-shrink-0 border-t border-border/60">
      {/* At a Glance */}
      <div className="px-3 pt-3">
        <div className="h-px bg-border/80" />
      </div>
      <div className="px-3 py-3">
        <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-foreground mb-3">
          AT A GLANCE
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {BLOCK_ORDER.map((blockId) => {
            const style = BLOCK_STYLE[blockId];
            const chips = board[blockId];
            const isEmpty = chips.length === 0;

            return (
              <div
                key={blockId}
                className={cn(
                  'rounded-xl border border-border/40 border-l-4 p-3 transition-all',
                  isEmpty ? 'bg-muted/25 text-muted-foreground/70' : ''
                )}
                style={{
                  borderLeftColor: isEmpty ? '#9CA3AF' : style.accent,
                  backgroundColor: isEmpty ? '#F4F4F5' : style.tint,
                }}
              >
                <div
                  className={cn(
                    'text-sm font-bold mb-2',
                    isEmpty ? 'text-muted-foreground/60' : 'text-foreground'
                  )}
                  style={!isEmpty ? { color: style.accent } : undefined}
                >
                  {style.label}
                </div>
                {isEmpty ? (
                  <p className="text-xs italic text-muted-foreground/60">Nothing added yet</p>
                ) : (
                  <>
                    <div className="space-y-1.5">
                      {chips.map((chip, index) => (
                        <div key={`${chip.id}-${index}`} className="flex items-start gap-2">
                          <span
                            className="mt-1.5 h-2 w-2 rounded-full flex-shrink-0"
                            style={{ backgroundColor: style.accent }}
                          />
                          <span className="text-[13px] text-foreground/90 leading-snug">
                            <span className="font-medium">{chip.label}:</span>{' '}
                            <strong className="font-bold">{chip.value}</strong>
                            {chip.contextChip && (
                              <span className="text-muted-foreground ml-1">+ {chip.contextChip.label}</span>
                            )}
                          </span>
                        </div>
                      ))}
                    </div>
                    {glanceSentences[blockId] && (
                      <div
                        className="mt-3 pt-2 border-t border-black/10 text-[12px] italic leading-relaxed"
                        style={{ color: style.accent }}
                      >
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

      {/* Full Reasoning Story */}
      <div className="px-3 pb-4">
        <div className="relative rounded-2xl border border-[#E7DCC7] bg-[#FBF6EB] shadow-sm px-5 py-4">
          <span
            aria-hidden="true"
            className="absolute left-3 top-1 text-[62px] leading-none font-serif text-[#C8B79E]/55 pointer-events-none select-none"
          >
            "
          </span>
          <div className="relative flex items-center gap-2 mb-3">
            <span className="h-2 w-2 rounded-full bg-[#C4622D]" />
            <h3 className="text-lg font-bold tracking-wide text-[#3A3025]">MY FULL REASONING STORY</h3>
          </div>
          <div className="relative pr-1">
            {storySentences.length === 0 ? (
              <p className="max-w-[68ch] text-[16px] leading-[1.8] text-[#4B4136]/70 italic">
                Your reasoning story will appear here once you begin adding evidence.
              </p>
            ) : (
              <p className="max-w-[68ch] text-[16px] leading-[1.8] text-[#2E2A24]">
                {storySentences.map((entry, index) => (
                  <span
                    key={`${entry.blockId}-${index}`}
                    style={{ color: BLOCK_STYLE[entry.blockId].accent }}
                  >
                    {entry.text}{' '}
                  </span>
                ))}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
