# Investment Banking Reimagined

A local React/TypeScript financial workspace backed by Rust and SQLite:

**Source adapters → canonical evidence → MCP tools/resources → bounded context → financial workflow → versioned document and dynamic slides.**

The owner’s 23 October instruction defers model, voice and live data connections. This phase implements the architecture and a working public-archive path. It requires **no API key or model subscription**. Natural-language briefs are saved for the next model-enabled phase; curated local blueprints exercise the real MCP/evidence/finance/slide pipeline without claiming autonomous reasoning.

## Run

On this Mac, double-click **Start Demo.command**, then open **http://localhost:4173**. The compiled release embeds the React build. No Node, Python or Rust runtime is needed to run it. `dist/Banking Studio.app` is an unsigned local Apple Silicon browser launcher, not a native webview or managed enterprise package.

```sh
npm ci
npm run build
cargo build --release
./target/release/banking-studio --open
```

The user-local Rust toolchain is also available at `~/.cargo/bin/cargo`. Source-launcher data lives in `.local/studio.sqlite`; the `.app` uses `~/Library/Application Support/Banking Studio Demo`. The web server binds only to loopback. `scripts/package-mac.sh` updates the local launcher.

## Explore the application

- **Data connections:** ready local SEC/Treasury archive; explicit deferred/planned refresh and provider-native MCP contracts for FactSet, S&P/Kensho and Daloopa. Planned contracts cannot retrieve data. Actual licences, authentication and schemas remain unverified.
- **Local blueprints:** financing, capital returns and hypothetical acquisition examples retrieve archive observations through the official MCP SDK, calculate in Rust, assemble a context packet and compile different document shapes. Companies are selected from the supported universe; reported financial data is not typed into a form. All transaction terms remain visible illustrative assumptions.
- **Evidence and context:** original and normalized values, units/scales, fiscal periods, filing dates, tags, accessions and citation identities. Context selection is bounded and explicitly lists omitted observations. The archive uses keyword search, not claimed semantic retrieval.
- **Dynamic materials:** a typed semantic document compiles into branded frames, geometry, data bindings and a citation index. Change page composition, reorder pages or directly edit a headline/narrative. Validation and optimistic revisions preserve financial records and source snapshots. Current frame lineage is analysis/fact-level; full per-number derived dependency tracing is further work.
- **Materials library and review:** reopen artifacts with their workrooms, inspect execution, record page-specific feedback and save a follow-up brief. Model execution of that feedback is deferred. JSON and CSV are inspection exports; editable PowerPoint and agent-aware XLSX are future adapters.

The public archive covers annual SEC US GAAP financials for PEP, CPB and GIS, plus a dated USD Treasury par curve. It is not live market data, LTM/consensus or an institutional transaction dataset. Scenario share prices, issuer spreads and deal terms are assumptions. Financial methods and limitations are documented in [the MCP methodology resource](docs/FINANCIAL_METHODS.md).

## Actual MCP, not a renamed tool list

The [official Rust SDK](https://github.com/modelcontextprotocol/rust-sdk), `rmcp 3.7.0`, supplies client/server discovery, tool calls and resources. The host uses a JSON-RPC duplex transport inside the application, avoiding extra daemons. The same public-archive server can run over stdio:

```sh
./target/release/banking-studio --mcp
```

Stdio mode uses a fresh in-memory public workspace, does not open the app database or start HTTP, and exposes no model credentials, arbitrary files or arbitrary URL fetches. Its SDK negotiates current MCP discovery and supported legacy initialization. The app’s architecture screen obtains the actual tool catalog through its running MCP client/server.

MCP does not replace data storage, financial semantics, context selection, model orchestration or rendering. Provider-native MCP and API-to-MCP adapters are alternative ways to supply the same evidence contract. Public provider descriptions are not entitlement or bank-approval evidence.

## Architecture, evidence and research

- [Deep peer/product/MCP research and explicit implementation decisions](docs/PEER_ARCHITECTURE_RESEARCH.md)
- [Current module boundaries and phase plan](docs/MCP_ARCHITECTURE.md)
- [Monday demonstration without external connections](docs/MONDAY_DEMO.md)
- [Financial methods](docs/FINANCIAL_METHODS.md)
- [Current MCP verification](docs/mcp-verification.json)
- [Original market research](docs/MARKET_RESEARCH.md), [data/platform options](docs/MVP_DATA_AND_PLATFORM.md) and [bank acceptance gates](docs/BANK_ACCEPTANCE.md)
- [GitHub Project](https://github.com/users/NeoDemos/projects/3) and [parent issue #1](https://github.com/NeoDemos/investment-banking-reimagined/issues/1)

```sh
npm run check
cargo test
python3 scripts/verify_mcp_architecture.py
python3 scripts/verify_demo.py
```

The current integration test exercises the actual binary, SDK protocol boundary, standalone MCP stdio and local financial/document workflows with external connections disabled and no model calls. Historical mock-model evidence in `docs/agent-verification.json` describes the prior phase; it is not current live-inference acceptance. Its `verify_agent.py` rehearsal is explicitly opt-in for the later model-port phase. The legacy deterministic API remains for existing local state; it is not the primary workflow.

## Design and scope

The canvas uses the actual public investor-site SVG wordmark, a 4:3 brand grammar and local Myriad website fonts. Proprietary fonts are excluded from the repo and app bundle; other machines need authorized fonts or use the installed/open-source fallback. Website `MyriadW01` differs from PDF-custom `MyriadforRabobank`; exact PDF typography or pixel parity is not claimed. This is an independent public-reference study, without bank affiliation or approval.

This local single-user prototype does not establish bank/ZDR acceptance, maker/checker controls, confidential processing, complete valuation/underwriting coverage or managed native distribution. The original bank/full-product programme remains separate. Next-phase model/remote data adapters are disabled by default; owner/developer activation of retained experimental adapter code is not an acceptance claim. No confidential or licensed provider content belongs in this public repository. The project is independent of the NeoDemos product.
