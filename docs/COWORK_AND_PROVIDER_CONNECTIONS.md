# Cowork as the primary MVP interface

Decision, 23 October 2026: use a portable banking skill plus provider connectors to test whether the conversational host is sufficient for the director's workflow. Further custom UI investment should follow evidence of a need for model inspection, persistent shared workrooms, governed review or linked editing. Keep the existing React application as a working inspection/review surface; its financial engine and public-data adapters remain reusable.

This is a local external demonstration, not a bank-approved integration. No provider account was provisioned or purchased. No employer seat was reused outside its authorised environment.

## What is implemented

- `skills/rabo-banking-materials`: portable skill instructions, provider guidance, retained vector logo, design tokens, financial-method conventions and Python rendering/connection tools. No proprietary fonts or licensed datasets are included.
- `scripts/provider_mcp.py`: credential-free provider URL configuration, host setup instructions, actual MCP initialize/tool discovery, and explicitly selected read-only tool retrieval into private source receipts. JSON and SSE responses, negotiated sessions and bounded discovery are implemented. The diagnostic client supports the 2024/2025 stateful MCP versions listed in its source; newer unsupported protocols or unannotated tools should use the provider-supported host connector.
- A deterministic HTML presentation renderer with evidence-bound KPI cards, tables and positive/negative bar charts; calculation lineage is retained. It validates references and finite numeric inputs, not financial arithmetic or narrative accuracy. Cowork must execute/reconcile calculations separately or use the existing engine when actually available.
- Provider catalogue exposed through the existing application's architecture endpoint. Provider results are **not automatically normalised into its four-company financial engine**. Live normalisation against entitled vendor schemas needs an authenticated acceptance case.

## Install the skill

Run `python3 scripts/package-cowork-skill.py`. Upload `outputs/rabo-banking-materials.zip` through Claude's Customize → Skills → Upload a skill and enable it. Code execution/file creation must be available. The archive contains a skill folder, following Anthropic's [upload instructions](https://support.claude.com/en/articles/12512180-use-skills-in-claude). Uploading and enabling it in the actual Cowork account remains a user action; this delivery has not been tested inside that account.

Try:

> Use the Rabo banking materials skill. Prepare a balanced Apple treasury discussion about issuing a five-year USD bond now versus waiting. Ask me about the funding objective and desired client takeaway. Use available public sources, distinguish historic issue terms from current spreads, run explicit calculations and produce digital client materials with inspectable evidence. Do not invent missing current issuer spreads.

Cowork's built-in PowerPoint capability can create an editable deck with the skill's design rules. The bundled renderer creates HTML, not PPTX. Fonts resolve from the execution environment; Myriad availability on the Mac does not imply availability inside Cowork. There is no claim of official-template pixel parity.

## Connect the providers

The portable client is also bundled in the skill's `scripts` directory. Repository examples:

```bash
python3 scripts/provider_mcp.py catalog
python3 scripts/provider_mcp.py setup capiq
python3 scripts/provider_mcp.py probe capiq
```

The last command intentionally probes without a token. Tested 23 October: the actual Kensho endpoint returned **401**, correctly reported as authentication/entitlement required, not a connected source.

For Capital IQ, prefer the S&P Global connector in Claude and the provisioned Kensho Okta browser login. Kensho documents the custom MCP endpoint as `https://kfinance.kensho.com/integrations/mcp`. Its [Claude guide](https://docs.kensho.com/llmreadyapi/mcp/third-party/claude) describes team-owner provisioning; validate availability in the actual Max account rather than assuming it. A provisioned access-token experiment can use `--token-env KENSHO_ACCESS_TOKEN`; put the value in a private runtime secret facility, never a prompt, argument or repository file. This client does not implement token refresh or OAuth: host-managed sign-in is the preferred route.

For Gain and DEDALE, obtain the URL/authentication instructions from the account manager or existing account connection settings. Then run `configure gain <vendor-provided-HTTPS-URL>` or `configure dedale <vendor-provided-HTTPS-URL>`. The placeholders are explanatory, not executable URLs. If the vendor documents a host outside its main domain, supply its exact verified hostname with `--vendor-host`; no alternate host is guessed. The configuration is credential-free and stored locally with private file permissions. `setup` prints the Cowork URL/instructions and a properly quoted Claude Code command; it does not change either host's settings.

Authentication in Claude Code does not automatically authenticate Cowork, the web app or this diagnostic client. The existing app's tightly scoped Codex/Claude drafting process is not silently given new external providers.

After authenticating a manual client, `probe` lists actual entitled tool schemas. `call <provider> <tool> --arguments <private-json-file> --output <new-private-receipt-file> --token-env <VARIABLE_NAME>` accepts only a live-discovered tool carrying `readOnlyHint:true`. A missing hint does not prove a tool writes; use the provider's supported host in that case. Receipts retain provider, endpoint, requested arguments, retrieval time, results and rights qualification. They do not establish units, comparability or licence rights automatically. Store them under ignored `outputs/` or `.local/`; never commit licensed responses.

## Pricing research

Checked 23 October 2026. No verified public numeric MCP tariff was found for any of these three providers. A data subscription, MCP access, underlying dataset rights and model usage are separate commercial questions.

| Provider | Verified public offer | Still requires a quote/confirmation |
|---|---|---|
| Gain | [Product page](https://www.gain.ai/product) advertises MCP, bulk data and a free platform trial. | Numeric price; whether trial includes MCP; account scope, quotas and external-demo rights. |
| DEDALE | [MCP announcement](https://www.dedale.com/articles/dedale-intelligence-is-now-accessible-via-mcp) describes read-only, account-entitled access with source links; invites direct enquiries. | Numeric price, minimum subscription, trial availability and whether MCP costs extra. |
| Capital IQ / Kensho | [Sales page](https://llmreadyapi.kensho.com/) invites trial/purchase enquiries. [Custom integration docs](https://docs.kensho.com/llmreadyapi/mcp/custom) direct access-level pricing to an S&P representative. | Numeric price, trial terms, dataset selection and whether an existing Capital IQ contract includes MCP/API use. |

Do not use Gain.io CRM, Gainium crypto or Remnant/Dedale-bi endpoints; they are different products. A Gain marketplace listing displaying an extremely large contact-sales/private-offer amount is not a validated single-user MCP quote and is excluded from the budget.

Ask each provider for a one-user external demonstration trial covering the intended AI host, datasets, queries, retention, derived calculations and client presentation exports. This is a suggested enquiry, not an email sent on the owner's behalf. There is insufficient verified evidence to state a dependable combined monthly price. No API-model charges are required merely to upload/use this skill with a subscription host, but subscription usage limits and data fees still apply.

## Verification and limits

`python3 scripts/verify_cowork_capability.py` tests synthetic provider JSON/SSE discovery/calls, session/version headers, paginated catalogues, auth and redirect handling, vendor URL checks, credential-free private configuration, evidence bindings, transitive/cyclic lineage, mixed units and negative/zero chart geometry. The actual Kensho unauthenticated probe returned 401. These are transport/rendering checks, not a successful vendor data or Cowork execution test.

Authenticated acceptance remains: provision each account, connect within Cowork, discover entitled tools, retrieve one company/research item, check units/dates/source links, execute/reconcile a calculation and revise the resulting materials. No confidential data or production bank deployment is included.
