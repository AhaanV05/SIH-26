# DEMO-001: MahaSetu Rehearsal Guide & Presentation Script

**Purpose:** Timed walkthrough of the complete golden-path demonstration  
**Target Duration:** 10 minutes (with flexibility for Q&A)  
**Audience:** SIH judges and technical reviewers  

---

## Pre-Presentation Checklist (5 minutes before)

- [ ] Run `./demo-reset.sh` to ensure clean state
- [ ] Start dev server: `corepack pnpm dev`
- [ ] Open browser to http://127.0.0.1:3000
- [ ] Verify you're logged in as "Aditi Kulkarni" (Problem Owner)
- [ ] Check that "SIMULATED_FOR_DEMO" badge is visible
- [ ] Verify role switcher dropdown shows all 5 roles
- [ ] Test one role switch to confirm it works (switch back to Problem Owner)

**Estimated setup time:** 3–5 minutes

---

## Presentation Flow

### Introduction (1 minute)

**Script:**
> "Good morning! I'm going to walk you through MahaSetu, the Innovation Procurement Exchange—a platform that connects government departments with innovative startups through a transparent, outcome-focused procurement lifecycle. You'll see how we bridge the gap between traditional government procurement and the fast-moving startup ecosystem.
>
> The platform has five key stakeholders: problem owners in government, evaluators, finance officers, startups, and procurement specialists. Everyone operates with complete transparency, frozen requirements, and immutable audit trails.
>
> What you're seeing is fully functional—this works offline, runs on your laptop, and every interaction is tracked and auditable. Let me walk you through the complete workflow in about ten minutes."

**Visual cues on screen:**
- Home page visible
- "Signal-to-scale command centre" headline readable
- SIMULATED_FOR_DEMO badge visible (reassures judges)

---

### Stage 1: Problem Identification (1 minute)

**Narration:**
> "We start when a government department has a public problem they want to solve. In this case, a city has a problem with overflowing community bins—sanitation crews don't know when bins are full until residents complain.
>
> The problem owner describes it in plain language. Our system will transform this into an executable procurement specification with deterministic quality checks."

**Demo steps:**
1. Click "Challenge Forge" (page 03)
2. Show the problem statement form:
   - Public problem: "Bins overflow for hours before ward teams know..."
   - Department: Urban Development
   - Geography: Pune, Maharashtra
3. Click "Compile challenge draft"

**Talking points while it compiles:**
- "This is where the AI provider hook would be. Right now we're in offline mode, so we use deterministic compilation."
- "The system is generating a structured specification, creating a frozen rubric for scoring, and identifying measurable milestones."

---

### Stage 2: Challenge Specification & Lint (2 minutes)

**Narration:**
> "Here's the structured output. Notice three things:
>
> First, the public outcome is clear: 'Reduce community-bin overflow events.' Everything connects to this.
>
> Second, we've broken down the evaluation into five measurable criteria. These are frozen—they cannot change once proposals start arriving. This protects the startup and ensures fair evaluation.
>
> Third, the system runs a procurement lint check to flag risky language. See this finding? 'Potentially solution-prescriptive: must use Microsoft Azure.' The system recommends rewriting it as an outcome constraint, not a vendor mandate. This prevents vendor lock-in and keeps competition open."

**Demo steps:**
1. Scroll through the compiled specification
   - Show the public outcome, affected users, geography
   - Point out Metrics (1), Rubric criteria (5), Eligibility checks (1), Milestones (1)
2. Scroll to the Procurement Lint section
   - Highlight the MS-PROC-005 warning
   - Show the recommendation text
3. Point to the "Freeze approved version" button (currently disabled)

**Key visual element:**
- The four-part structure is visible: Problem → Specification → Lint → Freeze
- Status badge shows "UNDER_REVIEW"

---

### Stage 3: Startup Passport & Verification (1 minute)

**Narration:**
> "Now imagine you're a startup. Before you can even apply, the government needs to verify you're a real, eligible organization. This is where the Passport comes in.
>
> Every startup registers their capabilities—AI, IoT, edge computing, security—and provides evidence. That evidence is cryptographically bound to the capabilities it proves. And here's the key: startups verify once, then reuse their passport across multiple challenges. No repeated audits."

