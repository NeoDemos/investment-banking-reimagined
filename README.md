# Investment Banking Reimagined

A local client-work application: **director instruction → agent plan → public data pool → MCP financial tools → stored model → dynamic client story → page review and another turn**.

The primary flow first asks tailored questions about the client objective and adviser positioning, then assembles the evidence needed for that financial job. Source connections are selected through a checkbox dropdown; a compact activity bar and evidence panel keep the workspace clear.

React/TypeScript presents the work; Rust and SQLite own financial calculations, evidence, document revisions and review copies. The current agent uses the laptop's authenticated **Codex CLI**, with bounded structured planning and composition requests. The app never reads or copies Codex credentials. A successful local account-authenticated planning/composition rehearsal has run; account access and quota still govern subsequent requests. The default profile is Codex gpt-6.1-sol on High; Claude Code Opus on Medium is selectable through its local login. Separate API-key adapters remain disabled. Claude is signed in here but its actual readiness request hit the weekly limit.

## Run on this Mac

Double-click **Start Demo.command**, or:

```sh
npm ci
npm run build
~/.cargo/bin/cargo build --release
BANKING_STUDIO_LOCAL_AGENT=1 BANKING_STUDIO_EXTERNAL_CONNECTIONS=0 ./target/release/banking-studio --open
```

Open **http://localhost:4173**. Runtime is one release binary with the built React UI embedded; no Node/Python development server is required. Codex must be installed and signed in for agent execution (`codex login status`). The independent structured workflow still works without a model. Source-launcher state lives in `.local/studio.sqlite`; the unsigned `dist/Banking Studio.app` browser launcher uses `~/Library/Application Support/Banking Studio Demo`. It is not a managed native webview or a Windows installer. `scripts/package-mac.sh` updates the local package.

## What to try

1. Start with the natural-language **director assignment**, using a debt-capital-markets, capital-returns or M&A example. The structured brief editor is secondary, under an expandable inspection option.
2. Ask the team to prepare the client story. The local agent proposes the brief/storyline. Optional fixed public SEC/Treasury adapters fetch and normalize source observations; failed attempts stay visible and the dated pool remains available.
3. Open **Storyline** to browse the client argument as linked frames. Materials combine agent-authored narrative/headlines with charts and figures resolved from stored deterministic models. Relevant annual peer context and the sourced Rabobank proposition come from the same retained data layer.
4. Inspect **Data pool**, **Evidence**, **Scenarios** and exact key-number traces. Changing assumptions creates a new model; originals remain intact. A confirmed funding amendment changes gap dependencies without silently resizing an issue.
5. Use **Discussion** for a further agent turn, or record page-specific review issues and authored edits. Review copies require explicit local prerequisites, current advice, review declarations and issue dispositions. These are self-attested prototype controls, not authenticated banker authority.
6. **Evaluation** starts empty. It records actual entered paired observations against exact copies, including quality failures, review and rework. Five independent GPT-6.1 Sol reviews are defect-finding evidence; neither 10× staff productivity nor 5× client impact has been established.

## Coverage and boundaries

Executable financial methods are regular semiannual USD bond economics/net funding, simplified full-period buybacks and simplified acquisition earnings/leverage with two funding actions and matching zero-synergy stresses. The engine also runs a bounded illustrative IPO equity/share/proceeds bridge and a single-tranche LBO debt/cash schedule with sponsor IRR/MOIC. Company coverage is PEP, CPB, GIS and AAPL; the Apple issuer-report adapter and Treasury/Bundesbank yields have live public connections. Current issuer spreads, fees and deal terms remain explicit illustrative inputs. Recent public delayed equity observations can anchor proposed buyback/M&A price baselines with source lineage; explicit banker price assumptions are preserved. Full IPO underwriting, forecast DCF, multi-tranche/integrated LBO, merger accounting, fairness opinions and executable underwriting remain outside scope.

The public pool retains normalized versions, original values/units, periods, filing dates/tags/accessions and ingestion receipts. A small dated Damodaran/NYU Stern industry reference supplies broad sector context, not current company/transaction comps. Annual-report URL registration is an intake boundary; general PDF/table extraction and European taxonomy mapping are not implemented. Wider company discovery, European company reporting and equity/index adapters are planned in the [work catalog](docs/CLIENT_WORK_CATALOG.md).

The agent proposes the story and validated scenario terms. Rust computes authoritative figures; typed financial blocks bind charts/tables to those values. The host uses the official `rmcp 3.7.0` SDK for actual discovery, tools/resources and JSON-RPC duplex messages. MCP transports capabilities; it does not replace the database, financial semantics, context selection or document engine. The public server also runs independently over stdio:

```sh
./target/release/banking-studio --mcp
```

## Evidence and design

- [Monday demo](docs/MONDAY_DEMO.md) · [client-work catalog and source research](docs/CLIENT_WORK_CATALOG.md)
- [Client architecture](docs/CLIENT_WORKROOM_ARCHITECTURE.md) · [local agent contract](docs/LOCAL_AGENT.md) · [MCP foundation](docs/MCP_ARCHITECTURE.md)
- [Guided client direction and task-specific evidence](docs/GUIDED_EVIDENCE_WORKFLOW.md) · [executed verification](docs/GUIDED_EVIDENCE_VERIFICATION.md)
- [Director reliability, live prompt and model verification](docs/DIRECTOR_RELIABILITY_VERIFICATION.md)
- [Five gauntlet reports and response ledger](docs/reviews/GAUNTLET.md) · [measurement protocol](docs/CLIENT_WORKFLOW_EVALUATION.md)
- [Peer architecture research](docs/PEER_ARCHITECTURE_RESEARCH.md) · [financial methods](docs/FINANCIAL_METHODS.md) · [bank acceptance programme](docs/BANK_ACCEPTANCE.md)
- [GitHub Project](https://github.com/users/NeoDemos/projects/3) · [original programme #1](https://github.com/NeoDemos/investment-banking-reimagined/issues/1)

```sh
npm run check
cargo test
python3 scripts/verify_client_workflow.py
python3 scripts/verify_client_controls.py
python3 scripts/verify_director.py
python3 scripts/verify_capital_models.py
python3 scripts/verify_contextual_workflow.py
python3 scripts/verify_mcp_architecture.py
python3 scripts/verify_demo.py
```

Contract suites use isolated temporary databases and no external calls. `verify_director.py` uses an explicit fake CLI to test invalid/unsupported output and state preservation; actual Codex execution is separately recorded as live rehearsal evidence. Historical `verify_agent.py` belongs to the earlier optional API adapter and is not part of these checks.

The identity study uses the actual public investor-site SVG and locally supplied Myriad website fonts. Proprietary fonts are excluded from Git and public distribution. Website Myriad differs from PDF-custom MyriadforRabobank; pixel-perfect PDF parity or official bank approval is not claimed. This is an independent, single-user, external **public-data** demonstration. Confidential data, bank integration, ZDR acceptance, authenticated maker/checker, signing/managed native distribution and bank compliance remain separate work. This project is independent of the NeoDemos product.
