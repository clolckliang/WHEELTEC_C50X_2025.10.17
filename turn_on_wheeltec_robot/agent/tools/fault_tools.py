from __future__ import annotations

import math
from typing import Dict, List

from agent.schemas import (
    FaultAnalysisResult,
    FaultFeatureSnapshot,
    FaultModelOutput,
    ImuSummary,
    MotorCurrentSummary,
    VehicleStatus,
)


def _safe_mean(values):
    if not values:
        return 0.0
    return float(sum(values)) / float(len(values))


def _safe_max(values):
    return max(values) if values else 0.0


def get_vehicle_status(tool_context):
    snapshot = tool_context.telemetry_cache.get_snapshot()
    odom = snapshot.get("odom") or {}
    control_status = snapshot.get("control_status") or {}
    recorder = tool_context.telemetry_cache.get_recorder_status()
    linear_x = float(odom.get("linear_x", 0.0) or 0.0)
    linear_y = float(odom.get("linear_y", 0.0) or 0.0)
    angular_z = float(odom.get("angular_z", 0.0) or 0.0)
    return VehicleStatus(
        linear_x=linear_x,
        linear_y=linear_y,
        angular_z=angular_z,
        speed_magnitude=math.sqrt(linear_x * linear_x + linear_y * linear_y),
        battery_voltage=float(snapshot.get("voltage", 0.0) or 0.0),
        control_status=str(control_status.get("status", "unknown")),
        control_owner=control_status.get("owner_name") or control_status.get("owner_id"),
        mode=control_status.get("mode"),
        is_recording=recorder.state == "recording",
    )


def get_motor_currents(tool_context):
    snapshot = tool_context.telemetry_cache.get_snapshot()
    currents = [float(value or 0.0) for value in (snapshot.get("currents") or [])]
    if not currents:
        currents = [0.0, 0.0, 0.0]
    peak_current = _safe_max(currents)
    min_current = min(currents) if currents else 0.0
    average_current = _safe_mean(currents)
    imbalance = peak_current - min_current
    imbalance_ratio = imbalance / peak_current if peak_current > 1e-6 else 0.0
    dominant_index = currents.index(peak_current) if currents else -1
    return MotorCurrentSummary(
        currents=currents,
        average_current=round(average_current, 4),
        peak_current=round(peak_current, 4),
        min_current=round(min_current, 4),
        imbalance=round(imbalance, 4),
        imbalance_ratio=round(imbalance_ratio, 4),
        dominant_index=dominant_index,
    )


def get_imu_summary(tool_context):
    snapshot = tool_context.telemetry_cache.get_snapshot()
    imu = snapshot.get("imu") or {}
    gx = float(imu.get("gx", 0.0) or 0.0)
    gy = float(imu.get("gy", 0.0) or 0.0)
    gz = float(imu.get("gz", 0.0) or 0.0)
    ax = float(imu.get("ax", 0.0) or 0.0)
    ay = float(imu.get("ay", 0.0) or 0.0)
    az = float(imu.get("az", 0.0) or 0.0)
    gyro_magnitude = math.sqrt(gx * gx + gy * gy + gz * gz)
    accel_magnitude = math.sqrt(ax * ax + ay * ay + az * az)
    return ImuSummary(
        gx=gx,
        gy=gy,
        gz=gz,
        ax=ax,
        ay=ay,
        az=az,
        gyro_magnitude=round(gyro_magnitude, 4),
        accel_magnitude=round(accel_magnitude, 4),
        yaw_stability=round(abs(gz), 4),
    )


def get_fault_model_output(tool_context):
    snapshot = tool_context.telemetry_cache.get_snapshot()
    payload = snapshot.get("fault_model") or {}
    return FaultModelOutput(
        label=payload.get("label"),
        score=float(payload.get("score", 0.0) or 0.0),
        source=str(payload.get("source", "rule")),
        raw=dict(payload.get("raw") or {}),
    )


