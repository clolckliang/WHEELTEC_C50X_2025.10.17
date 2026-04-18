from __future__ import annotations

import os
from datetime import datetime

from agent.schemas import ExperimentFile
from agent.tools.base import fail_result, ok_result


def _metadata_to_experiment_file(file_name, file_path, metadata):
    return ExperimentFile(
        file_name=file_name,
        display_name=metadata.get("display_name"),
        label=metadata.get("label"),
        tags=list(metadata.get("tags") or []),
        summary=metadata.get("summary"),
        mtime=os.path.getmtime(file_path),
        size=os.path.getsize(file_path),
        metadata_path=metadata.get("_metadata_path"),
    )


def list_record_files(tool_context, limit=5):
    tool_context.ensure_data_dir()
    entries = []
    for file_name in sorted(os.listdir(tool_context.config.data_dir), reverse=True):
        file_path = os.path.join(tool_context.config.data_dir, file_name)
        if not os.path.isfile(file_path) or not file_name.endswith(".csv"):
            continue
        metadata = tool_context.metadata_store.read(file_name)
        metadata["_metadata_path"] = tool_context.metadata_store.sidecar_path(file_name)
        entries.append(_metadata_to_experiment_file(file_name, file_path, metadata))
        if len(entries) >= max(1, int(limit)):
            break
    return entries


def _resolve_target_file(tool_context, explicit_file=None):
    if explicit_file:
        return explicit_file
    session = tool_context.session_store.snapshot()
    current_file = session.get("current_file_name")
    if current_file:
        return current_file
    files = list_record_files(tool_context, limit=1)
    if files:
        return files[0].file_name
    return None


def read_experiment_metadata(tool_context, file_name):
    payload = tool_context.metadata_store.read(file_name)
    if not payload:
        payload = {
            "file_name": file_name,
            "display_name": None,
            "label": None,
            "tags": [],
            "summary": None,
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat(),
            "stats": {},
        }
    return payload


def write_experiment_metadata(tool_context, file_name, patch):
    return tool_context.metadata_store.patch(file_name, patch)


def rename_current_experiment(tool_context, name, target_file=None):
    normalized = (name or "").strip()
    if not normalized:
        return fail_result(
            "rename_experiment",
            "实验名称不能为空。",
            warnings=["Empty experiment name."],
        )

    file_name = _resolve_target_file(tool_context, target_file)
    if not file_name:
        return fail_result(
            "rename_experiment",
            "当前没有可命名的实验文件。",
            warnings=["No experiment file available."],
        )

    metadata = write_experiment_metadata(tool_context, file_name, {"display_name": normalized})
    tool_context.session_store.update(current_experiment_name=normalized, current_file_name=file_name)
    return ok_result(
        "rename_experiment",
        "实验展示名称已更新。",
        file_name=file_name,
        experiment_name=metadata.get("display_name"),
        label=metadata.get("label"),
        tags=list(metadata.get("tags") or []),
    )


def attach_experiment_label(tool_context, label, target_file=None):
    normalized = (label or "").strip()
    if not normalized:
        return fail_result(
            "attach_label",
            "实验标签不能为空。",
            warnings=["Empty experiment label."],
        )

    file_name = _resolve_target_file(tool_context, target_file)
    if not file_name:
        return fail_result(
            "attach_label",
            "当前没有可打标签的实验文件。",
            warnings=["No experiment file available."],
        )

    current = read_experiment_metadata(tool_context, file_name)
    tags = list(current.get("tags") or [])
    if normalized not in tags:
        tags.append(normalized)
    metadata = write_experiment_metadata(
        tool_context,
        file_name,
        {"label": normalized, "tags": tags},
    )
    tool_context.session_store.update(current_experiment_label=normalized, current_file_name=file_name)
    return ok_result(
        "attach_label",
        "实验标签已更新。",
        file_name=file_name,
        experiment_name=metadata.get("display_name"),
        label=metadata.get("label"),
        tags=list(metadata.get("tags") or []),
    )


def export_latest_csv(tool_context):
    file_name = _resolve_target_file(tool_context)
    if not file_name:
        return fail_result(
            "export_latest_csv",
            "当前没有可导出的实验文件。",
            warnings=["No experiment file available."],
        )

    tool_context.session_store.update(last_exported_file=file_name)
    metadata = read_experiment_metadata(tool_context, file_name)
    return ok_result(
        "export_latest_csv",
        "已定位最近一次实验 CSV，可直接下载。",
        file_name=file_name,
        experiment_name=metadata.get("display_name"),
        label=metadata.get("label"),
        tags=list(metadata.get("tags") or []),
        metadata={"download_url": tool_context.build_download_url(file_name)},
    )
