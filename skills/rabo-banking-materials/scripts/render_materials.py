#!/usr/bin/env python3
"""Render source-bound banking materials to a self-contained digital presentation."""
import base64
from datetime import date
from html import escape
import json
import math
from pathlib import Path
import sys
from urllib.parse import urlsplit

ASSETS = Path(__file__).resolve().parents[1] / "assets"


def esc(value):
    return escape(str(value), quote=True)


def validate(doc):
    evidence = doc["evidence"]
    if not isinstance(evidence, dict) or not 1 <= len(evidence) <= 300:
        raise ValueError("Supply 1–300 evidence entries")
    for key, item in evidence.items():
        if isinstance(item["value"], bool) or not isinstance(item["value"], (int, float)) or not math.isfinite(item["value"]):
            raise ValueError("Evidence values must be finite numbers")
        for field in ("label", "unit", "asOf", "source"):
            if not isinstance(item[field], str) or not item[field].strip():
                raise ValueError("Every value requires label, unit, date and source")
        date.fromisoformat(item["asOf"])
        source = item["source"]
        parsed = urlsplit(source)
        if source not in ("assumption", "calculation") and (parsed.scheme != "https" or not parsed.hostname or parsed.username or parsed.password):
            raise ValueError("Sources must be HTTPS references, assumption or calculation")
        if source == "calculation" and (not item.get("formula") or not item.get("inputs")):
            raise ValueError("Calculations require a formula and input evidence IDs")
        for ref in item.get("inputs", []):
            if ref not in evidence:
                raise ValueError("Unknown calculation input")
    def visit(key, active, done):
        if key in active:
            raise ValueError("Cyclic calculation lineage")
        if key in done:
            return
        active.add(key)
        for ref in evidence[key].get("inputs", []):
            visit(ref, active, done)
        active.remove(key)
        done.add(key)
    done = set()
    for key in evidence:
        visit(key, set(), done)
    if not isinstance(doc.get("title"), str) or not doc["title"].strip():
        raise ValueError("Supply a presentation title")
    if not 1 <= len(doc["pages"]) <= 20:
        raise ValueError("Use 1–20 pages")
    for page in doc["pages"]:
        if not page["title"].strip() or not 1 <= len(page["blocks"]) <= 4:
            raise ValueError("Each page requires a title and 1–4 blocks")
        for block in page["blocks"]:
            kind = block["type"]
            if kind not in ("text", "metrics", "table", "bars"):
                raise ValueError("Unknown block type")
            refs = block.get("sources", []) if kind == "text" else block.get("refs", [])
            if not isinstance(refs, list) or any(ref not in evidence for ref in refs):
                raise ValueError("Unknown evidence reference")
            if kind == "text":
                if not isinstance(block.get("text"), str):
                    raise ValueError("Text block requires text")
            elif not refs or len(refs) > {"metrics": 4, "table": 12, "bars": 12}[kind]:
                raise ValueError("Too many or missing evidence references")
            if kind == "bars" and len({evidence[r]["unit"] for r in refs}) != 1:
                raise ValueError("Chart values must have the same unit")


def value(item):
    n = item["value"]
    return f"{n:,.2f}".rstrip("0").rstrip(".") if abs(n) < 1000 else f"{n:,.0f}"


