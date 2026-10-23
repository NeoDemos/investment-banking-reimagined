#!/usr/bin/env python3
"""Package the portable skill without local data, credentials or proprietary fonts."""
from pathlib import Path
import zipfile

ROOT = Path(__file__).resolve().parents[1]
SKILL = ROOT / "skills/rabo-banking-materials"
assert (ROOT / "data/provider-mcp-catalog.json").read_bytes() == (SKILL / "assets/provider-mcp-catalog.json").read_bytes()
assert (ROOT / "data/brand-rabobank.json").read_bytes() == (SKILL / "assets/brand.json").read_bytes()
assert (ROOT / "docs/FINANCIAL_METHODS.md").read_bytes() == (SKILL / "references/financial-methods.md").read_bytes()
output = ROOT / "outputs/rabo-banking-materials.zip"
output.parent.mkdir(exist_ok=True)
with zipfile.ZipFile(output, "w", zipfile.ZIP_DEFLATED) as archive:
    for file in sorted(SKILL.rglob("*")):
        if file.is_file() and file.suffix in (".md", ".py", ".json", ".svg") and "__pycache__" not in file.parts:
            archive.write(file, str(Path(SKILL.name) / file.relative_to(SKILL)))
with zipfile.ZipFile(output) as archive:
    assert archive.testzip() is None
    assert f"{SKILL.name}/SKILL.md" in archive.namelist()
print(output)
