#!/usr/bin/env python3
"""Build an explicit dated public snapshot. Development utility, not app runtime.

Requires SEC_USER_AGENT identifying your application and contact. Inspect a diff,
rebuild and use a fresh demo database after changing the embedded snapshot.
"""
import argparse
import datetime as dt
import json
import os
from pathlib import Path
import time
import urllib.request
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--as-of", default="2026-10-22")
parser.add_argument("--output", type=Path, default=ROOT / "data/public-snapshot.json")
args = parser.parse_args()
dt.date.fromisoformat(args.as_of)
agent = os.environ.get("SEC_USER_AGENT", "")
if not agent:
    raise SystemExit("Set SEC_USER_AGENT to identify your application and contact.")


def fetch(url):
    request = urllib.request.Request(url, headers={"User-Agent": agent, "Accept-Encoding": "identity"})
    with urllib.request.urlopen(request, timeout=45) as response:
        return response.read()


stamp = dt.datetime.now(dt.timezone.utc).isoformat()
out = {"asOf": args.as_of, "retrievedAt": stamp, "companies": []}
for symbol, cik, name in [("PEP", "0000077476", "PepsiCo"), ("CPB", "0000016732", "The Campbell’s Company"), ("GIS", "0000040704", "General Mills")]:
    url = f"https://data.sec.gov/api/xbrl/companyfacts/CIK{cik}.json"
    fs = json.loads(fetch(url))["facts"]["us-gaap"]
    records = [r for v in fs.values() for rs in v["units"].values() for r in rs if r.get("form") == "10-K" and r.get("fp") == "FY" and r.get("filed", "") <= args.as_of]
    latest = max(records, key=lambda r: (r["filed"], r["end"]))
    end = max(r["end"] for r in records if r["accn"] == latest["accn"])

    def get(keys, unit="USD", annual=True, required=True):
        for key in keys:
            candidates = [r for r in fs.get(key, {}).get("units", {}).get(unit, []) if r.get("end") == end and r.get("form") == "10-K" and r.get("filed", "") <= args.as_of and (not annual or r.get("start") and 300 < (dt.date.fromisoformat(end) - dt.date.fromisoformat(r["start"])).days < 390)]
            if candidates:
                r = max(candidates, key=lambda v: v["filed"])
                return {"value": r["val"], "unit": unit, "periodStart": r.get("start"), "periodEnd": end, "filed": r["filed"], "accession": r["accn"], "tag": key, "sourceUrl": f"https://www.sec.gov/Archives/edgar/data/{int(cik)}/{r['accn'].replace('-', '')}/", "apiUrl": url, "basis": "Reported US GAAP"}
        if required:
            raise ValueError(f"Missing or ambiguous required fact: {symbol}, {keys}, {end}")

    facts = {}
    for key, tags, unit, annual in [
        ("revenue", ["RevenueFromContractWithCustomerExcludingAssessedTax", "Revenues", "SalesRevenueNet"], "USD", True),
        ("netIncome", ["NetIncomeLossAvailableToCommonStockholdersBasic", "NetIncomeLoss"], "USD", True),
        ("operatingIncome", ["OperatingIncomeLoss"], "USD", True),
        ("da", ["DepreciationDepletionAndAmortization", "DepreciationDepletionAndAmortizationPropertyPlantAndEquipment"], "USD", True),
        ("cash", ["CashAndCashEquivalentsAtCarryingValue"], "USD", False),
        ("shares", ["WeightedAverageNumberOfDilutedSharesOutstanding"], "shares", True),
        ("reportedEPS", ["EarningsPerShareDiluted"], "USD/shares", True),
    ]:
        facts[key] = get(tags, unit, annual)
    debt = get(["DebtLongtermAndShorttermCombinedAmount"], annual=False, required=False)
    if debt is None:
        current = get(["DebtCurrent"], annual=False, required=False)
        noncurrent = get(["LongTermDebtNoncurrent"], annual=False, required=False)
        if current is None or noncurrent is None:
            raise ValueError(f"Review debt definition manually for {symbol}; no safe combination found")
        debt = {**current, "value": current["value"] + noncurrent["value"], "tag": current["tag"] + " + " + noncurrent["tag"], "inputs": [current, noncurrent], "basis": "Sum of reported current debt and noncurrent debt"}
    facts["debt"] = debt
    out["companies"].append({"symbol": symbol, "cik": cik, "name": name, "fiscalYear": latest["fy"], "periodEnd": end, "facts": facts})
    time.sleep(.2)

url = "https://home.treasury.gov/resource-center/data-chart-center/interest-rates/pages/xml?data=daily_treasury_yield_curve&field_tdr_date_value=" + args.as_of[:4]
rows = []
for node in ET.fromstring(fetch(url)).iter():
    if node.tag.endswith("properties"):
        row = {v.tag.split("}")[-1]: v.text for v in node}
        date = (row.get("NEW_DATE") or "")[:10]
        if date and date <= args.as_of:
            rows.append((date, row))
date, row = max(rows, key=lambda r: r[0])
points = [{"years": n, "yield": float(row[k])} for n, k in [(1, "BC_1YEAR"), (2, "BC_2YEAR"), (3, "BC_3YEAR"), (5, "BC_5YEAR"), (7, "BC_7YEAR"), (10, "BC_10YEAR"), (20, "BC_20YEAR"), (30, "BC_30YEAR")]]
out["curve"] = {"date": date, "currency": "USD", "type": "Treasury par yield curve", "source": "U.S. Treasury", "sourceUrl": url, "points": points, "retrievedAt": stamp}
args.output.write_text(json.dumps(out, indent=2, ensure_ascii=False) + "\n")
print(f"Wrote {args.output}. Review XBRL mappings and rebuild before demonstrating.")
