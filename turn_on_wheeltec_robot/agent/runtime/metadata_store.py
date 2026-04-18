from __future__ import annotations

import json
import os
from datetime import datetime


class MetadataStore(object):
    def __init__(self, data_dir):
        self.data_dir = data_dir

    def _sidecar_path(self, file_name):
        base, _ext = os.path.splitext(file_name)
        return os.path.join(self.data_dir, "%s.json" % base)

    def _now_iso(self):
        return datetime.now().isoformat()

    def read(self, file_name):
        path = self._sidecar_path(file_name)
        if not os.path.isfile(path):
            return {}
        with open(path, "r", encoding="utf-8") as handle:
            return json.load(handle)

    def write(self, file_name, payload):
        path = self._sidecar_path(file_name)
        data = dict(payload)
        data.setdefault("file_name", file_name)
        data.setdefault("created_at", self._now_iso())
        data["updated_at"] = self._now_iso()
        with open(path, "w", encoding="utf-8") as handle:
            json.dump(data, handle, ensure_ascii=False, indent=2)
        return data

    def patch(self, file_name, patch):
        current = self.read(file_name)
        merged = dict(current)
        for key, value in patch.items():
            if isinstance(value, dict) and isinstance(merged.get(key), dict):
                nested = dict(merged.get(key) or {})
                nested.update(value)
                merged[key] = nested
            else:
                merged[key] = value
        return self.write(file_name, merged)

    def sidecar_path(self, file_name):
        return self._sidecar_path(file_name)

