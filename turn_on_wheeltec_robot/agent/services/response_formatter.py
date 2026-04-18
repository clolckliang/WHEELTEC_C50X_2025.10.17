from __future__ import annotations


def success_payload(result, title=None, bullets=None):
    return {
        "status": "ok",
        "result": result,
        "display": {
            "title": title or result.get("action", "agent"),
            "summary": result.get("human_summary", ""),
            "bullets": list(bullets if bullets is not None else result.get("next_suggestions") or []),
        },
    }


def error_payload(message, warnings=None, title="agent"):
    return {
        "status": "error",
        "error": message,
        "warnings": warnings or [],
        "display": {
            "title": title,
            "summary": message,
            "bullets": list(warnings or []),
        },
    }
