# CLAUDE.md — ProjectX Simulator

This file provides guidance for AI assistants working on the ProjectX Simulator codebase. Read this before making any changes.

---

## Project Overview

**ProjectX Simulator** is an interactive educational web application — a marketing budget simulation game. Users allocate a $20,000 budget across 4 marketing channels (TikTok, Instagram, Facebook, Newspaper) to optimize revenue from 3 product tiers (Bottle $10, Cushion $50, Chair $500). The app teaches multi-product revenue dynamics through hands-on experimentation and a structured "Reasoning Board."

**Tech Stack:**
- React 18.3.1 + TypeScript 5.8.3
- Vite 5.4.19 (bundler, dev server on port 8080)
- Tailwind CSS 3.4.17 with custom warm HSL color palette
- shadcn/ui (46 components, Radix UI primitives)
- Framer Motion (animations), Recharts (charts), @dnd-kit (drag-and-drop)
- React Context API for global state (no Redux/Zustand)
- TanStack React Query v5 (data fetching infrastructure, minimally used)
- Vitest + Testing Library (tests)

---

## Development Commands

```bash
npm run dev        # Start dev server at http://localhost:8080
npm run build      # Production build (TypeScript check + Vite bundle)
npm run lint       # ESLint check
npm run test       # Run tests once
npm run test:watch # Run tests in watch mode
npm run preview    # Preview production build
```

Also works with Bun (bun.lock and bun.lockb are committed).

---

## Repository Structure

```
src/
├── components/
│   ├── ui/                    # shadcn/ui primitive components (DO NOT modify unless necessary)
│   ├── simulation/            # Core sim UI: shell, charts, decision controls
│   ├── reasoning/             # Reasoning board and narrative components
│   ├── tutorial/              # Tutorial overlay system
│   └── workspace/             # Split-view/workspace utilities
├── contexts/
│   ├── TabContext.tsx          # Tab navigation state + split-view mode
│   ├── ReasoningBoardContext.tsx  # Evidence chip placement on board
│   └── TutorialContext.tsx    # 3-step tutorial progress tracking
├── hooks/
│   ├── useMarketingSimulation.ts  # Core simulation logic hook
│   └── use-mobile.tsx         # Responsive breakpoint detection
├── lib/
│   ├── marketingConstants.ts  # ALL business logic constants and calculations
│   └── utils.ts               # Tailwind cn() helper
├── pages/
│   ├── Index.tsx              # Main page — assembles all providers and views
│   └── NotFound.tsx
├── test/
│   ├── reasoning-board.test.tsx
│   ├── example.test.ts
│   └── setup.ts
└── types/
    ├── evidenceChip.ts        # Evidence chip types, validation, narrative templates
    ├── reasoningToken.ts
    └── workspaceTypes.ts
```

---

## Key Files

| File | Purpose |
|------|---------|
| `src/lib/marketingConstants.ts` | Single source of truth for all simulation constants: channels, products, CPC rates, conversion rates, revenue calculations |
| `src/hooks/useMarketingSimulation.ts` | Encapsulates all simulation state: `channelSpend`, `remainingBudget`, metrics computation, budget enforcement, reset |
| `src/pages/Index.tsx` | Root composition: wraps all Context Providers, renders SimulationShell + panels |
| `src/types/evidenceChip.ts` | Evidence chip data model, reasoning board block types, validation rules, narrative templates |
| `src/contexts/TabContext.tsx` | Global tab state (Home, Decisions, Reasoning, Panels) + split-view tracking |
| `src/contexts/ReasoningBoardContext.tsx` | Evidence chips placed on the 4-block reasoning board |
| `src/components/simulation/DraggableBarChart.tsx` | Primary interactive chart (~42KB) — channel spend controls with drag interaction |
| `src/components/reasoning/ReasoningBoard.tsx` | 4-quadrant drag-and-drop evidence board |
| `src/components/tutorial/TutorialOverlay.tsx` | Guided 3-step onboarding with overlay positioning |

---

## Architecture & Conventions

### State Management
- **React Context only** — no Redux, Zustand, or MobX.
- The three contexts (`TabContext`, `ReasoningBoardContext`, `TutorialContext`) are the only global state.
- Business logic lives in `useMarketingSimulation` and `marketingConstants.ts`.
- Use `useMemo` and `useCallback` when computing derived values or passing stable callbacks.

