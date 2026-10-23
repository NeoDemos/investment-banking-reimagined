# Local Cowork installation — 23 October 2026

Installed `banking-studio-cowork` version 0.1.0 through the actual Claude Desktop UI: Customize → Plugins → Upload plugin. Claude displayed “Banking studio cowork is installed. Start a new session to use it.” The enabled switch was on, and all five skill entries were visible. The `/rabo` picker in the project's composer independently showed the Rabo skills.

Created a private, pinned **Investment Banking Reimagined** project with persistent banking-workflow instructions and the **First rehearsal — Apple bond pitch from public sources** context document:

https://claude.ai/cowork/project/01a16a79-c290-7484-b2f0-d6b116c1662c

Attached the clean `outputs/cowork-workspace` folder to the prepared composer with task-level Allow. This folder contains only the demonstration brief, working instructions and dated public source archives. The whole repository and unrelated projects were not selected. The Rabo skill and a ready-to-send rehearsal prompt are left in the project composer. Folder access may need to be selected again in a new task; project instructions and the saved context document persist separately.

The installed plugin contains:

| Skill | Purpose |
|---|---|
| rabo-banking-materials | Assignment workflow, Rabobank public-reference assets, digital renderer and optional provider setup |
| ibd-storyline-copywriting | Client decision narratives, executive summaries, page headlines and revisions |
| public-financial-research | Public filings/government series, source reconciliation and dated public archive |
| ibd-financial-modeling | Transparent calculation methods, explicit assumptions, sensitivity and inspection requirements |
| rabo-slide-production | Editable PowerPoint workflow through available host authoring tools and per-slide QA |

These are independently authored project skills. No proprietary Anthropic skill source was redistributed. Claude's available PowerPoint authoring capability is separate from the plugin's standalone HTML renderer. No successful PowerPoint generation inside Cowork is claimed from installation alone.

The actual UI reports the weekly usage limit is exhausted, resetting **24 October at 06:00 Europe/Amsterdam**. No usage credits were purchased and no extra paid model route was enabled. The project uses the visible **Opus 5.5 Medium** selection. A live deck-generation run must wait for allowance or a user-selected funded route.

Verification: native Claude plugin validation passed; all five skills passed the skill validator; the upload archive was accepted and enabled in Claude; eight existing transport/rendering tests passed. The public Treasury helper retrieved its actual FRED endpoint with HTTP 200 and saved a dated raw receipt privately. Successful raw retrieval is not financial extraction/model verification. Paid-provider accounts remain unconfigured.

Rebuild with `python3 scripts/package-cowork-plugin.py`. Editable sources live in `skills/`; plugin metadata/instructions and the repeatable test brief live in `cowork/`. Generated skill copies under `cowork/plugin/skills/` and packages/workspace under `outputs/` are ignored. Re-upload the rebuilt package when changing the installed version; rebuilding does not silently update the user's installed copy.
