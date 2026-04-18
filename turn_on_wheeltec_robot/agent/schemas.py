from __future__ import annotations

from typing import Any, Dict, List, Literal, Optional, TypedDict

try:
    from pydantic import BaseModel, Field
except ImportError:
    raise RuntimeError("pydantic is required for the agent subsystem")


class ExperimentFile(BaseModel):
    file_name: str
    display_name: Optional[str] = None
    label: Optional[str] = None
    tags: List[str] = Field(default_factory=list)
    summary: Optional[str] = None
    mtime: float
    size: int
    metadata_path: Optional[str] = None


class ExperimentContext(BaseModel):
    is_recording: bool
    current_experiment_name: Optional[str] = None
    current_experiment_label: Optional[str] = None
    current_file_name: Optional[str] = None
    current_started_at: Optional[float] = None
    last_exported_file: Optional[str] = None
    recent_files: List[ExperimentFile] = Field(default_factory=list)
    last_summary: Optional[str] = None


class RecorderRuntimeStatus(BaseModel):
    state: str = "idle"
    count: int = 0
    duration: float = 0.0
    rate: float = 0.0
    file: str = ""
    output_dir: str = ""


class ToolResult(BaseModel):
    success: bool
    action: str
    message: str
    file_name: Optional[str] = None
    experiment_name: Optional[str] = None
    label: Optional[str] = None
    tags: List[str] = Field(default_factory=list)
    summary: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)
    warnings: List[str] = Field(default_factory=list)


class SamplingAssistantResponse(BaseModel):
    action: str
    success: bool
    current_recording: bool
    file_name: Optional[str] = None
    experiment_name: Optional[str] = None
    label: Optional[str] = None
    tags: List[str] = Field(default_factory=list)
    summary: Optional[str] = None
    warnings: List[str] = Field(default_factory=list)
    next_suggestions: List[str] = Field(default_factory=list)
    human_summary: str
    metadata: Dict[str, Any] = Field(default_factory=dict)


FaultType = Literal["stall", "slip", "overload", "imbalance", "unknown", "nominal"]
FaultSeverity = Literal["low", "medium", "high", "critical"]


class FaultModelOutput(BaseModel):
    label: Optional[str] = None
    score: float = 0.0
    source: str = "rule"
    raw: Dict[str, Any] = Field(default_factory=dict)


class VehicleStatus(BaseModel):
    linear_x: float = 0.0
    linear_y: float = 0.0
    angular_z: float = 0.0
    speed_magnitude: float = 0.0
    battery_voltage: float = 0.0
    control_status: str = "unknown"
    control_owner: Optional[str] = None
    mode: Optional[str] = None
    is_recording: bool = False


class MotorCurrentSummary(BaseModel):
    currents: List[float] = Field(default_factory=list)
    average_current: float = 0.0
    peak_current: float = 0.0
    min_current: float = 0.0
    imbalance: float = 0.0
    imbalance_ratio: float = 0.0
    dominant_index: int = -1


class ImuSummary(BaseModel):
    gx: float = 0.0
    gy: float = 0.0
    gz: float = 0.0
    ax: float = 0.0
    ay: float = 0.0
    az: float = 0.0
    gyro_magnitude: float = 0.0
    accel_magnitude: float = 0.0
    yaw_stability: float = 0.0


class FaultFeatureSnapshot(BaseModel):
    vehicle: VehicleStatus
    currents: MotorCurrentSummary
    imu: ImuSummary
    fault_model: FaultModelOutput = Field(default_factory=FaultModelOutput)
    recent_speed_mean: float = 0.0
    recent_speed_peak: float = 0.0
    recent_speed_drop_ratio: float = 0.0
    recent_current_mean: float = 0.0
    recent_current_peak: float = 0.0
    recent_current_spike_ratio: float = 0.0
    recent_current_imbalance_ratio: float = 0.0
    recent_yaw_jitter: float = 0.0
    traction_instability: float = 0.0
    voltage_drop_detected: bool = False
    evidence: List[str] = Field(default_factory=list)


class FaultAnalysisResult(BaseModel):
    fault_type: FaultType
    confidence: float = 0.0
    severity: FaultSeverity = "low"
    explanation: str
    possible_causes: List[str] = Field(default_factory=list)
    recommended_actions: List[str] = Field(default_factory=list)
    maintenance_suggestions: List[str] = Field(default_factory=list)
    human_summary: str
    dashboard_summary: str
    evidence: List[str] = Field(default_factory=list)
    metadata: Dict[str, Any] = Field(default_factory=dict)


class FaultAssistantResponse(BaseModel):
    fault_type: FaultType
    confidence: float = 0.0
    severity: FaultSeverity = "low"
    explanation: str
    possible_causes: List[str] = Field(default_factory=list)
    recommended_actions: List[str] = Field(default_factory=list)
    maintenance_suggestions: List[str] = Field(default_factory=list)
    human_summary: str
    dashboard_summary: str
    metadata: Dict[str, Any] = Field(default_factory=dict)


class AgentInvokeRequest(BaseModel):
    role: str
    message: str
    context: Dict[str, Any] = Field(default_factory=dict)


class SamplingAssistantState(TypedDict, total=False):
    request_id: str
    user_input: str
    parsed_intent: Optional[str]
    target_file: Optional[str]
    requested_name: Optional[str]
    requested_label: Optional[str]
    requested_limit: Optional[int]
    context: ExperimentContext
    tool_outputs: Dict[str, Any]
    warnings: List[str]
    response: Optional[Dict[str, Any]]


class FaultAnalysisState(TypedDict, total=False):
    request_id: str
    user_input: str
    state_snapshot: Dict[str, Any]
    feature_snapshot: Dict[str, Any]
    analysis_result: Dict[str, Any]
    warnings: List[str]
    response: Optional[Dict[str, Any]]
