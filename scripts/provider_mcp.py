#!/usr/bin/env python3
"""Repository entry point for the portable provider connection tool."""
from pathlib import Path
import runpy

if __name__ == "__main__":
    runpy.run_path(str(Path(__file__).resolve().parents[1] / "skills/rabo-banking-materials/scripts/provider_mcp.py"), run_name="__main__")
