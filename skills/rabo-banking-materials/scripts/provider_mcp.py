#!/usr/bin/env python3
"""Configure vendor MCPs, export host setup, and test Streamable HTTP discovery.

No secrets are saved. OAuth is owned by Claude/Cowork. For a provisioned manual
access-token test, a token is read only from the named environment variable.
"""
import argparse
import json
import os
from pathlib import Path
import re
import shlex
import sys
import urllib.error
import urllib.parse
import urllib.request

ASSETS = Path(__file__).resolve().parents[1] / "assets"
CATALOG = json.loads((ASSETS / "provider-mcp-catalog.json").read_text())
PROVIDERS = {p["id"]: p for p in CATALOG["providers"]}
CONFIG = Path.cwd() / ".local/provider-connections.json"
MAX_BYTES = 2_000_000


class SafeError(ValueError):
    """A locally authored message without provider payloads or credentials."""
    pass


def endpoint(url, provider, extra_host=None):
    u = urllib.parse.urlsplit(url)
    host = (u.hostname or "").lower()
    if u.scheme != "https" or u.username or u.password or u.query or u.fragment or u.port not in (None, 443):
        raise SafeError("Use a credential-free HTTPS MCP URL, without query or fragment")
    if not any(host == d or host.endswith("." + d) for d in provider["domains"]) and host != extra_host:
        raise SafeError("Unexpected vendor domain. Verify the URL with the vendor; use --vendor-host for a documented alternative host")
    return url


def load(path):
    return json.loads(path.read_text()) if path.exists() else {}


def connection(provider_id, config):
    p = PROVIDERS[provider_id]
    saved = config.get(provider_id, {})
    url = saved.get("url") or p["endpoint"]
    if not url:
        raise SafeError(f"{p['name']}: vendor-supplied MCP URL is still required")
    return endpoint(url, p, saved.get("vendorHost"))


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *args, **kwargs):
        return None  # Do not forward an access token to a redirect destination.


