from __future__ import annotations

from agent.graphs.fault_analysis_assistant import build_fault_analysis_graph, build_initial_fault_state
from agent.schemas import FaultAssistantResponse


class FaultAnalysisAssistantService(object):
    def __init__(self, llm, tool_context):
        self.llm = llm
        self.tool_context = tool_context
        self.graph = build_fault_analysis_graph(llm=llm, tool_context=tool_context)

    def invoke(self, message):
        initial_state = build_initial_fault_state(message=message)
        result = self.graph.invoke(initial_state)
        return FaultAssistantResponse(**result["response"])

