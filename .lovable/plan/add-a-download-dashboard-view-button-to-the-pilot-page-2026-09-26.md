# Add a "Download dashboard view" button to the Pilot page

## What you get
Two buttons at the top of the Pilot page:
- **Download raw data** (the current button, renamed). It stays the same.
- **Download dashboard view** (new). This is one Excel file that holds the numbers exactly as the dashboard shows them, so you can check them against the raw data.

Both buttons follow the class picker: one class, or all classes.

## Sheets in the "dashboard view" file
1. **Pilot health**: every stat card, with its value, label and status (ok / warning), plus the numbers behind each chart.
2. **Reasoning board**: cards per quadrant, how many students filled each quadrant, block completion and chart data.
3. **Annotation quality**: annotation counts, quality tiers and the per-quadrant breakdowns.
4. **Allocation decisions**: final spend per channel, averages, how the decisions are spread out, and the outcome categories.
5. **Feature usage**: how many students used each feature, and what percentage.
6. **AI feedback**: rounds requested, what students did after feedback, and the before/after changes.
7. **Struggle signals**: each issue with its priority, status, percentage and threshold, plus tab time, first-evidence and reset stats.
8. **Per-student table**: every column exactly as shown, one row per student.
9. **Student details**: one row per student with everything from the detail panel you open by clicking a student:
   - the overview stats and final decision
   - the reasoning board cards with their notes
   - the reasoning story and written diagnosis
   - allocation path, AI feedback rounds, navigation, tutorial status and resets
   - the reflection answers, including AI use and the chat link
10. **Student timeline**: a long list with one row per event for each student (budget moves, board moves, feedback). This lets you trace the detail-panel charts step by step.

Each sheet starts with a header row showing the class filter and when the file was made.

## Technical details
- Keeping the export in step with the screen: the calculation code in each Pilot component (PilotHealth, PilotReasoningBoard, PilotAnnotationQuality, PilotAllocationDecisions, PilotFeatureUsage, PilotAiFeedback, PilotStruggleSignals, PilotPerStudentTable, StudentDetailPanel) moves into pure functions in `src/lib/pilotMetrics/*.ts`. Both the components and the export call these same functions, so the numbers always match. The UI and the queries stay the same.
- New `src/lib/pilotPresentedExport.ts`:
  - fetches the data once, with the same class filter and the same chunked `.in('session_id')` loading used today
  - runs each metrics function
  - writes the sheets with `xlsx`, cutting any cell longer than 32k characters
- Detail-panel data for every student is built from the bulk-fetched tables. There are no per-student queries.
- AdminPilot: rename the current button, add a second button with its own loading state and toasts.
- Verification: open the Pilot page, download both files, and spot-check a few Pilot health cards and per-student rows against what the dashboard shows.
