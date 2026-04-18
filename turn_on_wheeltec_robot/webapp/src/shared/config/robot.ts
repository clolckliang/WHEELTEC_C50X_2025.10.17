import { buildApiBase, buildRosbridgeUrl } from "@/shared/lib/browser";

const defaultRosbridgeUrl = buildRosbridgeUrl();

export const robotConfig = {
  rosbridgeUrl: defaultRosbridgeUrl,
  apiBase: buildApiBase(defaultRosbridgeUrl),
  heartbeatMs: 250,
  commandMs: 33,
  controlLeaseMs: 750,
  chartLength: 48,
  maxLinear: 1.5,
  maxLateral: 1.0,
  maxAngular: 3.75,
  deadzone: 0.07,
  gamepadDeadzone: 0.08,
  speedMultiplier: {
    min: 0.3,
    max: 1.5,
    step: 0.1,
    initial: 1,
  },
  topics: {
    odom: { name: "/odom", type: "nav_msgs/Odometry" },
    imu: { name: "/imu", type: "sensor_msgs/Imu" },
    voltage: { name: "/PowerVoltage", type: "std_msgs/Float32" },
    current: { name: "/current_data", type: "std_msgs/Float32MultiArray" },
    controlStatus: { name: "/web/control_status", type: "std_msgs/String" },
    recorderStatus: { name: "/web/data_collect/status", type: "std_msgs/String" },
    cmdVelWeb: { name: "/cmd_vel_web", type: "geometry_msgs/Twist" },
    cmdVelEnvelope: { name: "/web/cmd_vel_envelope", type: "std_msgs/String" },
    heartbeat: { name: "/web/heartbeat", type: "std_msgs/Empty" },
    clientHeartbeat: { name: "/web/client_heartbeat", type: "std_msgs/String" },
    estop: { name: "/web/estop", type: "std_msgs/Bool" },
    recorderCommand: { name: "/web/data_collect/command", type: "std_msgs/String" },
  },
};
