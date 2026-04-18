from __future__ import annotations

import re
from uuid import uuid4

from agent.schemas import ExperimentContext, SamplingAssistantResponse
from agent.tools.experiment_tools import (
    attach_experiment_label,
    export_latest_csv,
    list_record_files,
    read_experiment_metadata,
    rename_current_experiment,
    write_experiment_metadata,
)
from agent.tools.recorder_tools import get_recording_status, start_recording, stop_recording
from agent.tools.telemetry_tools import extract_experiment_statistics, get_current_fault_summary, get_current_vehicle_state

try:
    from langgraph.graph import END, START, StateGraph
except ImportError:
    END = "END"
    START = "START"
    StateGraph = None


def _blank_state(message, selected_file=None):
    return {
        "request_id": str(uuid4()),
        "user_input": message,
        "parsed_intent": None,
        "target_file": selected_file,
        "requested_name": None,
        "requested_label": None,
        "requested_limit": 5,
        "context": None,
        "tool_outputs": {},
        "warnings": [],
        "response": None,
    }


def _to_context(tool_context):
    recorder = get_recording_status(tool_context)
    session = tool_context.session_store.snapshot()
    recent_files = list_record_files(tool_context, limit=5)
    return ExperimentContext(
        is_recording=recorder.state == "recording",
        current_experiment_name=session.get("current_experiment_name"),
        current_experiment_label=session.get("current_experiment_label"),
        current_file_name=recorder.file or session.get("current_file_name"),
        current_started_at=session.get("current_started_at"),
        last_exported_file=session.get("last_exported_file"),
        recent_files=recent_files,
        last_summary=session.get("last_summary"),
    )


def _extract_first(patterns, text):
    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            return match.group(1).strip().strip("\"'")
    return None


def _parse_intent(state):
    text = state["user_input"].strip()
    lowered = text.lower()
    result = {
        "parsed_intent": None,
        "requested_name": None,
        "requested_label": None,
        "requested_limit": state.get("requested_limit") or 5,
    }

    numeric_match = re.search(r"(最近|last)\s*(\d+)", lowered)
    if numeric_match:
        result["requested_limit"] = max(1, min(20, int(numeric_match.group(2))))

    if ("开始" in text and "录制" in text) or "start" in lowered:
        result["parsed_intent"] = "start_recording"
        result["requested_name"] = _extract_first(
            [r"命名为\s*([A-Za-z0-9_\-]+)", r"name\s+(?:it\s+)?(?:as\s+)?([A-Za-z0-9_\-]+)"],
            text,
        )
        result["requested_label"] = _extract_first(
            [r"标签[为是:： ]+\s*([A-Za-z0-9_\-]+)", r"label\s+(?:it\s+)?(?:as\s+)?([A-Za-z0-9_\-]+)"],
            text,
        )
        return result

    if ("停止" in text and "录制" in text) or "stop" in lowered:
        result["parsed_intent"] = "stop_recording"
        return result

    if "命名" in text or "rename" in lowered:
        result["parsed_intent"] = "rename_experiment"
        result["requested_name"] = _extract_first(
            [r"命名为\s*([A-Za-z0-9_\-]+)", r"rename.*?([A-Za-z0-9_\-]+)$"],
            text,
        )
        return result

    if "标签" in text or "label" in lowered or "tag" in lowered:
        result["parsed_intent"] = "attach_label"
        result["requested_label"] = _extract_first(
            [r"标签[为是:： ]+\s*([A-Za-z0-9_\-]+)", r"(?:label|tag).*?([A-Za-z0-9_\-]+)$"],
            text,
        )
        return result

    if "导出" in text or "download" in lowered or "export" in lowered:
        result["parsed_intent"] = "export_latest_csv"
        return result

    if "列出" in text or "最近" in text or "list" in lowered:
        result["parsed_intent"] = "list_recent_files"
        return result

    if "摘要" in text or "总结" in text or "summary" in lowered or "summarize" in lowered:
        result["parsed_intent"] = "summarize_selected_experiment" if state.get("target_file") else "summarize_latest_experiment"
        return result

    result["parsed_intent"] = "list_recent_files"
    result.setdefault("warnings", []).append("Unable to confidently parse intent, defaulted to list_recent_files.")
    return result


