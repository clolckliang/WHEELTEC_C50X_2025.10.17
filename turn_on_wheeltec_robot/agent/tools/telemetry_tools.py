from __future__ import annotations

import csv
import math
import os

from agent.tools.fault_tools import build_fault_feature_snapshot, build_fault_result, classify_fault_rule_based


def get_current_vehicle_state(tool_context):
    return tool_context.telemetry_cache.get_snapshot()


def get_current_fault_summary(tool_context):
    feature_snapshot = build_fault_feature_snapshot(tool_context)
    classified = classify_fault_rule_based(tool_context, feature_snapshot)
    result = build_fault_result(tool_context, feature_snapshot, classified)
    return {
        "label": result.fault_type,
        "risk": result.severity,
        "advice": result.recommended_actions[0] if result.recommended_actions else result.explanation,
        "control_status": get_current_vehicle_state(tool_context).get("control_status") or {},
        "confidence": result.confidence,
        "summary": result.dashboard_summary,
    }


def extract_experiment_statistics(tool_context, file_name):
    file_path = os.path.join(tool_context.config.data_dir, file_name)
    if not os.path.isfile(file_path):
        return {
            "file_name": file_name,
            "row_count": 0,
            "duration_sec": 0.0,
            "speed_peak": 0.0,
            "speed_mean": 0.0,
            "current_peak": 0.0,
            "current_mean": 0.0,
            "voltage_min": 0.0,
            "voltage_max": 0.0,
            "fault_label": get_current_fault_summary(tool_context).get("label"),
        }

    row_count = 0
    timestamps = []
    speeds = []
    current_peaks = []
    voltages = []

    with open(file_path, "r", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            row_count += 1
            try:
                timestamps.append(float(row.get("timestamp", 0.0) or 0.0))
                vx = float(row.get("vx", 0.0) or 0.0)
                vy = float(row.get("vy", 0.0) or 0.0)
                speeds.append(math.sqrt(vx * vx + vy * vy))
                current0 = float(row.get("current0", 0.0) or 0.0)
                current1 = float(row.get("current1", 0.0) or 0.0)
                current2 = float(row.get("current2", 0.0) or 0.0)
                current_peaks.append(max(current0, current1, current2))
                voltages.append(float(row.get("voltage", 0.0) or 0.0))
            except Exception:
                continue

    duration_sec = 0.0
    if len(timestamps) >= 2:
        duration_sec = max(0.0, max(timestamps) - min(timestamps))

    speed_peak = max(speeds) if speeds else 0.0
    speed_mean = sum(speeds) / float(len(speeds)) if speeds else 0.0
    current_peak = max(current_peaks) if current_peaks else 0.0
    current_mean = sum(current_peaks) / float(len(current_peaks)) if current_peaks else 0.0
    voltage_min = min(voltages) if voltages else 0.0
    voltage_max = max(voltages) if voltages else 0.0

    return {
        "file_name": file_name,
        "row_count": row_count,
        "duration_sec": round(duration_sec, 3),
        "speed_peak": round(speed_peak, 3),
        "speed_mean": round(speed_mean, 3),
        "current_peak": round(current_peak, 3),
        "current_mean": round(current_mean, 3),
        "voltage_min": round(voltage_min, 3),
        "voltage_max": round(voltage_max, 3),
        "fault_label": get_current_fault_summary(tool_context).get("label"),
    }
