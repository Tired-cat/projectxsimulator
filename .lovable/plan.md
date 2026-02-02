
# LumbarPro Marketing Simulator - Comprehensive Fix Plan

## Problem Summary

The simulation currently has several consistency issues that break the learning experience:

1. **User starts above goal** - The math model generates ~$109k revenue at start, but the Excel shows only $43k
2. **Scenario text doesn't match numbers** - Claims "70% on TikTok" but actual spend doesn't reflect this
3. **Chart units are mixed** - Y-axis shows dollars but "Views" mode shows click counts
4. **Channel naming inconsistent** - "Newspaper/Email" in some places, "Newspaper" in others
5. **Missing Revenue filter** - Only Views, Profit, Show All available
6. **Available Budget shown** - Excel totals $17,500, not $20k, but we show remaining budget

---

## Implementation Plan

### Phase 1: Fix Conversion Rates to Match Excel Revenue

The current conversion rates produce wrong revenue. We need to calibrate them to match the Excel's actual revenue figures.

**Excel Baseline (at current spend):**
| Channel | Spend | Clicks (at CPC) | Revenue | Implied Conv Rate |
|---------|-------|-----------------|---------|-------------------|
| TikTok | $9,000 | 18,000 | $1,200 | ~0.67% overall |
| Instagram | $5,000 | 6,667 | $4,800 | ~0.72% overall |
| Facebook | $3,000 | 3,000 | $15,000 | ~5% overall |
| Newspaper | $500 | 200 | $22,000 | Implied high-ticket focus |

**Changes to `marketingConstants.ts`:**
- Recalibrate conversion rates so the Excel starting state produces approximately $43,000 total revenue
- Adjust chair conversion rates significantly downward for TikTok/Instagram
- Keep Newspaper as the "hidden gem" with strong chair conversions

### Phase 2: Fix Starting State & Scenario Text

**Update `useMarketingSimulation.ts` and `Index.tsx`:**
- Keep Excel's exact starting allocation: TikTok $9k, Instagram $5k, Facebook $3k, Newspaper $500
- Update scenario text to match: "Current allocation: 51% on TikTok ($9k), only 3% on Newspaper ($500)"
- Or: Change starting state to match the "70% TikTok" claim: TikTok $14k, Instagram $3k, Facebook $2k, Newspaper $1k

**Recommendation:** Match the Excel exactly and update the scenario text accordingly.

### Phase 3: Fix the Chart Filter System

**Update `DraggableBarChart.tsx`:**
- Add **Revenue** as a filter option (currently missing)
- New filter options: `Views | Revenue | Profit | Show All`
- Fix Y-axis to match selected metric:
  - Views mode: Y-axis shows count (0, 10k, 20k, 30k, 40k, 50k)
  - Revenue/Profit mode: Y-axis shows dollars ($0, $10k, $20k, $30k)
- Bar height represents the selected metric, NOT spend
- Spend shown only as a label below each bar

### Phase 4: Consistent Channel Naming

**Update across all files:**
- Rename "Newspaper/Email" to "Newspaper" everywhere
- Update `CHANNELS` object in `marketingConstants.ts`
- Update filter chips in `ProductMixChart.tsx`

### Phase 5: Remove "Available Budget" When Fully Allocated

**Update `DraggableBarChart.tsx`:**
- If Excel scenario uses $17,500 of $20k, show "Available: $2,500"
- Or: Increase total spend to use full $20k budget
- **Recommendation:** Update INITIAL_SPEND to total exactly $20,000 to eliminate confusion

### Phase 6: Improve Product Mix with Units Sold

**Update `ProductMixChart.tsx`:**
- Show both revenue AND units sold per product
- Add profit per product calculation
- Add dynamic insight sentences based on selected channel:
  - TikTok: "TikTok drives high volume (X views) but mostly low-ticket items ($Y avg)"
  - Newspaper: "Newspaper drives fewer views but X high-ticket chair sales"

### Phase 7: Add Collapsible Assumptions Panel

**Create new component or add to `Index.tsx`:**
- Collapsible accordion with simulation assumptions
- Product prices: $10 Bottle, $50 Cushion, $500 Pro Chair
- Channel characteristics: CPC rates, audience tendencies
- Short, educational format

### Phase 8: Goal Tracker Logic Fix

**Update `Index.tsx`:**
- Hide congratulations message on first load
- Only show success after user makes changes AND reaches goal
- Track if user has made any modifications to the starting allocation

---

## Technical Details

### File Changes

**`src/lib/marketingConstants.ts`:**
- Recalibrate conversion rates to produce ~$43k revenue at Excel starting spend
- Update channel name from "Newspaper/Email" to "Newspaper"
- Update INITIAL_SPEND to total $20,000 (or keep at $17,500 with scenario text update)

**`src/hooks/useMarketingSimulation.ts`:**
- Add `hasUserModified` state to track if user changed anything
- Update initial state to match constants

**`src/components/simulation/DraggableBarChart.tsx`:**
- Add "Revenue" to filter options
- Fix Y-axis labels to match selected metric (count vs dollars)
- Update bar height logic to show metric value, not spend
- Conditionally show "Available Budget" only if budget is unallocated

**`src/components/simulation/ProductMixChart.tsx`:**
- Show units sold alongside revenue
- Add dynamic insight text based on channel metrics
- Fix channel filter label consistency

**`src/pages/Index.tsx`:**
- Update scenario text to match actual starting percentages
- Add collapsible Assumptions accordion
- Fix goal tracker to only congratulate after user action

---

## Expected Outcome

After implementation:
1. User starts at ~$43k-$60k revenue (below $100k goal)
2. Scenario text matches actual allocation percentages
3. Charts show correct units for selected metric
4. "Newspaper" naming is consistent everywhere
5. Product Mix shows both revenue and units sold
6. Congratulations only appears after user achieves the goal
7. Learning loop is preserved: user must discover the "trap" and reallocate

---

## Validation Checklist

- [ ] Starting revenue is between $40k-$85k (below goal)
- [ ] Starting spend totals exactly $20,000
- [ ] Scenario text percentages match starting spend
- [ ] Views mode shows count axis, Revenue/Profit shows dollar axis
- [ ] Channel names consistent across all panels
- [ ] Congratulations hidden until goal reached through user action
- [ ] Product Mix shows units sold per product
