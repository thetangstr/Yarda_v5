"""
Usage monitoring for Gemini API calls (from Yarda v2).

Tracks API usage, response times, costs, and success/failure rates
to help optimize performance and manage costs.
"""

from datetime import datetime
from typing import Optional, Dict, Any
from dataclasses import dataclass, asdict
import json


@dataclass
class GeminiUsageRecord:
    """Record of a single Gemini API call."""
    timestamp: str
    request_id: str
    model: str
    style: str
    address: Optional[str]
    input_tokens: int  # Estimated
    output_tokens: int  # Estimated
    image_generated: bool
    response_time_ms: int
    status: str  # 'success', 'error', 'timeout'
    error_message: Optional[str]
    estimated_cost_usd: float
    preservation_strength: Optional[float] = None
    area_type: Optional[str] = None


class UsageMonitor:
    """
    Monitor and track Gemini API usage.

    Based on Yarda v2's implementation with enhancements:
    - In-memory storage for recent records (last 1000)
    - Cost estimation based on Gemini pricing
    - Performance metrics (avg response time, success rate)
    """

    def __init__(self):
        self.records = []  # In-memory storage
        self.max_records = 1000  # Keep last 1000 records

    def record_request(
        self,
        request_id: str,
        model: str,
        style: str,
        address: Optional[str],
        input_tokens: int,
        output_tokens: int,
        image_generated: bool,
        response_time_ms: int,
        status: str,
        error_message: Optional[str] = None,
        preservation_strength: Optional[float] = None,
        area_type: Optional[str] = None
    ):
        """
        Record a Gemini API request.

        Args:
            request_id: Unique request identifier
            model: Gemini model used (e.g., 'gemini-2.5-flash')
            style: Design style requested
            address: Property address (if any)
            input_tokens: Estimated input tokens (prompt + image)
            output_tokens: Estimated output tokens (text response)
            image_generated: Whether an image was generated
            response_time_ms: Response time in milliseconds
            status: 'success', 'error', or 'timeout'
            error_message: Error message if status != 'success'
            preservation_strength: Transformation intensity (0.0-1.0)
            area_type: Yard area type
        """
        # Estimate cost based on Gemini 2.5 Flash pricing
        # (These are placeholder values - update with actual pricing)
        # Input: ~$0.000125 per 1K tokens
        # Output: ~$0.000375 per 1K tokens
        # Image generation: ~$0.002 per image
        input_cost = (input_tokens / 1000) * 0.000125
        output_cost = (output_tokens / 1000) * 0.000375
        image_cost = 0.002 if image_generated else 0.0
        total_cost = input_cost + output_cost + image_cost

        record = GeminiUsageRecord(
            timestamp=datetime.utcnow().isoformat(),
            request_id=request_id,
            model=model,
            style=style,
            address=address,
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            image_generated=image_generated,
            response_time_ms=response_time_ms,
            status=status,
            error_message=error_message,
            estimated_cost_usd=round(total_cost, 6),
            preservation_strength=preservation_strength,
            area_type=area_type
        )

        # Add to records (keep only last max_records)
        self.records.append(record)
        if len(self.records) > self.max_records:
            self.records.pop(0)

    def get_recent_records(self, limit: int = 100) -> list[Dict[str, Any]]:
        """
        Get recent usage records.

        Args:
            limit: Maximum number of records to return

        Returns:
            List of usage records as dicts
        """
        return [asdict(r) for r in self.records[-limit:]]

    def get_summary_stats(self) -> Dict[str, Any]:
        """
        Get summary statistics for all recorded requests.

        Returns:
            Dict with summary metrics:
            - total_requests: Total number of requests
            - successful_requests: Number of successful requests
            - failed_requests: Number of failed requests
            - success_rate: Percentage of successful requests
            - avg_response_time_ms: Average response time
            - total_cost_usd: Total estimated cost
            - images_generated: Total images generated
        """
        if not self.records:
            return {
                "total_requests": 0,
                "successful_requests": 0,
                "failed_requests": 0,
                "success_rate": 0.0,
                "avg_response_time_ms": 0,
                "total_cost_usd": 0.0,
                "images_generated": 0
            }

        total = len(self.records)
        successful = sum(1 for r in self.records if r.status == 'success')
        failed = total - successful
        success_rate = (successful / total) * 100 if total > 0 else 0.0

        avg_response_time = sum(r.response_time_ms for r in self.records) / total
        total_cost = sum(r.estimated_cost_usd for r in self.records)
        images_generated = sum(1 for r in self.records if r.image_generated)

        return {
            "total_requests": total,
            "successful_requests": successful,
            "failed_requests": failed,
            "success_rate": round(success_rate, 2),
            "avg_response_time_ms": round(avg_response_time, 2),
            "total_cost_usd": round(total_cost, 6),
            "images_generated": images_generated
        }

    def get_style_breakdown(self) -> Dict[str, Dict[str, Any]]:
        """
        Get usage breakdown by style.

        Returns:
            Dict mapping style names to usage stats
        """
        styles = {}
        for record in self.records:
            style = record.style
            if style not in styles:
                styles[style] = {
                    "requests": 0,
                    "successful": 0,
                    "avg_response_time_ms": 0,
                    "total_cost_usd": 0.0
                }

            styles[style]["requests"] += 1
            if record.status == 'success':
                styles[style]["successful"] += 1
            styles[style]["total_cost_usd"] += record.estimated_cost_usd

        # Calculate averages
        for style, stats in styles.items():
            style_records = [r for r in self.records if r.style == style]
            stats["avg_response_time_ms"] = round(
                sum(r.response_time_ms for r in style_records) / len(style_records), 2
            )
            stats["total_cost_usd"] = round(stats["total_cost_usd"], 6)

        return styles

    def clear_records(self):
        """Clear all recorded usage data."""
        self.records.clear()

    def export_to_json(self, filepath: str):
        """
        Export all records to a JSON file.

        Args:
            filepath: Path to save JSON file
        """
        data = {
            "exported_at": datetime.utcnow().isoformat(),
            "total_records": len(self.records),
            "summary": self.get_summary_stats(),
            "style_breakdown": self.get_style_breakdown(),
            "records": self.get_recent_records(limit=len(self.records))
        }

        with open(filepath, 'w') as f:
            json.dump(data, f, indent=2)


# Global usage monitor instance
usage_monitor = UsageMonitor()


def get_usage_monitor() -> UsageMonitor:
    """
    Get the global usage monitor instance.

    Usage:
        from src.services.usage_monitor import get_usage_monitor

        monitor = get_usage_monitor()
        monitor.record_request(...)
    """
    return usage_monitor
