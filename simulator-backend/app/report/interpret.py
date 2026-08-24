"""Optional plain-language interpretation via the existing Cloudflare Worker (D6).

Reuses the same Claude proxy the website chat uses — no new server. Best-effort:
if the endpoint is unreachable (offline), returns None and the pipeline carries
on. The Worker holds the API key; nothing secret lives here.
"""
from __future__ import annotations

import json
import urllib.request

DEFAULT_ENDPOINT = "https://stemcells-chat.dr-sanjayanbu.workers.dev"


def _summarize(payload: dict) -> str:
    ea = payload.get("epigenetic_age") or {}
    targets = payload.get("targets") or []
    con = payload.get("construct") or {}
    cands = payload.get("candidates") or []
    top_genes = ", ".join(t.get("gene") or t.get("cpg") for t in targets[:6])
    lines = [
        "Summarise this epigenetic-age analysis for a patient in plain language, "
        "in a few short paragraphs. Be encouraging but honest, and end with a one-line "
        "reminder that the molecules are research hypotheses, not treatments.",
        "",
        f"- Predicted biological (epigenetic) age: {ea.get('dnam_age')} years",
        f"- Chronological age: {ea.get('chronological_age')}",
        f"- Age acceleration: {ea.get('age_acceleration')} years",
        f"- Key target genes/sites: {top_genes}",
    ]
    if con:
        lines.append(f"- Proposed vector strategy: {con.get('strategy')}")
    if cands:
        lines.append(f"- Candidate molecules generated: {len(cands)}")
    return "\n".join(lines)


def interpret_results(
    payload: dict,
    endpoint: str = DEFAULT_ENDPOINT,
    mode: str = "concise",
    timeout: int = 60,
) -> str | None:
    prompt = _summarize(payload)
    body = json.dumps({"messages": [{"role": "user", "content": prompt}], "mode": mode}).encode()
    req = urllib.request.Request(
        endpoint, data=body, headers={"Content-Type": "application/json"}, method="POST"
    )
    try:
        text = ""
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            for raw in resp:
                line = raw.decode("utf-8", "replace").strip()
                if not line.startswith("data:"):
                    continue
                data = line[5:].strip()
                if not data or data == "[DONE]":
                    continue
                try:
                    evt = json.loads(data)
                except json.JSONDecodeError:
                    continue
                if evt.get("type") == "content_block_delta" and evt.get("delta", {}).get("type") == "text_delta":
                    text += evt["delta"].get("text", "")
        return text.strip() or None
    except Exception:  # noqa: BLE001 — best-effort; offline is fine
        return None
