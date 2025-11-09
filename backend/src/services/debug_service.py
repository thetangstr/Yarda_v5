"""
Debug Service

Stores and retrieves debug logs for the generation flow.
Helps troubleshoot the image generation pipeline.

Features:
- In-memory log storage (cleared on server restart)
- Retrieval by generation_id
- Structured logging with timestamps
"""

from typing import List, Dict, Any, Optional
from datetime import datetime
from dataclasses import dataclass, asdict
from uuid import UUID
import json

@dataclass
class DebugLog:
    """Single debug log entry"""
    timestamp: str
    step: str
    level: str  # 'info', 'error', 'warning', 'success'
    message: str
    generation_id: str
    details: Optional[Dict[str, Any]] = None

class DebugService:
    """In-memory debug log storage"""

    def __init__(self):
        # Store logs by generation_id
        self.logs: Dict[str, List[DebugLog]] = {}

    def log(
        self,
        generation_id: UUID,
        step: str,
        level: str,
        message: str,
        details: Optional[Dict[str, Any]] = None
    ) -> None:
        """
        Add a debug log entry.

        Args:
            generation_id: Generation UUID
            step: Step name (e.g., 'address_validation', 'gemini_api_call')
            level: Log level ('info', 'error', 'warning', 'success')
            message: Log message
            details: Optional additional details dict
        """
        gen_id_str = str(generation_id)

        # Initialize list if not exists
        if gen_id_str not in self.logs:
            self.logs[gen_id_str] = []

        log_entry = DebugLog(
            timestamp=datetime.utcnow().isoformat(),
            step=step,
            level=level,
            message=message,
            generation_id=gen_id_str,
            details=details
        )

        self.logs[gen_id_str].append(log_entry)

        # Print to stdout as well for server logs
        self._print_log(log_entry)

    def get_logs(self, generation_id: UUID) -> List[Dict[str, Any]]:
        """
        Get all logs for a generation.

        Args:
            generation_id: Generation UUID

        Returns:
            List of log entries as dicts
        """
        gen_id_str = str(generation_id)
        logs = self.logs.get(gen_id_str, [])
        return [asdict(log) for log in logs]

    def clear_logs(self, generation_id: UUID) -> None:
        """Clear logs for a generation."""
        gen_id_str = str(generation_id)
        if gen_id_str in self.logs:
            del self.logs[gen_id_str]

    def _print_log(self, log: DebugLog) -> None:
        """Pretty print log to stdout"""
        color_map = {
            'error': '\033[91m',    # Red
            'warning': '\033[93m',  # Yellow
            'success': '\033[92m',  # Green
            'info': '\033[94m',     # Blue
        }
        reset = '\033[0m'

        color = color_map.get(log.level, '')
        print(
            f"{color}[DEBUG] {log.timestamp} [{log.step}] {log.level.upper()}: {log.message}{reset}"
        )
        if log.details:
            print(f"  Details: {json.dumps(log.details, indent=2)}")


# Global debug service instance
_debug_service: Optional[DebugService] = None


def get_debug_service() -> DebugService:
    """Get or create global debug service"""
    global _debug_service
    if _debug_service is None:
        _debug_service = DebugService()
    return _debug_service