def build_fault_feature_snapshot(tool_context):
    config = tool_context.config
    vehicle = get_vehicle_status(tool_context)
    currents = get_motor_currents(tool_context)
    imu = get_imu_summary(tool_context)
    fault_model = get_fault_model_output(tool_context)
    window_sec = getattr(config, "fault_history_window_sec", 4.0)

    odom_history = tool_context.telemetry_cache.get_history("odom", window_sec=window_sec)
    current_history = tool_context.telemetry_cache.get_history("currents", window_sec=window_sec)
    imu_history = tool_context.telemetry_cache.get_history("imu", window_sec=window_sec)
    voltage_history = tool_context.telemetry_cache.get_history("voltage", window_sec=window_sec)

    speed_series = [
        math.sqrt(
            float(item["data"].get("linear_x", 0.0) or 0.0) ** 2
            + float(item["data"].get("linear_y", 0.0) or 0.0) ** 2
        )
        for item in odom_history
    ]
    current_peak_series = [_safe_max([float(v or 0.0) for v in item["data"]]) for item in current_history]
    imbalance_series = []
    for item in current_history:
        values = [float(v or 0.0) for v in item["data"]]
        peak_value = _safe_max(values)
        min_value = min(values) if values else 0.0
        imbalance_series.append((peak_value - min_value) / peak_value if peak_value > 1e-6 else 0.0)
    yaw_series = [abs(float(item["data"].get("gz", 0.0) or 0.0)) for item in imu_history]
    voltage_series = [float(item["data"].get("value", 0.0) or 0.0) for item in voltage_history]

    recent_speed_mean = _safe_mean(speed_series)
    recent_speed_peak = _safe_max(speed_series)
    current_speed = vehicle.speed_magnitude
    recent_speed_drop_ratio = 0.0
    if recent_speed_peak > 1e-6:
        recent_speed_drop_ratio = max(0.0, (recent_speed_peak - current_speed) / recent_speed_peak)

    recent_current_mean = _safe_mean(current_peak_series)
    recent_current_peak = _safe_max(current_peak_series)
    recent_current_spike_ratio = 0.0
    if recent_current_mean > 1e-6:
        recent_current_spike_ratio = max(0.0, (currents.peak_current - recent_current_mean) / recent_current_mean)

    recent_yaw_jitter = _safe_mean(yaw_series)
    traction_instability = min(1.0, 0.65 * min(recent_yaw_jitter, 1.5) + 0.35 * min(abs(imu.ax) + abs(imu.ay), 1.5))
    voltage_drop_detected = bool(
        voltage_series and min(voltage_series) < getattr(config, "low_voltage_threshold", 22.3)
    )

    evidence = []
    if currents.peak_current >= getattr(config, "high_current_threshold", 2.4):
        evidence.append("电流处于高负载区间")
    if current_speed <= getattr(config, "low_speed_threshold", 0.08):
        evidence.append("当前速度响应偏低")
    if currents.imbalance_ratio >= getattr(config, "imbalance_ratio_threshold", 0.33):
        evidence.append("电机电流存在明显不对称")
    if recent_yaw_jitter >= getattr(config, "slip_yaw_jitter_threshold", 0.6):
        evidence.append("IMU 偏航抖动偏高")
    if voltage_drop_detected:
        evidence.append("采样窗口内检测到电压下沉")
    if fault_model.label:
        evidence.append("外部故障模型输出为 %s (%.2f)" % (fault_model.label, fault_model.score))

    return FaultFeatureSnapshot(
        vehicle=vehicle,
        currents=currents,
        imu=imu,
        fault_model=fault_model,
        recent_speed_mean=round(recent_speed_mean, 4),
        recent_speed_peak=round(recent_speed_peak, 4),
        recent_speed_drop_ratio=round(recent_speed_drop_ratio, 4),
        recent_current_mean=round(recent_current_mean, 4),
        recent_current_peak=round(recent_current_peak, 4),
        recent_current_spike_ratio=round(recent_current_spike_ratio, 4),
        recent_current_imbalance_ratio=round(_safe_mean(imbalance_series), 4),
        recent_yaw_jitter=round(recent_yaw_jitter, 4),
        traction_instability=round(traction_instability, 4),
        voltage_drop_detected=voltage_drop_detected,
        evidence=evidence,
    )


