# Simulation Solution Guide
## What the Code Says the Correct Answer Is

This document explains exactly how the simulation works under the hood, what the optimal strategy is, and what current limitations exist.

---

## The Revenue Model

Every channel generates revenue through this exact formula:

```
Clicks = floor(Spend ÷ CPC)
Sales  = floor(Clicks × Conversion Rate)
Revenue = Sales × Product Price
```

There are no diminishing returns. Every additional dollar you spend on a channel produces a fixed return.

---

## Channel Statistics (from `src/lib/marketingConstants.ts`)

| Channel | CPC | Bottle Conv. | Cushion Conv. | Chair Conv. |
|---------|-----|-------------|--------------|------------|
| TikTok | $0.50 | 0.6% | 0.03% | 0.001% |
| Instagram | $0.75 | 2.5% | 0.8% | 0.05% |
| Facebook | $1.00 | 1.5% | 1.0% | 0.9% |
| Newspaper | $2.50 | 2.0% | 4.0% | **20.0%** |

**Products:** Bottle = $10, Cushion = $50, Chair = $500

---

## Revenue Per Dollar Spent (the real metric)

This is what actually determines the winner:

| Channel | Rev/Click | Rev/Dollar Spent | Rank |
|---------|-----------|-----------------|------|
| TikTok | $0.08 | **$0.16** | 4th (worst) |
| Instagram | $0.90 | **$1.20** | 3rd |
| Facebook | $5.15 | **$5.15** | 2nd |
| Newspaper | $102.20 | **$40.88** | 1st (best by far) |

**How these are calculated:**

TikTok:
```
(0.006 × $10) + (0.0003 × $50) + (0.00001 × $500) = $0.08/click
$0.08 ÷ $0.50 CPC = $0.16 per dollar spent
```

Newspaper:
```
(0.02 × $10) + (0.04 × $50) + (0.20 × $500) = $102.20/click
$102.20 ÷ $2.50 CPC = $40.88 per dollar spent
```

Newspaper is **256x more efficient** than TikTok per dollar.

---

## Starting State Analysis

Default allocation: TikTok $9,000 | Instagram $5,500 | Facebook $4,500 | Newspaper $1,000

| Channel | Spend | Clicks | Bottles | Cushions | Chairs | Revenue | Profit |
|---------|-------|--------|---------|----------|--------|---------|--------|
| TikTok | $9,000 | 18,000 | 108 | 5 | 0 | $1,330 | -$7,670 |
| Instagram | $5,500 | 7,333 | 183 | 58 | 3 | $6,230 | +$730 |
| Facebook | $4,500 | 4,500 | 67 | 45 | 40 | $22,920 | +$18,420 |
| Newspaper | $1,000 | 400 | 8 | 16 | 80 | $40,880 | +$39,880 |
| **Total** | **$20,000** | | | | | **$71,360** | **$51,360** |

**The designed "trap":** TikTok gets 45% of the budget and generates only 2% of the revenue. Students are expected to notice this.

**The designed "hidden gem":** Newspaper gets 5% of the budget and generates 57% of the revenue.

---

## The Optimal Strategy

Since the model is linear (no caps, no diminishing returns), the mathematically optimal strategy is to move all budget to Newspaper first, then Facebook:

**Theoretical maximum — everything into Newspaper:**
```
$20,000 ÷ $2.50 CPC = 8,000 clicks
8,000 × 0.20 chair rate = 1,600 chair sales × $500 = $800,000
+ 8,000 × 0.02 bottle rate = 160 × $10 = $1,600
+ 8,000 × 0.04 cushion rate = 320 × $50 = $16,000
Total: $817,600 revenue ($797,600 profit)
```

**A realistic strong strategy — Newspaper + Facebook, minimal TikTok:**

| Channel | Spend | Revenue | Profit |
|---------|-------|---------|--------|
| TikTok | $0 | $0 | $0 |
| Instagram | $1,000 | $1,200 | +$200 |
| Facebook | $4,000 | $20,600 | +$16,600 |
| Newspaper | $15,000 | $613,200 | +$598,200 |
| **Total** | **$20,000** | **$635,000** | **+$615,000** |

