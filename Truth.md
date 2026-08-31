# TRUTH — SIH 2026 Startup-Friendly Public Procurement Platform

> The append-only single source of truth for this project.
>
> **Project window:** 2026-08-31 through 2026-09-05 (Asia/Kolkata)  
> **Deadline:** 2026-09-05  
> **Status:** Discovery and project initialization  
> **Canonical file:** `Truth.md` at the repository root

---

## 0. How to use this document

This file is the durable memory shared by every human contributor, coding agent, LLM, and provider working on the project. It must contain enough context for someone with no access to earlier chats to understand what is being built, why it is being built, what has already happened, what remains, and what they should do next.

### 0.1 Non-negotiable append-only rule

1. **Read this entire file before starting work.** Also inspect the repository and current Git diff; this document describes intent, but the working tree is evidence of implementation.
2. **Never delete, rewrite, reorder, or silently correct existing content.** History is immutable, including mistakes.
3. **Only append.** Add new information at the bottom under `Append-Only Project Ledger` using the entry template in this file.
4. If an earlier statement becomes incorrect, append a new correction or decision that explicitly supersedes it. Do not edit the old statement.
5. Every work session must have a `SESSION_START` entry before material work and a `SESSION_END` or `BLOCKED` entry before handoff.
6. Use timestamps in ISO 8601 format with the India offset: `YYYY-MM-DDTHH:mm:ss+05:30`.
7. Every entry must identify the human or agent/provider responsible. Never use an ambiguous author such as only `AI`.
8. Record evidence: files changed, commands run, tests, screenshots, commit hashes, URLs, and important output. Do not report a task as complete without verification evidence.
9. Never expose secrets, tokens, passwords, private keys, personal citizen data, or private credentials in this file. Record only the secret's environment-variable name and where an authorized teammate can obtain it.
10. Treat scope changes, architectural decisions, and rejected approaches as first-class entries. A future contributor must know not only what was chosen but why.
11. New work should reference stable task IDs from the backlog. If a new task is discovered, create a task ID in the ledger and state its priority, owner, dependencies, and acceptance criteria.
12. Do not claim that a law, policy, API, integration, or government permission exists until it has been verified from an authoritative source. Mark such items `UNVERIFIED` or `SIMULATED_FOR_DEMO`.

### 0.2 Git is still required

Append-only documentation does not replace version control. Contributors should create small, descriptive commits where practical. Do not overwrite another contributor's uncommitted changes. At handoff, state whether the working tree is clean and provide the last known commit hash.

### 0.3 Resolving contradictions

When two entries conflict, apply this order:

1. The newest explicit `DECISION` that names the older decision it supersedes.
2. Verified repository behavior and automated test output.
3. The newest timestamped status snapshot.
4. The initial baseline in this document.

Contradictions that cannot be resolved safely must be appended as `OPEN_QUESTION` entries rather than guessed away.

### 0.4 Status vocabulary

Use only these task states:

- `NOT_STARTED` — accepted into the backlog but no implementation has begun.
- `IN_PROGRESS` — actively being worked on by a named owner.
- `BLOCKED` — cannot proceed; the exact blocker and required resolution are recorded.
- `IN_REVIEW` — implementation exists and awaits verification or teammate review.
- `DONE` — acceptance criteria have been met and evidence is recorded.
- `DEFERRED` — intentionally excluded from the current delivery; reason recorded.
- `SUPERSEDED` — replaced by a newer task or decision.

Priority vocabulary:

- `P0` — demo or submission cannot succeed without it.
- `P1` — important differentiator; implement after P0 stability.
- `P2` — valuable stretch goal.
- `P3` — post-hackathon concept only.

### 0.5 Ledger entry types

- `SESSION_START`
- `SESSION_END`
- `STATUS_SNAPSHOT`
- `TASK_CREATED`
- `TASK_UPDATE`
- `DECISION`
- `CORRECTION`
- `DISCOVERY`
- `OPEN_QUESTION`
- `RISK`
- `BLOCKED`
- `REVIEW`
- `TEST_RESULT`
- `DEMO_RESULT`
- `RELEASE`

---

## 1. Project identity

### 1.1 Problem statement

> **Startup-friendly public procurement mechanism that enables government departments to identify, pilot, procure, and scale innovative solutions from eligible startups.**

The problem is associated with Smart India Hackathon 2026 and the Government of Maharashtra. This is a software problem. The intended solution must bridge the mismatch between risk-controlled government procurement and the fast, iterative operating model of startups.

### 1.2 Working product identity

- **Working codename:** `MahaSetu`
- **Descriptor:** Maharashtra Innovation Procurement Exchange
- **Naming status:** Provisional; the team may supersede it through a ledger `DECISION`.
- **One-line pitch:** A challenge-to-scale procurement operating system where Maharashtra departments discover verified startups, run measurable pilots safely, release milestone payments transparently, and reuse proven solutions across departments.
- **Short pitch:** Government officers describe public problems in plain language. MahaSetu converts them into outcome-based challenges, finds eligible startups, supports transparent evaluation, creates a safe pilot workspace with measurable milestones, and turns successful pilots into reusable procurement evidence for other departments.
- **Primary thesis:** The strongest solution is not another tender-listing portal. It is a workflow and trust layer connecting the complete innovation procurement lifecycle: `Identify → Evaluate → Pilot → Procure → Scale`.

### 1.3 Mission

Make the Government of Maharashtra a fast, transparent, reliable first customer for eligible startups while preserving fairness, auditability, security, privacy, and responsible use of public money.

### 1.4 Desired outcomes

- Reduce the time required to discover eligible startups for a government problem.
- Replace input-heavy, brand-specific requirements with measurable outcome-based challenge briefs.
- Allow a startup to verify eligibility once and reuse that verification.
- Make evaluation structured, explainable, conflict-aware, and auditable.
- Allow low-risk pilots using safe data and isolated environments.
- Make pilot milestones, evidence, decisions, and payment status visible to both sides.
- Produce a reusable evidence package from every successful pilot.
- Let other departments discover proven solutions and begin an authorized follow-on procurement workflow without repeating unnecessary evaluation.
- Give startups predictable feedback and payment visibility.
- Give administrators portfolio-level analytics on innovation, time-to-pilot, success, deployment, and inclusion.

### 1.5 Non-goals for the hackathon MVP

- Replacing GeM, CPPP, Maharashtra e-tendering, PFMS, state treasury systems, or legally mandated procurement systems.
- Moving real public funds.
- Claiming that a blockchain transaction itself constitutes legal approval or payment authorization.
- Storing real sensitive citizen datasets.
- Building production-grade zero-knowledge proof infrastructure during a five-day sprint.
- Making final procurement awards autonomously with AI.
- Circumventing competition, finance rules, audit requirements, or departmental authority.
- Promising one-click purchases where the law or delegated financial powers do not allow them.

The MVP should demonstrate an **integration-ready orchestration layer**. External government services that are unavailable should be represented through explicit mock adapters and labeled `SIMULATED_FOR_DEMO` in both code and UI.

---

## 2. Problem understanding

### 2.1 Core structural mismatch

Traditional public procurement is optimized for comparability, predictability, audit, and risk reduction. Innovative startup solutions are often novel, unproven at government scale, difficult to describe through rigid specifications, and improved through rapid feedback. The platform must not remove controls; it must create a smaller, evidence-driven path for controlled experimentation and subsequent scale.

### 2.2 Pain points for government departments

- Officers can describe operational pain but may lack the market knowledge to specify a novel technical solution.
- Long tender documents can prescribe implementations before the best approach is known.
- Discovering credible startups is manual and relationship-dependent.
- Eligibility documents are reviewed repeatedly.
- Evaluation can become fragmented across documents, email, spreadsheets, and meetings.
- Pilots may begin without agreed success metrics, owners, baselines, or evidence requirements.
- Data access is delayed because privacy and security risks are unclear.
- Pilot progress, approvals, invoices, and payment status are opaque.
- A successful pilot in one department is hard for another department to discover or trust.
- Institutional learning is lost when officials transfer roles or teams change.

### 2.3 Pain points for startups

- Repetitive registration and compliance uploads.
- Requirements favor incumbents through turnover, prior experience, or narrowly specified criteria.
- Relevant opportunities are hard to find.
- Dense procurement language increases bid effort.
- No safe or timely access to realistic test data and APIs.
- Unclear evaluation criteria and limited feedback.
- Long decision and payment cycles create working-capital risk.
- A pilot does not reliably lead to a scale pathway.
- Startups may expose unnecessary proprietary information during evaluation.

