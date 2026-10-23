# Test Banking Studio in Claude Cowork

The project plugin combines IBD research, modeling, copywriting and Rabobank-style slides. Its editable source lives in this repository's `skills/` directory; run `python3 scripts/package-cowork-plugin.py` after changes to rebuild the installable package.

Open Claude → Customize → Plugins and select **banking-studio-cowork**. Its five skills should be available. Start a fresh Cowork task with a dedicated task folder; avoid selecting unrelated repositories or confidential files. The setup script also prepares a clean public-only folder at `outputs/cowork-workspace` containing the test brief, public source archive and working instructions.

Copy the prompt in `briefs/apple-bond-pitch.md`. Ask for an editable PowerPoint, source-linked calculations and an inspection appendix. Use the host's PowerPoint authoring capability; this plugin's standalone renderer produces HTML and is not a PPTX exporter. The local application is optional for this test.

Public-source network access may be restricted and SEC may return 403. The source skill retains failures and supports a clearly dated public archive. Current issuer secondary spreads, executable pricing and current rating affirmation are not supplied by the archive. Do not infer them.

The public-reference design retains the vector wordmark and palette. Myriad availability depends on the execution environment. No proprietary font files are included and no official-template pixel parity is claimed.