def render(doc):
    validate(doc)
    evidence = doc["evidence"]
    logo = "data:image/svg+xml;base64," + base64.b64encode((ASSETS / "rabobank-wordmark.svg").read_bytes()).decode()
    pages = []
    for index, page in enumerate(doc["pages"]):
        blocks, used = [], set()
        def retain(ref):
            if ref not in used:
                used.add(ref)
                for parent in evidence[ref].get("inputs", []):
                    retain(parent)
        for block in page["blocks"]:
            kind = block["type"]
            refs = block.get("sources", []) if kind == "text" else block["refs"]
            for ref in refs:
                retain(ref)
            items = [evidence[r] for r in refs]
            if kind == "text":
                blocks.append(f'<p class="narrative">{esc(block["text"])}</p>')
            elif kind == "metrics":
                blocks.append('<div class="metrics">' + ''.join(f'<div><small>{esc(x["label"])}</small><strong>{value(x)} <em>{esc(x["unit"])}</em></strong><small>{esc(x["classification"] if x.get("classification") else x["source"] if x["source"] in ("assumption", "calculation") else "Sourced")} · {esc(x["asOf"])}</small></div>' for x in items) + '</div>')
            elif kind == "table":
                rows = ''.join(f'<tr><th>{esc(x["label"])}</th><td>{value(x)} {esc(x["unit"])}</td><td>{esc(x["asOf"])}</td><td>{esc(x.get("classification", x["source"] if x["source"] in ("assumption", "calculation") else "Sourced"))}</td></tr>' for x in items)
                blocks.append('<table><thead><tr><th>Measure</th><th>Value</th><th>As of</th><th>Basis</th></tr></thead><tbody>' + rows + '</tbody></table>')
            else:
                lo = min(0, *(x["value"] for x in items))
                hi = max(0, *(x["value"] for x in items))
                span = hi - lo or 1
                zero = 300 + (0 - lo) / span * 440
                marks = []
                for i, x in enumerate(items):
                    end = 300 + (x["value"] - lo) / span * 440
                    y = 18 + i * 45
                    marks.append(f'<text x="0" y="{y+19}">{esc(x["label"])}</text><rect x="{min(zero,end):.2f}" y="{y}" width="{max(abs(end-zero),1):.2f}" height="26" fill="{("#000099" if i%2 == 0 else "#ff6700")}"/><text x="760" y="{y+19}">{value(x)} {esc(x["unit"])}</text>')
                blocks.append(f'<svg class="bars" role="img" aria-label="Comparison in {esc(items[0]["unit"])}" viewBox="0 0 900 {len(items)*45+20}"><line x1="{zero}" x2="{zero}" y1="8" y2="{len(items)*45+10}" stroke="#cad0dc"/>{"".join(marks)}</svg>')
        citations = []
        for ref in sorted(used):
            item = evidence[ref]
            source = item["source"]
            label = f'{item["label"]} · {item["asOf"]}'
            link = f'<a href="{esc(source)}" target="_blank" rel="noopener noreferrer">{esc(label)}</a>' if source.startswith("https:") else f'{esc(label)} · {esc(source)}'
            citations.append(f'<li>{link}{" · " + esc(item["formula"]) if item.get("formula") else ""}</li>')
        pages.append(f'<section class="page" id="page-{index+1}"><header><span>{esc(page.get("kicker", "CLIENT DISCUSSION"))}</span><img src="{logo}" alt="Rabobank public-reference wordmark"/></header><h1>{esc(page["title"])}</h1><p class="message">{esc(page.get("message", ""))}</p><main>{"".join(blocks)}</main><details><summary>Evidence and calculation lineage · {len(used)} records</summary><ul>{"".join(citations)}</ul></details><footer><span>{esc(doc.get("audience", "Client discussion"))} · {index+1} / {len(doc["pages"])}</span><span>Independent external prototype · subject to banker review</span></footer></section>')
    css = """*{box-sizing:border-box}body{margin:0;background:#edf0f6;color:#414244;font:18px/1.4 'Myriad for Rabobank',MyriadforRabobank,'Myriad Pro',Myriad,'Source Sans 3',Arial,sans-serif}.page{width:min(100% - 48px,1120px);min-height:840px;margin:28px auto;padding:44px 58px 30px;background:white;display:flex;flex-direction:column;scroll-margin-top:20px}header{display:flex;align-items:center;justify-content:space-between}header span{font:11px Arial;letter-spacing:1.7px;color:#737578}header img{width:145px;height:auto}h1{color:#000099;font-size:40px;line-height:1.12;font-weight:300;max-width:880px;margin:46px 0 14px}.message{color:#737578;font-size:20px;margin:0 0 32px;border-left:3px solid #ff6700;padding-left:15px}main{flex:1}main>*{margin:0 0 26px}.narrative{max-width:900px}.metrics{display:flex;gap:32px}.metrics>div{flex:1;border-top:1px solid #dae0eb;padding-top:18px}.metrics strong{display:block;color:#000099;font-size:42px;font-weight:300;line-height:1.3}.metrics em{font-size:22px;font-style:normal}small{font-size:13px;color:#737578}table{border-collapse:collapse;width:100%;font-size:15px}td,th{padding:11px 8px;border-bottom:1px solid #e4e7ed;text-align:left}thead{color:#000099}tbody th{font-weight:400}.bars{width:100%;max-height:340px;font:16px Arial}details{font-size:11px;margin:12px 0;color:#737578}details ul{padding-left:18px}a{color:#000099}footer{border-top:1px solid #dfe3ec;padding-top:16px;display:flex;justify-content:space-between;gap:20px;font-size:10px;color:#737578}nav{position:fixed;right:12px;bottom:12px;display:flex;gap:8px}button{background:#000099;color:white;border:0;border-radius:6px;padding:10px 16px;cursor:pointer}@media(max-width:750px){.page{width:100%;margin:0 0 16px;padding:28px;min-height:100vh}h1{font-size:30px}.metrics{flex-wrap:wrap}.metrics>div{min-width:40%}.metrics strong{font-size:30px}footer{flex-wrap:wrap}}@media print{body{background:white}.page{width:100%;margin:0;min-height:0;break-after:page;padding:24px}nav{display:none}details{display:block}h1{margin-top:28px}}"""
    script = """let page=0;const pages=[...document.querySelectorAll('.page')];function move(d){page=Math.max(0,Math.min(pages.length-1,page+d));pages[page].scrollIntoView({behavior:'smooth'});}document.addEventListener('keydown',e=>{if(e.key==='ArrowRight')move(1);if(e.key==='ArrowLeft')move(-1);});const observer=new IntersectionObserver(entries=>{for(const e of entries)if(e.isIntersecting)page=pages.indexOf(e.target);},{threshold:.6});pages.forEach(p=>observer.observe(p));"""
    return f'<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{esc(doc["title"])}</title><style>{css}</style></head><body>{"".join(pages)}<nav aria-label="Presentation navigation"><button onclick="move(-1)" aria-label="Previous page">←</button><button onclick="move(1)" aria-label="Next page">→</button><button onclick="window.print()">Print</button></nav><script>{script}</script></body></html>'


if __name__ == "__main__":
    try:
        doc = json.loads(Path(sys.argv[1]).read_text())
        output = Path(sys.argv[2])
        if output.exists():
            raise ValueError("Preserve the prior draft: choose a new output filename")
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_text(render(doc))
        print(f"Rendered {len(doc['pages'])} pages; inspect every page before delivery.")
    except (ValueError, KeyError, TypeError, IndexError, OSError) as exc:
        print(f"Cannot render materials: {exc}", file=sys.stderr)
        sys.exit(1)
