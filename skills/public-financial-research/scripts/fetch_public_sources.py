#!/usr/bin/env python3
"""Fetch fixed public finance sources into private dated receipts; no parsing claims."""
import argparse
from datetime import datetime, timezone
import json
import os
from pathlib import Path
import sys
import urllib.error
import urllib.request

CIKS = {"AAPL": "0000320193", "PEP": "0000077476", "GIS": "0000040704", "CPB": "0000016732"}


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("source", choices=["treasury-history", "sec-company-facts"])
    p.add_argument("output", type=Path)
    p.add_argument("--symbol", choices=CIKS, default="AAPL")
    a = p.parse_args()
    if a.output.exists():
        raise ValueError("Choose a new receipt filename to preserve source versions")
    url = "https://fred.stlouisfed.org/graph/fredgraph.csv?id=DGS3,DGS5,DGS10" if a.source == "treasury-history" else f"https://data.sec.gov/api/xbrl/companyfacts/CIK{CIKS[a.symbol]}.json"
    receipt = {"source": a.source, "symbol": a.symbol if a.source == "sec-company-facts" else None, "url": url, "retrievedAt": datetime.now(timezone.utc).isoformat(), "state": "failed"}
    headers = {"User-Agent": os.environ.get("SEC_USER_AGENT", "BankingStudioPublicDemo/0.1"), "Accept": "text/csv,application/json"}
    try:
        with urllib.request.urlopen(urllib.request.Request(url, headers=headers), timeout=25) as response:
            raw = response.read(8_000_001)
            if len(raw) > 8_000_000:
                raise ValueError("Response exceeds the public-demo size limit")
            text = raw.decode("utf-8-sig")
            if a.source == "treasury-history":
                if not all(s in text.splitlines()[0].split(",") for s in ("DGS3", "DGS5", "DGS10")):
                    raise ValueError("Unexpected Treasury CSV schema")
            elif str(json.loads(text).get("cik")) != str(int(CIKS[a.symbol])):
                raise ValueError("Returned issuer does not match the requested CIK")
            receipt.update(state="retrieved", httpStatus=response.status, rawText=text, note="Raw source receipt; extraction, normalization and financial verification remain required")
    except urllib.error.HTTPError as exc:
        receipt.update(httpStatus=exc.code, error="Public source refused or failed the request; no data inferred")
    except (urllib.error.URLError, TimeoutError):
        receipt["error"] = "Public source connection failed or timed out; no data inferred"
    a.output.parent.mkdir(parents=True, exist_ok=True)
    fd = os.open(a.output, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    with os.fdopen(fd, "w") as f:
        json.dump(receipt, f, indent=2)
    print(json.dumps({"source": a.source, "state": receipt["state"], "httpStatus": receipt.get("httpStatus"), "note": "Receipt saved; inspect source dates and units before use"}))
    return 0 if receipt["state"] == "retrieved" else 1


if __name__ == "__main__":
    try:
        sys.exit(main())
    except (ValueError, OSError, IndexError):
        print("Public retrieval could not be completed; inspect inputs and preserve earlier receipts", file=sys.stderr)
        sys.exit(1)
