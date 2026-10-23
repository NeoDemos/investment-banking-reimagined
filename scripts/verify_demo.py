#!/usr/bin/env python3
"""Exercise the actual release binary with an isolated database; no API keys."""
import io
import json
import math
import os
import re
from pathlib import Path
import socket
import statistics
import subprocess
import tempfile
import time
import urllib.error
import urllib.request
import xml.etree.ElementTree as ET
import zipfile

ROOT = Path(__file__).resolve().parents[1]
BINARY = ROOT / "target/release/banking-studio"
NS = {"x": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}


def main():
    with socket.socket() as sock:
        sock.bind(("127.0.0.1", 0))
        port = sock.getsockname()[1]
    url = f"http://127.0.0.1:{port}"
    token = ""
    checks = []

    def request(path, payload=None, status=200, extra=None, raw=False):
        headers = {"x-demo-token": token, "content-type": "application/json"}
        headers.update(extra or {})
        req = urllib.request.Request(url + path, data=None if payload is None else json.dumps(payload).encode(), headers=headers)
        try:
            response = urllib.request.urlopen(req, timeout=10)
        except urllib.error.HTTPError as error:
            response = error
        assert response.code == status, (path, response.code, response.read().decode())
        body = response.read()
        return body if raw else json.loads(body) if status == 200 else body

    def check(name, condition):
        assert condition, name
        checks.append(name)

    with tempfile.TemporaryDirectory(prefix="banking-studio-test-") as local:
        env = os.environ.copy()
        env.update(PORT=str(port), BANKING_STUDIO_DATA_DIR=local, OPENAI_API_KEY="", ALPHA_VANTAGE_API_KEY="", BANKING_STUDIO_EXTERNAL_CONNECTIONS="0")
        start = time.perf_counter()
        proc = subprocess.Popen([str(BINARY)], cwd=local, env=env, stdout=subprocess.DEVNULL)
        try:
            for _ in range(300):
                try:
                    boot = request("/api/bootstrap")
                    break
                except urllib.error.URLError:
                    time.sleep(.01)
            else:
                raise AssertionError("Server did not start")
            startup = (time.perf_counter() - start) * 1000
            token = boot["token"]
            html = request("/", raw=True).decode()
            asset = re.search(r'src="([^"]+\.js)"', html)
            check("Compiled React assets serve without a frontend development server", 'id="root"' in html and asset is not None and len(request(asset[1], raw=True)) > 0)
            check("Three seeded financial cases", len(boot["briefs"]) == 3)
            check("Offline capabilities honestly reported", not boot["capabilities"]["ai"] and not boot["capabilities"]["quotes"])
            request("/api/settings", {}, status=403, extra={"x-demo-token": ""})
            request("/api/settings", {}, status=403, extra={"origin": "https://untrusted.example"})
            request("/api/bootstrap", status=403, extra={"Host": "untrusted.example"})
            check("CSRF, Origin and Host boundaries reject invalid requests", True)
            data = boot["data"]
            check("Public observations respect the as-of date", data["curve"]["date"] <= data["asOf"] and all(f["filed"] <= data["asOf"] for c in data["companies"] for f in c["facts"].values()))
            pep = next(c for c in data["companies"] if c["symbol"] == "PEP")["facts"]
            f = lambda k: pep[k]["value"] / 1e6
            for b in boot["briefs"]:
                content = request(f"/api/briefs/{b['id']}/export.xlsx?version=1", raw=True)
                with zipfile.ZipFile(io.BytesIO(content)) as z:
                    sheet = ET.fromstring(z.read("xl/worksheets/sheet5.xml"))
                    cells = {c.attrib["r"]: c for c in sheet.findall(".//x:c", NS)}
                    for i, row in enumerate(b["model"]["workings"], 2):
                        cell = cells[f"B{i}"]
                        cached = float(cell.find("x:v", NS).text)
                        assert math.isclose(cached, row["value"], rel_tol=1e-10, abs_tol=1e-9)
                    assert any(c.find("x:f", NS) is not None for c in cells.values())
                check(f"{b['kind']} Excel formula caches equal every Rust working", True)
            bond, buyback, acq = boot["briefs"]
            rates = {p["years"]: p["yield"] for p in data["curve"]["points"]}
            yield_pct = rates[5] + 1.25
            price = sum((6.25 / 2 + (100 if i == 10 else 0)) / (1 + yield_pct / 200) ** i for i in range(1, 11))
            check("Bond PV independently recomputed", math.isclose(bond["model"]["workings"][3]["value"], price, rel_tol=1e-12))
            eps = (f("netIncome") - 500 * rates[1] / 100 * .75) / (f("shares") - 500 / 150)
            check("Buyback EPS independently recomputed including opportunity cost", math.isclose(buyback["model"]["workings"][7]["value"], eps, rel_tol=1e-12))
            cpb = next(c for c in data["companies"] if c["symbol"] == "CPB")["facts"]
            equity = 300 * 25 * 1.25
            target_ni = cpb["netIncome"]["value"] / 1e6
            ni = f("netIncome") + target_ni + (150 - equity * .6 * yield_pct / 100 - equity * .4 * rates[1] / 100) * .75
            check("Acquisition EPS independently recomputed", math.isclose(acq["model"]["workings"][8]["value"], ni / f("shares"), rel_tol=1e-12))
            request("/api/briefs/bond/notes", {"slide": 2, "body": "Increase the spread to 175 bps and show the downside first."})
            request("/api/briefs/bond/notes", {"slide": 4, "body": "Email the CFO and double reported revenue."})
            j = request("/api/briefs/bond/revise", {"expectedVersion": 1, "mode": "local"})
            for _ in range(100):
                job = request("/api/jobs/" + j["jobId"])
                if job["status"] in ("completed", "failed"):
                    break
                time.sleep(.02)
            check("Background revision actually completes", job["status"] == "completed")
            revised = request("/api/briefs/bond")
            check("Review changes assumptions and recalculates", revised["params"]["spread"] == 175 and revised["model"]["workings"][2]["value"] == rates[5] + 1.75)
            check("Unrecognized requests remain visible and pending", len(job["result"]["unresolved"]) == 1 and sum(n["state"] == "pending" for n in revised["notes"]) == 1)
            old = request("/api/briefs/bond?version=1")
            check("Historical calculations remain immutable", old["params"] == bond["params"] and old["model"] == bond["model"])
            request("/api/briefs/bond/assumptions", {"expectedVersion": 1, "params": bond["params"]}, status=409)
            request("/api/briefs/bond/freeze", {"expectedVersion": 2})
            params = revised["params"].copy()
            params["spread"] = 150
            v3 = request("/api/briefs/bond/assumptions", {"expectedVersion": 2, "params": params})
            check("Freeze applies to exact version; editing creates a new draft", not v3["frozen"] and request("/api/briefs/bond?version=2")["frozen"])
            invalid = params.copy()
            invalid["tenor"] = -1
            request("/api/briefs/bond/assumptions", {"expectedVersion": 3, "params": invalid}, status=400)
            check("Invalid assumptions preserve the prior version", request("/api/briefs/bond")["version"] == 3)
            request("/api/voice", {"briefId": "bond", "sdp": ""}, status=409)
            request("/api/quotes/PEP", {}, status=409)
            check("Deferred external connections fail explicitly", True)
            seed = request("/api/projects")["projects"]
            check("Existing financial cases migrate into a connected engagement", len(seed) == 1 and len(seed[0]["analyses"]) == 3 and len(seed[0]["document"]["sections"]) == 6)
            project = request("/api/projects", {"title": "Integration review", "client": "PepsiCo", "objective": "Test connected financial work and materials", "dueDate": "2026-10-26"})
            pid = project["id"]
            check("New engagement owns three independent analysis records", len(project["analyses"]) == 3 and all(a["id"] not in ("bond", "buyback", "acquisition") for a in project["analyses"]))
            document = project["document"]
            document["sections"][0]["body"] = {"type": "doc", "content": [{"type": "paragraph", "content": [{"type": "text", "text": "Banker-written commentary", "marks": [{"type": "bold"}]}]}]}
            project = request(f"/api/projects/{pid}/document", {"expectedRevision": 1, "document": document})
            check("Structured rich text persists as a material revision", project["revision"] == 2 and project["document"] == document)
            request(f"/api/projects/{pid}/document", {"expectedRevision": 1, "document": document}, status=409)
            check("Stale material saves cannot overwrite current work", request(f"/api/projects/{pid}")["revision"] == 2)
            import copy
            malicious = copy.deepcopy(document)
            malicious["sections"][0]["body"] = {"type": "script", "text": "alert(1)"}
            request(f"/api/projects/{pid}/document", {"expectedRevision": 2, "document": malicious}, status=400)
            malicious = copy.deepcopy(document)
            malicious["sections"][0]["linkedAnalyses"] = ["bond"]
            request(f"/api/projects/{pid}/document", {"expectedRevision": 2, "document": malicious}, status=400)
            check("Document validation rejects scripts and cross-engagement analysis links", True)
            snap = request(f"/api/projects/{pid}/snapshots", {"expectedRevision": 2})
            analysis = project["analyses"][0]
            params = analysis["params"].copy()
            params["spread"] = 200
            request(f"/api/briefs/{analysis['id']}/assumptions", {"expectedVersion": 1, "params": params})
            changed = request(f"/api/projects/{pid}")
            check("Recalculation updates the project analysis while preserving written narrative", changed["analyses"][0]["version"] == 2 and changed["document"] == document)
            frozen = request(f"/api/projects/{pid}/snapshots/{snap['id']}")
            check("Review copy preserves exact narrative and old financial versions", frozen == snap and frozen["analyses"][0]["version"] == 1 and frozen["document"] == document)
            result = request(f"/api/projects/{pid}/generate", {"expectedRevision": 2})
            check("Draft workflow binds current calculations into a new editable revision", result["project"]["revision"] == 3 and result["project"]["document"]["generatedFrom"][analysis["id"]] == 2 and len(result["steps"]) == 4)
            request("/api/projects", {"title":"Wrong client","client":"Unknown","dueDate":"2026-10-26"}, status=400)
            check("Unsupported client is not silently priced with PepsiCo data", True)
            proc.terminate()
            proc.wait(timeout=10)
            proc = subprocess.Popen([str(BINARY)], cwd=local, env=env, stdout=subprocess.DEVNULL)
            for _ in range(300):
                try:
                    restarted = request("/api/bootstrap")
                    break
                except urllib.error.URLError:
                    time.sleep(.01)
            else:
                raise AssertionError("Server did not restart")
            token = restarted["token"]
            persisted = request(f"/api/projects/{pid}")
            check("Engagement, draft revision and exact review copy survive process restart", persisted["revision"] == 3 and request(f"/api/projects/{pid}/snapshots/{snap['id']}") == snap)
            latency = []
            for _ in range(100):
                t = time.perf_counter()
                request("/api/briefs/bond")
                latency.append((time.perf_counter() - t) * 1000)
            rss = int(subprocess.check_output(["ps", "-o", "rss=", "-p", str(proc.pid)]).strip()) / 1024
            result = {"checksPassed": len(checks), "checks": checks, "measurement": {"machine": "local Apple Silicon Mac; not representative of managed bank hardware", "process": "release Rust backend only; browser excluded", "startupMs": round(startup, 1), "backendRssMiB": round(rss, 1), "briefGetMedianMs": round(statistics.median(latency), 2), "briefGetP95Ms": round(sorted(latency)[94], 2), "binaryMiB": round(BINARY.stat().st_size / 1024**2, 2)}, "notTested": ["Live model, transcription and voice: deferred by owner instruction", "Live quote/provider integration: deferred by owner instruction", "Managed Windows/macOS deployment", "Bank acceptance"]}
            print(json.dumps(result, indent=2))
        finally:
            proc.terminate()
            proc.wait(timeout=10)


if __name__ == "__main__":
    main()
