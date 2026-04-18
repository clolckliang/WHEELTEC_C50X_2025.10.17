from __future__ import annotations

import json
import os
import time

import rospy
from std_msgs.msg import String


class ToolContext(object):
    def __init__(self, config, telemetry_cache, metadata_store, session_store, base_url):
        self.config = config
        self.telemetry_cache = telemetry_cache
        self.metadata_store = metadata_store
        self.session_store = session_store
        self.base_url = base_url.rstrip("/")
        self._recorder_pub = rospy.Publisher(config.recorder_command_topic, String, queue_size=5)

    def publish_recorder_command(self, payload):
        self._recorder_pub.publish(String(data=payload))

    def wait_for_recorder_state(self, accepted_states, timeout):
        deadline = time.time() + timeout
        while time.time() < deadline and not rospy.is_shutdown():
            status = self.telemetry_cache.get_recorder_status()
            if status.state in accepted_states:
                return status
            rospy.sleep(0.1)
        return self.telemetry_cache.get_recorder_status()

    def build_download_url(self, file_name):
        return "%s%s" % (self.config.download_route_prefix, file_name)

    def ensure_data_dir(self):
        if not os.path.isdir(self.config.data_dir):
            os.makedirs(self.config.data_dir)

    def to_json(self, payload):
        return json.dumps(payload, ensure_ascii=False)
