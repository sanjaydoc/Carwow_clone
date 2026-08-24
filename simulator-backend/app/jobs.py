"""Async job runner with live progress (D1).

A single-user local app doesn't need Celery/Redis — an in-memory registry with
asyncio tasks is enough. Each job records a list of progress events that the UI
streams over Server-Sent Events, so the Simulator can show the pipeline working
in real time (reusing the dividing-cell loader / log).
"""
from __future__ import annotations

import asyncio
import traceback
import uuid
from dataclasses import dataclass, field
from typing import Any, Awaitable, Callable


@dataclass
class Job:
    id: str
    kind: str
    status: str = "queued"          # queued | running | done | error
    progress: float = 0.0           # 0..1
    events: list[dict] = field(default_factory=list)
    result: Any = None
    error: str | None = None
    _queue: asyncio.Queue = field(default_factory=asyncio.Queue, repr=False)

    def emit(self, message: str, *, progress: float | None = None, **extra: Any) -> None:
        if progress is not None:
            self.progress = max(0.0, min(1.0, progress))
        event = {"message": message, "progress": self.progress, **extra}
        self.events.append(event)
        self._queue.put_nowait(event)

    def public(self) -> dict:
        return {
            "id": self.id,
            "kind": self.kind,
            "status": self.status,
            "progress": self.progress,
            "events": self.events,
            "result": self.result,
            "error": self.error,
        }


# A progress-reporting callback handed to job bodies.
Progress = Callable[..., None]


class JobManager:
    def __init__(self) -> None:
        self._jobs: dict[str, Job] = {}
        # Serialize GPU-heavy work (6 GB VRAM: never two models at once).
        self._gpu_lock = asyncio.Lock()

    def get(self, job_id: str) -> Job | None:
        return self._jobs.get(job_id)

    @property
    def gpu_lock(self) -> asyncio.Lock:
        return self._gpu_lock

    def start(self, kind: str, body: Callable[[Job], Awaitable[Any]]) -> Job:
        job = Job(id=uuid.uuid4().hex[:12], kind=kind)
        self._jobs[job.id] = job

        async def runner() -> None:
            job.status = "running"
            job.emit(f"{kind} started", progress=0.02)
            try:
                job.result = await body(job)
                job.status = "done"
                job.emit(f"{kind} complete", progress=1.0)
            except Exception as exc:  # noqa: BLE001 — surface any failure to the UI
                job.status = "error"
                job.error = str(exc)
                job.emit(f"error: {exc}", error=True)
                traceback.print_exc()
            finally:
                # Sentinel so SSE streamers know to close.
                job._queue.put_nowait(None)

        asyncio.create_task(runner())
        return job

    async def stream(self, job: Job):
        """Yield already-recorded events, then live ones until the job ends."""
        for event in list(job.events):
            yield event
        if job.status in ("done", "error"):
            return
        while True:
            event = await job._queue.get()
            if event is None:
                break
            yield event


manager = JobManager()
