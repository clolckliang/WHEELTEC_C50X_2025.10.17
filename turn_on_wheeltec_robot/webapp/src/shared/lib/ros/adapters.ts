import type { FaultSummary } from "@/shared/types/fault";
import type { RecorderStatus } from "@/shared/types/recorder";
import type { BatteryState, CurrentSample, TelemetrySnapshot, VelocitySample } from "@/shared/types/telemetry";

type LooseRecord = Record<string, any>;

const nowLabel = () => new Date().toLocaleTimeString("zh-CN", { hour12: false });

export function createTelemetrySnapshot(): TelemetrySnapshot {
  return {
    batteryVoltage: 0,
    linearX: 0,
    linearY: 0,
    angularZ: 0,
    imuGz: 0,
    odomX: 0,
    odomY: 0,
    currents: [0, 0, 0],
    controlStatus: "idle",
    controlOwnerId: "",
    controlOwnerName: "",
    controlOwnerSource: "",
    controlClientCount: 0,
    controlWaitingCount: 0,
    controlLastReleaseReason: "",
    updatedAt: Date.now(),
  };
}

export function adaptVoltageMessage(message: LooseRecord) {
  return {
    batteryVoltage: Number(message.data ?? 0),
    updatedAt: Date.now(),
  };
}

export function adaptCurrentMessage(message: LooseRecord): {
  telemetry: Partial<TelemetrySnapshot>;
  sample: CurrentSample;
} {
  const values = Array.isArray(message.data) ? message.data : [];
  const currents: [number, number, number] = [
    Number(values[0] ?? 0),
    Number(values[1] ?? 0),
    Number(values[2] ?? 0),
  ];

  return {
    telemetry: {
      currents,
      updatedAt: Date.now(),
    },
    sample: {
      timestamp: nowLabel(),
      i0: currents[0],
      i1: currents[1],
      i2: currents[2],
    },
  };
}

export function adaptImuMessage(message: LooseRecord) {
  return {
    imuGz: Number(message.angular_velocity?.z ?? 0),
    updatedAt: Date.now(),
  };
}

export function adaptOdometryMessage(message: LooseRecord): {
  telemetry: Partial<TelemetrySnapshot>;
  sample: VelocitySample;
} {
  const twist = message.twist?.twist ?? {};
  const pose = message.pose?.pose ?? {};
  const linearX = Number(twist.linear?.x ?? 0);
  const linearY = Number(twist.linear?.y ?? 0);
  const angularZ = Number(twist.angular?.z ?? 0);

  return {
    telemetry: {
      linearX,
      linearY,
      angularZ,
      odomX: Number(pose.position?.x ?? 0),
      odomY: Number(pose.position?.y ?? 0),
      updatedAt: Date.now(),
    },
    sample: {
      timestamp: nowLabel(),
      vx: linearX,
      vy: linearY,
      wz: angularZ,
    },
  };
}

export function adaptControlStatusMessage(message: LooseRecord) {
  const raw = String(message.data ?? "unknown");
  try {
    const payload = JSON.parse(raw);
    return {
      controlStatus: String(payload.status ?? "unknown"),
      controlOwnerId: String(payload.owner_id ?? ""),
      controlOwnerName: String(payload.owner_name ?? ""),
      controlOwnerSource: String(payload.owner_source ?? ""),
      controlClientCount: Number(payload.client_count ?? 0),
      controlWaitingCount: Number(payload.waiting_count ?? 0),
      controlLastReleaseReason: String(payload.last_release_reason ?? ""),
      updatedAt: Date.now(),
    };
  } catch {
    // Fall back to legacy plain-string status messages.
  }

  return {
    controlStatus: raw,
    controlOwnerId: "",
    controlOwnerName: "",
    controlOwnerSource: "",
    controlClientCount: 0,
    controlWaitingCount: 0,
    controlLastReleaseReason: "",
    updatedAt: Date.now(),
  };
}

export function adaptRecorderStatusMessage(message: LooseRecord): RecorderStatus {
  try {
    const payload = JSON.parse(String(message.data ?? "{}")) as Partial<RecorderStatus> & { output_dir?: string };
    return {
      state: payload.state ?? "idle",
      count: payload.count ?? 0,
      duration: payload.duration ?? 0,
      rate: payload.rate ?? 0,
      file: payload.file ?? "",
      outputDir: payload.outputDir ?? payload.output_dir ?? "",
    };
  } catch {
    return {
      state: "idle",
      count: 0,
      duration: 0,
      rate: 0,
      file: "",
      outputDir: "",
    };
  }
}

export function deriveBatteryState(voltage: number): BatteryState {
  const level = Math.max(0, Math.min(1, (voltage - 21) / 4.2));
  const label = voltage >= 24 ? "Healthy" : voltage >= 22.5 ? "Attention" : "Low";
  return { level, label };
}

export function deriveFaultSummary(snapshot: TelemetrySnapshot): FaultSummary {
  const tags: string[] = [];
  let severity: FaultSummary["severity"] = "normal";
  let label = "Nominal";
  let score = 0.11;
  let advice = "继续监控运行状态。";

  if (snapshot.controlStatus.includes("estop")) {
    severity = "critical";
    label = "Emergency Stop";
    score = 0.96;
    advice = "确认机械环境安全后再解除急停。";
    tags.push("estop", "manual-intervention");
  } else if (snapshot.controlStatus.includes("timeout")) {
    severity = "warning";
    label = "Control Timeout";
    score = 0.62;
    advice = "检查 rosbridge 网络、浏览器心跳和前端连接。";
    tags.push("network", "watchdog");
  }

  const peakCurrent = Math.max(...snapshot.currents);
  if (peakCurrent > 2.3) {
    if (severity !== "critical") {
      severity = "warning";
      label = "Motor Current Spike";
      score = Math.max(score, 0.74);
      advice = "降低速度倍率，检查轮组阻力与地面摩擦。";
    }
    tags.push("current-spike");
  }

  if (snapshot.batteryVoltage > 0 && snapshot.batteryVoltage < 22.3) {
    severity = severity === "critical" ? severity : "warning";
    label = severity === "critical" ? label : "Battery Sag";
    score = Math.max(score, 0.68);
    advice = "优先补电，避免在低电压下继续高负载运行。";
    tags.push("battery");
  }

  if (severity === "normal") {
    tags.push("stable");
  }

  return { label, score, severity, advice, tags };
}