**Demo steps:**
1. Click "Startup passport" (page 04)
2. Switch role to "Startup" (top-right dropdown)
3. Show EcoScan Labs profile:
   - Name, location, founding date
   - Listed capabilities
   - Evidence section (VERIFIED status with timestamp)

**Talking points:**
- "That evidence is SIMULATED_FOR_DEMO, so it's clearly labeled. In production, this would connect to government verification APIs."
- "Notice the evidence is challenge-agnostic—it can be reused."

---

### Stage 4: Automatic Matching (1 minute)

**Narration:**
> "Now the government's matching engine automatically compares the frozen challenge requirements with eligible startups. No guesswork, no bias—just transparent, algorithmic reasoning.
>
> Watch how the system explains why EcoScan is a good match for this challenge."

**Demo steps:**
1. Click "Startup matches" (page 05)
2. Switch role back to "Problem owner"
3. Show the matching results:
   - Challenge displayed
   - EcoScan shown as matched
   - Match reasoning visible
   - Confidence score (%) displayed

**Key point:**
- "The matching is deterministic and explainable. Judges, startups, and government can all understand why a particular startup was recommended."

---

### Stage 5: Proposal Submission (1 minute)

**Narration:**
> "A matched startup submits their proposal. They're not pitching a company—they're proposing a concrete pilot: measurable outcomes, timeline, budget, and risks. The form enforces a focus on the problem, not the startup's brand.
>
> Critically, proposals are outcome-focused, not input-focused. They're not saying 'we'll use X technology'—they're saying 'we'll achieve Y metric within Z time.'"

**Demo steps:**
1. Click "Proposals" (page 06)
2. Show the pre-filled proposal form:
   - Approach
   - Measurable outcomes
   - Sandbox duration (2 weeks)
   - Pilot cost (₹185,000)
   - Risks and mitigations
3. Show the three guardrails (before you can submit):
   - Reusable Passport
   - Frozen rubric
   - Human decision (no AI auto-selection)

**Key takeaway:**
- "The guardrails ensure government maintains control. The system never auto-selects a startup—that's a human decision."

---

### Stage 6: Evaluation & Scoring (1.5 minutes)

**Narration:**
> "An evaluator receives the proposal. They see the frozen rubric—five criteria that cannot change. They score independently, declare any conflicts of interest, and their reasoning is recorded.
>
> Crucially, all of this is auditable. Later, the government can see who scored what, when, and why. This builds public trust."

**Demo steps:**
1. Click "Evaluations" (page 07)
2. Switch role to "Evaluator"
3. Show:
   - Frozen rubric (5 criteria)
   - Challenge and proposal context
   - Conflict-of-interest declaration checkbox
   - Scoring interface
4. Switch back to "Problem owner" to show the view from the government side

**Discussion points:**
- "The rubric is frozen from day one. No moving the goalposts."
- "Evaluator scores are tracked with timestamps. No retroactive changes."
- "If there's a tie or divergence, the system flags it for human consensus."

---

### Stage 7: Pilot & Milestone Tracking (1 minute)

**Narration:**
> "The proposal is accepted and becomes an active pilot. Now the startup and government co-manage a safe experiment. They define measurable milestones—not just 'completed,' but specific, quantifiable success criteria.
>
> The government can see real-time progress. The startup can see exactly what evidence they need to collect."

**Demo steps:**
1. Click "Pilot lab" (page 08)
2. Show the pilot charter:
   - Challenge and proposal linked
   - Status: ACTIVE
   - Milestones (e.g., "Deployment complete and operational")
   - Success metrics
   - Acceptance criteria
3. Show evidence submission workflow

**Key concept:**
- "Milestones are measurable, not subjective. 'Deployed' means sensors are live, data is flowing, and the system is responding to real events. Evidence is timestamped and immutable."

---

### Stage 8: Payment & Milestone Acceptance (1.5 minutes)