### 2.4 Root causes the product can address

- Fragmented identity and evidence.
- Procurement documents framed as solutions rather than outcomes.
- Weak market discovery and capability matching.
- Unstructured evaluation.
- No common pilot contract/milestone workspace.
- Missing shared telemetry and evidence.
- Lack of a portable record of successful government pilots.
- Limited visibility into follow-on adoption across departments.

### 2.5 Constraints the product must respect

- Public procurement must remain fair, reviewable, and contestable.
- AI can recommend and assist; authorized humans must make consequential decisions.
- All ranking and eligibility decisions require reasons and audit records.
- Government integrations may be unavailable during the hackathon.
- Users may operate on low bandwidth and mobile devices.
- Marathi, Hindi, and English support matters.
- Accessibility is a government-product requirement, not polish.
- Sensitive business documents and citizen data require minimization and access control.
- The deadline permits a polished vertical slice, not a statewide production system.

---

## 3. Users, roles, and permissions

### 3.1 Government problem owner / nodal officer

Needs to:

- Describe an operational problem without writing a full tender.
- Convert the description into a measurable challenge brief.
- Obtain internal approvals.
- Discover potentially relevant startups.
- Publish clarifications equally to all applicants.
- Participate in evaluation without seeing protected evaluator deliberations belonging to others.
- Configure pilot milestones and success metrics.
- Approve or reject submitted milestone evidence with reasons.
- See payment-request status.
- publish a reusable pilot outcome record.

### 3.2 Procurement officer

Needs to:

- Confirm the correct procurement pathway.
- Configure eligibility and evaluation rules.
- Review conflicts of interest.
- Freeze criteria before proposal opening.
- Manage clarifications, timelines, and audit exports.
- Ensure AI suggestions do not become unreviewed criteria.
- Route approved results to the authorized external procurement system.

### 3.3 Finance officer

Needs to:

- Verify budget reservation or sandbox budget status.
- Review milestone acceptance and invoice/payment request packages.
- Approve, return, or reject requests with reasons.
- See a full chain of authorization.
- Export or transmit a payment request through an adapter.

### 3.4 Evaluator / domain expert

Needs to:

- Declare conflicts of interest.
- Review eligible proposals using a frozen rubric.
- Score independently.
- Add evidence-backed comments.
- Join moderation only after independent scoring closes.
- Explain overrides and anomalies.

### 3.5 Startup administrator / founder

Needs to:

- Create and maintain a reusable startup profile.
- Connect or upload evidence for eligibility.
- Control who in the startup can submit proposals.
- Discover matched challenges with explanations.
- Submit a concise outcome-oriented proposal, demo, architecture, timeline, and pricing.
- Ask clarifying questions in a fair, public channel.
- Track evaluation, pilot, milestone, and payment state.
- Reuse successful pilot credentials and case studies.

### 3.6 Startup technical contributor

Needs to:

- Upload technical evidence or repository/demo links.
- Access sandbox APIs and synthetic data.
- Submit milestone evidence.
- View technical feedback.

### 3.7 Platform administrator / auditor

Needs to:

- Manage departments, roles, taxonomies, and mock integration configuration.
- View append-only audit events.
- Investigate anomalous access or evaluation patterns.
- Export evidence without changing the underlying event history.

### 3.8 Public/transparency viewer — stretch role

May see publishable challenge metadata, aggregate outcomes, and redacted award/pilot information. Must never see protected bids, trade secrets, security evidence, or personal information.

### 3.9 Baseline role rules

- Least privilege by default.
- A user can hold multiple roles only where allowed and visible.
- Evaluators must record conflict declarations.
- Startup users cannot see competing proposals.
- Government users cannot alter frozen criteria after proposal opening without a visible cancellation/reissue event.
- AI service accounts can generate drafts and recommendations but cannot publish, award, accept milestones, or authorize funds.

---

## 4. End-to-end product lifecycle

### 4.1 Identify: turn problems into challenges

1. A government officer creates a problem draft.
2. The officer provides department, affected users, geography, baseline, urgency, constraints, available data, budget band, and desired outcomes.
3. An AI copilot identifies missing information and drafts a challenge brief.
4. The system flags solution-prescriptive language, potentially exclusionary eligibility clauses, vague outcomes, and metrics that cannot be measured.
5. The officer accepts or edits suggestions.
6. Procurement and domain reviewers approve the challenge.
7. Criteria, weights, timeline, and visibility are frozen at publication.
8. Matching starts against eligible startup capability profiles.

**Output:** A plain-language, outcome-based, approved challenge brief with measurable success criteria.

### 4.2 Discover and match

1. The platform represents each challenge and startup as structured capabilities, sectors, deployment constraints, maturity, geography, security readiness, and evidence.
2. Matching uses mandatory filters first and semantic similarity second.
3. Every recommendation includes human-readable reasons such as capability overlap, relevant pilot evidence, supported languages, or deployment model.
4. Startups receive opt-in recommendations.
5. Officers may search and invite eligible startups, but invitations do not bypass the same submission and evaluation rules.
6. Low-confidence matches are labeled; users can correct profile tags.

**Output:** Explainable recommendations, never an opaque eligibility or award decision.

### 4.3 Apply and evaluate

1. A startup verifies its reusable profile, accepts declarations, and submits a proposal.
2. The proposal emphasizes proposed outcomes, approach, delivery plan, risk, team, integration, security, and total pilot cost.
3. The platform validates completeness and eligibility evidence.
4. Clarification questions and answers are shared fairly according to challenge rules.
5. Evaluators declare conflicts and score independently against a frozen rubric.
6. The system highlights score divergence, missing comments, possible conflicts, and unusual patterns.
7. A moderation panel records final reasoning.
8. Authorized officers select a pilot winner or reject all proposals.

**Output:** A reproducible evaluation packet with scoring, reasons, and audit events.

### 4.4 Pilot safely

1. Department and startup co-create a pilot charter from the approved proposal.
2. The charter specifies milestones, metrics, baselines, targets, evidence sources, owners, due dates, acceptance windows, payment percentages, dependencies, and stop conditions.
3. The startup receives access to a demo sandbox, mock APIs, and synthetic data suitable for the challenge.
4. Telemetry and evidence are submitted to a shared milestone workspace.
5. Government officers accept, return for clarification, or reject evidence with reasons.
6. A risk register and change-request log capture deviations.
7. The final pilot report compares results with baseline and target.

**Output:** Verifiable pilot evidence and an agreed go/no-go/iterate decision.

### 4.5 Procure and pay

1. Accepted milestones produce a signed milestone-acceptance record.
2. The platform assembles a payment request packet: order reference, milestone, acceptance, amount, invoice metadata, bank/beneficiary reference, and approvals.
3. Finance users review the request.
4. For the hackathon, a mock treasury/PFMS adapter advances the request through demo states and clearly displays `SIMULATED_FOR_DEMO`.
5. Every transition is written to the audit log.
6. A real deployment would require formal integration, security review, delegated financial authority, and reconciliation design.

**Output:** Transparent payment status and a complete approval trail; no claim of autonomous real-money transfer in the MVP.

### 4.6 Scale

1. A completed pilot generates a structured outcome card containing context, measured results, deployment pattern, limitations, security posture, references, cost band, and officer attestation.
2. The solution enters the `Proven Solutions Exchange` only after required approval.
3. Other departments search by problem and outcome, not only by vendor name.
4. The platform compares the new department's context with the original pilot and produces a transferability assessment.
5. The interested department launches an authorized follow-on workflow: reuse evidence, request a new localized pilot, initiate a framework route, or export to the mandated procurement system.

**Output:** Reusable institutional evidence, not an unverified promise of procurement bypass.

---

## 5. Recommended MVP: the demoable vertical slice

The five-day build should tell one coherent story. The reference scenario should be concrete enough for judges to understand within minutes.

### 5.1 Reference demo scenario

**Department:** A fictionalized Maharashtra municipal solid-waste unit.  
**Problem:** Overflowing community bins are reported late, causing inefficient collection routes and citizen complaints.  
**Desired outcome:** Reduce missed/overflow events and response time during a controlled ward-level pilot.  
**Startup solution:** A computer-vision and route-prioritization startup proposes a pilot using synthetic bin events and a mock operations API.  
**Why this scenario works:** It is visible, measurable, suitable for synthetic data, and demonstrates matching, pilot milestones, evidence, and cross-department reuse without requiring real citizen personal data.

Possible metrics:

