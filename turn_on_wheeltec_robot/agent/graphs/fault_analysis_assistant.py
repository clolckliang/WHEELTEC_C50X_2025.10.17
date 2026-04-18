from __future__ import annotations

from uuid import uuid4

from agent.schemas import FaultAssistantResponse
from agent.tools.fault_tools import (
    build_fault_feature_snapshot,
    build_fault_result,
    classify_fault_rule_based,
)

try:
    from langgraph.graph import END, START, StateGraph
except ImportError:
    END = "END"
    START = "START"
    StateGraph = None


def _blank_state(message):
    return {
        "request_id": str(uuid4()),
        "user_input": message,
        "state_snapshot": {},
        "feature_snapshot": {},
        "analysis_result": {},
        "warnings": [],
        "response": None,
    }


def _llm_explanation(llm, result, feature_snapshot):
    if llm is None:
        return None
    prompt = (
        "你是一个 ROS 小车故障分析助手。请基于结构化故障结果和特征快照，输出 4 句以内的专业中文解释，"
        "适合 dashboard 和项目答辩展示。不要虚构未知信息。\n"
        "故障结果: %s\n"
        "特征快照: %s\n"
        "请覆盖：故障解释、风险等级、建议动作。"
        % (result, feature_snapshot)
    )
    response = llm.invoke(prompt)
    return getattr(response, "content", str(response)).strip()


def build_fault_analysis_graph(llm, tool_context):
    if StateGraph is None:
        raise RuntimeError("langgraph is not installed. Install requirements-agent.txt first.")

    graph = StateGraph(dict)

    def read_vehicle_state(state):
        next_state = dict(state)
        next_state["state_snapshot"] = tool_context.telemetry_cache.get_snapshot()
        return next_state

    def preprocess_fault_features(state):
        next_state = dict(state)
        feature_snapshot = build_fault_feature_snapshot(tool_context)
        next_state["feature_snapshot"] = feature_snapshot.dict()
        return next_state

    def analyze_fault(state):
        next_state = dict(state)
        feature_snapshot = state["feature_snapshot"]
        classified = classify_fault_rule_based(tool_context, feature_snapshot)
        next_state["analysis_result"] = build_fault_result(tool_context, feature_snapshot, classified).dict()
        return next_state

    def generate_fault_explanation(state):
        next_state = dict(state)
        result = dict(state["analysis_result"])
        rewritten = _llm_explanation(llm, result, state["feature_snapshot"])
        if rewritten:
            result["explanation"] = rewritten
            result["human_summary"] = rewritten.split("。")[0].strip() + "。"
        next_state["analysis_result"] = result
        return next_state

    def format_fault_result(state):
        result = dict(state["analysis_result"])
        warnings = list(state.get("warnings") or [])
        if warnings:
            result["metadata"] = dict(result.get("metadata") or {})
            result["metadata"]["warnings"] = warnings
        response_model = FaultAssistantResponse(**result)
        next_state = dict(state)
        next_state["response"] = response_model.dict()
        return next_state

    graph.add_node("read_vehicle_state", read_vehicle_state)
    graph.add_node("preprocess_fault_features", preprocess_fault_features)
    graph.add_node("analyze_fault", analyze_fault)
    graph.add_node("generate_fault_explanation", generate_fault_explanation)
    graph.add_node("format_fault_result", format_fault_result)

    graph.add_edge(START, "read_vehicle_state")
    graph.add_edge("read_vehicle_state", "preprocess_fault_features")
    graph.add_edge("preprocess_fault_features", "analyze_fault")
    graph.add_edge("analyze_fault", "generate_fault_explanation")
    graph.add_edge("generate_fault_explanation", "format_fault_result")
    graph.add_edge("format_fault_result", END)
    return graph.compile()


def build_initial_fault_state(message):
    return _blank_state(message=message)