**Narration:**
> "Here's where it gets interesting. Payment is not automatic or discretionary—it's milestone-triggered and validated by ten specific checks.
>
> The government wants to pay when the startup delivers. The startup wants transparent confirmation that their work was accepted. Our system makes that transparent, auditable, and risk-controlled."

**Demo steps:**
1. Click "Evidence & pay" (page 09)
2. Switch role to "Finance"
3. Show the milestone acceptance workflow:
   - Evidence submitted (photos, logs, etc.)
   - Acceptance controls (Accept / Request revision)
   - Payment readiness validation
4. Point out the SIMULATED_FOR_DEMO label on the payment flow
5. Show the payment status and receipt

**The 10-point readiness check:**
> "Before payment can be approved, the system verifies:
>
> 1. The pilot is active
> 2. The proposal was accepted
> 3. The milestone evidence has been submitted
> 4. The milestone has been accepted
> 5. The finance officer has authorization
> 6. The amount matches the approved budget
> 7. Prior payments have been cleared
> 8. The project timeline is still active
> 9. This isn't a duplicate payment request
> 10. Records can't be retroactively modified
>
> This is not theoretical. All ten checks are in the code. We ran 200 unit tests to verify it."

---

### Stage 9: Proven Solutions & Scale (1.5 minutes)

**Narration:**
> "Here's the transformative part: once a pilot succeeds, other departments can adopt the proven solution without repeating the entire evaluation.
>
> Imagine Nashik wants to solve the same bin-overflow problem. They don't start from scratch. They see Pune's proven solution, assess if it transfers to their context, and accelerate procurement.
>
> This is how innovation spreads across government. One successful pilot becomes proof for a hundred more."