def _build_summary_with_llm(llm, metadata, statistics, fault_summary):
    if llm is None:
        return (
            "本次实验持续 %.1f 秒，采样 %d 行，速度峰值 %.3f m/s，电流峰值 %.3f A，最低电压 %.3f V，"
            "当前关联故障标签为 %s。建议结合标签和实验目标继续复核数据质量。"
            % (
                statistics.get("duration_sec", 0.0),
                statistics.get("row_count", 0),
                statistics.get("speed_peak", 0.0),
                statistics.get("current_peak", 0.0),
                statistics.get("voltage_min", 0.0),
                fault_summary.get("label", "unknown"),
            )
        )

    prompt = (
        "你是一个机器人实验采样助手，请基于给定统计特征生成一段简洁、专业、适合 dashboard 展示的中文实验摘要。"
        "\n实验名称: %s"
        "\n标签: %s"
        "\n统计: %s"
        "\n故障上下文: %s"
        "\n请输出 4-6 句，总结实验目标、运行表现、异常特征、数据质量和下一步建议。"
        % (
            metadata.get("display_name") or statistics.get("file_name"),
            ", ".join(metadata.get("tags") or []),
            statistics,
            fault_summary,
        )
    )
    response = llm.invoke(prompt)
    return getattr(response, "content", str(response)).strip()