### Component Patterns
- Prefer **composition over prop drilling** when adding new features.
- UI primitives are in `src/components/ui/` (shadcn/ui) — use these instead of custom equivalents.
- Feature components live in `simulation/`, `reasoning/`, `tutorial/`, `workspace/`.
- Cross-component communication uses **window custom events** (see tutorial sync in `Index.tsx`); keep this pattern minimal.

### Simulation Constants
- **Never hardcode** budget amounts, channel names, product prices, or CPC rates outside of `src/lib/marketingConstants.ts`.
- The $20,000 total budget is enforced in `useMarketingSimulation.ts` — always respect this constraint.
- Revenue calculation functions: `calculateChannelMetrics()` and `calculateMixedRevenue()`.

### Reasoning Board (Evidence Chips)
- The board has exactly 4 blocks: `descriptive → diagnostic → predictive → prescriptive`.
- Evidence chips have strict validation (duplicate detection, prerequisite checking, channel alignment) — see `src/types/evidenceChip.ts`.
- Narrative templates are defined in `evidenceChip.ts` — extend there, not inline.

### Tutorial System
- 3-step linear tutorial tracked in `TutorialContext`.
- Steps have action completion flags — tutorial only advances when the user performs the correct action.
- Tutorial overlay uses absolute positioning relative to target elements; be careful when modifying layout to avoid breaking overlay placement.

### Styling
- **Tailwind CSS only** — no CSS modules, no styled-components.
- Custom design tokens defined in `tailwind.config.ts`: warm HSL palette, custom fonts (Lora for headings, Source Sans 3 for body).
- Dark mode is configured via `class` strategy but not prominently used yet.
- Use `cn()` from `src/lib/utils.ts` for conditional class merging.

### TypeScript
- Config is intentionally lenient: `noImplicitAny: false`, `noUnusedLocals: false`.
- Path alias `@/*` maps to `src/*`.
- Prefer explicit types for public hook/context interfaces; inline types are fine for component internals.

---

## Testing

```bash
npm run test         # Run all tests
npm run test:watch   # Watch mode
```

- Framework: **Vitest** with jsdom environment.
- Test files: `src/test/*.{test,spec}.{ts,tsx}` — place tests here, not co-located.
- Setup: `src/test/setup.ts` (imports `@testing-library/jest-dom`).
- Current tests focus on reasoning board logic. Add tests for new simulation logic or validation rules.

---

## Important Constraints

1. **Budget enforcement:** The total of all channel spends must always equal exactly $20,000. This is enforced in `useMarketingSimulation.ts`.
2. **No environment variables:** The app has no `.env` files — all constants are hardcoded in `marketingConstants.ts`.
3. **No backend/API:** Fully client-side. No server, no API calls (React Query is present but unused for external data).
4. **Port 8080:** Dev server runs on port 8080 (configured in `vite.config.ts`), not the default 3000/5173.
5. **HMR overlay disabled:** `server.hmr.overlay: false` in vite config — Vite error overlay is off.
6. **shadcn/ui components:** Don't rewrite UI primitives in `src/components/ui/`. Update them via the shadcn CLI or leave as-is.

---

## Common Tasks

### Adding a new marketing channel
1. Add channel definition in `src/lib/marketingConstants.ts` (CHANNELS array).
2. Update initial allocation to keep total at $20,000.
3. Update `useMarketingSimulation.ts` if channel count affects state shape.
4. Add any new evidence chip templates in `src/types/evidenceChip.ts`.

### Adding a new product tier
1. Add to PRODUCTS array in `src/lib/marketingConstants.ts`.
2. Update conversion rate matrices for each channel.
3. Update `calculateMixedRevenue()` if needed.

### Adding a tutorial step
1. Add step definition in `TutorialContext.tsx`.
2. Add overlay position/content in `TutorialOverlay.tsx`.
3. Wire action completion trigger at the appropriate UI interaction point.

### Modifying the reasoning board
1. Types and validation: `src/types/evidenceChip.ts`.
2. Board state: `src/contexts/ReasoningBoardContext.tsx`.
3. UI: `src/components/reasoning/ReasoningBoard.tsx`.

---

## Recent Development History

Based on recent commits (as of March 2026):
- Tutorial overlay stability fixes (hook ordering issues resolved)
- Revenue calculation fix in `calculateMixedRevenue`
- UI theme redesign toward a warm, handcrafted aesthetic
- Split-view comparison feature added
- Evidence chip drag-to-board workflow

---

## Platform Notes

This project was scaffolded via **Lovable** (an AI-assisted development platform). The `.lovable/` directory contains platform configuration — do not modify it manually. The project can be developed locally with standard npm/Vite workflows independent of Lovable.