- Overflow-event detection precision and recall on the synthetic dataset.
- Median time from simulated alert to collection assignment.
- Percentage of high-priority alerts handled within the target window.
- API uptime and latency during the test.
- Estimated kilometers saved relative to a static-route baseline.

All demo performance numbers must be labeled synthetic or simulated.

### 5.2 Golden-path demo script

1. Sign in as a government officer.
2. Enter a messy, plain-language description of the waste-management problem.
3. Use the copilot to generate an outcome-based challenge brief.
4. Show the inclusion guard identifying an unnecessary turnover/experience clause and suggesting startup-appropriate wording.
5. Publish the challenge with a frozen rubric.
6. Show explainable matches to seeded startup profiles.
7. Switch to a startup account and show reusable eligibility/profile status.
8. Open the matched challenge, view `Why this matches`, and submit a concise proposal.
9. Switch to evaluator view, declare no conflict, and score against the frozen rubric.
10. Select the pilot and generate a milestone charter.
11. Enter the sandbox view and run or display synthetic test results.
12. Submit milestone evidence; approve it as the officer.
13. Show the generated payment request moving through a clearly simulated adapter.
14. Complete the pilot and generate a Proven Solution card.
15. Switch to another department, discover the solution, and launch a follow-on adoption assessment.
16. Finish on the portfolio dashboard: time-to-pilot, active pilots, milestone health, payment status, and reuse count.

### 5.3 P0 features

#### P0-A — Authentication and role switcher

- Seeded demo users for government officer, startup, evaluator, and finance roles.
- Role-aware navigation and route protection.
- A demo-only role switcher is acceptable if visibly labeled.

#### P0-B — Challenge Builder with AI-assisted draft

- Plain-language problem input.
- Structured fields for baseline, users, constraints, outcomes, metrics, data, timeline, budget band, and risk.
- AI draft or deterministic fallback if no model key is available.
- Inclusion/compliance lint panel.
- Human edit and approval before publication.
- Store AI input/output metadata and human acceptance status in the demo audit log.

#### P0-C — Startup Passport

- Organization profile, capabilities, sectors, maturity, deployment model, languages, locations, security attributes, and team.
- Reusable evidence records for DPIIT recognition, incorporation, tax, MSME/Udyam, or other documents.
- Demo verification status and provenance.
- Expiry/revocation field.
- Do not falsely represent mock verification as a live government API call.

#### P0-D — Explainable matching

- Mandatory eligibility filters.
- Semantic/tag score.
- Match explanation with positive reasons, missing capabilities, and confidence.
- User-visible feedback mechanism to improve tags.
- Matching must not auto-select a winner.

#### P0-E — Proposal and transparent evaluation

- Structured proposal form.
- Frozen evaluation rubric and weights.
- Conflict-of-interest declaration.
- Independent scoring with required reasons.
- Final comparison view and decision record.
- Basic score-divergence warning.

#### P0-F — Pilot Mission Control

- Pilot charter.
- Milestone timeline.
- Metric definitions and targets.
- Evidence submission.
- Accept/return/reject actions with reasons.
- Risk and issue log.
- Overall pilot health.

#### P0-G — Simulated milestone payment tracking

- Generate a payment request only after milestone acceptance.
- Finance approval state.
- Mock adapter states: `DRAFT → SUBMITTED → VALIDATED → PROCESSING → PAID` and failure/return states.
- `SIMULATED_FOR_DEMO` label at every relevant screen.

#### P0-H — Proven Solutions Exchange

- Outcome card generated from completed pilot data.
- Search/filter by problem, department, capability, evidence strength, and deployment model.
- Reuse/follow-on request from a second department.
- Transferability checklist.

#### P0-I — Audit timeline

- Append-only application event records for major state changes.
- Actor, action, object, time, before/after summary or hash, reason, and correlation ID.
- Filter and export for demo.

#### P0-J — Seed data and polished walkthrough

- At least 2 departments, 1 challenge, 4 startups, 3 proposals, 1 active/completed pilot, and 1 follow-on request.
- Empty, loading, success, validation, error, and permission-denied states for the golden path.
- A reset/seed command for repeatable judging.

### 5.4 P1 differentiators

- Marathi and English UI/localized challenge brief.
- Blind first-stage evaluation that hides selected identity fields where appropriate.
- Evaluator anomaly view: score divergence, suspiciously fast review, missing justifications.
- Reverse challenge board where startups propose unsolved public-sector problems; publication still requires government review.
- Duplicate-problem detector across departments.
- Synthetic data generator/configurator and mock API key management.
- Pilot evidence cryptographic hash and downloadable evidence package.
- Notification center and deadline reminders.
- Accessibility conformance checks.
- Portfolio analytics and bottleneck visualization.

### 5.5 P2 stretch concepts

- W3C Verifiable Credential representation of startup eligibility and completed pilot attestations.
- Privacy-preserving selective disclosure demonstration.
- Zero-knowledge proof concept for a narrow threshold statement, implemented only if the core product is complete.
- Repository/code-quality evidence ingestion with explicit permission.
- Demand aggregation suggestion for similar challenges across departments.
- Public transparency portal with redaction rules.
- Tamper-evident external anchoring of periodic audit-log hashes.

### 5.6 P3/post-hackathon concepts

- Live authoritative integrations with DPIIT/Startup India, MCA, GSTN, Udyam, GeM, Maharashtra e-tendering, PFMS/state treasury, eSign, DigiLocker, or identity providers.
- Production sovereign-cloud sandbox provisioning.
- Formal procurement pathway rules engine maintained by authorized policy owners.
- Real fund reservation, invoice reconciliation, and payment initiation.
- Statewide federated analytics.
- Production-grade credential wallet and zero-knowledge circuits.

---

## 6. Innovation that is credible, not decorative

### 6.1 Procurement Policy Compiler

The challenge builder should behave like a linter/compiler:

- Input: plain-language problem, departmental context, desired outcomes, constraints, policy template, and budget band.
- Analysis: missing baseline, vague metric, brand-specific wording, excessive prior-experience clause, outcome/metric mismatch, unrealistic timeline, missing data owner, missing grievance or clarification route.
- Output: structured challenge draft plus warnings and explanations.
- Human gate: an officer explicitly accepts each material suggestion.

This is more defensible than claiming the LLM writes a legally valid tender autonomously.

### 6.2 Trust that compounds

The Startup Passport should combine evidence with freshness and provenance. A profile does not merely say `verified`; it shows:

- What was checked.
- Who or what checked it.
- When it was checked.
- When it expires.
- Whether the check was live, uploaded, manually reviewed, or simulated.
- Which challenges require it.

Successful pilots add portable evidence. Trust grows through measured public-sector delivery instead of only years of turnover.

### 6.3 Explainable opportunity matching

The match engine should answer:

- Why was this startup recommended?
- Which mandatory criteria passed?
- Which desired capabilities overlap?
- What evidence supports the match?
- What is missing or uncertain?
- Was any sensitive/protected attribute used? The expected answer is no.

### 6.4 Evidence-driven milestone escrow metaphor

Use the UX language of conditional release without claiming custody of funds. Each milestone links target, evidence, reviewer, acceptance, amount, and external payment status. A conventional relational state machine plus tamper-evident audit log is preferable for the MVP. Blockchain is not required to prove integrity in a five-day prototype.

### 6.5 Transferability Graph

A successful pilot is not universally transferable. The platform compares:

- Department type.
- Geography and scale.
- User population.
- Data schema and sensitivity.
- Integration dependencies.
- Language requirements.
- Infrastructure and connectivity.
- Regulatory context.
- Proven metric range.

It produces `High`, `Medium`, or `Low` transferability with reasons and recommends direct reuse, a localized micro-pilot, or fresh evaluation. This makes the scale feature intellectually stronger than a simple app catalog.

### 6.6 Procurement Digital Twin

The portfolio dashboard can simulate the workflow and expose bottlenecks:

- Draft-to-approval time.
- Approval-to-publication time.
- Proposal evaluation time.
- Pilot setup time.
- Milestone acceptance time.
- Acceptance-to-payment time.
- Pilot-to-reuse time.

For the hackathon, analytics operate on seeded data. In production, this can guide process improvement without letting AI make award decisions.

### 6.7 Fairness-by-construction

- Freeze criteria and weights before proposal opening.
- Share clarifications consistently.
- Require conflict declarations.
- Separate independent scoring from moderation.
- Record reasons for overrides.
- Keep AI scores advisory.
- Allow correction and grievance workflows.
- Avoid sensitive attributes in matching and scoring.

