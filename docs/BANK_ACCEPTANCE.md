# Bank assessment and evidence gates

> **22 October update:** the owner authorized a separate, local public-data MVP for Monday 26 October. See [current MVP scope and tasks](planning/MONDAY_MVP.md). The research authorization statements below describe the original broader programme and do not revoke that narrow MVP authorization. Bank production and confidential processing remain outside scope.

Planning target, 21 October 2026. Assume an EU international bank as the first reference deployment; the actual institution and classification are unconfirmed. Other jurisdictions require a separate mapping. This is a proposed engineering/evidence specification, not legal advice, an audit conclusion, or bank approval.

## Two delivery routes

**Internal application on an approved bank platform:** reuse approved identity, hosting, secrets, model gateway, monitoring, change process and support where actually available. This is the credible acceleration route. Approval of a platform does not automatically approve a new application, external MCP destination or use case.

**External SaaS supplier:** add corporate security governance, vendor diligence, contracts/DPA/subprocessors, independent assurance, operations, support commitments, and exit arrangements. A solo developer and a coding subscription cannot substitute for accountable owners. Assurance with an observation period cannot be manufactured in a coding sprint; requirements and timing depend on the bank and assurance scope.

EU context: the Commission describes [DORA's operational-resilience and ICT-provider framework](https://finance.ec.europa.eu/digital-finance/cyber-resilience_en) and maintains the [implementing/delegated acts](https://finance.ec.europa.eu/regulation-and-supervision/financial-services-legislation/implementing-and-delegated-acts/digital-operational-resilience-regulation_en). Applicability, criticality, outsourcing classification, contractual requirements and evidence must be determined by the bank's control/legal teams. Generic certifications are inputs to review, not application acceptance.

## Proposed control-to-evidence register

All rows are open until confirmed by the relevant bank owner. Actual confidential requirements and evidence belong in the bank's approved private system; publish only sanitized status/references here.

| Area | Proposed implementation / test | Evidence and proposed accountable owner | Gate |
| --- | --- | --- | --- |
| Scope and data classification | Decide public, licensed, internal and confidential/MNPI use; identify bank jurisdiction and materiality | Signed use-case boundary and bank requirement register; sponsor/security | Before confidential data |
| Identity / lifecycle | Bank SSO/MFA, scoped roles, joiner/mover/leaver and privileged access | Entitlement and revocation test, access review; IAM owner | Controlled pilot |
| Information barriers | Tenant/matter/document authorization before every retrieval, tool call, cache, log, export and background job; derived permissions cannot broaden source permissions | Two-matter adversarial matrix including revoked access and derived artifacts; security/data owner | Before confidential multi-matter use |
| Model and provider processing | Approved processors, retention/residency, subprocessor contracts, encryption/key policy and egress allowlist | Data-flow map, processing approvals and outbound observations; architecture/privacy/procurement | Before restricted data leaves boundary |
| Tool identity and data rights | Per-user or explicitly authorized service credentials; enforce dataset rights independently of chat instructions | Denied-entitlement tests and rights ledger; data owner/procurement | Before provider use/client export |
| Agent security | Untrusted documents cannot grant tool privileges; narrow tool schemas, bounded actions, timeouts and no automatic external sending | Prompt-injection/exfiltration tests, malicious-document and SSRF cases; security | Pilot and release |
| Rendering / output | Reviewed components from structured data; isolated generated content; escape untrusted text, restrict network and scripts | XSS, hyperlink, remote-resource and export tests; application owner | Before sharing |
| Analytical quality | Deterministic methods, explicit conventions, expert gold cases, source support, missing-data refusal and model change control | Reconciliation results, reviewer sign-off and regression reports; finance/model-risk owner as applicable | Before advisory use |
| Review and record | Maker/checker states, explicit publication approval, immutable version with fact/model/prompt/calculation references; logged client distribution where permitted | Replay and change-after-approval tests, record retention/deletion/legal-hold policy; business/records owner | Before external delivery |
| Secure delivery | Protected source, reviews, dependency/secret scanning, SBOM, reproducible builds, patching and independent penetration test | Findings and remediation evidence; engineering/security | Production candidate |
| Operations / resilience | Monitoring, incidents, backup/restore, provider outage and model-change handling, RTO/RPO agreed with bank, rollback and exit plan | Restore/outage exercise, on-call ownership and support arrangements; operations/vendor owner | Production candidate |
| Supplier / acceptance | Contractual and assurance review, residual risk decisions and go-live/change approval | Formal owner decisions and remaining limitations; bank risk/procurement/sponsor | Actual acceptance |

Specific test counts in the delivery plan are preliminary engineering gates, not a bank-issued control standard. Zero observed leaks in a finite test set does not prove absence of leakage.

## Stage gates

- **G0 — authorize the bounded build:** owner approves implementation scope; identify permitted data/processing environment. Current authorization remains research/planning. A planned GitHub issue is not permission to execute it.
- **G1 — month-one demonstration:** public/synthetic or expressly permitted data; validated calculation slice, citations, controlled review and frozen outputs. No bank-production or client-advice approval implied.
- **G2 — controlled analyst pilot:** rights and bank-specific pilot controls accepted; restricted users/matters, approved model route, reviewer and operating owner available. Real confidential use depends on this decision.
- **G3 — bank assessment candidate:** mapped controls, independent testing/remediation, finance validation and operational evidence ready for the bank to assess. This is a deliverable we can plan; acceptance remains the bank's decision.
- **G4 — accepted production and expansion:** formal approval and operating commitments. New sectors, transaction types and data routes reopen relevant controls and evaluations.

## Timing assumptions

The bank workstream starts in week one in parallel with public-data work. Requested review/procurement lead times are planning placeholders, not promised bank SLAs: provider rights/access 1–4+ weeks; architecture/privacy/control responses 2–6+ weeks; independent security test booking and remediation 3–6+ weeks; acceptance/procurement 4–12+ weeks after a complete pack. These can overlap, extend, or fail.

A candidate on an existing approved platform could be technically ready in 3–6 months under favorable access/reviewer conditions. Until those conditions are confirmed, retain 6–12+ months as the conservative bank-delivery planning envelope. External SaaS may take longer. Do not add all placeholder waits mechanically or claim the lower bound as a bank commitment.
