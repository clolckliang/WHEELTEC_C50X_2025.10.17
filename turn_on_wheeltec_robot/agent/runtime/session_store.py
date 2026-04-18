import threading


class SessionStore(object):
    def __init__(self):
        self._lock = threading.Lock()
        self._state = {
            "current_experiment_name": None,
            "current_experiment_label": None,
            "current_file_name": None,
            "current_started_at": None,
            "last_exported_file": None,
            "last_summary": None,
        }

    def snapshot(self):
        with self._lock:
            return dict(self._state)

    def update(self, **patch):
        with self._lock:
            self._state.update(patch)
            return dict(self._state)