---

## 7. Technical blueprint

All choices in this section are a recommended baseline, not evidence of existing implementation. Any change must be appended as a `DECISION`.

### 7.1 Recommended hackathon architecture

Use a modular monolith for delivery speed, with clear boundaries that can later become services.

```text
Web browser
    |
    v
Next.js application
    |-- role-aware UI
    |-- server/API routes or typed API client
    |-- challenge, startup, evaluation, pilot, payment, exchange modules
    |
    +--> PostgreSQL
    |      |-- transactional records
    |      |-- JSON fields for flexible evidence
    |      `-- pgvector only if semantic matching is implemented
    |
    +--> AI provider adapter
    |      |-- challenge drafting
    |      |-- inclusion/compliance lint
    |      `-- embeddings/matching explanation
    |
    +--> Object storage adapter
    |      `-- demo evidence files; local/S3-compatible
    |
    `--> Integration adapter layer
           |-- startup verification mock
           |-- sandbox/mock operational API
           `-- PFMS/treasury payment mock
```

Alternative: if the team is materially stronger in Python, use Next.js for the web client and FastAPI for the backend. Do not introduce a second runtime solely because the initial report mentioned FastAPI. Minimize operational complexity during the sprint.

### 7.2 Proposed stack

- **Frontend:** Next.js, React, TypeScript.
- **Styling/components:** Tailwind CSS plus a consistent accessible component library chosen by the implementer.
- **Backend:** Next.js server routes/actions for the simplest deployment, or FastAPI only by explicit decision.
- **Database:** PostgreSQL.
- **ORM:** Prisma or Drizzle, selected once and recorded.
- **Validation:** Zod on TypeScript boundaries.
- **Authentication:** hackathon-safe seeded accounts or a standard auth library; no custom password cryptography.
- **AI:** provider-neutral adapter with a deterministic fallback.
- **Matching:** filter + weighted tags initially; embeddings via pgvector if time permits.
- **File storage:** local demo storage or S3-compatible adapter; never commit sensitive uploads.
- **Testing:** unit tests for rules/state machines, integration tests for critical APIs, and Playwright for the golden path.
- **Deployment:** choose a platform that supports the selected server/database architecture; record the public demo and limitations.

### 7.3 Bounded contexts/modules

- `identity` — users, roles, departments, organizations, memberships.
- `passport` — startup profile, capabilities, evidence, verification.
- `challenges` — problem intake, AI drafts, criteria, approval, publication.
- `matching` — filters, features, scores, explanations, recommendations.
- `applications` — proposal, attachments, clarification, submission state.
- `evaluation` — rubric, assignments, conflicts, scores, moderation, decision.
- `pilots` — charter, milestones, metrics, evidence, risks, changes, outcome.
- `payments` — milestone request, approval, adapter status, reconciliation reference.
- `exchange` — proven solution card, transferability, follow-on interest.
- `notifications` — in-app events and optional email adapter.
- `audit` — immutable event records and exports.
- `analytics` — derived aggregates; it must not mutate source records.

### 7.4 State machines

#### Challenge

```text
DRAFT -> UNDER_REVIEW -> APPROVED -> PUBLISHED -> APPLICATIONS_CLOSED
      -> EVALUATION -> PILOT_SELECTED -> PILOT_ACTIVE -> COMPLETED
      -> CANCELLED
```

Invalid transitions must be rejected server-side and logged.

#### Startup evidence

```text
UNSUBMITTED -> PENDING -> VERIFIED
                       -> REJECTED
VERIFIED -> EXPIRED | REVOKED
```

#### Proposal

```text
DRAFT -> SUBMITTED -> ELIGIBILITY_REVIEW -> ELIGIBLE -> EVALUATION
                                   |             |-> WITHDRAWN
                                   `-> INELIGIBLE
EVALUATION -> SHORTLISTED -> SELECTED | NOT_SELECTED
```

#### Milestone

```text
PLANNED -> IN_PROGRESS -> EVIDENCE_SUBMITTED -> ACCEPTED
                                      |       -> RETURNED -> EVIDENCE_SUBMITTED
                                      `       -> REJECTED
```

#### Payment request

```text
NOT_READY -> DRAFT -> FINANCE_REVIEW -> APPROVED -> ADAPTER_SUBMITTED
                        |                 |              |
                        `-> RETURNED      `-> REJECTED   +-> PROCESSING -> PAID
                                                       `-> FAILED -> RETRY/RETURNED
```

### 7.5 Suggested data model

Core entities and important fields:

#### Identity

- `User(id, name, email, locale, status, createdAt)`
- `Organization(id, type, legalName, displayName, status)`
- `Department(id, organizationId, parentId, name, jurisdiction)`
- `Membership(id, userId, organizationId, role, activeFrom, activeTo)`

#### Startup Passport

- `StartupProfile(id, organizationId, summary, foundedOn, website, stage, employeeBand, deploymentModels, supportedLanguages)`
- `Capability(id, code, name, taxonomyPath)`
- `StartupCapability(startupId, capabilityId, proficiency, evidenceSummary)`
- `CredentialEvidence(id, startupId, type, identifierMasked, issuer, sourceType, status, issuedAt, expiresAt, verifiedAt, verificationRef, fileRef)`
- `PilotAttestation(id, startupId, pilotId, issuerDepartmentId, outcomeHash, issuedAt, status)`

#### Challenge

- `Challenge(id, departmentId, ownerId, title, problem, baseline, affectedUsers, geography, constraints, budgetMin, budgetMax, status, version, publishedAt)`
- `DesiredOutcome(id, challengeId, statement, baselineValue, targetValue, unit, measurementMethod)`
- `EligibilityCriterion(id, challengeId, code, description, mandatory, evidenceType)`
- `RubricCriterion(id, challengeId, name, description, weight, scoreMin, scoreMax)`
- `ChallengeApproval(id, challengeId, reviewerId, decision, reason, at)`
- `Clarification(id, challengeId, askedBy, question, answer, visibility, status)`

#### AI trace

- `AiRun(id, useCase, provider, model, promptTemplateVersion, inputHash, output, confidence, startedAt, completedAt, humanDisposition)`
- Never store secrets or unnecessary raw sensitive documents in prompts.

#### Matching and applications

- `Match(id, challengeId, startupId, eligibilityPass, semanticScore, evidenceScore, overallScore, confidence, explanation, generatedAt, modelVersion)`
- `Proposal(id, challengeId, startupId, approach, outcomes, timeline, pilotCost, risks, status, submittedAt)`
- `ProposalAttachment(id, proposalId, type, fileRef, hash, visibility)`

#### Evaluation

- `EvaluatorAssignment(id, proposalId, evaluatorId, status)`
- `ConflictDeclaration(id, assignmentId, hasConflict, details, declaredAt)`
- `Score(id, assignmentId, rubricCriterionId, value, rationale, submittedAt)`
- `ModerationDecision(id, proposalId, finalScore, decision, rationale, decidedBy, decidedAt)`

#### Pilot

- `Pilot(id, challengeId, proposalId, ownerId, startupLeadId, status, startAt, endAt, budget, finalDecision)`
- `Metric(id, pilotId, name, baseline, target, unit, source, frequency)`
- `Milestone(id, pilotId, sequence, name, dueAt, paymentPercent, status, acceptanceCriteria)`
- `Evidence(id, milestoneId, submittedBy, type, value, fileRef, hash, submittedAt)`
- `MilestoneReview(id, milestoneId, reviewerId, decision, reason, reviewedAt)`
- `RiskItem(id, pilotId, title, probability, impact, mitigation, ownerId, status)`
- `ChangeRequest(id, pilotId, requestedBy, change, impact, decision, reason)`

#### Payment and scale

- `PaymentRequest(id, milestoneId, amount, status, invoiceRef, adapter, externalRef, requestedAt, paidAt)`
- `PaymentEvent(id, paymentRequestId, fromStatus, toStatus, actorId, reason, at)`
- `SolutionCard(id, pilotId, startupId, title, summary, outcomes, limitations, evidenceStrength, status, publishedAt)`
- `TransferabilityAssessment(id, solutionCardId, targetDepartmentId, score, reasons, recommendation, createdAt)`
- `AdoptionRequest(id, solutionCardId, targetDepartmentId, requesterId, pathway, status)`

#### Audit

- `AuditEvent(id, occurredAt, actorType, actorId, action, entityType, entityId, correlationId, reason, metadata, previousHash, eventHash)`

### 7.6 Audit integrity model

