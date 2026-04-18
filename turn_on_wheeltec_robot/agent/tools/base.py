from __future__ import annotations

from agent.schemas import ToolResult


def ok_result(action, message, **kwargs):
    return ToolResult(success=True, action=action, message=message, **kwargs)


def fail_result(action, message, warnings=None, **kwargs):
    return ToolResult(success=False, action=action, message=message, warnings=warnings or [], **kwargs)
