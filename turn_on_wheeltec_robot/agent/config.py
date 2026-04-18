import os


class AgentConfig(object):
    def __init__(self, package_root, data_dir):
        self.package_root = package_root
        self.data_dir = data_dir
        self.openai_api_key = os.getenv("OPENAI_API_KEY", "").strip()
        self.openai_model = os.getenv("OPENAI_MODEL", "gpt-4o-mini").strip()
        self.recorder_command_topic = "/web/data_collect/command"
        self.recorder_status_topic = "/web/data_collect/status"
        self.control_status_topic = "/web/control_status"
        self.fault_model_topic = os.getenv("FAULT_MODEL_TOPIC", "/web/fault_model_output").strip()
        self.download_route_prefix = "/api/data/download/"
        self.summary_sample_limit = int(os.getenv("EXPERIMENT_SUMMARY_SAMPLE_LIMIT", "500"))
        self.recorder_command_timeout = float(os.getenv("EXPERIMENT_RECORDER_TIMEOUT", "5.0"))
        self.fault_history_window_sec = float(os.getenv("FAULT_HISTORY_WINDOW_SEC", "4.0"))
        self.low_speed_threshold = float(os.getenv("FAULT_LOW_SPEED_THRESHOLD", "0.08"))
        self.high_current_threshold = float(os.getenv("FAULT_HIGH_CURRENT_THRESHOLD", "2.4"))
        self.overload_current_threshold = float(os.getenv("FAULT_OVERLOAD_CURRENT_THRESHOLD", "1.8"))
        self.imbalance_ratio_threshold = float(os.getenv("FAULT_IMBALANCE_RATIO_THRESHOLD", "0.33"))
        self.slip_yaw_jitter_threshold = float(os.getenv("FAULT_SLIP_YAW_JITTER_THRESHOLD", "0.6"))
        self.slip_motion_threshold = float(os.getenv("FAULT_SLIP_MOTION_THRESHOLD", "0.55"))
        self.low_voltage_threshold = float(os.getenv("FAULT_LOW_VOLTAGE_THRESHOLD", "22.3"))


def build_agent_config(package_root, data_dir):
    return AgentConfig(package_root=package_root, data_dir=data_dir)