For each material application event:

1. Serialize stable event data.
2. Store the previous event hash.
3. Compute the current event hash from the previous hash plus current event payload.
4. Reject updates/deletes to audit rows at the application layer and, if feasible, database layer.
5. Verify the chain through an admin tool/test.

This is a tamper-evident log, not magical immutability. Production integrity would require restricted database roles, backups, monitoring, external anchoring, and formal operations controls.

### 7.7 AI design principles

- Provider-neutral interface.
- Structured JSON outputs validated against schemas.
- Version prompts and matching logic.
- Deterministic fallback content for offline/demo mode.
- Retrieval limited to approved policy templates and project data.
- Prominent uncertainty and source/provenance display.
- Human approval for publication, eligibility changes, ranking decisions, awards, milestone acceptance, and payment authorization.
- No protected or irrelevant personal attributes in matching/scoring.
- Log suggestions and user disposition without exposing secrets.
- Defend against prompt injection in uploaded content by treating documents as data, not instructions.

### 7.8 Matching formula — initial explainable baseline

Do not start with an opaque model. A first implementation can be:

```text
if any mandatory eligibility criterion fails:
    eligible = false
    no ranking score is used for selection
else:
    capability_overlap = weighted taxonomy overlap       # 0..1
    semantic_similarity = embedding similarity           # 0..1, optional
    evidence_strength = verified relevant evidence       # 0..1
    delivery_fit = geography/language/deployment fit      # 0..1

    match_score =
        0.40 * capability_overlap +
        0.25 * semantic_similarity +
        0.20 * evidence_strength +
        0.15 * delivery_fit
```

Weights are provisional and must be displayed/configurable. The match score recommends discovery only; it must not determine the procurement winner.

### 7.9 API surface — provisional

- `POST /api/challenges/draft`
- `POST /api/challenges/:id/lint`
- `POST /api/challenges/:id/submit-review`
- `POST /api/challenges/:id/publish`
- `GET /api/challenges/:id/matches`
- `GET /api/startups/:id/passport`
- `POST /api/startups/:id/evidence`
- `POST /api/challenges/:id/proposals`
- `POST /api/evaluations/:assignmentId/conflict`
- `POST /api/evaluations/:assignmentId/scores`
- `POST /api/proposals/:id/decision`
- `POST /api/pilots`
- `POST /api/milestones/:id/evidence`
- `POST /api/milestones/:id/review`
- `POST /api/milestones/:id/payment-request`
- `POST /api/payment-requests/:id/approve`
- `POST /api/payment-requests/:id/mock-advance`
- `POST /api/pilots/:id/complete`
- `GET /api/solutions`
- `POST /api/solutions/:id/assess-transferability`
- `POST /api/solutions/:id/adoption-requests`
- `GET /api/audit-events`

### 7.10 Repository layout — provisional

```text
/
|-- Truth.md
|-- README.md
|-- .env.example
|-- docs/
|   |-- architecture.md
|   |-- demo-script.md
|   `-- evidence/
|-- src/ or apps/
|   |-- app/
|   |-- components/
|   |-- modules/
|   |-- lib/
|   `-- adapters/
|-- prisma/ or db/
|-- public/
|-- tests/
|   |-- unit/
|   |-- integration/
|   `-- e2e/
`-- scripts/
    `-- seed/reset demo data
