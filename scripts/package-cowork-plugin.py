#!/usr/bin/env python3
"""Build a filtered Cowork plugin and a public-only test workspace."""
import json
from pathlib import Path
import shutil
import tempfile
import zipfile

ROOT = Path(__file__).resolve().parents[1]
PLUGIN = ROOT / "cowork/plugin"
SKILLS = ["rabo-banking-materials", "ibd-storyline-copywriting", "public-financial-research", "ibd-financial-modeling", "rabo-slide-production"]
package_files = [PLUGIN / ".claude-plugin/plugin.json", PLUGIN / "README.md"]
for name in SKILLS:
    source, target = ROOT / "skills" / name, PLUGIN / "skills" / name
    target.mkdir(parents=True, exist_ok=True)
    for file in source.rglob("*"):
        if file.is_file() and not file.is_symlink() and file.suffix in (".md", ".json", ".py", ".svg") and "__pycache__" not in file.parts:
            out = target / file.relative_to(source)
            out.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(file, out)
            package_files.append(out)

outputs = ROOT / "outputs"
outputs.mkdir(exist_ok=True)
with tempfile.TemporaryDirectory(prefix="banking-cowork-package-") as temp:
    package = Path(temp) / "banking-studio-cowork.plugin"
    with zipfile.ZipFile(package, "w", zipfile.ZIP_DEFLATED) as archive:
        for file in sorted(package_files):
            archive.write(file, str(file.relative_to(PLUGIN)))
    with zipfile.ZipFile(package) as archive:
        assert archive.testzip() is None
        names = archive.namelist()
        assert len([n for n in names if n.endswith("SKILL.md")]) == 5
        assert not any(n.endswith((".woff2", ".ttf", ".env", ".sqlite")) for n in names)
    shutil.copy2(package, outputs / package.name)
    shutil.copy2(package, outputs / "banking-studio-cowork.zip")

workspace = outputs / "cowork-workspace"
workspace.mkdir(exist_ok=True)
for name in ("START_HERE.md", "briefs/apple-bond-pitch.md"):
    target = workspace / name
    target.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(ROOT / "cowork" / name, target)
public = workspace / "public-sources"
public.mkdir(exist_ok=True)
for name in ("public-snapshot.json", "issuer-credit-reference.json", "sector-reference.json"):
    shutil.copy2(ROOT / "data" / name, public / name)
(workspace / "OUTPUTS_GO_HERE.md").write_text("Save presentation, model, evidence and review versions in a new task subfolder here. Inputs are public and explicitly dated. No confidential data belongs in this demonstration.\n")
print(json.dumps({"plugin": str(outputs / "banking-studio-cowork.plugin"), "zip": str(outputs / "banking-studio-cowork.zip"), "workspace": str(workspace), "skills": SKILLS}, indent=2))
