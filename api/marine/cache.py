from __future__ import annotations

import time
from dataclasses import dataclass
from threading import Lock
from typing import Any


@dataclass
class CacheEntry:
    value: Any
    expires_at: float


class TtlCache:
    def __init__(self) -> None:
        self._items: dict[str, CacheEntry] = {}
        self._lock = Lock()

    def get(self, key: str) -> Any | None:
        with self._lock:
            entry = self._items.get(key)
            if not entry:
                return None
            if entry.expires_at <= time.time():
                self._items.pop(key, None)
                return None
            return entry.value

    def set(self, key: str, value: Any, expires_at: float) -> None:
        with self._lock:
            self._items[key] = CacheEntry(value=value, expires_at=expires_at)
