#!/usr/bin/env python3
"""Transport and data-binding tests; provider fixtures are synthetic, not entitlements."""
import copy
import importlib.util
import json
from pathlib import Path
import subprocess
import tempfile
import threading
import unittest
from unittest.mock import patch
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

ROOT = Path(__file__).resolve().parents[1]


def module(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    result = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(result)
    return result


mcp = module("provider_mcp", ROOT / "skills/rabo-banking-materials/scripts/provider_mcp.py")
renderer = module("renderer", ROOT / "skills/rabo-banking-materials/scripts/render_materials.py")


class FakeProvider(BaseHTTPRequestHandler):
    def log_message(self, *_):
        pass

    def do_POST(self):
        body = json.loads(self.rfile.read(int(self.headers["Content-Length"])))
        if self.path == "/unauthorized":
            self.send_response(401)
            self.end_headers()
            self.wfile.write(b'provider-secret-must-not-be-printed')
            return
        if self.path == "/redirect":
            self.send_response(307)
            self.send_header("Location", "/mcp")
            self.end_headers()
            return
        method = body["method"]
        if method == "notifications/initialized":
            self.send_response(202)
            self.end_headers()
            return
        if method == "initialize":
            assert not self.headers.get("Mcp-Session-Id")
            result = {"protocolVersion": "2025-03-26", "capabilities": {"tools": {}}, "serverInfo": {"name": "synthetic-provider", "version": "1"}}
        else:
            assert self.headers.get("Mcp-Session-Id") == "synthetic-session"
            assert self.headers.get("MCP-Protocol-Version") == "2025-03-26"
            if method == "tools/list":
                result = {"tools": [{"name": "read_fixture", "inputSchema": {"type": "object"}, "annotations": {"readOnlyHint": True}}], "nextCursor": "second"} if not body.get("params", {}).get("cursor") else {"tools": [{"name": "write_fixture", "inputSchema": {"type": "object"}}]}
            else:
                result = {"content": [{"type": "text", "text": "Synthetic financial observation"}], "isError": False}
        response = {"jsonrpc": "2.0", "id": body["id"], "result": result}
        self.send_response(200)
        self.send_header("Content-Type", "text/event-stream" if self.path == "/sse" else "application/json")
        self.send_header("Mcp-Session-Id", "synthetic-session")
        self.end_headers()
        if self.path == "/sse":
            self.wfile.write(b': keepalive\n\nevent: message\ndata: ' + json.dumps(response).encode() + b'\n\n')
        else:
            self.wfile.write(json.dumps(response).encode())


class CapabilityTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = ThreadingHTTPServer(("127.0.0.1", 0), FakeProvider)
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()
        cls.base = f"http://127.0.0.1:{cls.server.server_port}"

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()
        cls.thread.join()

    def test_json_and_sse_discovery_and_call(self):
        for path in ("/mcp", "/sse"):
            c = mcp.Client(self.base + path, "synthetic-token")
            c.initialize()
            self.assertEqual([t["name"] for t in c.tools()], ["read_fixture", "write_fixture"])
            self.assertFalse(c.request("tools/call", {"name": "read_fixture", "arguments": {}})["isError"])

    def test_auth_failure_and_redirect_do_not_expose_payload(self):
        for path in ("/unauthorized", "/redirect"):
            with self.assertRaises(mcp.SafeError) as error:
                mcp.Client(self.base + path, "synthetic-token").initialize()
            self.assertNotIn("provider-secret", str(error.exception))
            self.assertNotIn("synthetic-token", str(error.exception))

    def test_vendor_identity_and_credential_free_urls(self):
        p = mcp.PROVIDERS["gain"]
        for url in ("https://gain.io/mcp", "https://gain.ai.evil.test/mcp", "http://gain.ai/mcp", "https://user:secret@gain.ai/mcp", "https://gain.ai/mcp?token=secret"):
            with self.assertRaises(ValueError):
                mcp.endpoint(url, p)
        self.assertEqual(mcp.endpoint("https://mcp.gain.ai/mcp", p), "https://mcp.gain.ai/mcp")
        with self.assertRaises(ValueError):
            mcp.connection("gain", {})
        self.assertIn("kfinance.kensho.com", mcp.connection("capiq", {}))

    def test_configure_does_not_change_host_or_store_secret(self):
        with tempfile.TemporaryDirectory() as directory:
            target = Path(directory) / "config.json"
            cmd = ["python3", str(ROOT / "skills/rabo-banking-materials/scripts/provider_mcp.py"), "--config", str(target)]
            subprocess.run(cmd + ["configure", "gain", "https://mcp.gain.ai/mcp"], check=True, capture_output=True)
            result = json.loads(subprocess.run(cmd + ["setup", "gain"], check=True, capture_output=True, text=True).stdout)
            self.assertIn("claude mcp add", result["claudeCodeCommand"])
            self.assertEqual(target.stat().st_mode & 0o777, 0o600)
            self.assertNotIn("token", target.read_text())

    def test_tool_receipt_is_private_and_write_tools_are_blocked(self):
        with tempfile.TemporaryDirectory() as directory:
            directory = Path(directory)
            args = directory / "arguments.json"
            args.write_text('{"company":"synthetic"}')
            output = directory / "receipt.json"
            argv = ["provider_mcp", "--config", str(directory / "config.json"), "call", "capiq", "read_fixture", "--arguments", str(args), "--output", str(output)]
            with patch.object(mcp, "connection", return_value=self.base + "/mcp"), patch("sys.argv", argv):
                mcp.main()
            receipt = json.loads(output.read_text())
            self.assertEqual(receipt["arguments"], {"company": "synthetic"})
            self.assertEqual(receipt["tool"], "read_fixture")
            self.assertEqual(output.stat().st_mode & 0o777, 0o600)
            self.assertNotIn("Authorization", output.read_text())
            argv[5] = "write_fixture"
            with patch.object(mcp, "connection", return_value=self.base + "/mcp"), patch("sys.argv", argv):
                with self.assertRaises(mcp.SafeError):
                    mcp.main()

    def document(self):
        return {"title": "Synthetic rehearsal", "audience": "CFO", "evidence": {
            "a": {"label": "Benchmark", "value": 4, "unit": "%", "asOf": "2026-10-23", "source": "assumption", "classification": "Synthetic assumption"},
            "b": {"label": "Spread", "value": 1, "unit": "%", "asOf": "2026-10-23", "source": "assumption", "classification": "Synthetic assumption"},
            "c": {"label": "All-in yield", "value": 5, "unit": "%", "asOf": "2026-10-23", "source": "calculation", "classification": "Synthetic calculation", "inputs": ["a", "b"], "formula": "a+b"}}, "pages": [{"title": "Compare funding choices", "message": "Synthetic data only", "blocks": [{"type": "metrics", "refs": ["c"]}, {"type": "bars", "refs": ["a", "c"]}, {"type": "table", "refs": ["a", "b", "c"]}]}]}

    def test_render_binds_values_and_retains_transitive_lineage(self):
        doc = self.document()
        doc["pages"][0]["blocks"] = [{"type": "metrics", "refs": ["c"]}, {"type": "text", "text": "<script>evil()</script>"}]
        html = renderer.render(doc)
        self.assertIn("3 records", html)
        self.assertIn("Benchmark", html)
        self.assertIn("Spread", html)
        self.assertNotIn("<script>evil()", html)
        self.assertIn("data:image/svg+xml;base64", html)

    def test_invalid_model_lineage_and_units_rejected(self):
        for change in ("missing", "cycle", "mixed_units", "nan", "unsafe_source"):
            d = self.document()
            if change == "missing":
                d["evidence"]["c"]["inputs"] = ["unknown"]
            elif change == "cycle":
                d["evidence"]["c"]["inputs"] = ["c"]
            elif change == "mixed_units":
                d["evidence"]["a"]["unit"] = "USDm"
            elif change == "nan":
                d["evidence"]["a"]["value"] = float("nan")
            else:
                d["evidence"]["a"]["source"] = "javascript:alert(1)"
            with self.assertRaises(ValueError):
                renderer.render(d)

    def test_negative_zero_chart_geometry(self):
        d = self.document()
        d["evidence"]["a"]["value"] = -4
        d["evidence"]["b"]["value"] = 0
        d["pages"][0]["blocks"] = [{"type": "bars", "refs": ["a", "b", "c"]}]
        html = renderer.render(d)
        self.assertNotIn('width="-', html)
        self.assertNotIn("nan", html)


if __name__ == "__main__":
    unittest.main()
