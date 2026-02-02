

To ensure clarity for your first development loop, we are stripping everything down to the **"Math & Interaction"** layer. This allows you to hand a clean, logical brief to a developer or use a tool like Lovable/Bolt to build the core engine.

Here is the refined **Phase 0 & Phase 1 Sprint Plan** focused on a "simulate and break" testing model.

---

## Phase 0: The "Market Engine" (Immediate Testing)

**Goal:** Create an unbreakable dashboard where the user can manipulate budget and see mathematically accurate results in the charts. No "Path" logic yet—just raw data reaction.

### 1. Interactive Control Panel

* 
**The Global Budget:** A master variable starting at **$20,000**.


* 
**The Spend Sliders:** Four sliders (TikTok, Instagram, Facebook, Newspaper).


* **Logic:** As one slider goes up, the "Remaining Budget" must go down. If the budget hits $0, other sliders lock.


* 
**Product Toggle:** A switch to select which product is being "pushed" in the ads: **$500 Pro Chair** vs. **$10 Ergo-Bottle**.



### 2. Live Data Visualization (The Bar & Pie Charts)

The charts must update **instantly** as sliders move based on these variables:

* 
**TikTok:** High Traffic ($0.50 CPC), but 0.01% Chair Conversion.


* 
**Newspaper:** Low Traffic ($2.50 CPC), but 5.0% Chair Conversion.


* 
**Revenue Formula:** .



---

## Phase 1: The "Analysis & Commitment" (The Logic Layer)

**Goal:** Once the math works, we add the "Identify" and "Submit" features to see if users can find the "Trap."

### 1. The Filtering System (Identify)

The student must be able to toggle what the Bar Chart shows to find the mismatch:

* 
**View 1 (Default):** "Total Views" — TikTok looks like the winner.


* 
**View 2:** "Revenue" — Newspaper suddenly shows the highest bars.


* 
**View 3:** "Product Mix" (Pie Chart) — Shows TikTok is only selling $10 bottles while Newspaper sells chairs.



### 2. The Drag-and-Drop Analysis

Instead of just clicking, students drag "Insight Chips" to categorize what they see:

* **The Pool:** Chips like "Low Revenue," "High Traffic," "Profit Leader," "Liquidity Risk" [Phase 1 Overview].
* **The Drop Zone:** An area where they must drag a chip to a chart to "Identify" the issue before the **Submit** button unlocks.

### 3. The "Submit" & Visual Outcome

The user clicks "Run Simulation." Instead of a feedback text box, the dashboard **transforms**:

* 
**Path 1 Success:** Net Profit skyrockets (Green Arrow ↑ 400%).


* 
**Path 3 Failure:** Cash on Hand depletes rapidly (Red Alert ⚠).



---

## The "Break-Test" Sprint (User Testing)

Once Phase 0 and 1 are built, give it to users with one instruction: **"Try to reach $100,000 in revenue."**

**What we are watching for:**

* **Math Exploits:** Can they find a way to get infinite money by sliding bars rapidly?
* 
**Filtering Friction:** Do they realize they *can* change the graph view, or do they stay stuck on "Total Views" (The Trap)?.


* **Logic Gaps:** Does the transition from "Submit" to "Outcome" feel like a real simulation or just a static page change?

---

**Would you like the specific JavaScript logic for the "Winning Formula" (Newspaper vs. TikTok) to give to your developer for Phase 0?**
