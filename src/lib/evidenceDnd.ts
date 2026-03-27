import type { EvidenceChip, ReasoningBlockId } from '@/types/evidenceChip';

export interface ExternalEvidencePayload {
  label: string;
  value: string;
  context: string;
  sourceId: string;
  chipKind?: EvidenceChip['chipKind'];
  channelName?: string;
  metricName?: string;
  deltaValue?: number;
}

export type EvidenceDragData =
  | {
      kind: 'external-chip';
      payload: ExternalEvidencePayload;
    }
  | {
      kind: 'board-chip';
      chip: EvidenceChip;
      fromBlock: ReasoningBlockId;
    };

export type EvidenceDropData =
  | {
      kind: 'reasoning-block';
      blockId: ReasoningBlockId;
    }
  | {
      kind: 'context-target';
      blockId: ReasoningBlockId;
      targetChipId: string;
    };

const sanitize = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/--+/g, '-')
    .replace(/^-|-$/g, '');

export const getExternalChipDragId = (sourceId: string, suffix?: string) => {
  const base = `ext-chip-${sanitize(sourceId)}`;
  return suffix ? `${base}-${sanitize(suffix)}` : base;
};

export const getBoardChipDragId = (blockId: ReasoningBlockId, chipId: string) =>
  `board-chip-${blockId}-${chipId}`;

export const getBlockDropId = (blockId: ReasoningBlockId) =>
  `reasoning-block-${blockId}`;

export const getContextDropId = (blockId: ReasoningBlockId, chipId: string) =>
  `context-target-${blockId}-${chipId}`;