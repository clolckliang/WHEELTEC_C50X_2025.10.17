#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Experiment assistant runtime exposed to the web dashboard server."""

from __future__ import annotations

import os
import sys


CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
PACKAGE_ROOT = os.path.dirname(CURRENT_DIR)
if PACKAGE_ROOT not in sys.path:
    sys.path.insert(0, PACKAGE_ROOT)

import rospy

from agent.config import build_agent_config
from agent.runtime.metadata_store import MetadataStore
from agent.runtime.session_store import SessionStore
from agent.runtime.telemetry_cache import TelemetryCache
from agent.runtime.tool_context import ToolContext
from agent.services.experiment_service import ExperimentAssistantService
from agent.services.fault_service import FaultAnalysisAssistantService
from agent.services.response_formatter import error_payload, success_payload


class AgentRuntime(object):
    def __init__(self, package_root, data_dir, base_url):
        self.package_root = package_root
        self.data_dir = data_dir
        self.base_url = base_url
        self.config = build_agent_config(package_root=package_root, data_dir=data_dir)
        self.telemetry_cache = TelemetryCache()
        self.metadata_store = MetadataStore(data_dir=data_dir)
        self.session_store = SessionStore()
        self.tool_context = ToolContext(
            config=self.config,
            telemetry_cache=self.telemetry_cache,
            metadata_store=self.metadata_store,
            session_store=self.session_store,
            base_url=base_url,
        )
        self._experiment_service = None
        self._fault_service = None
        self._load_error = None

        try:
            llm = self._build_llm()
            self._experiment_service = ExperimentAssistantService(
                llm=llm,
                tool_context=self.tool_context,
            )
            self._fault_service = FaultAnalysisAssistantService(
                llm=llm,
                tool_context=self.tool_context,
            )
        except Exception as exc:
            self._load_error = str(exc)
            rospy.logwarn("agent runtime disabled: %s", exc)

    def _build_llm(self):
        if not self.config.openai_api_key:
            return None
        try:
            from langchain_openai import ChatOpenAI
        except Exception as exc:
            raise RuntimeError("langchain_openai unavailable: %s" % exc)
        return ChatOpenAI(
            api_key=self.config.openai_api_key,
            model=self.config.openai_model,
            temperature=0.2,
        )

    def health(self):
        return {
            "available": self._experiment_service is not None or self._fault_service is not None,
            "services": {
                "experiment_assistant": self._experiment_service is not None,
                "fault_analysis_assistant": self._fault_service is not None,
            },
            "model": self.config.openai_model,
            "has_api_key": bool(self.config.openai_api_key),
            "load_error": self._load_error,
            "data_dir": self.data_dir,
            "topic_seen": self.telemetry_cache.get_topic_seen(),
        }

    def invoke(self, role, message, context=None):
        context = context or {}
        if role == "experiment_assistant":
            if self._experiment_service is None:
                return error_payload(
                    "experiment assistant unavailable",
                    warnings=[self._load_error] if self._load_error else [],
                    title="experiment_assistant",
                )
            result = self._experiment_service.invoke(
                message=message,
                selected_file=context.get("selected_file"),
            )
            return success_payload(result.dict(), title="experiment_assistant")
        if role == "fault_analysis_assistant":
            if self._fault_service is None:
                return error_payload(
                    "fault analysis assistant unavailable",
                    warnings=[self._load_error] if self._load_error else [],
                    title="fault_analysis_assistant",
                )
            result = self._fault_service.invoke(message=message)
            return success_payload(
                result.dict(),
                title="fault_analysis_assistant",
                bullets=result.recommended_actions,
            )
        return error_payload("unsupported role: %s" % role, title="agent")
