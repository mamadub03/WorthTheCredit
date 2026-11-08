"""Tiny in-memory rate limiter (per process). Good enough for a hackathon on
one Vultr box; use Redis if you ever run several workers/servers."""

import threading
import time
from collections import defaultdict, deque


class RateLimiter:
    def __init__(self, max_calls: int, per_seconds: float):
        self.max_calls = max_calls
        self.per_seconds = per_seconds
        self._calls: dict[str, deque[float]] = defaultdict(deque)
        self._lock = threading.Lock()

    def allow(self, key: str) -> bool:
        """Records a call and returns True if `key` is still under the limit."""
        if self.max_calls <= 0:
            return True
        now = time.monotonic()
        with self._lock:
            q = self._calls[key]
            while q and now - q[0] > self.per_seconds:
                q.popleft()
            if len(q) >= self.max_calls:
                return False
            q.append(now)
            return True

    def reset(self) -> None:
        with self._lock:
            self._calls.clear()
