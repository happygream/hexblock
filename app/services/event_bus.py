"""
Simple in-process event bus for SSE.
The log reader publishes query events from a background thread.
Connected SSE clients subscribe and receive them in real time.
"""

import asyncio
import threading
from typing import AsyncGenerator

_subscribers: list[asyncio.Queue] = []
_main_loop: asyncio.AbstractEventLoop | None = None
_lock = threading.Lock()


def set_main_loop(loop: asyncio.AbstractEventLoop):
    """Called once at startup to register the main event loop."""
    global _main_loop
    _main_loop = loop


def publish(event: dict):
    """Thread-safe publish — called from the log reader thread."""
    if _main_loop is None:
        return
    with _lock:
        subs = list(_subscribers)
    for q in subs:
        try:
            _main_loop.call_soon_threadsafe(q.put_nowait, event)
        except Exception:
            pass


async def subscribe() -> AsyncGenerator[dict, None]:
    """Async generator — yields events as they arrive."""
    q: asyncio.Queue = asyncio.Queue(maxsize=100)
    with _lock:
        _subscribers.append(q)
    try:
        while True:
            event = await q.get()
            yield event
    finally:
        with _lock:
            try:
                _subscribers.remove(q)
            except ValueError:
                pass
