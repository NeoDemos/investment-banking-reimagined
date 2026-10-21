# Dated task register

As of 21 October 2026. [Project](https://github.com/users/NeoDemos/projects/3) · [Parent #1](https://github.com/NeoDemos/investment-banking-reimagined/issues/1) · [Delivery assumptions](../DELIVERY_PLAN.md) · [Complete structured specifications](tasks.json)

**Planning only.** Illustrative kickoff: 26 October 2026. All tasks remain open; build work requires explicit owner authorization. Low/base/high are estimated owner hours, not confidence intervals. External reviewers and elapsed waits are additional. The sole owner is capacity-constrained; agent concurrency does not multiply owner hours or Max allowance.

Month one: 101/128/192 low/base/high owner hours, with a separate 32-hour base-plan reserve in 160 available hours. Later target dates are conditional windows, increasingly uncertain, and require holiday/leave and gate rebaselining. Phase totals are incremental; cumulative subscription-month estimates are in the delivery plan.

## P0 — Scope, data and bank-route gates

Incremental base owner effort: **26 hours**. Proposed accountable owner: @NeoDemos. Specialist reviewers and bank control owners are not yet assigned/committed.

| Task | Target start → finish | Horizon | Low / base / high owner h | Depends on |
| --- | --- | --- | ---: | --- |
| [T01 · #2](https://github.com/NeoDemos/investment-banking-reimagined/issues/2) Confirm first banker workflow, sector and output boundary | 2026-10-26 → 2026-10-26 | Days 1–1 / weeks 1–1 | 3 / 4 / 6 | — |
| [T02 · #3](https://github.com/NeoDemos/investment-banking-reimagined/issues/3) Identify bank sponsor, approved platform and control-review route | 2026-10-26 → 2026-10-27 | Days 1–2 / weeks 1–1 | 3 / 4 / 6 | — |
| [T03 · #4](https://github.com/NeoDemos/investment-banking-reimagined/issues/4) Validate one provider tool sample, entitlement and commercial rights | 2026-10-27 → 2026-10-28 | Days 2–3 / weeks 1–1 | 5 / 6 / 9 | [#2](https://github.com/NeoDemos/investment-banking-reimagined/issues/2) |
| [T04 · #5](https://github.com/NeoDemos/investment-banking-reimagined/issues/5) Specify finance reference cases and numerical acceptance tolerances | 2026-10-28 → 2026-10-29 | Days 3–4 / weeks 1–1 | 5 / 6 / 9 | [#2](https://github.com/NeoDemos/investment-banking-reimagined/issues/2) |
| [T05 · #6](https://github.com/NeoDemos/investment-banking-reimagined/issues/6) Approve data schema, trust boundaries and bounded-build decision | 2026-10-29 → 2026-10-30 | Days 4–5 / weeks 1–1 | 5 / 6 / 9 | [#2](https://github.com/NeoDemos/investment-banking-reimagined/issues/2), [#3](https://github.com/NeoDemos/investment-banking-reimagined/issues/3), [#4](https://github.com/NeoDemos/investment-banking-reimagined/issues/4), [#5](https://github.com/NeoDemos/investment-banking-reimagined/issues/5) |

### Executors, reviewer capacity and external lead times

- **T01:** Owner + Opus lead. Additional review: Finance reviewer: 1 h. External lead/gate: Reviewer availability: 1–3 working days.
- **T02:** Owner + Opus lead. Additional review: Security/platform contact: 2 h. External lead/gate: Bank response: 2–6+ weeks; initiate in week 1.
- **T03:** Owner + Opus lead. Additional review: Provider/data/procurement contact: 2 h. External lead/gate: Access/rights: 1–4+ weeks; day-3 demo fallback decision.
- **T04:** Opus lead + finance reviewer. Additional review: Finance reviewer: 3 h. External lead/gate: Reviewer turnaround: 1–3 working days.
- **T05:** Opus lead + owner. Additional review: Security/platform contact: 2 h. External lead/gate: Build authorization and permitted-data decision required.

## P1 — One-month valuation challenge

Incremental base owner effort: **102 hours**. Proposed accountable owner: @NeoDemos. Specialist reviewers and bank control owners are not yet assigned/committed.

| Task | Target start → finish | Horizon | Low / base / high owner h | Depends on |
| --- | --- | --- | ---: | --- |
| [T06 · #7](https://github.com/NeoDemos/investment-banking-reimagined/issues/7) Establish application shell, reproducible build and delivery checks | 2026-10-30 → 2026-11-02 | Days 5–6 / weeks 1–2 | 6 / 8 / 12 | [#6](https://github.com/NeoDemos/investment-banking-reimagined/issues/6) |
| [T07 · #8](https://github.com/NeoDemos/investment-banking-reimagined/issues/8) Implement minimum identity, matter isolation and tool restrictions | 2026-11-02 → 2026-11-03 | Days 6–7 / weeks 2–2 | 8 / 10 / 15 | [#7](https://github.com/NeoDemos/investment-banking-reimagined/issues/7) |
| [T08 · #9](https://github.com/NeoDemos/investment-banking-reimagined/issues/9) Integrate one read-only provider adapter and measure coding throughput | 2026-11-03 → 2026-11-05 | Days 7–9 / weeks 2–2 | 8 / 10 / 15 | [#4](https://github.com/NeoDemos/investment-banking-reimagined/issues/4), [#7](https://github.com/NeoDemos/investment-banking-reimagined/issues/7), [#8](https://github.com/NeoDemos/investment-banking-reimagined/issues/8) |
| [T09 · #10](https://github.com/NeoDemos/investment-banking-reimagined/issues/10) Reconcile entity, fiscal period, units and financial definitions | 2026-11-05 → 2026-11-06 | Days 9–10 / weeks 2–2 | 8 / 10 / 15 | [#5](https://github.com/NeoDemos/investment-banking-reimagined/issues/5), [#6](https://github.com/NeoDemos/investment-banking-reimagined/issues/6), [#9](https://github.com/NeoDemos/investment-banking-reimagined/issues/9) |
| [T10 · #11](https://github.com/NeoDemos/investment-banking-reimagined/issues/11) Implement bounded trading comps and EV-to-equity calculations | 2026-11-09 → 2026-11-10 | Days 11–12 / weeks 3–3 | 8 / 10 / 15 | [#10](https://github.com/NeoDemos/investment-banking-reimagined/issues/10) |
| [T11 · #12](https://github.com/NeoDemos/investment-banking-reimagined/issues/12) Implement simple scenario DCF and sensitivity limits | 2026-11-10 → 2026-11-11 | Days 12–13 / weeks 3–3 | 6 / 8 / 12 | [#11](https://github.com/NeoDemos/investment-banking-reimagined/issues/11) |
| [T12 · #13](https://github.com/NeoDemos/investment-banking-reimagined/issues/13) Attach provenance to material numbers, claims and transformations | 2026-11-11 → 2026-11-12 | Days 13–14 / weeks 3–3 | 5 / 6 / 9 | [#10](https://github.com/NeoDemos/investment-banking-reimagined/issues/10), [#11](https://github.com/NeoDemos/investment-banking-reimagined/issues/11), [#12](https://github.com/NeoDemos/investment-banking-reimagined/issues/12) |
| [T13 · #14](https://github.com/NeoDemos/investment-banking-reimagined/issues/14) Implement bounded research-to-briefing job orchestration | 2026-11-12 → 2026-11-13 | Days 14–15 / weeks 3–3 | 5 / 6 / 9 | [#8](https://github.com/NeoDemos/investment-banking-reimagined/issues/8), [#11](https://github.com/NeoDemos/investment-banking-reimagined/issues/11), [#12](https://github.com/NeoDemos/investment-banking-reimagined/issues/12), [#13](https://github.com/NeoDemos/investment-banking-reimagined/issues/13) |
| [T14 · #15](https://github.com/NeoDemos/investment-banking-reimagined/issues/15) Render a source-linked client briefing with controlled interactions | 2026-11-13 → 2026-11-16 | Days 15–16 / weeks 3–4 | 6 / 8 / 12 | [#14](https://github.com/NeoDemos/investment-banking-reimagined/issues/14) |
| [T15 · #16](https://github.com/NeoDemos/investment-banking-reimagined/issues/16) Generate and visually verify editable presentation and workbook exports | 2026-11-16 → 2026-11-18 | Days 16–18 / weeks 4–4 | 6 / 8 / 12 | [#15](https://github.com/NeoDemos/investment-banking-reimagined/issues/15) |
| [T16 · #17](https://github.com/NeoDemos/investment-banking-reimagined/issues/17) Implement maker/checker review and immutable output snapshots | 2026-11-18 → 2026-11-19 | Days 18–19 / weeks 4–4 | 5 / 6 / 9 | [#8](https://github.com/NeoDemos/investment-banking-reimagined/issues/8), [#13](https://github.com/NeoDemos/investment-banking-reimagined/issues/13), [#16](https://github.com/NeoDemos/investment-banking-reimagined/issues/16) |
| [T17 · #18](https://github.com/NeoDemos/investment-banking-reimagined/issues/18) Run financial, permission, injection and export acceptance cases | 2026-11-19 → 2026-11-20 | Days 19–20 / weeks 4–4 | 6 / 8 / 12 | [#5](https://github.com/NeoDemos/investment-banking-reimagined/issues/5), [#17](https://github.com/NeoDemos/investment-banking-reimagined/issues/17) |
| [T18 · #19](https://github.com/NeoDemos/investment-banking-reimagined/issues/19) Demonstrate month-one slice and make measured pilot go/no-go decision | 2026-11-20 → 2026-11-20 | Days 20–20 / weeks 4–4 | 3 / 4 / 6 | [#18](https://github.com/NeoDemos/investment-banking-reimagined/issues/18) |

### Executors, reviewer capacity and external lead times

- **T06:** Sonnet worker; Opus review. Additional review: Owner reviews diff and setup. External lead/gate: Existing stack/platform assumed.
- **T07:** Opus lead; Sonnet test worker. Additional review: Security/platform contact: 4 h. External lead/gate: Approved identity route needed for restricted pilot; demo uses synthetic identities.
- **T08:** Sonnet worker; Opus review. Additional review: Provider/data contact: 2 h. External lead/gate: Entitled endpoint or explicitly labeled public fixture route.
- **T09:** Opus lead; Sonnet checks. Additional review: Finance reviewer: 3 h. External lead/gate: Reference-data clarifications: 1–3 working days.
- **T10:** Opus lead; Sonnet test worker. Additional review: Finance reviewer: 2 h. External lead/gate: Approved peer set and valuation conventions.
- **T11:** Opus lead. Additional review: Finance reviewer: 2 h. External lead/gate: Approved assumptions and sector template.
- **T12:** Sonnet worker; Opus review. Additional review: Finance reviewer included in final QA. External lead/gate: Stable source access and retention rights.
- **T13:** Opus lead; Sonnet worker. Additional review: Owner reviews job replay. External lead/gate: Approved model endpoint for any application inference.
- **T14:** Sonnet worker; Opus review. Additional review: Owner/template review. External lead/gate: One fixed template only.
- **T15:** Sonnet worker; Opus review. Additional review: Owner + finance review included in QA. External lead/gate: Fixed 8–12-page/slide template; no Office add-in.
- **T16:** Opus lead; Sonnet worker. Additional review: Security/platform contact: 1 h. External lead/gate: Reviewer role assigned.
- **T17:** Opus reviewer + Sonnet test worker. Additional review: Finance reviewer: 3 h; security contact: 2 h. External lead/gate: Independent reviewer turnaround: 1–3 working days.
- **T18:** Owner + Opus lead. Additional review: Finance/security feedback already scheduled. External lead/gate: G1 decision at day 20; no automatic G2 approval.

## P2 — Controlled analyst / CIM-section pilot

Incremental base owner effort: **104 hours**. Proposed accountable owner: @NeoDemos. Specialist reviewers and bank control owners are not yet assigned/committed.

| Task | Target start → finish | Horizon | Low / base / high owner h | Depends on |
| --- | --- | --- | ---: | --- |
| [T19 · #20](https://github.com/NeoDemos/investment-banking-reimagined/issues/20) Recalibrate provider, runtime and pilot cost budget | 2026-11-23 → 2026-11-27 | Weeks 5–5+ (conditional; rebaseline after prior gate) | 6 / 8 / 12 | [#19](https://github.com/NeoDemos/investment-banking-reimagined/issues/19) |
| [T20 · #21](https://github.com/NeoDemos/investment-banking-reimagined/issues/21) Add approved internal documents, bank SSO and pilot information barriers | 2026-11-23 → 2026-12-11 | Weeks 5–7+ (conditional; rebaseline after prior gate) | 18 / 24 / 36 | [#3](https://github.com/NeoDemos/investment-banking-reimagined/issues/3), [#8](https://github.com/NeoDemos/investment-banking-reimagined/issues/8), [#19](https://github.com/NeoDemos/investment-banking-reimagined/issues/19) |
| [T21 · #22](https://github.com/NeoDemos/investment-banking-reimagined/issues/22) Add selected precedent transactions with private-coverage limitations | 2026-11-23 → 2026-12-04 | Weeks 5–6+ (conditional; rebaseline after prior gate) | 12 / 16 / 24 | [#4](https://github.com/NeoDemos/investment-banking-reimagined/issues/4), [#11](https://github.com/NeoDemos/investment-banking-reimagined/issues/11), [#20](https://github.com/NeoDemos/investment-banking-reimagined/issues/20) |
| [T22 · #23](https://github.com/NeoDemos/investment-banking-reimagined/issues/23) Draft bounded sell-side CIM sections from approved financial material | 2026-12-07 → 2026-12-18 | Weeks 7–8+ (conditional; rebaseline after prior gate) | 18 / 24 / 36 | [#21](https://github.com/NeoDemos/investment-banking-reimagined/issues/21), [#22](https://github.com/NeoDemos/investment-banking-reimagined/issues/22) |
| [T23 · #24](https://github.com/NeoDemos/investment-banking-reimagined/issues/24) Run controlled 3–5-analyst pilot and measure total review savings | 2026-12-21 → 2027-01-01 | Weeks 9–10+ (conditional; rebaseline after prior gate) | 18 / 24 / 36 | [#20](https://github.com/NeoDemos/investment-banking-reimagined/issues/20), [#21](https://github.com/NeoDemos/investment-banking-reimagined/issues/21), [#22](https://github.com/NeoDemos/investment-banking-reimagined/issues/22), [#23](https://github.com/NeoDemos/investment-banking-reimagined/issues/23) |
| [T24 · #25](https://github.com/NeoDemos/investment-banking-reimagined/issues/25) Complete pilot operating guide and phase-three scope decision | 2026-12-28 → 2027-01-01 | Weeks 10–10+ (conditional; rebaseline after prior gate) | 6 / 8 / 12 | [#24](https://github.com/NeoDemos/investment-banking-reimagined/issues/24) |

### Executors, reviewer capacity and external lead times

- **T19:** Owner + Opus lead. Additional review: Procurement/data and finance: 2–4 h. External lead/gate: Vendor terms and actual usage: 1–4+ weeks.
- **T20:** Opus lead; Sonnet workers. Additional review: Bank IAM/security/data owners: 8–16 h. External lead/gate: Bank approvals and access: 2–6+ weeks.
- **T21:** Opus lead; Sonnet adapter worker. Additional review: Finance reviewer + data owner: 4–8 h. External lead/gate: Additional data rights/coverage: 1–4+ weeks.
- **T22:** Opus lead; Sonnet drafting/template worker. Additional review: Banker/management reviewer: 6–12 h. External lead/gate: Authorized management forecast and KPI material: 1–3+ weeks.
- **T23:** Owner + Opus evaluation lead. Additional review: 3–5 analysts + finance reviewer: 12–24 h. External lead/gate: User availability and approved pilot window: 2+ weeks.
- **T24:** Owner + Opus lead; Haiku documentation worker. Additional review: Business sponsor/control contact: 2–4 h. External lead/gate: Sponsor review: 1–2+ weeks.

## P3 — Bank-assessment candidate and decision

Incremental base owner effort: **216 hours**. Proposed accountable owner: @NeoDemos. Specialist reviewers and bank control owners are not yet assigned/committed.

| Task | Target start → finish | Horizon | Low / base / high owner h | Depends on |
| --- | --- | --- | ---: | --- |
| [T25 · #26](https://github.com/NeoDemos/investment-banking-reimagined/issues/26) Map actual bank controls and close architecture/processing gaps | 2027-01-04 → 2027-01-15 | Weeks 11–12+ (conditional; rebaseline after prior gate) | 12 / 16 / 24 | [#3](https://github.com/NeoDemos/investment-banking-reimagined/issues/3), [#25](https://github.com/NeoDemos/investment-banking-reimagined/issues/25) |
| [T26 · #27](https://github.com/NeoDemos/investment-banking-reimagined/issues/27) Harden authorization, lifecycle, entitlements and records controls | 2027-01-11 → 2027-02-05 | Weeks 12–15+ (conditional; rebaseline after prior gate) | 30 / 40 / 60 | [#21](https://github.com/NeoDemos/investment-banking-reimagined/issues/21), [#26](https://github.com/NeoDemos/investment-banking-reimagined/issues/26) |
| [T27 · #28](https://github.com/NeoDemos/investment-banking-reimagined/issues/28) Establish model, prompt, tool and analytical-method change governance | 2027-02-01 → 2027-02-19 | Weeks 15–17+ (conditional; rebaseline after prior gate) | 18 / 24 / 36 | [#26](https://github.com/NeoDemos/investment-banking-reimagined/issues/26), [#27](https://github.com/NeoDemos/investment-banking-reimagined/issues/27) |
| [T28 · #29](https://github.com/NeoDemos/investment-banking-reimagined/issues/29) Prove monitoring, incidents, backup/restore and provider-outage recovery | 2027-02-01 → 2027-02-26 | Weeks 15–18+ (conditional; rebaseline after prior gate) | 24 / 32 / 48 | [#26](https://github.com/NeoDemos/investment-banking-reimagined/issues/26), [#27](https://github.com/NeoDemos/investment-banking-reimagined/issues/27) |
| [T29 · #30](https://github.com/NeoDemos/investment-banking-reimagined/issues/30) Expand independent financial and adversarial evaluation evidence | 2027-02-15 → 2027-03-12 | Weeks 17–20+ (conditional; rebaseline after prior gate) | 24 / 32 / 48 | [#23](https://github.com/NeoDemos/investment-banking-reimagined/issues/23), [#24](https://github.com/NeoDemos/investment-banking-reimagined/issues/24), [#28](https://github.com/NeoDemos/investment-banking-reimagined/issues/28) |
| [T30 · #31](https://github.com/NeoDemos/investment-banking-reimagined/issues/31) Obtain independent security testing and remediate material findings | 2027-02-22 → 2027-04-02 | Weeks 18–23+ (conditional; rebaseline after prior gate) | 36 / 48 / 72 | [#27](https://github.com/NeoDemos/investment-banking-reimagined/issues/27), [#28](https://github.com/NeoDemos/investment-banking-reimagined/issues/28), [#29](https://github.com/NeoDemos/investment-banking-reimagined/issues/29) |
| [T31 · #32](https://github.com/NeoDemos/investment-banking-reimagined/issues/32) Assemble supplier/operating evidence and submit bank acceptance decision | 2027-03-29 → 2027-04-23 | Weeks 23–26+ (conditional; rebaseline after prior gate) | 18 / 24 / 36 | [#26](https://github.com/NeoDemos/investment-banking-reimagined/issues/26), [#28](https://github.com/NeoDemos/investment-banking-reimagined/issues/28), [#29](https://github.com/NeoDemos/investment-banking-reimagined/issues/29), [#30](https://github.com/NeoDemos/investment-banking-reimagined/issues/30), [#31](https://github.com/NeoDemos/investment-banking-reimagined/issues/31) |

### Executors, reviewer capacity and external lead times

- **T25:** Opus lead + bank architecture/control owners. Additional review: Bank owners: 12–24 h. External lead/gate: Requirements/processing review: 2–6+ weeks.
- **T26:** Opus lead; Sonnet implementation/test workers. Additional review: IAM/security/records owners: 12–24 h. External lead/gate: Bank integration and remediation: 2–6+ weeks.
- **T27:** Opus lead + finance/model-risk owner. Additional review: Finance/model-risk/control owners: 8–16 h. External lead/gate: Review classification and process: 2–6+ weeks.
- **T28:** Opus lead; Sonnet operations worker. Additional review: Bank operations/security: 12–24 h. External lead/gate: Exercise scheduling: 2–4+ weeks.
- **T29:** Opus evaluation lead; Sonnet test worker. Additional review: Finance/security reviewers: 16–32 h. External lead/gate: Reference cases and reviewers: 2–4+ weeks.
- **T30:** Opus lead; Sonnet remediation worker. Additional review: Independent tester + bank security: quote and engagement required. External lead/gate: Booking/testing/remediation: 3–6+ weeks.
- **T31:** Owner + Opus documentation lead. Additional review: Bank sponsor/procurement/risk/operations: uncommitted. External lead/gate: Acceptance/procurement: 4–12+ weeks after complete pack.

## P4 — Workflow and product expansion

Incremental base owner effort: **232 hours**. Proposed accountable owner: @NeoDemos. Specialist reviewers and bank control owners are not yet assigned/committed.

| Task | Target start → finish | Horizon | Low / base / high owner h | Depends on |
| --- | --- | --- | ---: | --- |
| [T32 · #33](https://github.com/NeoDemos/investment-banking-reimagined/issues/33) Add debt-capital-markets financing and investor-briefing module | 2027-04-26 → 2027-06-04 | Weeks 27–32+ (conditional; rebaseline after prior gate) | 30 / 40 / 60 | [#32](https://github.com/NeoDemos/investment-banking-reimagined/issues/32) |
| [T33 · #34](https://github.com/NeoDemos/investment-banking-reimagined/issues/34) Add IPO equity-story, valuation and dilution briefing module | 2027-06-07 → 2027-07-16 | Weeks 33–38+ (conditional; rebaseline after prior gate) | 30 / 40 / 60 | [#32](https://github.com/NeoDemos/investment-banking-reimagined/issues/32) |
| [T34 · #35](https://github.com/NeoDemos/investment-banking-reimagined/issues/35) Add PE investment-committee, sources-and-uses and LBO module | 2027-07-19 → 2027-08-27 | Weeks 39–44+ (conditional; rebaseline after prior gate) | 36 / 48 / 72 | [#32](https://github.com/NeoDemos/investment-banking-reimagined/issues/32) |
| [T35 · #36](https://github.com/NeoDemos/investment-banking-reimagined/issues/36) Add VC funding, cap-table and investment-memo module | 2027-08-30 → 2027-09-24 | Weeks 45–48+ (conditional; rebaseline after prior gate) | 24 / 32 / 48 | [#32](https://github.com/NeoDemos/investment-banking-reimagined/issues/32) |
| [T36 · #37](https://github.com/NeoDemos/investment-banking-reimagined/issues/37) Expand templates, collaboration and multi-provider/product capabilities selectively | 2027-09-27 → 2027-10-22 | Weeks 49–52+ (conditional; rebaseline after prior gate) | 30 / 40 / 60 | [#33](https://github.com/NeoDemos/investment-banking-reimagined/issues/33), [#34](https://github.com/NeoDemos/investment-banking-reimagined/issues/34), [#35](https://github.com/NeoDemos/investment-banking-reimagined/issues/35), [#36](https://github.com/NeoDemos/investment-banking-reimagined/issues/36) |
| [T37 · #38](https://github.com/NeoDemos/investment-banking-reimagined/issues/38) Evaluate product economics, support capacity and next-year expansion | 2027-10-25 → 2027-11-05 | Weeks 53–54+ (conditional; rebaseline after prior gate) | 24 / 32 / 48 | [#37](https://github.com/NeoDemos/investment-banking-reimagined/issues/37) |

### Executors, reviewer capacity and external lead times

- **T32:** Opus lead; Sonnet domain/template workers. Additional review: Debt banker/credit/data reviewer: 12–24 h. External lead/gate: Debt data/analytics rights and review: 2–6+ weeks.
- **T33:** Opus lead; Sonnet domain/template workers. Additional review: ECM banker/issuer reviewer: 12–24 h. External lead/gate: Authorized forecasts/ownership and review: 2–6+ weeks.
- **T34:** Opus lead; Sonnet calculation/template workers. Additional review: PE/LBO/credit reviewer: 16–32 h. External lead/gate: Management and financing inputs/rights: 2–6+ weeks.
- **T35:** Opus lead; Sonnet calculation/template workers. Additional review: VC/cap-table reviewer: 12–24 h. External lead/gate: Private terms/cap-table access and rights: 2–6+ weeks.
- **T36:** Opus lead; Sonnet UI/integration workers. Additional review: Analysts/data/security owners: 12–24 h. External lead/gate: Per-integration rights/security review: 2–6+ weeks.
- **T37:** Owner + Opus lead. Additional review: Business/operations/procurement: 8–16 h. External lead/gate: Budget and procurement decision: 2–6+ weeks.

## Using the plan

Each linked issue contains task-specific acceptance criteria, scope/authorization boundaries, effort and elapsed-time assumptions. Native sub-issues under #1 and blocking links express the dependencies. The Project has phase, numeric owner hours, effort range, start and target dates, authorization, executor, horizon, external wait and specialist-review fields, plus task, board and roadmap views.

The late roadmap includes bounded initial modules and an explicit next-year re-estimation task; it does not claim that all competitor capabilities fit these estimates. Record actual effort, model usage/limit waits, reviewer corrections and evidence on completion. Reforecast after T08, T18, T24 and every bank/module gate.
