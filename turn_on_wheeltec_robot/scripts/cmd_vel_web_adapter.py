#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Lightweight robot-side safety adapter for browser teleoperation.

Legacy input topics:
  - /cmd_vel_web (geometry_msgs/Twist)
  - /web/heartbeat (std_msgs/Empty)
  - /web/estop (std_msgs/Bool)

Arbitrated multi-client topics:
  - /web/cmd_vel_envelope (std_msgs/String, JSON payload)
  - /web/client_heartbeat (std_msgs/String, JSON payload)
  - /web/estop (std_msgs/Bool)

Output topic:
  - /cmd_vel (geometry_msgs/Twist)

This node keeps the existing chassis node untouched while adding timeout,
estop latch, speed limiting, and a single-owner control lease for browser
teleoperation. Legacy topics remain accepted as a fallback client so older
pages still work.
"""

import json
import rospy
from geometry_msgs.msg import Twist
from std_msgs.msg import Bool, Empty, String


class WebCmdVelAdapter(object):
    def __init__(self):
        self.input_topic = rospy.get_param("~input_topic", "/cmd_vel_web")
        self.envelope_topic = rospy.get_param("~envelope_topic", "/web/cmd_vel_envelope")
        self.output_topic = rospy.get_param("~output_topic", "/cmd_vel")
        self.heartbeat_topic = rospy.get_param("~heartbeat_topic", "/web/heartbeat")
        self.client_heartbeat_topic = rospy.get_param("~client_heartbeat_topic", "/web/client_heartbeat")
        self.estop_topic = rospy.get_param("~estop_topic", "/web/estop")
        self.status_topic = rospy.get_param("~status_topic", "/web/control_status")

        self.publish_rate = rospy.get_param("~publish_rate", 20.0)
        self.cmd_timeout = rospy.get_param("~cmd_timeout", 0.5)
        self.heartbeat_timeout = rospy.get_param("~heartbeat_timeout", 1.0)
        self.client_registry_timeout = rospy.get_param(
            "~client_registry_timeout",
            max(self.heartbeat_timeout * 3.0, 3.0),
        )

        self.max_linear_x = rospy.get_param("~max_linear_x", 0.4)
        self.max_linear_y = rospy.get_param("~max_linear_y", 0.4)
        self.max_angular_z = rospy.get_param("~max_angular_z", 1.0)
        self.linear_deadband = rospy.get_param("~linear_deadband", 0.02)
        self.angular_deadband = rospy.get_param("~angular_deadband", 0.03)
        self.response_exponent = rospy.get_param("~response_exponent", 0.70)
        self.min_linear_ratio = rospy.get_param("~min_linear_ratio", 0.20)
        self.min_lateral_ratio = rospy.get_param("~min_lateral_ratio", 0.15)
        self.min_angular_ratio = rospy.get_param("~min_angular_ratio", 0.24)

        self.legacy_client_id = "__legacy_web__"
        self.active_client_id = ""
        self.active_client_name = ""
        self.active_client_source = ""
        self.last_cmd = Twist()
        self.last_cmd_time = rospy.Time(0)
        self.last_heartbeat_time = rospy.Time(0)
        self.have_cmd = False
        self.estop_latched = False
        self.last_status_payload = ""
        self.clients = {}
        self.last_release_reason = ""

        self.cmd_pub = rospy.Publisher(self.output_topic, Twist, queue_size=10)
        self.status_pub = rospy.Publisher(self.status_topic, String, queue_size=10, latch=True)

        rospy.Subscriber(self.input_topic, Twist, self.cmd_callback)
        rospy.Subscriber(self.envelope_topic, String, self.cmd_envelope_callback)
        rospy.Subscriber(self.heartbeat_topic, Empty, self.heartbeat_callback)
        rospy.Subscriber(self.client_heartbeat_topic, String, self.client_heartbeat_callback)
        rospy.Subscriber(self.estop_topic, Bool, self.estop_callback)

        rospy.on_shutdown(self.on_shutdown)
        self.publish_status("idle")

        rospy.loginfo(
            "web_cmd_vel_adapter ready: %s -> %s (cmd_timeout=%.2fs, heartbeat_timeout=%.2fs)",
            self.input_topic,
            self.output_topic,
            self.cmd_timeout,
            self.heartbeat_timeout,
        )

    def clamp(self, value, limit):
        if value > limit:
            return limit
        if value < -limit:
            return -limit
        return value

    def zero_twist(self):
        return Twist()

    def shape_axis(self, value, limit, deadband, min_ratio):
        if limit <= 0.0:
            return 0.0

        magnitude = abs(value)
        if magnitude <= 0.0:
            return 0.0

        normalized = min(1.0, magnitude / limit)
        if normalized <= deadband:
            return 0.0

        span = max(1e-6, 1.0 - deadband)
        normalized = (normalized - deadband) / span
        shaped = min_ratio + (1.0 - min_ratio) * pow(normalized, self.response_exponent)
        return shaped * limit if value >= 0.0 else -shaped * limit

    def update_client(self, client_id, name, source, wants_control):
        if not client_id:
            return

        self.clients[client_id] = {
            "id": client_id,
            "name": name or client_id,
            "source": source or "web",
            "wants_control": bool(wants_control),
            "last_seen": rospy.Time.now(),
        }

    def prune_clients(self, now):
        stale = []
        for client_id, client in self.clients.items():
            if (now - client["last_seen"]).to_sec() > self.client_registry_timeout:
                stale.append(client_id)

        for client_id in stale:
            if client_id == self.active_client_id:
                self.release_owner("lease_expired")
            self.clients.pop(client_id, None)

    def owner_alive(self, now):
        if not self.active_client_id:
            return False
        if self.last_heartbeat_time.to_sec() == 0.0:
            return False
        return (now - self.last_heartbeat_time).to_sec() <= self.heartbeat_timeout

    def acquire_owner(self, client_id, reason):
        client = self.clients.get(client_id, {})
        previous_owner = self.active_client_id
        self.active_client_id = client_id
        self.active_client_name = client.get("name", client_id)
        self.active_client_source = client.get("source", "web")
        self.last_heartbeat_time = client.get("last_seen", rospy.Time.now())
        self.last_cmd = self.zero_twist()
        self.last_cmd_time = rospy.Time(0)
        self.have_cmd = False

        if previous_owner != client_id:
            self.cmd_pub.publish(self.zero_twist())
            rospy.loginfo(
                "web_cmd_vel_adapter owner -> %s (%s), reason=%s",
                self.active_client_name,
                self.active_client_id,
                reason,
            )

    def release_owner(self, reason):
        if self.active_client_id:
            rospy.loginfo(
                "web_cmd_vel_adapter release owner %s (%s), reason=%s",
                self.active_client_name,
                self.active_client_id,
                reason,
            )
        self.active_client_id = ""
        self.active_client_name = ""
        self.active_client_source = ""
        self.last_cmd = self.zero_twist()
        self.last_cmd_time = rospy.Time(0)
        self.last_heartbeat_time = rospy.Time(0)
        self.have_cmd = False
        self.last_release_reason = reason

    def maybe_acquire_owner(self, client_id, takeover, reason):
        now = rospy.Time.now()
        if client_id == self.active_client_id:
            return True
        if not self.active_client_id:
            self.acquire_owner(client_id, reason)
            return True
        if not self.owner_alive(now):
            self.acquire_owner(client_id, "previous_owner_stale")
            return True
        if takeover:
            self.acquire_owner(client_id, "manual_takeover")
            return True
        return False

    def build_status_payload(self, status):
        waiting_clients = []
        for client_id, client in self.clients.items():
            if client_id != self.active_client_id and client.get("wants_control"):
                waiting_clients.append(client.get("name", client_id))

        return {
            "status": status,
            "owner_id": self.active_client_id,
            "owner_name": self.active_client_name,
            "owner_source": self.active_client_source,
            "client_count": len(self.clients),
            "waiting_count": len(waiting_clients),
            "waiting_clients": waiting_clients,
            "last_release_reason": self.last_release_reason,
        }

    def publish_status(self, status):
        payload = self.build_status_payload(status)
        serialized = json.dumps(payload, sort_keys=True)
        if serialized != self.last_status_payload:
            self.last_status_payload = serialized
            self.status_pub.publish(String(data=serialized))
            rospy.loginfo("web_cmd_vel_adapter status: %s", serialized)

    def parse_envelope(self, raw):
        try:
            payload = json.loads(raw)
        except Exception as exc:
            rospy.logwarn("web_cmd_vel_adapter invalid JSON payload: %s", exc)
            return None

        client_id = str(payload.get("client_id", "")).strip()
        if not client_id:
            return None

        return {
            "client_id": client_id,
            "client_name": str(payload.get("client_name", client_id)).strip() or client_id,
            "source": str(payload.get("source", "web")).strip() or "web",
            "wants_control": bool(payload.get("wants_control", True)),
            "takeover": bool(payload.get("takeover", False)),
            "twist": payload.get("twist") or {},
        }

    def twist_from_payload(self, payload):
        twist = Twist()
        linear = payload.get("linear") or {}
        angular = payload.get("angular") or {}
        twist.linear.x = float(linear.get("x", 0.0))
        twist.linear.y = float(linear.get("y", 0.0))
        twist.linear.z = float(linear.get("z", 0.0))
        twist.angular.x = float(angular.get("x", 0.0))
        twist.angular.y = float(angular.get("y", 0.0))
        twist.angular.z = float(angular.get("z", 0.0))
        return twist

    def cmd_callback(self, msg):
        self.update_client(self.legacy_client_id, "Legacy Web", "legacy", True)
        if not self.maybe_acquire_owner(self.legacy_client_id, False, "legacy_cmd"):
            return
        self.last_heartbeat_time = rospy.Time.now()
        self.have_cmd = True

        limited = self.limit_twist(msg)
        self.last_cmd = limited
        self.last_cmd_time = rospy.Time.now()

    def cmd_envelope_callback(self, msg):
        payload = self.parse_envelope(msg.data)
        if not payload:
            return

        self.update_client(
            payload["client_id"],
            payload["client_name"],
            payload["source"],
            payload["wants_control"],
        )

        if not payload["wants_control"]:
            if payload["client_id"] == self.active_client_id:
                self.release_owner("client_observer_mode")
            return

        if not self.maybe_acquire_owner(payload["client_id"], payload["takeover"], "cmd_envelope"):
            return

        self.last_heartbeat_time = rospy.Time.now()
        self.have_cmd = True

        limited = self.limit_twist(self.twist_from_payload(payload["twist"]))
        self.last_cmd = limited
        self.last_cmd_time = rospy.Time.now()

    def limit_twist(self, msg):
        limited = Twist()
        limited.linear.x = self.shape_axis(
            self.clamp(msg.linear.x, self.max_linear_x),
            self.max_linear_x,
            self.linear_deadband,
            self.min_linear_ratio,
        )
        limited.linear.y = self.shape_axis(
            self.clamp(msg.linear.y, self.max_linear_y),
            self.max_linear_y,
            self.linear_deadband,
            self.min_lateral_ratio,
        )
        limited.angular.z = self.shape_axis(
            self.clamp(msg.angular.z, self.max_angular_z),
            self.max_angular_z,
            self.angular_deadband,
            self.min_angular_ratio,
        )

        return limited

    def heartbeat_callback(self, _msg):
        self.update_client(self.legacy_client_id, "Legacy Web", "legacy", True)
        if self.active_client_id in ("", self.legacy_client_id):
            self.maybe_acquire_owner(self.legacy_client_id, False, "legacy_heartbeat")
            self.last_heartbeat_time = rospy.Time.now()

    def client_heartbeat_callback(self, msg):
        payload = self.parse_envelope(msg.data)
        if not payload:
            return

        self.update_client(
            payload["client_id"],
            payload["client_name"],
            payload["source"],
            payload["wants_control"],
        )

        if payload["wants_control"]:
            acquired = self.maybe_acquire_owner(
                payload["client_id"],
                payload["takeover"],
                "client_heartbeat",
            )
            if acquired and payload["client_id"] == self.active_client_id:
                self.last_heartbeat_time = rospy.Time.now()
        elif payload["client_id"] == self.active_client_id:
            self.release_owner("client_observer_mode")

    def estop_callback(self, msg):
        if msg.data:
            self.estop_latched = True
            self.publish_status("estop")
            self.cmd_pub.publish(self.zero_twist())
        else:
            self.estop_latched = False
            self.publish_status("idle")

    def resolve_status_and_command(self):
        now = rospy.Time.now()
        self.prune_clients(now)

        if self.estop_latched:
            return "estop", self.zero_twist()

        if not self.active_client_id:
            return "idle", self.zero_twist()

        if self.heartbeat_timeout > 0.0:
            if self.last_heartbeat_time.to_sec() == 0.0:
                return "waiting_heartbeat", self.zero_twist()
            if (now - self.last_heartbeat_time).to_sec() > self.heartbeat_timeout:
                self.release_owner("heartbeat_timeout")
                return "heartbeat_timeout", self.zero_twist()

        if not self.have_cmd:
            return "lease_held", self.zero_twist()

        if self.cmd_timeout > 0.0 and (now - self.last_cmd_time).to_sec() > self.cmd_timeout:
            return "cmd_timeout", self.zero_twist()

        return "active", self.last_cmd

    def run(self):
        rate = rospy.Rate(self.publish_rate)
        while not rospy.is_shutdown():
            status, cmd = self.resolve_status_and_command()
            self.publish_status(status)
            self.cmd_pub.publish(cmd)
            rate.sleep()

    def on_shutdown(self):
        self.cmd_pub.publish(self.zero_twist())


if __name__ == "__main__":
    rospy.init_node("web_cmd_vel_adapter", anonymous=False)
    WebCmdVelAdapter().run()
