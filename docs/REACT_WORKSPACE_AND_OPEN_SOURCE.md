# React workspace correction and open-source foundations

23 October 2026. The owner's correction is that the deliverable is a working **application for preparing client materials**, integrating financial work and communication. The first implementation overemphasized a slide viewer. That interface is replaced by a React/TypeScript engagement workspace, retaining the Rust financial core.

## Reference products → implemented interactions

Public pages and product images were inspected; no authenticated vendor account, proprietary source or private design file was available. “Comparable” here means independently recreating useful visible workflow patterns, not claiming parity with the products.

| Reference | Public evidence | Application interpretation |
|---|---|---|
| Finster | Company/research workspace, tasks, interactive analysis and PowerPoint automation. The public product page's analysis image/video posters were inspected. [Product](https://www.finster.ai/product) | A source library, inspectable financial outputs, source-linked blocks and a client-material workspace. Source inspection and analysis stay accessible while producing materials. |
| Model ML | Workflows that create financial work products, structured grids, firm formatting and connected data. [Workflows](https://modelml.com/product/workflows), [Grids](https://modelml.com/product/grids) | Workflow starters → engagement brief → independent financial scenarios → editable client narrative → review/revision. |
| Rabobank public presentation references | Myriad for Rabobank and light-weight heading hierarchy in the earlier public PDF inspection. [Public presentations](https://www.rabobank.com/about-us/investor-relations/presentations) | Navy/blue/orange, lighter headings and restrained financial communication. The app uses locally installed Myriad/Light when available. Exact customized font/official-template approval is not established. |

The user's Mac contains installed Myriad, Myriad Light and SemiBold families. Browser loading of local Myriad was verified. CSS references these through `local(...)`; proprietary font files are neither copied into the repository nor shipped in the binary. Source Sans 3 is the explicit open-source fallback. The text brand treatment is not an extracted official logotype.

## Reused now

| Foundation | Purpose in the actual code | Licence evidence |
|---|---|---|
| React + TypeScript | Typed application components and state. Rust continues to own calculations, SQLite and provider access. | React MIT; installed licence retained. [React setup guidance](https://react.dev/learn/build-a-react-app-from-scratch). |
| Tiptap / ProseMirror | Real rich-text narrative editing, formatting and structured JSON persistence. Headless editor with an independently built toolbar. | MIT editor/core; paid cloud features are not used. [Project](https://github.com/ueberdosis/tiptap), [React installation](https://tiptap.dev/docs/editor/getting-started/install/react). |
| TanStack Table v8 | Sortable financial calculation grid. An explicit stable API version is pinned rather than taking v9's changed API. | MIT. [Repository licence](https://github.com/TanStack/table/blob/main/LICENSE), [v8 React guide](https://tanstack.com/table/v8/docs/framework/react/react-table). |
| Lucide | Consistent interface icons. | ISC with included upstream notices. [Licence](https://lucide.dev/license). |
| Source Sans 3 | Locally bundled fallback for machines without Myriad. | SIL OFL 1.1. [Adobe project](https://github.com/adobe-fonts/source-sans). |
| Vite | Static production build and development server; not a production runtime service. | MIT; pinned in the build lockfile. [Guide](https://vite.dev/guide/). |

The build preserves licence texts for all installed production dependency packages in `/third-party-notices.txt`, linked from Settings. Dependency licences enable reuse; they do not establish bank acceptance or rights to proprietary provider content. Version pins are in `package-lock.json`; an `npm install` audit on 23 October reported no known vulnerabilities, which is not an independent security review.

## Larger open-source starting points inspected

[Presenton](https://github.com/presenton/presenton) is an Apache-2.0 presentation-generation/editor project advertising template support, editable PPTX and an API. It is a useful **candidate for a later PowerPoint export/editor spike**. Its public README also describes Docker and Electron delivery; adopting its whole application would add a second application/runtime and return the product toward a presentation generator. No Presenton code is included here, and no claim is made that its exports meet banking templates or confidentiality controls. Evaluate its exact export components, dependencies and NOTICE obligations before reuse.

[OpenBB's public repository](https://github.com/OpenBB-finance/OpenBB), which redirected during inspection, is a broader financial-data platform candidate. It was not adopted: the immediate gap was the integrated interaction model, not another data runtime. Any later provider-adapter reuse needs inspection of the current repository, applicable component licences, coverage and underlying data rights; open-source software does not make all delivered financial data free to redistribute.

## Architectural decision

Use a static React/TypeScript client and embed its production assets in the Rust binary. No Node process, bundled Chromium or Python service is required to run the compiled demo. Tiptap and the review room are separate chunks, loaded when opened. The initial workspace does not load the editor. Browser memory is additional to backend RSS; managed-laptop performance remains unmeasured.

The SQLite extension adds engagements, membership links to analyses, material revisions and review snapshots. New engagements get independent analysis IDs. Material edits use optimistic revision checks; analysis updates preserve the narrative. Saved review copies hold both rich-text content and analysis models/versions. The server validates node/mark/attribute allowlists and rejects cross-engagement analysis bindings.

Revisit identity/authorization, provider entitlements, source-vintage migrations, multi-user collaboration, revision restore UI, native packaging and real PowerPoint export before a bank pilot. Live API voice/text/transcription remains a separately tracked rehearsal gate. A locally checked narrative or saved review copy is not bank/client approval.
