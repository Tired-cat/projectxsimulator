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
  const ranked = rankChips(chips);
  let phrase: string;
  if (ranked.length === 1) {
    phrase = formatEvidence(ranked[0]);
  } else {
    const parts = [formatEvidence(ranked[0])];
    for (let i = 1; i < ranked.length; i++) {
      parts.push(`${pickGlanceConnector(ranked[i - 1], ranked[i])} ${formatEvidence(ranked[i])}`);
    }
    phrase = parts.join(', ');
  }
  const templates = GLANCE_OPENERS[blockId];
  const idx = Math.floor(seededRandom(ranked.map(c => c.id).join('-') + blockId) * templates.length);
  return templates[idx].replace('[items]', phrase);
}

// ── Full Reasoning Story: value-derived, relationship-focused, no raw data ──

function extractNumeric(chip: EvidenceChip): number | null {
  if (chip.deltaValue != null) return chip.deltaValue;
  const cleaned = chip.value.replace(/[$£€,%\s]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

function analyseRelationship(a: EvidenceChip, b: EvidenceChip): {
  isContrast: boolean;
  magnitude: 'similar' | 'moderate' | 'considerable' | 'vast';
  aHigher: boolean;
} {
  const numA = extractNumeric(a);
  const numB = extractNumeric(b);

  if (numA == null || numB == null) {
    const isContrast =
      (a.chipKind === 'delta-increase' && b.chipKind === 'delta-decrease') ||
      (a.chipKind === 'delta-decrease' && b.chipKind === 'delta-increase');
    return { isContrast, magnitude: 'moderate', aHigher: true };
  }

  const absA = Math.abs(numA);
  const absB = Math.abs(numB);
  const max = Math.max(absA, absB);
  const ratio = max === 0 ? 1 : Math.abs(absA - absB) / max;

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

// ── Metric priority ranking (revenue/profit anchor the narrative) ──
const METRIC_PRIORITY: Array<[string, number]> = [
  ['revenue', 0], ['profit', 0], ['net profit', 0],
  ['click', 1], ['conversion', 1],
  ['view', 2], ['impression', 2],
  ['budget', 3],
];

function metricRank(chip: EvidenceChip): number {
  const key = (chip.metricName ?? chip.label).toLowerCase();
  for (const [term, rank] of METRIC_PRIORITY) {
    if (key.includes(term)) return rank;
  }
  return 3;
}

function rankChips(chips: EvidenceChip[]): EvidenceChip[] {
  return [...chips].sort((a, b) => metricRank(a) - metricRank(b));
}

// ── Metric-aware conclusion phrases ──
function getContrastConclusion(chip: EvidenceChip): string {
  const m = (chip.metricName ?? chip.label).toLowerCase();
  if (m.includes('revenue') || m.includes('profit')) return 'suggesting the spend distribution between them needs rebalancing';
  if (m.includes('view') || m.includes('impression')) return 'indicating a reach imbalance that may not reflect revenue potential';
  if (m.includes('click') || m.includes('conversion')) return 'pointing to an engagement gap worth investigating';
  if (m.includes('budget')) return 'raising the question of whether this split is the best use of the total budget';
  return 'suggesting the allocation between them deserves closer review';
}

function getReinforceConclusion(chip: EvidenceChip): string {
  const m = (chip.metricName ?? chip.label).toLowerCase();
  if (m.includes('revenue') || m.includes('profit')) return 'reinforcing their combined contribution to total revenue';
  if (m.includes('view') || m.includes('impression')) return 'confirming consistent audience reach across both';
  if (m.includes('budget')) return 'showing a deliberate, proportional investment in both channels';
  return 'confirming a consistent pattern across both channels';
}

/** Build a single-chip description (no context) */
function describeChipAlone(chip: EvidenceChip): string {
  const ch = channelOf(chip);
  const val = chip.value;
  const m = (chip.metricName ?? chip.label).toLowerCase();

  // Product mix chip — qualitative / behavioural
  if (chip.chipKind === 'product') {
    const parts = chip.label.split('—');
    const channel = parts[0]?.trim() || ch;
    const product = parts[1]?.trim() || chip.label;
    return `${channel} primarily selling ${product} (${val}), pointing to an audience that favours this product tier`;
  }


  if (m.includes('revenue') || m.includes('profit')) {
    if (chip.chipKind === 'delta-increase') return `${ch} generating stronger revenue than expected`;
    if (chip.chipKind === 'delta-decrease') return `${ch} underperforming on revenue`;
    return `${ch} contributing ${val} in revenue`;
  }
  if (m.includes('view') || m.includes('impression')) {
    if (chip.chipKind === 'delta-increase') return `${ch} reaching a broader audience with ${val} views`;
    if (chip.chipKind === 'delta-decrease') return `${ch} losing reach, down to ${val} views`;
    return `${ch} generating ${val} views`;
  }
  if (m.includes('click') || m.includes('conversion')) {
    if (chip.chipKind === 'delta-increase') return `${ch} driving more engaged traffic`;
    if (chip.chipKind === 'delta-decrease') return `${ch} seeing reduced click-through`;
    return `${ch} producing ${val} clicks`;
  }
  if (m.includes('budget')) {
    if (chip.chipKind === 'delta-increase') return `${ch} receiving a larger share of the budget`;
    if (chip.chipKind === 'delta-decrease') return `${ch}'s allocation trimmed back`;
    if (chip.chipKind === 'baseline') return `${ch}'s original allocation of ${val}`;
    return `${ch} allocated ${val}`;
  }
  // fallback
  if (chip.chipKind === 'delta-increase') return `strong ${metricOf(chip)} growth in ${ch}`;
  if (chip.chipKind === 'delta-decrease') return `declining ${metricOf(chip)} in ${ch}`;
  if (chip.chipKind === 'baseline') return `the baseline ${metricOf(chip)} level for ${ch}`;
  return `${ch}'s ${metricOf(chip)} at ${val}`;
}

/** Build a relationship sentence between a chip and its context chip */
function describeRelationship(chip: EvidenceChip, ctx: EvidenceChip, seed: string): string {
  const rel = analyseRelationship(chip, ctx);
  const chA = channelOf(chip);
  const chB = channelOf(ctx);
  const mA = metricOf(chip);
  const mB = metricOf(ctx);
  const primaryChip = metricRank(chip) <= metricRank(ctx) ? chip : ctx;

  if (rel.isContrast) {
    const word = STORY_CONTRAST_WORDS[Math.floor(seededRandom(seed) * STORY_CONTRAST_WORDS.length)];
    const higher = rel.aHigher ? chA : chB;
    const lower = rel.aHigher ? chB : chA;
    const higherM = rel.aHigher ? mA : mB;

    if (rel.magnitude === 'vast')
      return `${word} ${higher} driving far stronger ${higherM} than ${lower}, ${getContrastConclusion(primaryChip)}`;
    if (rel.magnitude === 'considerable')
      return `${word} ${higher} considerably outperforming ${lower} on ${higherM}, ${getContrastConclusion(primaryChip)}`;
    return `${word} ${higher}'s ${higherM} outpacing ${lower}'s, ${getContrastConclusion(primaryChip)}`;
  } else {
    const word = STORY_REINFORCE_WORDS[Math.floor(seededRandom(seed) * STORY_REINFORCE_WORDS.length)];
    if (rel.magnitude === 'similar')
      return `${chA}'s ${mA} ${word} ${chB}'s ${mB}, ${getReinforceConclusion(primaryChip)}`;
    return `${chA}'s ${mA} moving in the same direction as ${chB}'s ${mB}, ${getReinforceConclusion(primaryChip)}`;
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

// ── Block-specific story openers that frame each stage distinctly ──
const STORY_OPENERS: Record<ReasoningBlockId, string[]> = {
  descriptive: [
    'The data showed me [insight].',
    'Looking at the numbers, I identified [insight].',
    'What stood out immediately was [insight].',
  ],
  diagnostic: [
    'I traced this back to [insight].',
    'The root cause was [insight].',
    '[insight] explained why I was seeing this pattern.',
  ],
  prescriptive: [
    '[insight] drove my decision to act.',
    'I chose to intervene because of [insight].',
    'Acting on [insight], I shifted my budget allocation.',
  ],
  predictive: [
    'With these changes in place, I expect [insight].',
    'The likely outcome is [insight].',
    'Looking ahead, [insight] shapes my expectation of results.',
  ],
};

// ── Product-mix aware openers for diagnostic block ──
const DIAGNOSTIC_PRODUCT_OPENERS = [
  'The product mix revealed that [insight], explaining the revenue pattern I observed.',
  '[insight] showed why certain channels generate disproportionate revenue per click.',
  'Looking at what was actually being sold, [insight] clarified the underlying dynamic.',
];

function generateStorySentence(
  chips: EvidenceChip[],
  blockId: ReasoningBlockId,
  priorChannels: Set<string>
): string {
  if (chips.length === 0) return '';

  const ranked = rankChips(chips);
  const hasProductChip = ranked.some(c => c.chipKind === 'product');

  let insight: string;
  if (ranked.length === 1) {
    const chip = ranked[0];
    const ctx = chip.contextChip;
    if (ctx && ctx.sourceId !== chip.sourceId) {
      insight = describeRelationship(chip, ctx, chip.id + 'ctx');
    } else {
      insight = describeChipAlone(chip);
    }
  } else {
    // Build a combined insight — avoid repeating channel already used in prior block with same metric
    const primaryChip = ranked[0];
    const primaryCh = channelOf(primaryChip);
    const primaryMetricKey = `${primaryCh}|${metricOf(primaryChip)}`;

    if (priorChannels.has(primaryMetricKey) && ranked.length >= 2) {
      // Pivot to the second chip to avoid repetition
      const bridgeChip = ranked[1];
      insight = `${describeChipAlone(bridgeChip)}, which connects to the earlier observation about ${primaryCh}`;
    } else {
      const parts: string[] = [describeChipAlone(ranked[0])];
      for (let i = 1; i < ranked.length; i++) {
        parts.push(describePairRelationship(ranked[i - 1], ranked[i], ranked[i - 1].id + ranked[i].id));
      }
      insight = parts.join(', ');
    }
  }

  // Pick template — use product-aware opener for diagnostic if product chip present
  let templates: string[];
  if (blockId === 'diagnostic' && hasProductChip) {
    templates = DIAGNOSTIC_PRODUCT_OPENERS;
  } else {
    templates = STORY_OPENERS[blockId];
  }

  const idx = Math.floor(seededRandom(ranked.map(c => c.id).join('-') + blockId + 'story') * templates.length);
  return templates[idx].replace('[insight]', insight);
}

// ── Exported helper: build the full reasoning story text from board state ──

// Correct causal chain: Observe → Diagnose → Decide → Predict
const BLOCK_ORDER: ReasoningBlockId[] = ['descriptive', 'diagnostic', 'prescriptive', 'predictive'];

export function buildFullReasoningStory(board: Record<ReasoningBlockId, EvidenceChip[]>): string {
  const sentences: string[] = [];
  const priorChannels = new Set<string>();

  for (const blockId of BLOCK_ORDER) {
    const chips = board[blockId];
    const sentence = generateStorySentence(chips, blockId, priorChannels);
    if (!sentence) continue;

    for (const chip of chips) {
      priorChannels.add(`${channelOf(chip)}|${metricOf(chip)}`);
    }

    const connector = QUADRANT_CONNECTORS[blockId];
    const text = connector
      ? connector + sentence.charAt(0).toLowerCase() + sentence.slice(1)
      : sentence;
    sentences.push(text);
  }

  return sentences.join(' ');
}

// ── Layout ──

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

  // Full Story: relationship-focused, cross-block deduplication
  const storySentences = useMemo(() => {
    const sentences: { text: string; blockId: ReasoningBlockId }[] = [];
    // Track channel+metric combos used in prior blocks to avoid circularity
    const priorChannels = new Set<string>();

    for (const blockId of BLOCK_ORDER) {
      const chips = board[blockId];
      const sentence = generateStorySentence(chips, blockId, priorChannels);
      if (!sentence) continue;

      // Register channels used in this block for dedup in later blocks
      for (const chip of chips) {
        priorChannels.add(`${channelOf(chip)}|${metricOf(chip)}`);
      }

      const connector = QUADRANT_CONNECTORS[blockId];
      const text = connector
        ? connector + sentence.charAt(0).toLowerCase() + sentence.slice(1)
        : sentence;
      sentences.push({ text, blockId });
    }
    return sentences;
  }, [board]);

  const annotatedByBlock = useMemo(() => {
    const result: Partial<Record<ReasoningBlockId, { chip: EvidenceChip; blockStyle: typeof BLOCK_STYLE[ReasoningBlockId] }[]>> = {};
    for (const blockId of BLOCK_ORDER) {
      const chips = (board[blockId] || []).filter(c => c.annotation && c.annotation.trim().length > 0);
      if (chips.length > 0) {
        result[blockId] = chips.map(c => ({ chip: c, blockStyle: BLOCK_STYLE[blockId] }));
      }
    }
    return result;
  }, [board]);

  const hasAnyAnnotations = Object.keys(annotatedByBlock).length > 0;

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
                            {(chip.contextChips ?? (chip.contextChip ? [chip.contextChip] : [])).map((ctx, ci) => (
                              <span key={`ctx-${ci}`} className="text-muted-foreground ml-1">+ {ctx.label}</span>
                            ))}
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
      {hasAnyAnnotations && (
        <div className="px-3 pb-5">
          <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-foreground mb-3">
            CONTEXTUAL NOTES
          </h3>
          <div className="space-y-3">
            {BLOCK_ORDER.map((blockId) => {
              const entries = annotatedByBlock[blockId];
              if (!entries || entries.length === 0) return null;
              const style = BLOCK_STYLE[blockId];
              return (
                <div
                  key={blockId}
                  className="rounded-xl border border-border/40 p-3"
                  style={{
                    borderLeftColor: style.accent,
                    borderLeftWidth: 4,
                    backgroundColor: style.tint
                  }}
                >
                  <div className="text-xs font-bold mb-2" style={{ color: style.accent }}>
                    {style.label}
                  </div>
                  <div className="space-y-2">
                    {entries.map(({ chip }) => (
                      <div key={chip.id} className="text-[12px]">
                        <span className="font-medium text-foreground/80">
                          {chip.label}: {chip.value}
                        </span>
                        <p className="italic text-foreground/70 mt-0.5 leading-snug">
                          "{chip.annotation}"
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