class Client:
    def __init__(self, url, token=None, opener=None):
        self.url, self.token = url, token
        self.session, self.version, self.seq = None, None, 0
        self.opener = opener or urllib.request.build_opener(NoRedirect())

    def request(self, method, params=None, notification=False):
        self.seq += 1
        payload = {"jsonrpc": "2.0", "method": method}
        if not notification:
            payload["id"] = self.seq
        if params is not None:
            payload["params"] = params
        headers = {"Content-Type": "application/json", "Accept": "application/json, text/event-stream"}
        if self.token:
            headers["Authorization"] = "Bearer " + self.token
        if self.session:
            headers["Mcp-Session-Id"] = self.session
        if self.version:
            headers["MCP-Protocol-Version"] = self.version
        req = urllib.request.Request(self.url, json.dumps(payload).encode(), headers, method="POST")
        try:
            response = self.opener.open(req, timeout=25)
        except urllib.error.HTTPError as exc:
            if exc.code in (401, 403):
                raise SafeError(f"HTTP {exc.code}: authentication or entitlement required; this is not a connected data source") from None
            raise SafeError(f"MCP endpoint returned HTTP {exc.code}; response body withheld") from None
        except (urllib.error.URLError, TimeoutError):
            raise SafeError("MCP connection failed or timed out") from None
        with response:
            if response.headers.get("Mcp-Session-Id"):
                self.session = response.headers["Mcp-Session-Id"]
            if notification and response.status in (200, 202, 204):
                return None
            content_type = response.headers.get("Content-Type", "").split(";")[0]
            if content_type == "text/event-stream":
                # Stop at our response event; a server may keep the stream open.
                lines, size, found = [], 0, None
                while True:
                    raw = response.readline(MAX_BYTES + 1)
                    size += len(raw)
                    if size > MAX_BYTES:
                        raise SafeError("MCP response exceeds the local context limit")
                    if raw in (b"\n", b"\r\n", b""):
                        if lines:
                            msg = json.loads("\n".join(lines))
                            if not isinstance(msg, dict):
                                raise SafeError("Invalid MCP event")
                            if msg.get("id") == self.seq:
                                found = msg
                                break
                        lines = []
                        if not raw:
                            break
                    elif raw.startswith(b"data:"):
                        lines.append(raw[5:].decode().strip())
                if found is None:
                    raise SafeError("No matching MCP response in event stream")
                result = found
            elif content_type == "application/json":
                raw = response.read(MAX_BYTES + 1)
                if len(raw) > MAX_BYTES:
                    raise SafeError("MCP response exceeds the local context limit")
                result = json.loads(raw)
            else:
                raise SafeError("Endpoint did not return MCP JSON or an event stream")
        if not isinstance(result, dict) or result.get("jsonrpc") != "2.0" or result.get("id") != self.seq:
            raise SafeError("Invalid or mismatched MCP response")
        if "error" in result:
            raise SafeError("MCP server returned a protocol error; provider payload withheld")
        if "result" not in result:
            raise SafeError("MCP response has no result")
        return result["result"]

    def initialize(self):
        result = self.request("initialize", {"protocolVersion": "2025-03-26", "capabilities": {}, "clientInfo": {"name": "banking-studio-provider-client", "version": "0.1.0"}})
        if not isinstance(result, dict):
            raise SafeError("Invalid MCP initialization result")
        self.version = result.get("protocolVersion")
        if self.version not in ("2024-11-05", "2025-03-26", "2025-06-18", "2025-11-25"):
            raise SafeError("Provider negotiated an unsupported protocol version; use the vendor's supported host connector")
        self.request("notifications/initialized", notification=True)
        return result

    def tools(self):
        tools, cursor, seen = [], None, set()
        for _ in range(10):
            page = self.request("tools/list", {"cursor": cursor} if cursor else {})
            if not isinstance(page, dict) or not isinstance(page.get("tools"), list):
                raise SafeError("Invalid MCP tools catalogue")
            if any(not isinstance(t, dict) or not isinstance(t.get("name"), str) or not isinstance(t.get("inputSchema"), dict) for t in page["tools"]):
                raise SafeError("Invalid MCP tool schema")
            tools.extend(page.get("tools", []))
            if len(tools) > 1000:
                raise SafeError("Tool catalogue exceeds the local discovery limit")
            cursor = page.get("nextCursor")
            if cursor is not None and not isinstance(cursor, str):
                raise SafeError("Invalid MCP tools cursor")
            if not cursor:
                return tools
            if cursor in seen:
                raise SafeError("Repeated MCP tools cursor")
            seen.add(cursor)
        raise SafeError("Tool discovery exceeds ten pages; narrow discovery in the host")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--config", type=Path, default=CONFIG)
    sub = parser.add_subparsers(dest="action", required=True)
    sub.add_parser("catalog")
    configure = sub.add_parser("configure")
    configure.add_argument("provider", choices=PROVIDERS)
    configure.add_argument("url")
    configure.add_argument("--vendor-host", help="Exact alternative host, independently verified with the vendor")
    for action in ("setup", "probe", "call"):
        p = sub.add_parser(action)
        p.add_argument("provider", choices=PROVIDERS)
        if action != "setup":
            p.add_argument("--token-env", help="Name of an environment variable containing a provisioned access token")
        if action == "call":
            p.add_argument("tool", help="Explicitly selected read-only tool from live discovery")
            p.add_argument("--arguments", type=Path, required=True)
            p.add_argument("--output", type=Path, required=True, help="Private local evidence JSON; raw results are never printed")
    args = parser.parse_args()
    config = load(args.config)
    if args.action == "catalog":
        print(json.dumps(CATALOG, indent=2))
        return
    provider = PROVIDERS[args.provider]
    if args.action == "configure":
        url = endpoint(args.url, provider, args.vendor_host)
        config[args.provider] = {"url": url, "vendorHost": args.vendor_host}
        args.config.parent.mkdir(parents=True, exist_ok=True)
        fd = os.open(args.config, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
        with os.fdopen(fd, "w") as f:
            os.fchmod(f.fileno(), 0o600)
            json.dump(config, f, indent=2)
        print("Connection URL saved. Authentication and entitlement remain unverified.")
        return
    url = connection(args.provider, config)
    if args.action == "setup":
        print(json.dumps({"provider": provider["name"], "cowork": {"url": url, "instructions": provider["setup"], "authentication": "Use the provider's host-managed sign-in; no token in the skill"}, "claudeCodeCommand": shlex.join(["claude", "mcp", "add", "--transport", "http", "--scope", "local", "banking-" + args.provider, url]), "note": "Claude Code configuration is separate from Cowork. No host settings have been changed."}, indent=2))
        return
    token = None
    if args.token_env:
        if not re.fullmatch(r"[A-Z][A-Z0-9_]*", args.token_env):
            raise SafeError("Use an uppercase environment variable name")
        token = os.environ.get(args.token_env)
        if not token:
            raise SafeError("The selected token environment variable is empty")
    client = Client(url, token)
    client.initialize()
    tools = client.tools()
    if args.action == "probe":
        print(json.dumps({"state": "discovered", "provider": args.provider, "toolCount": len(tools), "tools": [{"name": t["name"], "inputSchema": t.get("inputSchema"), "annotations": t.get("annotations", {})} for t in tools], "note": "Discovery does not establish data coverage or licence rights"}, indent=2))
        return
    tool = next((t for t in tools if t.get("name") == args.tool), None)
    if not tool or tool.get("annotations", {}).get("readOnlyHint") is not True:
        raise SafeError("Select a discovered tool explicitly marked read-only; otherwise use the provider's host connector")
    arguments = json.loads(args.arguments.read_text())
    if not isinstance(arguments, dict):
        raise SafeError("Tool arguments must be a JSON object")
    result = client.request("tools/call", {"name": args.tool, "arguments": arguments})
    if not isinstance(result, dict):
        raise SafeError("Invalid MCP tool result")
    if result.get("isError"):
        raise SafeError("Provider tool failed; no successful evidence receipt was written")
    from datetime import datetime, timezone
    receipt = {"provider": args.provider, "endpoint": url, "tool": args.tool, "arguments": arguments, "retrievedAt": datetime.now(timezone.utc).isoformat(), "rights": "Account entitlements apply; inspect licence before reuse", "result": result}
    args.output.parent.mkdir(parents=True, exist_ok=True)
    fd = os.open(args.output, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    with os.fdopen(fd, "w") as f:
        json.dump(receipt, f, indent=2)
    print("Provider evidence saved privately; inspect source dates, units and rights before modelling.")


if __name__ == "__main__":
    try:
        main()
    except (ValueError, OSError, KeyError, TypeError):
        # Only known safe validation messages are surfaced; never echo transport payloads or tokens.
        exc = sys.exc_info()[1]
        message = str(exc) if isinstance(exc, SafeError) else "Invalid input or local file operation failed"
        print(message, file=sys.stderr)
        sys.exit(1)