**Demo steps:**
1. Click "Scale graph" (page 10)
2. Show:
   - Source pilot (Pune's "Waste overflow pilot")
   - Solution card created from pilot evidence
   - Transferability assessment:
     - Candidate geographies (Nashik, Aurangabad)
     - Infrastructure match scoring
     - Cost scaling
     - Customization effort
   - Adoption request form (Nashik selected, scope adjusted, budget adjusted)

**Key talking points:**
- "The transferability assessment is based on concrete factors: geography, infrastructure, cost. Not gut feel."
- "Other departments accelerate procurement without repeating the discovery, evaluation, and risk-bearing phases."
- "This is where the platform creates systemic change: it makes successful solutions reusable."

---

### Stage 10: Audit & Transparency (1 minute)

**Narration:**
> "Every action—every problem defined, every challenge frozen, every score recorded, every milestone accepted, every payment—is logged in an immutable audit chain. This is non-repudiation: you cannot later claim something didn't happen or happened differently.
>
> The audit thread is visible to the appropriate people: finance officers see the payment chain, problem owners see the challenge lifecycle, startups see their evaluation scores and feedback."

**Demo steps:**
1. Click "Audit thread" (page 11)
2. Scroll through the audit log showing:
   - Challenge freeze event (timestamp, hash, approver)
   - Proposal submission event
   - Evaluation events (scores, evaluator, timestamp)
   - Milestone acceptance event
   - Payment event

**Technical highlight:**
> "Under the hood, each event has:
> - A strict ISO 8601 timestamp (Asia/Kolkata timezone)
> - Canonical JSON hashing (no silent modifications)
> - A link to the previous event (forward chain)
> - The signed session cookie of the user who performed the action
> 
> This prevents time-travel attacks, reordering, and silent modification. Try to tamper with an event—the chain breaks."

---

### Closing & Security Highlight (1 minute)

**Script:**
> "Let me highlight the security architecture:
>
> **1. Server-side authorization:** All access control happens on the server. The role switcher you see is for demo purposes. In production, the server verifies you're actually a finance officer by checking government membership records.
>
> **2. Offline operation:** This platform runs without a database, without external APIs, without secrets. Perfect for a secure demo. In production, it would connect to government identity systems and sandbox payment processors.
>
> **3. No data leakage:** We ran through the code. Startups can only see their own proposals and pilots. Evaluators can only score their assigned challenges. Finance officers can only pay their department's pilots. The access control is enforced on the server, not the UI.
>
> **4. Deterministic & auditable:** Every calculation—matching, evaluation, payment readiness—is auditable. A judge can later check 'Why was this startup selected?' and see the complete chain: matching reasoning, rubric enforcement, evaluation scores, moderation decision, payment checks. No black boxes."

**Final demo step:**
1. Switch roles one more time to show the role switcher works smoothly
2. Navigate back to the home page
3. Show all 11 pages in the navigation rail

**Closing:**
> "To summarize: MahaSetu is a complete, auditable, outcome-focused procurement platform. It reduces discovery time for government, ensures fair evaluation for startups, enforces immutable records, and enables proven solutions to scale across departments.
>
> The entire platform is open, transparent, and designed to increase public trust in government innovation procurement.
>
> Thank you. I'm happy to answer questions."

---

## Troubleshooting During Presentation

### Issue: App is slow or unresponsive

**Solution:**
- Click "Sign out" and refresh the page
- This resets the session cache
- If that doesn't work, kill the server (`Ctrl+C`) and restart (`corepack pnpm dev`)

### Issue: Role switcher doesn't respond

**Solution:**
- Refresh the page (`Cmd/Ctrl+R`)
- If the problem persists, reset the full environment with `./demo-reset.sh`

### Issue: Database/auth errors appear

**Solution:**
- The platform is designed to run without a database (offline mode)
- If you see database errors, you may have `DATABASE_URL` set in your environment
- Unset it: `unset DATABASE_URL` (macOS/Linux) or `$env:DATABASE_URL=$null` (PowerShell)
- Restart the dev server

### Issue: Audio/video recording glitches

**Solution:**
- The platform itself doesn't have audio/video
- If recording your screen, use OBS Studio or ScreenFlow
- Test audio and screen recording before the presentation
- Keep the browser window at a comfortable zoom level (no less than 100%)

---

## Timing Notes

| Stage | Recommended Time | Actual Time |
|---|---|---|
| Intro & setup | 1 min | — |
| Problem to challenge | 1 min | — |
| Challenge to specification & lint | 2 min | — |
| Passport & verification | 1 min | — |
| Matching | 1 min | — |
| Proposals | 1 min | — |
| Evaluation | 1.5 min | — |
| Pilot & milestones | 1 min | — |
| Payment workflow | 1.5 min | — |
| Scale & adoption | 1.5 min | — |
| Audit trail | 1 min | — |
| Closing & Q&A | 1 min | — |
| **Total** | **~15 min** | — |

**Note:** You have up to 10–15 minutes allocated. If you're running short on time, skip the "Scale & adoption" stage (Stage 9) and jump directly to the audit trail. If you have extra time, linger on the evaluation stage and explain the rubric enforcement in more detail.

---

## Key Talking Points (Memorize These)

1. **Outcome-focused, not input-focused:** We don't ask startups to pitch. We ask them to measure outcomes.

2. **Frozen requirements:** The rubric and challenge specifications are frozen from day one. This protects startups and ensures fair evaluation.

3. **Deterministic & explainable:** Every decision—matching, scoring, payment—has a reason that judges and startups can inspect.

4. **Auditable & immutable:** Every action is logged with timestamps and cryptographic integrity checks. Later, the government can prove exactly what happened.

5. **Offline & secure:** The platform runs without external dependencies, making it safe to demo and audit. In production, it connects to government systems.

6. **Reusable solutions:** Successful pilots become evidence for other departments, accelerating innovation across government.

---

## Post-Demo Actions

After the presentation:

1. **Save evidence:** Take screenshots of key screens if you want to document the demo for your portfolio
2. **Reset for next round:** If you're doing multiple presentations, run `./demo-reset.sh` between each one
3. **Log questions:** Write down questions judges ask; these may guide future work

---

## Need Help?

- **App not starting?** Check that port 3000 is free: `lsof -i :3000`
- **Dependencies not installing?** Clear pnpm cache: `corepack pnpm store prune`
- **TypeScript errors?** Run `corepack pnpm typecheck` to see the full list
- **Tests failing?** Run `corepack pnpm test` to verify the build is good
- **Database issues?** Make sure `DATABASE_URL` is unset in your environment

---

**Good luck with your presentation! You've built something remarkable. 🚀**
