

## Fix: Runtime crashes + full @dnd-kit cleanup

### Problem

Two runtime errors are causing a blank screen:

1. **`useDndMonitor must be used within a children of <DndContext>`** — `ReasoningBoard` calls `useDndMonitor` but no `<DndContext>` exists anywhere in the component tree. All `useDraggable` / `useDroppable` hooks also silently fail without it.

2. **`Function components cannot be given refs` (DialogContent warning)** — Minor React warning from Radix Dialog, not a crash blocker but worth fixing.

Additionally, `ProductMixChart` and `DraggableBarChart` still use native HTML5 drag (`draggable`, `onDragStart`, `e.dataTransfer`) instead of @dnd-kit, creating an inconsistent system where drops never reach the @dnd-kit `onDragEnd` handler.

### Plan

#### 1. Add `<DndContext>` provider wrapper

Wrap the simulation content tree in a `<DndContext>` from `@dnd-kit/core`. The best place is in `src/pages/Index.tsx`, wrapping `<SimulationContent />` inside `<ReasoningBoardProvider>`. This single provider will serve all draggable sources and droppable targets across the app.

The `onDragEnd` handler will be a thin dispatcher that delegates to the existing `addChip`, `moveChip`, and `contextualiseChip` functions — effectively moving the logic currently in `ReasoningBoard`'s `useDndMonitor` up to the provider level.

**File**: `src/pages/Index.tsx`
- Import `DndContext` and `DragOverlay` from `@dnd-kit/core`
- Wrap the content in `<DndContext onDragEnd={handleDragEnd}>` inside the existing provider tree
- Move the drag-end logic (currently in `ReasoningBoard.tsx`'s `useDndMonitor`) here

#### 2. Remove `useDndMonitor` from ReasoningBoard

Since the `DndContext` with `onDragEnd` is now at the top level, remove the `useDndMonitor` call from `ReasoningBoard.tsx`. Keep all `useDroppable` and `useDraggable` hooks in place — they'll work correctly now that they're inside a `DndContext`.

**File**: `src/components/reasoning/ReasoningBoard.tsx`
- Remove the `useDndMonitor` import and call (lines 2, 56-98)
- Keep `activeDrag` state but drive it from the parent `DndContext` via context or keep it local with `useDndMonitor` replaced by a simpler approach

#### 3. Convert ProductMixChart to @dnd-kit

Replace native `draggable` / `onDragStart` / `onDragEnd` with `useDraggable` hooks for each legend row and pie segment.

**File**: `src/components/simulation/ProductMixChart.tsx`
- Remove `handleSegmentDragStart` / `handleSegmentDragEnd` and native drag attributes
- Create a small `DraggableLegendRow` sub-component using `useDraggable` with `ExternalEvidencePayload` data
- Remove direct `setDraggingChip` calls (the DndContext handler manages state)

#### 4. Convert DraggableBarChart main bar drag to @dnd-kit

The main bar in `DraggableBarChart` still uses native HTML5 drag for reason mode. Convert it to use `useDraggable`.

**File**: `src/components/simulation/DraggableBarChart.tsx`
- Remove `handleBarDragStart` / `handleBarDragEnd` native drag handlers (lines 704-715)
- The `GhostDeltaBar` component already uses `useDraggable` correctly — just remove the native drag fallback path from the parent

#### 5. Fix DialogContent ref warning (minor)

The warning about `DialogContent` giving refs to function components is a known shadcn/Radix issue. It's cosmetic but can be silenced.

**File**: `src/components/ui/dialog.tsx`  
- This is a shadcn component — the warning is harmless and won't cause crashes. Skip unless specifically requested.

### Technical details

- `DndContext` needs to be inside `ReasoningBoardProvider` so the `onDragEnd` handler can access `addChip`, `moveChip`, `contextualiseChip` via the context hook
- All existing `useDraggable` calls in `EvidenceHandle`, `GhostDeltaBar`, and `ReasoningBoard` (ChipCard) will automatically work once wrapped in `DndContext`
- The `activeDrag` state for visual highlighting of drop zones can be driven by `DndContext`'s `onDragStart` / `onDragCancel` callbacks passed as props
- No backend, session, or auto-save code is touched

