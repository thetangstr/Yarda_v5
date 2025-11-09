/**
 * Admin Debug Panel
 *
 * Displays debug logs from generation flow
 * Only visible to admin users
 *
 * Features:
 * - Real-time log streaming
 * - Collapsible panel
 * - Step-by-step flow visualization
 * - Clear logs button
 */

import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, ChevronUp, Trash2, Copy } from 'lucide-react';

interface DebugLog {
  timestamp: string;
  step: string;
  level: 'info' | 'error' | 'warning' | 'success';
  message: string;
  details?: Record<string, any>;
}

interface DebugPanelProps {
  isAdmin?: boolean;
  generationId?: string;
}

const DEBUG_STEPS = [
  'address_validation',
  'google_maps_api_call',
  'street_view_retrieved',
  'satellite_image_retrieved',
  'images_displayed',
  'gemini_api_call',
  'image_generation_complete',
  'image_displayed',
];

export default function DebugPanel({ isAdmin = false, generationId }: DebugPanelProps) {
  const [logs, setLogs] = useState<DebugLog[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [copyNotification, setCopyNotification] = useState(false);
  const [debugEndpointExists, setDebugEndpointExists] = useState(true); // Track if debug endpoint exists
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // Subscribe to debug logs via WebSocket or polling
  useEffect(() => {
    if (!isAdmin || !generationId || !debugEndpointExists) return;

    const pollLogs = async () => {
      try {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        const userStorage = localStorage.getItem('user-storage');
        let accessToken = '';

        try {
          const parsed = JSON.parse(userStorage || '{}');
          accessToken = parsed.state?.accessToken || '';
        } catch (e) {
          console.error('Failed to parse user storage:', e);
        }

        const response = await fetch(
          `${API_URL}/debug/logs?generation_id=${generationId}`,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          setLogs(data.logs || []);

          // Track completed steps
          const completed = new Set<string>();
          data.logs?.forEach((log: DebugLog) => {
            if (log.level === 'success') {
              completed.add(log.step);
            }
          });
          setCompletedSteps(completed);
        } else if (response.status === 404) {
          // Endpoint doesn't exist, stop polling
          console.log('[DebugPanel] Debug logs endpoint not available, disabling debug panel');
          setDebugEndpointExists(false);
        } else {
          console.warn(`Debug logs endpoint returned ${response.status}`);
        }
      } catch (err) {
        console.error('Failed to fetch debug logs:', err);
      }
    };

    // Poll every 500ms during generation
    const interval = setInterval(pollLogs, 500);
    return () => clearInterval(interval);
  }, [generationId, isAdmin, debugEndpointExists]);

  if (!isAdmin) {
    return null;
  }

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'success':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      default:
        return 'bg-blue-50 border-blue-200 text-blue-800';
    }
  };

  const getStepStatus = (step: string) => {
    if (completedSteps.has(step)) return '✓';
    if (logs.some(l => l.step === step && l.level === 'error')) return '✗';
    return '-';
  };

  const copyLogsToClipboard = async () => {
    const logText = logs.map((log) => {
      let text = `[${log.timestamp}] [${log.step}] ${log.level.toUpperCase()}: ${log.message}`;
      if (log.details) {
        text += `\nDetails: ${JSON.stringify(log.details, null, 2)}`;
      }
      return text;
    }).join('\n\n');

    try {
      await navigator.clipboard.writeText(logText);
      setCopyNotification(true);
      setTimeout(() => setCopyNotification(false), 2000);
    } catch (err) {
      console.error('Failed to copy logs:', err);
    }
  };

  return (
    <div className="fixed bottom-0 right-0 w-96 max-h-96 bg-white border-t border-l border-gray-300 shadow-lg rounded-tl-lg overflow-hidden z-50">
      {/* Copy notification */}
      {copyNotification && (
        <div className="absolute top-0 left-0 right-0 bg-green-500 text-white text-sm py-2 px-4 text-center animate-pulse">
          Logs copied to clipboard!
        </div>
      )}

      {/* Header */}
      <div
        className="bg-gray-900 text-white px-4 py-3 flex justify-between items-center cursor-pointer"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm font-bold">DEBUG PANEL</span>
          {generationId && (
            <span className="text-xs bg-gray-800 px-2 py-1 rounded">
              {generationId.substring(0, 8)}...
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              copyLogsToClipboard();
            }}
            className="p-1 hover:bg-gray-800 rounded"
            title="Copy logs to clipboard"
          >
            <Copy size={16} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setLogs([]);
              setCompletedSteps(new Set());
            }}
            className="p-1 hover:bg-gray-800 rounded"
            title="Clear logs"
          >
            <Trash2 size={16} />
          </button>
          {isOpen ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
        </div>
      </div>

      {isOpen && (
        <>
          {/* Step Progress */}
          <div className="border-b border-gray-200 bg-gray-50 px-4 py-3 text-xs">
            <p className="font-bold text-gray-700 mb-2">STEP PROGRESS</p>
            <div className="grid grid-cols-4 gap-2">
              {DEBUG_STEPS.map((step) => (
                <div
                  key={step}
                  className={`p-2 rounded text-center font-mono text-xs ${
                    completedSteps.has(step)
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  <div>{getStepStatus(step)}</div>
                  <div className="truncate">{step.split('_')[0]}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Logs */}
          <div className="overflow-y-auto max-h-64 bg-white p-3 space-y-2 font-mono text-xs">
            {!debugEndpointExists ? (
              <div className="text-center py-8">
                <p className="text-yellow-600 font-bold mb-2">⚠️ Debug Endpoint Not Available</p>
                <p className="text-gray-500 text-xs">
                  The /debug/logs endpoint is not implemented on the backend.
                  <br />
                  Add it to see detailed generation logs here.
                </p>
              </div>
            ) : logs.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                Waiting for logs...
              </p>
            ) : (
              logs.map((log, idx) => (
                <div
                  key={idx}
                  className={`border rounded p-2 ${getLevelColor(log.level)}`}
                >
                  <div className="flex justify-between items-start">
                    <span className="font-bold">[{log.step}]</span>
                    <span className="text-xs opacity-75">{log.timestamp}</span>
                  </div>
                  <div>{log.message}</div>
                  {log.details && (
                    <details className="mt-1 text-xs opacity-75">
                      <summary>Details</summary>
                      <pre className="mt-1 bg-opacity-50 p-1 rounded overflow-auto max-h-20">
                        {JSON.stringify(log.details, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              ))
            )}
            <div ref={logsEndRef} />
          </div>
        </>
      )}
    </div>
  );
}