def classify_fault_rule_based(tool_context, feature_snapshot):
    config = tool_context.config
    feature = feature_snapshot if isinstance(feature_snapshot, FaultFeatureSnapshot) else FaultFeatureSnapshot(**feature_snapshot)
    model = feature.fault_model

    if (
        feature.currents.peak_current >= getattr(config, "high_current_threshold", 2.4)
        and feature.vehicle.speed_magnitude <= getattr(config, "low_speed_threshold", 0.08)
        and feature.recent_speed_drop_ratio >= 0.35
    ):
        return {
            "fault_type": "stall",
            "confidence": 0.84,
            "severity": "high" if not feature.voltage_drop_detected else "critical",
            "evidence": feature.evidence + ["高电流伴随低速度和速度下跌，符合堵转特征"],
        }

    if (
        feature.currents.peak_current >= getattr(config, "overload_current_threshold", 1.8)
        and feature.vehicle.speed_magnitude > getattr(config, "low_speed_threshold", 0.08)
        and feature.recent_current_spike_ratio >= 0.28
    ):
        return {
            "fault_type": "overload",
            "confidence": 0.76,
            "severity": "medium" if not feature.voltage_drop_detected else "high",
            "evidence": feature.evidence + ["电流持续偏高但仍有速度输出，更接近负载异常"],
        }

    if (
        feature.recent_current_imbalance_ratio >= getattr(config, "imbalance_ratio_threshold", 0.33)
        and feature.currents.dominant_index >= 0
    ):
        return {
            "fault_type": "imbalance",
            "confidence": 0.73,
            "severity": "medium",
            "evidence": feature.evidence + ["多轮/左右电流长期不均衡，符合轮组负载不平衡"],
        }

    if (
        feature.currents.peak_current < getattr(config, "overload_current_threshold", 1.8)
        and feature.traction_instability >= getattr(config, "slip_motion_threshold", 0.55)
        and feature.recent_speed_drop_ratio >= 0.18
    ):
        return {
            "fault_type": "slip",
            "confidence": 0.71,
            "severity": "medium",
            "evidence": feature.evidence + ["电流不高但姿态/速度波动明显，更接近打滑"],
        }

    if model.label and model.score >= 0.72:
        normalized = str(model.label).lower()
        if "stall" in normalized:
            inferred_type = "stall"
        elif "slip" in normalized:
            inferred_type = "slip"
        elif "overload" in normalized or "load" in normalized:
            inferred_type = "overload"
        elif "imbalance" in normalized or "unbalance" in normalized:
            inferred_type = "imbalance"
        else:
            inferred_type = "unknown"
        return {
            "fault_type": inferred_type,
            "confidence": min(0.9, max(0.68, model.score)),
            "severity": "medium",
            "evidence": feature.evidence + ["规则信号不充分，采用外部模型结果补充判断"],
        }

    if feature.vehicle.control_status.startswith("estop"):
        return {
            "fault_type": "unknown",
            "confidence": 0.62,
            "severity": "critical",
            "evidence": feature.evidence + ["控制状态处于急停，优先按未知高风险处理"],
        }

    return {
        "fault_type": "nominal" if not feature.evidence else "unknown",
        "confidence": 0.42 if feature.evidence else 0.63,
        "severity": "low",
        "evidence": feature.evidence if feature.evidence else ["未发现典型异常特征"],
    }


def estimate_fault_risk(tool_context, feature_snapshot, classified):
    feature = feature_snapshot if isinstance(feature_snapshot, FaultFeatureSnapshot) else FaultFeatureSnapshot(**feature_snapshot)
    severity = classified.get("severity", "low")
    confidence = float(classified.get("confidence", 0.0) or 0.0)
    if feature.voltage_drop_detected and severity == "medium":
        severity = "high"
    if feature.fault_model.score >= 0.85 and severity == "high":
        severity = "critical"
    if classified.get("fault_type") == "nominal" and confidence >= 0.6:
        severity = "low"
    return severity