```

Do not create complexity solely to match this tree. The actual scaffold decision must be recorded.

---

## 8. UX and visual language

### 8.1 Product personality

- Trustworthy, calm, institutional, and modern.
- Clear enough for first-time users.
- Avoid crypto/AI spectacle, dark patterns, or sci-fi visuals.
- Innovation should appear through useful workflow behavior.

### 8.2 Navigation proposal

Government:

- Overview
- Challenges
- Discover Startups
- Evaluations
- Pilots
- Payments
- Proven Solutions
- Analytics
- Audit

Startup:

- Opportunities
- My Passport
- Proposals
- Pilots
- Payments
- Credentials/Outcomes
- Notifications

### 8.3 Key screens

1. Role-specific overview dashboard.
2. Challenge intake wizard.
3. AI draft comparison and lint panel.
4. Published challenge detail.
5. Startup match results with explanation.
6. Startup Passport and evidence freshness.
7. Proposal workspace.
8. Evaluator rubric and conflict declaration.
9. Proposal comparison/moderation screen.
10. Pilot Mission Control.
11. Milestone evidence review drawer/page.
12. Payment status timeline.
13. Proven Solution card and transferability assessment.
14. Portfolio analytics.
15. Audit timeline.

### 8.4 Accessibility and localization baseline

- Target WCAG 2.2 AA where practical.
- Full keyboard navigation for the golden path.
- Visible focus states.
- Semantic labels and headings.
- Never encode status through color alone.
- Sufficient contrast.
- Tables usable on smaller screens.
- Error summaries and field-level errors.
- English baseline, architecture ready for Marathi and Hindi message catalogs.
- Dates shown in local format while storage uses timezone-aware timestamps.
- Avoid unexplained procurement abbreviations; provide tooltips/glossary.

### 8.5 Low-bandwidth behavior

- Keep initial bundles and images small.
- Paginate or virtualize heavy lists.
- Compress evidence uploads and display limits.
- Avoid mandatory video backgrounds or large animations.
- Preserve form drafts locally/server-side.
- Make loading and retry states explicit.

---

## 9. Security, privacy, and responsible AI

### 9.1 Data classification

- `PUBLIC`: published challenges, public aggregate outcomes.
- `INTERNAL`: departmental drafts, operational notes.
- `CONFIDENTIAL_BUSINESS`: proposals, pricing, startup documents, proprietary evidence.
- `RESTRICTED`: security test results, sensitive integration data, personal information.

Every attachment type must have an allowed audience. The MVP should use synthetic names and data.

### 9.2 Minimum controls

- Server-side authorization on every mutation and protected read.
- Secure session handling through a standard library.
- Input validation.
- File type/size allow-list and safe filenames.
- Signed or access-controlled file references.
- Rate limiting for AI and sensitive endpoints where feasible.
- Audit material state changes.
- Prevent secrets from entering client bundles, logs, screenshots, and Git.
- `.env.example` contains names only, never real values.
- Dependency audit before submission.
- Seed accounts must not use real personal credentials.

### 9.3 Threats to explicitly test

- Startup reads another startup's proposal by changing an ID.
- Evaluator scores without a conflict declaration.
- User alters challenge criteria after publication.
- Milestone payment request created before acceptance.
- Direct API call skips a required state.
- Uploaded text injects instructions into the AI prompt.
- Audit events are edited or deleted.
- Finance state is advanced by a non-finance role.
- Mock integration is mistaken for real integration.
- AI output invents a policy or verification result.

### 9.4 Responsible AI controls

- AI outputs are drafts/recommendations.
- Display inputs/features used for matching.
- Exclude caste, religion, gender, personal political belief, and unrelated founder characteristics.
- Allow users to report a bad match or incorrect summary.
- Store model/prompt version and confidence/limitations.
- Benchmark matching on seeded examples before demo.
- Provide a non-AI fallback so the demo remains functional without network/provider access.

---

## 10. Policy and integration claims requiring verification

The source material supplied to the project mentioned several claims. They are useful research leads, not yet verified facts for the product or presentation.

### 10.1 `UNVERIFIED` policy claims

- Exact applicability and wording of GFR 2017 Rule 170(i) concerning bid security/EMD exemptions.
- Exact applicability and wording of Rule 173(i) or other rules concerning prior turnover and experience relaxation.
- Whether every government tender must provide such relaxation, or whether quality/technical requirements can override it in specific cases.
- Current GeM startup order counts, participating startup counts, and order values.
- Current L1 + 15% price-preference provisions and who qualifies.
- Current direct-purchase thresholds and whether figures differ by platform/entity/category.
- Maharashtra Startup Week selection count, work-order value, departments, and current program rules.
- Available MSInS and Maharashtra government procurement workflows.
- Legal mechanisms for follow-on procurement after a pilot.

### 10.2 `UNVERIFIED` technical integration claims

- Public or partner API availability for DPIIT recognition verification.
- MCA, GSTN, Udyam, GeM, Maharashtra e-tendering, DigiLocker, eSign, PFMS, state treasury, or bank integrations.
- Authorization and security requirements for PFMS REAT or other payment interfaces.
- Whether sandbox endpoints exist for hackathon use.

### 10.3 Safe demo wording

Use:

- `Integration-ready adapter`
- `Simulated verification`
- `Mock treasury workflow`
- `Subject to departmental policy and delegated financial authority`
- `Exports evidence to the mandated procurement system`
- `AI-assisted, human-approved`

Do not use without verified evidence:

- `Legally guaranteed instant payment`
- `Automatically awards contracts`
- `Bypasses tendering`
- `Directly connected to PFMS/DPIIT/GSTN`
- `Blockchain makes the process legally compliant`
- `All startups are exempt from every eligibility requirement`

### 10.4 Research evidence standard

Policy research should prioritize:

1. Official Government of India or Government of Maharashtra rules, circulars, manuals, and program pages.
2. Official system documentation from GeM, PFMS, Startup India/DPIIT, MSInS, or relevant departments.
3. SIH-issued problem statement and attachments.
4. High-quality secondary material only for context.

Record source title, issuing authority, publication/effective date, URL, date accessed, exact supported claim, and any ambiguity. Do not paste long copyrighted passages.

---

## 11. Success metrics

### 11.1 Product metrics

- Median problem-draft to published-challenge time.
- Percentage of challenges with measurable baseline and target.
- Eligible startup discovery coverage.
- Startup time spent on reusable verification versus repeated uploads.
- Proposal completion rate.
- Evaluator completion time and score-divergence rate.
- Pilot setup time.
- Milestone acceptance turnaround.
- Acceptance-to-payment-request and payment-confirmation time.
- Pilot success, iteration, and termination rates.
- Percentage of completed pilots reused or assessed by another department.
- Startup satisfaction and government-user satisfaction.

### 11.2 Hackathon acceptance metrics

- Golden path completes without manual database changes.
- Fresh seed/reset produces a deterministic demo.
- All P0 state transitions enforce authorization.
- Matching provides readable reasons.
- A challenge cannot be published without required fields/approval.
- A payment request cannot be generated before milestone acceptance.
- Mock integrations are labeled.
- At least one end-to-end browser test covers the main story.
- Presentation distinguishes implemented, simulated, and future features.

### 11.3 North-star metric

`Median verified time from approved public problem to evidence-backed pilot decision.`

This rewards speed while retaining verification and an explicit outcome decision.

---

## 12. Delivery plan: August 31 to September 5, 2026

The precise submission cutoff is `OPEN_QUESTION OQ-001`; until verified, the team should target a code-and-demo freeze by **2026-09-04T21:00:00+05:30** and reserve September 5 for final submission/recovery.

### Day 1 — Monday, 2026-08-31: scope and foundation

Goals:

- Confirm official problem text, deliverables, judging criteria, and cutoff.
- Agree on product name and golden-path scenario.
- Scaffold repository, database, linting, formatting, testing, and environment template.
- Implement design tokens, shell navigation, seeded identities, and role model.
- Finalize schema and state-machine tests.
- Prepare low-fidelity screen map.

Exit criteria:

- App starts locally from documented commands.
- Database can migrate and seed.
- Role-aware shell renders.
- P0 backlog is assigned.

### Day 2 — Tuesday, 2026-09-01: identify, passport, and match

Goals:

- Build challenge intake and structured challenge detail.
- Build AI/deterministic drafting and lint adapter.
- Build Startup Passport and seeded verification evidence.
- Implement explainable matching.
- Add relevant tests and audit events.

Exit criteria:

- Officer publishes a seeded/new challenge.
- Startup sees why it matched.
- Mock verification is clearly labeled.

### Day 3 — Wednesday, 2026-09-02: apply, evaluate, and launch pilot

Goals:

- Proposal form and submission state.
- Frozen rubric, evaluator assignment, conflict declaration, scoring, comparison, and decision.
- Generate pilot charter and milestones from selected proposal.
- Add authorization and state-transition tests.

Exit criteria:

- Proposal-to-pilot selection works end to end.
- Decision packet and audit timeline are visible.

### Day 4 — Thursday, 2026-09-03: pilot, pay, and scale

Goals:

- Pilot Mission Control and evidence review.
- Synthetic/mock telemetry for the waste scenario.
- Payment request and mock finance adapter.
- Completed outcome report, Solution Card, and transferability assessment.
- Seed a second department adoption flow.

Exit criteria:

- Entire golden path is functionally complete.
- No blocker requires production government access.

### Day 5 — Friday, 2026-09-04: stabilize and present

Goals:

- End-to-end and cross-role authorization tests.
- Accessibility, responsive layout, loading/error/empty states.
- Fix P0 bugs; defer risky stretch work.
- Deployment and repeatable seed/reset.
- Record demo video/screenshots if required.
- Finalize README, architecture diagram, pitch deck/script, innovation claims, limitations, and evidence.
- Rehearse with a strict timer and backup plan.

Exit criteria:

- Code/demo freeze by 21:00 IST.
- Public or locally reliable demo URL/build.
- Backup recording and screenshots.
- Submission package staged.

### Deadline day — Saturday, 2026-09-05

Goals:

- Run smoke test.
- Verify submission fields and links.
- Submit before the verified cutoff with buffer.
- Record the submission reference and final commit in this ledger.

Do not add unreviewed features on deadline day.

---

## 13. Initial backlog

No owner is assigned until a contributor appends a `TASK_UPDATE` claiming the task.

| ID | Priority | Initial state | Task | Dependencies | Acceptance summary |
|---|---:|---|---|---|---|
| GOV-001 | P0 | NOT_STARTED | Verify official SIH problem, deliverables, judging rubric, and cutoff | None | Authoritative links and exact requirements recorded |
| PROD-001 | P0 | NOT_STARTED | Confirm codename, one-line pitch, and demo scenario | GOV-001 | Team decision recorded |
| UX-001 | P0 | NOT_STARTED | Define information architecture and golden-path wireframes | PROD-001 | All P0 screens and transitions mapped |
| ARCH-001 | P0 | NOT_STARTED | Select stack, package manager, ORM, auth approach, and deployment target | None | Decision and rationale recorded |
| DEV-001 | P0 | NOT_STARTED | Scaffold app, lint, format, test, env template, and README | ARCH-001 | Fresh setup succeeds |
| DB-001 | P0 | NOT_STARTED | Implement core schema, migrations, and deterministic seed | ARCH-001 | Reset/seed works and supports demo |
| AUTH-001 | P0 | NOT_STARTED | Implement seeded authentication, roles, and authorization | DEV-001, DB-001 | Protected routes/actions tested |
| AUDIT-001 | P0 | NOT_STARTED | Implement tamper-evident audit events | DB-001, AUTH-001 | Chain verification test passes |
| CHAL-001 | P0 | NOT_STARTED | Challenge intake, draft, review, publish, and freeze | DB-001, AUTH-001 | Valid state flow works |
| AI-001 | P0 | NOT_STARTED | Provider adapter and deterministic fallback for drafting/lint | CHAL-001 | Demo works with and without provider key |
| PASS-001 | P0 | NOT_STARTED | Startup Passport and mock evidence verification | DB-001, AUTH-001 | Reusable evidence/freshness visible |
| MATCH-001 | P0 | NOT_STARTED | Explainable eligibility and matching engine | CHAL-001, PASS-001 | Reasons and tests present |
| PROP-001 | P0 | NOT_STARTED | Proposal submission and validation | CHAL-001, PASS-001 | Startup can submit once challenge is open |
| EVAL-001 | P0 | NOT_STARTED | Conflict declaration, rubric scoring, moderation, selection | PROP-001 | Frozen rubric and audit trail enforced |
| PILOT-001 | P0 | NOT_STARTED | Pilot charter, milestone, metric, risk, evidence workflow | EVAL-001 | Selected proposal becomes managed pilot |
| PAY-001 | P0 | NOT_STARTED | Milestone-linked mock payment request and finance workflow | PILOT-001 | Cannot request before acceptance; simulation label visible |
| SCALE-001 | P0 | NOT_STARTED | Solution Card, transferability, and adoption request | PILOT-001 | Second department can start follow-on flow |
| DATA-001 | P0 | NOT_STARTED | Seed reference departments/startups/challenge/proposals/pilot | DB-001 | Golden path starts in a compelling state |
| TEST-001 | P0 | NOT_STARTED | Golden-path browser test and critical authorization/state tests | P0 features | Repeatable test evidence recorded |
| DEMO-001 | P0 | NOT_STARTED | Demo script, reset process, recording, and backup | P0 features | Timed rehearsal succeeds |
| DOC-001 | P0 | NOT_STARTED | Submission README, architecture, limitations, and setup | DEV-001 | Fresh contributor can run app |
| RES-001 | P1 | NOT_STARTED | Verify procurement policy and integration claims | GOV-001 | Primary-source evidence matrix produced |
| I18N-001 | P1 | NOT_STARTED | English/Marathi localization for golden-path copy | UX-001 | Language switch covers demo screens |
| FAIR-001 | P1 | NOT_STARTED | Score divergence and evaluation anomaly indicators | EVAL-001 | Seeded anomaly is explained |
| SBOX-001 | P1 | NOT_STARTED | Synthetic data and mock operational sandbox page | PILOT-001 | Demonstrates safe test-data concept |
| A11Y-001 | P1 | NOT_STARTED | Accessibility audit and fixes | P0 UI | Keyboard and automated checks recorded |
| PERF-001 | P1 | NOT_STARTED | Low-bandwidth/performance review | P0 UI | Key pages meet agreed budgets |
| VC-001 | P2 | NOT_STARTED | Verifiable Credential-shaped pilot attestation demo | PASS-001, PILOT-001 | Clearly labeled prototype with verification demo |
| ZKP-001 | P2 | NOT_STARTED | Narrow privacy-proof concept | P0 complete | Implement only if it strengthens demo without risk |

---

## 14. Definition of done

A feature is `DONE` only when:

- Acceptance behavior is implemented.
- Authorization is enforced server-side.
- Validation and failure states exist.
- Relevant audit events exist.
- Unit/integration/e2e tests are added in proportion to risk.
- Tests actually ran and their result is logged.
- Mock/simulated behavior is labeled.
- User-facing copy is understandable.
- No secret or personal production data is committed.
- Documentation or demo script is updated through a ledger entry or appropriate append-only project record.
- A named contributor has reviewed the result or explicitly records why self-review was necessary.

`Looks complete` is not evidence.

---

## 15. Quality and verification strategy

### 15.1 Unit tests

- State transition guards.
- Matching filters and explanation generation.
- Rubric weight and score calculations.
- Payment readiness conditions.
- Transferability scoring.
- Audit hash-chain verification.

### 15.2 Integration tests

- Challenge draft → approval → publication.
- Passport evidence → eligibility.
- Proposal submission → evaluator assignment.
- Milestone acceptance → payment request.
- Pilot completion → Solution Card.
- Authorization failures between startup/government/evaluator/finance roles.

### 15.3 End-to-end test

At minimum, automate the golden path through challenge, match, proposal, evaluation, pilot milestone, mock payment, and solution reuse. If one test is too long or brittle, create a small number of ordered independent scenarios with deterministic seed data.

### 15.4 Manual review checklist

- Mobile and desktop layouts.
- Keyboard-only navigation.
- Empty/loading/error/success states.
- No broken links.
- No unlabelled simulated integration.
- No invented policy claims in UI or presentation.
- No role can see protected competitor information.
- Demo reset works twice consecutively.
- Backup demo works without live AI or network dependencies.

---

## 16. Demo and judging narrative

### 16.1 Suggested narrative arc

1. **Problem:** Procurement asks startups to behave like old incumbents; departments struggle to test new ideas safely.
2. **Insight:** Innovation procurement is a lifecycle and evidence problem, not a tender-posting problem.
3. **Product:** MahaSetu converts a public problem into a fair challenge, brings eligible startups into a safe pilot, and turns successful outcomes into reusable evidence.
4. **Live proof:** Run the waste-management golden path.
5. **Trust:** Show human gates, frozen criteria, explainable matching, milestone evidence, simulation labels, and audit history.
6. **Scale:** Show the second department reusing evidence with a context-aware transferability assessment.
7. **Impact:** Faster time-to-pilot, lower repeated compliance effort, clearer payment state, and institutional reuse.

### 16.2 What makes the project distinctive

- Full challenge-to-scale workflow rather than a marketplace mockup.
- Procurement linter that improves measurability and inclusion.
- Reusable evidence with freshness/provenance.
- Explainable discovery rather than opaque AI award ranking.
- Pilot Mission Control with measurable outcomes.
- Payment readiness tied to accepted evidence, while respecting human/financial authority.
- Transferability assessment that avoids naïve one-click reuse.
- Fairness and auditability embedded in the workflow.

### 16.3 Honest implementation labels

Every presentation feature should be classified:

- `IMPLEMENTED` — works in the prototype.
- `SIMULATED` — realistic adapter or seeded event, visibly labeled.
- `DESIGNED` — architecture or UX is specified but not implemented.
- `FUTURE` — requires policy, integration access, or production hardening.

Never blur these classes during judging.

---

## 17. Risks and mitigations

| ID | Risk | Likelihood | Impact | Mitigation |
|---|---|---:|---:|---|
| R-001 | Scope is too large for five days | High | Critical | Lock golden path, finish P0, aggressively defer P2/P3 |
| R-002 | Team builds blockchain/ZKP spectacle before workflow | Medium | High | Require P0 completion before cryptographic stretch features |
| R-003 | Unverified policy claims undermine credibility | High | High | Primary-source research and honest demo wording |
| R-004 | External AI/network failure breaks demo | Medium | High | Deterministic fallback and seeded outputs |
| R-005 | External government APIs are unavailable | High | Medium | Adapter interfaces with explicit simulated states |
| R-006 | Multi-agent handoffs duplicate or overwrite work | High | High | Read Truth/Git diff; claim task; session ledger; small commits |
| R-007 | Evaluation AI appears biased or autonomous | Medium | High | Explainability, human gates, frozen rubric, no award automation |
| R-008 | UI becomes a collection of dashboards without a story | Medium | High | Golden-path demo and end-to-end vertical slice |
| R-009 | Seed data feels fake or inconsistent | Medium | Medium | One reference scenario with internally consistent metrics |
| R-010 | Authorization bugs expose proposals | Medium | Critical | Server-side role tests and IDOR tests |
| R-011 | Deadline interpretation is wrong | Medium | Critical | Verify exact cutoff in GOV-001; freeze a day early |
| R-012 | Append-only file becomes hard to use | Medium | Medium | Structured entries, status snapshots, stable IDs, supersession links |

---

## 18. Open questions at initialization

- `OQ-001 (P0)`: What is the official SIH 2026 submission cutoff, timezone, and required artifact list?
- `OQ-002 (P0)`: What exact judging criteria and weights apply?
- `OQ-003 (P0)`: Is the official problem statement accompanied by an image/PDF containing constraints not present in the supplied text?
- `OQ-004 (P0)`: Who are the team members, availability windows, and strongest technical/design/research skills?
- `OQ-005 (P0)`: Which stack can the team deliver fastest and deploy most reliably?
- `OQ-006 (P0)`: Is `MahaSetu` acceptable as the product name?
- `OQ-007 (P0)`: Will the waste-management scenario be the canonical demo or is a domain specified by the organizers?
- `OQ-008 (P1)`: Which authoritative startup eligibility sources are technically accessible?
- `OQ-009 (P1)`: Which Maharashtra procurement path can legally move from PoC to scaled adoption?
- `OQ-010 (P1)`: Does the judging environment guarantee internet access?
- `OQ-011 (P1)`: Is Marathi localization expected or a differentiator?
- `OQ-012 (P1)`: Are there mandatory hosting/data-residency constraints for the prototype?

---

## 19. Team operating protocol

### 19.1 Before a work session

1. Read `Truth.md` fully.
2. Inspect `git status`, recent log, and relevant code.
3. Check the latest `STATUS_SNAPSHOT` and `SESSION_END`.
4. Append `SESSION_START` with intended tasks and assumptions.
5. Claim specific task IDs. Avoid vague claims such as `work on frontend`.
6. If another session may overlap, coordinate at file/module boundaries.

### 19.2 During a work session

- Prefer one vertical result over many half-built files.
- Preserve others' changes.
- Run focused tests as work proceeds.
- Append important decisions as soon as they materially affect others.
- If changing a public interface or data model, record downstream impact.
- Do not leave undocumented background services or manual setup.

### 19.3 At handoff

Append `SESSION_END` containing:

- Objective and outcome.
- Task status changes.
- Files created/changed.
- Commands/tests and exact results.
- Commits and working-tree state.
- Decisions made and assumptions used.
- Known bugs, partial implementations, and risks.
- Exact next recommended action.
- Any credentials/config needed by name only.

### 19.4 Session entry template

Copy this template and append it at the bottom. Do not modify the template here.

```markdown
### [YYYY-MM-DDTHH:mm:ss+05:30] ENTRY_TYPE — Short title

