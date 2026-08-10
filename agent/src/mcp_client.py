"""
Minimal MCP (Model Context Protocol) client for KeeperHub's remote server.

This is intentionally small — just enough JSON-RPC over Streamable HTTP to:
  1. initialize a session
  2. call a tool (execute_transfer, get_direct_execution_status, etc.)

This is what makes KeeperHub's MCP surface show up as an actual, visible part
of the build (not just a REST call dressed up) — the agent discovers and
calls KeeperHub's execution tools the same way any MCP-native runtime would.
"""

import json
import uuid
import requests


class KeeperHubMCPClient:
    def __init__(self, mcp_url: str, api_key: str):
        self.mcp_url = mcp_url
        self.headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "Accept": "application/json, text/event-stream",
        }
        self._session_id = None
        self._initialize()

    def _post(self, payload: dict):
        resp = self.session_post(payload)
        resp.raise_for_status()
        return self._parse_response(resp)

    def session_post(self, payload: dict):
        headers = dict(self.headers)
        if self._session_id:
            headers["Mcp-Session-Id"] = self._session_id
        return requests.post(self.mcp_url, headers=headers, json=payload, timeout=30)

    def _parse_response(self, resp: requests.Response):
        # Streamable HTTP MCP servers may respond with plain JSON or an
        # SSE stream of "data: {...}" lines. Handle both.
        content_type = resp.headers.get("content-type", "")
        if "text/event-stream" in content_type:
            for line in resp.text.splitlines():
                if line.startswith("data:"):
                    return json.loads(line[len("data:"):].strip())
            raise RuntimeError(f"No data event in SSE response: {resp.text[:500]}")
        return resp.json()

    def _initialize(self):
        init_payload = {
            "jsonrpc": "2.0",
            "id": str(uuid.uuid4()),
            "method": "initialize",
            "params": {
                "protocolVersion": "2025-06-18",
                "capabilities": {},
                "clientInfo": {"name": "treasury-sweep-agent", "version": "0.1.0"},
            },
        }
        resp = self.session_post(init_payload)
        resp.raise_for_status()
        self._session_id = resp.headers.get("Mcp-Session-Id")
        self._parse_response(resp)

        # Required follow-up per MCP spec before making tool calls.
        notif_payload = {
            "jsonrpc": "2.0",
            "method": "notifications/initialized",
            "params": {},
        }
        self.session_post(notif_payload)

    def call_tool(self, name: str, arguments: dict) -> dict:
        payload = {
            "jsonrpc": "2.0",
            "id": str(uuid.uuid4()),
            "method": "tools/call",
            "params": {"name": name, "arguments": arguments},
        }
        result = self._post(payload)
        if "error" in result:
            raise RuntimeError(f"MCP tool error calling {name}: {result['error']}")
        return result.get("result", {})

    @staticmethod
    def extract_json(mcp_result: dict) -> dict:
        """
        MCP tool results come back as {"content": [{"type": "text", "text": "..."}], ...}
        where the actual payload is a JSON STRING inside content[0]['text'], not a
        plain dict. This unwraps it. Handles the plain-success case and the
        "API call failed: 400 Bad Request - {...}" error-message case, where the
        real JSON is embedded after some prefix text.
        """
        content = mcp_result.get("content", [])
        if not content:
            return mcp_result  # already flat, or empty — nothing to unwrap
        text = content[0].get("text", "")
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            idx = text.find("{")
            if idx != -1:
                try:
                    return json.loads(text[idx:])
                except json.JSONDecodeError:
                    pass
            return {"success": False, "wouldRevert": True, "raw": text}