def build_fault_result(tool_context, feature_snapshot, classified):
    feature = feature_snapshot if isinstance(feature_snapshot, FaultFeatureSnapshot) else FaultFeatureSnapshot(**feature_snapshot)
    fault_type = classified.get("fault_type", "unknown")
    severity = estimate_fault_risk(tool_context, feature, classified)
    confidence = round(float(classified.get("confidence", 0.0) or 0.0), 2)
    evidence = list(classified.get("evidence") or [])

    cause_map: Dict[str, List[str]] = {
        "stall": ["轮组阻力过大", "机械卡滞", "负载瞬时过重", "驱动器输出受限"],
        "slip": ["地面附着力不足", "加减速过急", "轮胎/轮面接触状态异常", "姿态扰动导致牵引不稳定"],
        "overload": ["载荷偏大", "摩擦阻力上升", "轮组轻微干涉", "持续高扭矩工况"],
        "imbalance": ["单侧/单轮阻力异常", "轮组安装偏差", "驱动电流分配不均", "机械连接松动"],
        "unknown": ["信号特征不完整", "外部扰动未完全观测", "需要更多历史数据确认"],
        "nominal": ["暂无明显故障原因"],
    }
    action_map: Dict[str, List[str]] = {
        "stall": ["立即减小速度指令或停止运动", "检查对应轮组是否卡滞", "确认地面和负载条件后再恢复"],
        "slip": ["降低速度倍率和角速度指令", "检查地面附着条件", "优先在低速下复现实验确认"],
        "overload": ["降低当前工况负载", "检查轮组阻力和驱动温升", "观察电压是否持续下沉"],
        "imbalance": ["检查电流偏高一侧轮组", "复核机械连接和轮组安装", "对比空载与带载电流差异"],
        "unknown": ["继续采样 3-5 秒短时窗口", "结合录制数据和故障模型复核", "必要时人工检查机械状态"],
        "nominal": ["维持监控即可", "可继续进行实验采样"],
    }
    maintenance_map: Dict[str, List[str]] = {
        "stall": ["检查轴承、轮组和减速机构", "查看驱动器限流与接线状态"],
        "slip": ["检查轮面磨损与接触面材质", "评估控制参数是否过激"],
        "overload": ["检查负载分布和轮组摩擦", "关注电源与驱动器温升"],
        "imbalance": ["检查偏高电流一侧的机械阻尼", "复核轮组同轴度和安装紧固"],
        "unknown": ["补充更多传感器或模型输出", "保留 CSV 供后续离线分析"],
        "nominal": ["保持常规维护周期"],
    }

    if fault_type == "nominal":
        explanation = "当前速度、电流和 IMU 没有形成典型故障组合，系统整体表现接近正常。"
        dashboard_summary = "暂无明显异常"
    elif fault_type == "stall":
        explanation = "当前电流显著升高，同时速度响应偏低且短时内速度下降明显，整体更符合堵转或近堵转状态。"
        dashboard_summary = "疑似堵转或近堵转"
    elif fault_type == "slip":
        explanation = "当前电流没有明显冲高，但姿态抖动和速度响应波动偏大，更接近轮组打滑或牵引不稳定。"
        dashboard_summary = "疑似打滑"
    elif fault_type == "overload":
        explanation = "当前仍保持一定速度输出，但电流长期偏高，说明系统更可能处于负载异常或阻力增大的工况。"
        dashboard_summary = "疑似负载异常"
    elif fault_type == "imbalance":
        dominant = feature.currents.dominant_index
        explanation = "当前电机电流存在明显不对称，说明某一侧或某一轮组的负载更高，符合左右/多轮不平衡特征。"
        if dominant >= 0:
            explanation += " 当前偏高的是编号 %d 的电机通道。" % dominant
        dashboard_summary = "检测到轮组负载不平衡"
    else:
        explanation = "当前存在一定异常信号，但还不足以唯一归类为典型堵转、打滑或负载异常，建议结合录制和人工检查继续确认。"
        dashboard_summary = "存在未知异常信号"

    human_summary = "%s 当前风险等级为 %s，置信度 %.2f。" % (dashboard_summary, severity, confidence)

    return FaultAnalysisResult(
        fault_type=fault_type,
        confidence=confidence,
        severity=severity,
        explanation=explanation,
        possible_causes=cause_map.get(fault_type, cause_map["unknown"]),
        recommended_actions=action_map.get(fault_type, action_map["unknown"]),
        maintenance_suggestions=maintenance_map.get(fault_type, maintenance_map["unknown"]),
        human_summary=human_summary,
        dashboard_summary=dashboard_summary,
        evidence=evidence,
        metadata={
            "feature_snapshot": feature.dict(),
            "fault_model": feature.fault_model.dict(),
        },
    )