- **Entry ID:** LOG-YYYYMMDD-NNN
- **Author:** Human name / agent name / provider and model
- **Session window:** start timestamp → end timestamp or `ACTIVE`
- **Related tasks:** TASK-ID, TASK-ID
- **Status changes:** `TASK-ID: OLD_STATE → NEW_STATE`
- **Summary:** What happened and why.
- **Changes:**
  - `path/to/file`: concise description
- **Decisions/assumptions:**
  - Decision, rationale, and what it supersedes (if anything)
- **Verification:**
  - `command`: PASS/FAIL and meaningful output
- **Known issues/risks:**
  - Concrete issue and impact
- **Git state:** branch, commit hash, clean/dirty, uncommitted files
- **Next action:** The first concrete action for the next contributor
- **Handoff note:** Anything needed to resume without chat history
```

### 19.5 Decision entry template

```markdown
### [YYYY-MM-DDTHH:mm:ss+05:30] DECISION — Decision title

- **Entry ID:** DEC-YYYYMMDD-NNN
- **Author:** ...
- **Related tasks:** ...
- **Decision:** ...
- **Context:** ...
- **Options considered:** ...
- **Rationale:** ...
- **Consequences:** ...
- **Supersedes:** entry ID or `None`
- **Revisit trigger:** concrete condition or `No planned revisit`
```

### 19.6 Status snapshot template

Use a snapshot at least once daily and whenever a major handoff occurs. A newer snapshot supersedes only status, not historical decisions.

```markdown
### [YYYY-MM-DDTHH:mm:ss+05:30] STATUS_SNAPSHOT — Current project state

