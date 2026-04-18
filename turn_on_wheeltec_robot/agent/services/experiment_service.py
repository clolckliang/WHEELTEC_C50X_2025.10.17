from __future__ import annotations

from agent.graphs.experiment_assistant import build_experiment_assistant_graph, build_initial_sampling_state
from agent.schemas import SamplingAssistantResponse


class ExperimentAssistantService(object):
    def __init__(self, llm, tool_context):
        self.llm = llm
        self.tool_context = tool_context
        self.graph = build_experiment_assistant_graph(llm=llm, tool_context=tool_context)

    def invoke(self, message, selected_file=None):
        initial_state = build_initial_sampling_state(message=message, selected_file=selected_file)
        result = self.graph.invoke(initial_state)
        return SamplingAssistantResponse(**result["response"])
