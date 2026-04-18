from __future__ import annotations

import os
import time

from agent.tools.base import fail_result, ok_result


def get_recording_status(tool_context):
    return tool_context.telemetry_cache.get_recorder_status()


def start_recording(tool_context, name=None, label=None):
    status = get_recording_status(tool_context)
    if status.state != "idle":
        return fail_result(
            "start_recording",
            "当前录制器不在 idle 状态，无法开始新的实验录制。",
            warnings=["Recorder is busy."],
            file_name=status.file or None,
        )

    safe_label = "".join([char for char in (label or "") if char.isalnum() or char in "-_"])
    payload = "start:%s" % safe_label if safe_label else "start"
    tool_context.publish_recorder_command(payload)
    next_status = tool_context.wait_for_recorder_state(
        accepted_states=["recording", "processing"],
        timeout=tool_context.config.recorder_command_timeout,
    )
    if next_status.state != "recording":
        return fail_result(
            "start_recording",
            "录制开始命令已发送，但未在超时时间内进入 recording 状态。",
            warnings=["Recorder ack timeout."],
            file_name=next_status.file or None,
        )

    tool_context.session_store.update(
        current_experiment_name=name or None,
        current_experiment_label=label or None,
        current_file_name=next_status.file or None,
        current_started_at=time.time(),
    )
    return ok_result(
        "start_recording",
        "新的实验录制已经开始。",
        file_name=next_status.file or None,
        experiment_name=name or None,
        label=label or None,
        tags=[label] if label else [],
    )


def stop_recording(tool_context):
    status = get_recording_status(tool_context)
    if status.state != "recording":
        return fail_result(
            "stop_recording",
            "当前没有正在进行的录制。",
            warnings=["Recorder is not recording."],
            file_name=status.file or None,
        )

    current_file = status.file or tool_context.session_store.snapshot().get("current_file_name")
    tool_context.publish_recorder_command("stop")
    next_status = tool_context.wait_for_recorder_state(
        accepted_states=["idle"],
        timeout=tool_context.config.recorder_command_timeout + 5.0,
    )
    if next_status.state != "idle":
        return fail_result(
            "stop_recording",
            "停止录制命令已发送，但录制器尚未回到 idle。",
            warnings=["Recorder stop timeout."],
            file_name=current_file,
        )

    tool_context.session_store.update(
        current_file_name=current_file,
        current_started_at=None,
    )
    return ok_result(
        "stop_recording",
        "当前实验录制已停止。",
        file_name=current_file,
    )