- **Entry ID:** SNAP-YYYYMMDD-NNN
- **Author:** ...
- **Overall health:** GREEN / AMBER / RED
- **Current demo readiness:** brief statement
- **P0 done:** ...
- **P0 in progress:** ...
- **P0 blocked:** ...
- **Next three actions:**
  1. ...
  2. ...
  3. ...
- **Latest verified build/test:** ...
- **Latest commit:** ...
- **Deadline risk:** ...
```

### 19.7 Rules for LLM/agent contributors

- This file is the context source; do not rely on unavailable chat history.
- Verify repository state instead of trusting a prior agent's claim.
- Do not re-scaffold or replace architecture without a recorded decision.
- Do not edit unrelated user/team work.
- Use established components, types, patterns, and commands.
- If context/rate limits approach, stop at a coherent boundary and append a complete handoff.
- Never fabricate test results, integration access, sources, or completion.
- Prefer small reviewable patches and commands that teammates can reproduce.

---

## 20. Initial decisions

### DEC-INIT-001 — Truth.md is append-only

- **Decision:** `Truth.md` will be the canonical, append-only project memory.
- **Rationale:** Contributors will rotate across time periods, chat contexts, LLMs, and providers. An append-only ledger preserves history and prevents silent context loss.
- **Consequence:** Corrections and status changes are appended and explicitly supersede earlier entries. Git remains the source of implementation history.

### DEC-INIT-002 — Build a lifecycle orchestration layer

- **Decision:** Position the product as an integration-ready innovation procurement lifecycle, not as a replacement for existing statutory procurement/payment platforms.
- **Rationale:** This is more implementable, credible, and compatible with unknown policy/integration constraints.

### DEC-INIT-003 — Prefer measurable trust over blockchain claims

- **Decision:** Use a relational state machine and tamper-evident audit chain in the P0 MVP. Treat blockchain, verifiable credentials, and zero-knowledge proofs as optional later layers.
- **Rationale:** The central user value is structured evidence, fairness, and time-to-pilot. A ledger does not remove the need for authorization, policy, secure operations, or data quality.

### DEC-INIT-004 — AI assists but does not decide

- **Decision:** AI drafts challenges, detects omissions, assists discovery, and explains matches. Authorized humans publish challenges, decide eligibility exceptions, score proposals, select pilots, accept milestones, and authorize payment workflows.
- **Rationale:** Public procurement decisions require accountability, contestability, and traceable human authority.

### DEC-INIT-005 — External systems are adapters

- **Decision:** Unavailable verification, sandbox, and payment integrations will be implemented as typed adapters with explicit mocks.
- **Rationale:** The demo must remain reliable and must not misrepresent access to government systems.

---

# Append-Only Project Ledger

> **All new project information goes below this line. Never insert above or edit earlier content.**

### [2026-08-31T10:11:23+05:30] SESSION_START — Initialize the shared project truth

- **Entry ID:** LOG-20260831-001
- **Author:** OpenAI Codex, primary project-initialization session
- **Session window:** 2026-08-31T10:11:23+05:30 → ACTIVE
- **Related tasks:** Project initialization
- **Status changes:** None; backlog initialized.
- **Summary:** Created the first canonical project context from the user's SIH 2026 problem statement and supplied architectural report. Established an append-only collaboration protocol for rotating human/LLM work sessions and drafted the product vision, lifecycle, P0/P1/P2 scope, architecture, data model, security model, delivery schedule, acceptance criteria, risks, questions, and handoff templates.
- **Source context received:**
  - Problem statement: startup-friendly public procurement mechanism enabling departments to identify, pilot, procure, and scale innovative solutions from eligible startups.
  - Supplied concepts included AI challenge/RFP translation, startup matching, reusable credentials, synthetic data sandboxes, milestone payment workflows, smart contracts, real-time evaluation, risk-adjusted EMD logic, reverse pitching, OCR compliance, a GovTech app store, W3C Verifiable Credentials, zero-knowledge proofs, PFMS integration, and permissioned ledgers.
  - This baseline narrows those concepts into a credible five-day vertical slice while retaining advanced features as staged extensions.
- **Changes:**
  - `Truth.md`: created as the single source of truth.
- **Decisions/assumptions:**
  - Deadline interpreted as 2026-09-05 in Asia/Kolkata because the environment date is 2026-08-31 and the user stated September 5.
  - Exact cutoff and official requirements remain unverified.
  - The workspace appeared empty at initialization.
- **Verification:**
  - Initial workspace listing returned no project files.
  - File verification will be recorded in the corresponding session-end entry.
- **Known issues/risks:**
  - Team identities, stack preferences, official SIH artifacts, and cutoff are unknown.
  - Policy and integration claims in the supplied report require authoritative verification.
- **Git state:** Not yet verified; workspace showed no files before this document was added.
- **Next action:** Verify `Truth.md`, then have the first implementation contributor append a session start, claim GOV-001/ARCH-001, inspect official artifacts, and scaffold the chosen stack.
- **Handoff note:** Read this entire document. Do not implement blockchain/ZKP before the P0 lifecycle is stable.

### [2026-08-31T10:17:06+05:30] SESSION_END — Shared project truth initialized

- **Entry ID:** LOG-20260831-002
- **Author:** OpenAI Codex, primary project-initialization session
- **Session window:** 2026-08-31T10:11:23+05:30 → 2026-08-31T10:17:06+05:30
- **Related tasks:** Project initialization
- **Status changes:** Project initialization: `IN_PROGRESS → DONE`
- **Summary:** Finished and verified the initial append-only project record. It is ready to serve as the handoff context for subsequent contributors and providers.
- **Changes:**
  - `Truth.md`: created with 1,542 lines before this closing ledger entry and approximately 71.6 KB of project context.
- **Decisions/assumptions:**
  - No new decisions beyond DEC-INIT-001 through DEC-INIT-005.
- **Verification:**
  - `Get-Item Truth.md`: PASS; file exists at the repository/workspace root.
  - `(Get-Content Truth.md).Count`: PASS; returned 1,542 before appending this entry.
  - `Get-Content Truth.md -TotalCount 6` and `-Tail 8`: PASS; canonical header and ledger tail are present.
  - `git rev-parse --is-inside-work-tree`: FAIL; the current workspace is not yet a Git repository.
- **Known issues/risks:**
  - The folder is not initialized as a Git repository. This document recommends Git, but initialization was not requested or performed in this session.
  - The terminal displayed the UTF-8 em dash in the title incorrectly under its current output encoding; the source file was created as UTF-8 and should be viewed in a UTF-8-aware editor.
- **Git state:** No Git repository detected.
- **Next action:** The next contributor should read this file, append `SESSION_START`, claim `GOV-001` and/or `ARCH-001`, and record whether the team authorizes Git initialization.
- **Handoff note:** The baseline is intentionally detailed, but it is not frozen product truth. Supersede assumptions through explicit appended decisions; never edit prior history.