That is roughly **9x** more revenue than the starting state.

---

## What a Good Reasoning Board Looks Like

Based on the optimal insight, a high-quality reasoning chain would be:

**Descriptive (What I observed):**
> Chip: "Newspaper Revenue: $40,880" with annotation: "Newspaper generates more revenue than TikTok despite receiving 1/9 of the budget."

**Diagnostic (Why it happened):**
> Chip: "Product Mix — Newspaper Chairs: 20%" with annotation: "Newspaper readers convert at 20% on the $500 chair — 200x higher than TikTok's 0.001%. The audience intent is completely different."

**Prescriptive (What I did):**
> Chip: "Newspaper Budget ▲ +$14,000" with annotation: "Moved $9,000 from TikTok (ROI: $0.16/dollar) to Newspaper (ROI: $40.88/dollar). TikTok volume is misleading — it's reach without purchase intent."

**Predictive (What I expect):**
> Chip: "Total Revenue ▲" with annotation: "Shifting $14,000 to Newspaper at $40.88/dollar return should add approximately $572,000 in revenue."

This is the reasoning chain the simulation is designed to reward with positive AI feedback.

---

## Known Limitations and Loopholes

### 1. The model is linear — no diminishing returns
**What this means:** There is no ceiling on how much revenue a single channel can produce. You can put the full $20,000 into Newspaper and generate $817,600.

**Why this is a design limitation:** In reality, newspaper advertising saturates quickly — you cannot run infinite newspaper ads in a local market. The simulation does not model this.

**Impact on learning:** A student who discovers the Newspaper ROI and moves all budget there will "win" the simulation without needing to make genuine trade-off decisions. The educational purpose is partially undermined.

**Status:** Not a bug. A known simplification. A future improvement would add a `maxSpend` per channel or a diminishing-returns curve.

---

### 2. The starting state comment is outdated
**What the code says:**
```typescript
// Marketing Simulation Constants - Calibrated to produce ~$43k revenue at starting state
```

**What the actual math produces:** $71,360 revenue at starting state (verified above).

**Why:** The `INITIAL_SPEND` values were updated at some point (Newspaper went from $500 to $1,000, others shifted) but the comment was not updated.

**Fix:** Update the comment in `src/lib/marketingConstants.ts`.

---

### 3. Contradictory empty-state messaging on the Reasoning Board
**What the board says when empty:**
> "Place evidence in any block — no set order required."

**What the validation system actually enforces:**
- Diagnostic requires Descriptive to be filled first
- Prescriptive requires Diagnostic
- Predictive requires Prescriptive

**Impact:** Students read the instruction, fill blocks out of order, then get a validation error that contradicts what they were told. Confusing.

**Fix:** Change the empty-state message to reflect the actual prerequisite chain.

---

### 4. The "Reason" button is not discoverable
The Reason button must be clicked before bars become draggable. But there is nothing in the main UI explaining this except the tutorial. Students who skip or miss the tutorial cannot figure out how to add evidence.

**Status:** Partially addressed by the tutorial. Could be further improved by adding a persistent hint on the Reasoning Board itself when no chips have been added.

---

## Summary: What Success Looks Like

A student who has fully understood the simulation should be able to say:

1. **Observation:** TikTok gets the most budget but generates almost no revenue. Newspaper gets almost no budget but generates the most revenue.

2. **Diagnosis:** The difference is chair conversion rate. Newspaper converts at 20% for $500 chairs. TikTok converts at 0.001% — effectively never. High views ≠ high revenue when the audience does not buy expensive products.

3. **Decision:** Shift budget from TikTok to Newspaper. Possibly also increase Facebook (0.9% chair conversion, good ROI at $5.15/dollar).

4. **Prediction:** Total revenue should increase dramatically because each dollar moved from TikTok ($0.16 return) to Newspaper ($40.88 return) multiplies revenue by ~256x.

The key transferable insight is: **reach does not equal revenue. Audience intent and product-channel fit determine ROI.**