def build_experiment_assistant_graph(llm, tool_context):
    if StateGraph is None:
        raise RuntimeError("langgraph is not installed. Install requirements-agent.txt first.")

    graph = StateGraph(dict)

    def read_experiment_context(state):
        next_state = dict(state)
        next_state["context"] = _to_context(tool_context)
        return next_state

    def route_sampling_intent(state):
        next_state = dict(state)
        next_state.update(_parse_intent(state))
        return next_state

    def validate_sampling_action(state):
        next_state = dict(state)
        warnings = list(next_state.get("warnings") or [])
        context = next_state["context"]
        intent = next_state.get("parsed_intent")
        if intent == "start_recording" and context.is_recording:
            warnings.append("当前已经在录制中。")
            next_state["parsed_intent"] = "done"
        elif intent == "stop_recording" and not context.is_recording:
            warnings.append("当前没有正在录制的实验。")
            next_state["parsed_intent"] = "done"
        elif intent in ("rename_experiment", "attach_label", "export_latest_csv", "summarize_latest_experiment", "summarize_selected_experiment"):
            has_recent = bool(context.current_file_name or context.recent_files)
            if not has_recent:
                warnings.append("当前没有可操作的实验文件。")
                next_state["parsed_intent"] = "done"
        if intent == "rename_experiment" and not next_state.get("requested_name"):
            warnings.append("缺少实验名称。")
            next_state["parsed_intent"] = "done"
        if intent == "attach_label" and not next_state.get("requested_label"):
            warnings.append("缺少实验标签。")
            next_state["parsed_intent"] = "done"
        next_state["warnings"] = warnings
        return next_state

    def execute_sampling_tool(state):
        next_state = dict(state)
        intent = next_state.get("parsed_intent")
        if intent == "start_recording":
            next_state["tool_outputs"]["execute"] = start_recording(
                tool_context,
                name=next_state.get("requested_name"),
                label=next_state.get("requested_label"),
            ).dict()
        elif intent == "stop_recording":
            next_state["tool_outputs"]["execute"] = stop_recording(tool_context).dict()
        elif intent == "rename_experiment":
            next_state["tool_outputs"]["execute"] = rename_current_experiment(
                tool_context,
                name=next_state.get("requested_name"),
                target_file=next_state.get("target_file"),
            ).dict()
        elif intent == "attach_label":
            next_state["tool_outputs"]["execute"] = attach_experiment_label(
                tool_context,
                label=next_state.get("requested_label"),
                target_file=next_state.get("target_file"),
            ).dict()
        return next_state

    def build_experiment_metadata(state):
        next_state = dict(state)
        result = dict(next_state.get("tool_outputs", {}).get("execute") or {})
        file_name = result.get("file_name")
        if not file_name:
            return next_state

        patch = {}
        if result.get("experiment_name"):
            patch["display_name"] = result.get("experiment_name")
        if result.get("label"):
            patch["label"] = result.get("label")
            patch["tags"] = result.get("tags") or [result.get("label")]

        if patch:
            metadata = write_experiment_metadata(tool_context, file_name, patch)
            result["metadata"] = dict(result.get("metadata") or {})
            result["metadata"]["sidecar"] = metadata
            next_state["tool_outputs"]["execute"] = result
        return next_state

    def list_recent_files_node(state):
        next_state = dict(state)
        files = list_record_files(tool_context, limit=next_state.get("requested_limit") or 5)
        next_state["tool_outputs"]["recent_files"] = [item.dict() for item in files]
        return next_state

    def export_csv_node(state):
        next_state = dict(state)
        next_state["tool_outputs"]["export"] = export_latest_csv(tool_context).dict()
        return next_state

    def summarize_experiment(state):
        next_state = dict(state)
        target_file = state.get("target_file")
        if not target_file:
            context = state["context"]
            if context.current_file_name:
                target_file = context.current_file_name
            elif context.recent_files:
                target_file = context.recent_files[0].file_name

        if not target_file:
            next_state["warnings"] = list(next_state.get("warnings") or []) + ["没有可用于摘要的实验文件。"]
            return next_state

        metadata = read_experiment_metadata(tool_context, target_file)
        statistics = extract_experiment_statistics(tool_context, target_file)
        fault_summary = get_current_fault_summary(tool_context)
        summary = _build_summary_with_llm(llm, metadata, statistics, fault_summary)
        merged = write_experiment_metadata(
            tool_context,
            target_file,
            {
                "summary": summary,
                "stats": statistics,
            },
        )
        tool_context.session_store.update(last_summary=summary, current_file_name=target_file)
        next_state["tool_outputs"]["summary"] = {
            "file_name": target_file,
            "summary": summary,
            "metadata": merged,
            "fault": fault_summary,
            "vehicle": get_current_vehicle_state(tool_context),
        }
        return next_state

    def route_after_validation(state):
        intent = state.get("parsed_intent")
        if intent in ("start_recording", "stop_recording", "rename_experiment", "attach_label"):
            return "tool"
        if intent == "list_recent_files":
            return "list"
        if intent == "export_latest_csv":
            return "export"
        if intent in ("summarize_latest_experiment", "summarize_selected_experiment"):
            return "summarize"
        return "done"

    def format_sampling_response(state):
        context = state["context"]
        warnings = list(state.get("warnings") or [])
        tool_outputs = state.get("tool_outputs") or {}
        action = state.get("parsed_intent") or "unknown"
        success = True
        file_name = context.current_file_name
        experiment_name = context.current_experiment_name
        label = context.current_experiment_label
        tags = []
        summary = context.last_summary
        metadata = {}
        next_suggestions = []
        human_summary = "实验助手已处理请求。"

        result_payload = tool_outputs.get("execute") or tool_outputs.get("export") or tool_outputs.get("summary")
        if result_payload:
            success = bool(result_payload.get("success", True))
            file_name = result_payload.get("file_name") or file_name
            experiment_name = result_payload.get("experiment_name") or experiment_name
            label = result_payload.get("label") or label
            tags = list(result_payload.get("tags") or tags)
            summary = result_payload.get("summary") or summary
            warnings.extend(list(result_payload.get("warnings") or []))
            metadata.update(result_payload.get("metadata") or {})
            human_summary = result_payload.get("message") or human_summary

        if tool_outputs.get("recent_files") is not None:
            action = "list_recent_files"
            metadata["recent_files"] = tool_outputs.get("recent_files")
            human_summary = "已整理最近实验文件列表。"
            next_suggestions = ["可选择某个文件生成实验摘要", "可导出最近一次 CSV"]
        elif tool_outputs.get("summary") is not None:
            action = "summarize_latest_experiment" if not state.get("target_file") else "summarize_selected_experiment"
            summary_payload = tool_outputs["summary"]
            file_name = summary_payload.get("file_name") or file_name
            summary = summary_payload.get("summary") or summary
            metadata.update(
                {
                    "sidecar": summary_payload.get("metadata"),
                    "fault": summary_payload.get("fault"),
                    "vehicle": summary_payload.get("vehicle"),
                    "download_url": tool_context.build_download_url(file_name) if file_name else None,
                }
            )
            human_summary = "已为目标实验生成结构化摘要。"
            next_suggestions = ["可继续补充实验标签", "可将摘要同步到前端 Recorder Panel"]
        elif tool_outputs.get("export") is not None:
            action = "export_latest_csv"
            next_suggestions = ["可继续为该实验生成摘要", "可为实验补充标签"]
        elif result_payload:
            if action == "start_recording":
                next_suggestions = ["可继续为实验打标签", "录制结束后可生成实验摘要"]
            elif action == "stop_recording":
                next_suggestions = ["可立即生成最近实验摘要", "可导出最近一次 CSV"]
            elif action == "rename_experiment":
                next_suggestions = ["可继续为实验打标签", "录制结束后生成实验摘要"]
            elif action == "attach_label":
                next_suggestions = ["可继续重命名实验", "可在实验结束后生成摘要"]
        elif action == "done":
            success = False if warnings else True
            human_summary = warnings[0] if warnings else human_summary
            next_suggestions = ["可尝试开始新实验录制", "可列出最近实验文件"]

        response_model = SamplingAssistantResponse(
            action=action,
            success=success,
            current_recording=context.is_recording if action != "stop_recording" else False,
            file_name=file_name,
            experiment_name=experiment_name,
            label=label,
            tags=tags,
            summary=summary,
            warnings=warnings,
            next_suggestions=next_suggestions,
            human_summary=human_summary,
            metadata=metadata,
        )
        next_state = dict(state)
        next_state["response"] = response_model.dict()
        return next_state

    graph.add_node("read_experiment_context", read_experiment_context)
    graph.add_node("route_sampling_intent", route_sampling_intent)
    graph.add_node("validate_sampling_action", validate_sampling_action)
    graph.add_node("execute_sampling_tool", execute_sampling_tool)
    graph.add_node("build_experiment_metadata", build_experiment_metadata)
    graph.add_node("list_recent_files_node", list_recent_files_node)
    graph.add_node("export_csv_node", export_csv_node)
    graph.add_node("summarize_experiment", summarize_experiment)
    graph.add_node("format_sampling_response", format_sampling_response)

    graph.add_edge(START, "read_experiment_context")
    graph.add_edge("read_experiment_context", "route_sampling_intent")
    graph.add_edge("route_sampling_intent", "validate_sampling_action")
    graph.add_conditional_edges(
        "validate_sampling_action",
        route_after_validation,
        {
            "tool": "execute_sampling_tool",
            "list": "list_recent_files_node",
            "export": "export_csv_node",
            "summarize": "summarize_experiment",
            "done": "format_sampling_response",
        },
    )
    graph.add_edge("execute_sampling_tool", "build_experiment_metadata")
    graph.add_edge("build_experiment_metadata", "format_sampling_response")
    graph.add_edge("list_recent_files_node", "format_sampling_response")
    graph.add_edge("export_csv_node", "format_sampling_response")
    graph.add_edge("summarize_experiment", "format_sampling_response")
    graph.add_edge("format_sampling_response", END)
    return graph.compile()


def build_initial_sampling_state(message, selected_file=None):
    return _blank_state(message=message, selected_file=selected_file)
