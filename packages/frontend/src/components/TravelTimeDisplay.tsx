'use client';

// Problem 1: Travel time estimates display
// Shows p50/p90 duration, traffic delay, confidence score from Problem1TravelTimeMetrics.

import type { Problem1TravelTimeMetrics } from '@/api/types';

interface TravelTimeDisplayProps {
  metrics: Problem1TravelTimeMetrics;
}

export function TravelTimeDisplay({ metrics }: TravelTimeDisplayProps) {
  return (
    <div className="card p-4">
      <div className="flex items-between justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-900">Travel time (Problem 1)</h3>
        <span className="text-xs font-medium text-delhi-600 bg-delhi-50 px-2 py-0.5 rounded">
          GPS-based
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="bg-gray-50 p-3 rounded-lg">
          <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Typical (p50)</div>
          <div className="text-lg font-bold text-gray-900">{metrics.p50DurationMinutes} min</div>
        </div>
        <div className="bg-gray-50 p-3 rounded-lg">
          <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Worst case (p90)</div>
          <div className="text-lg font-bold text-gray-900">{metrics.p90DurationMinutes} min</div>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
        <div className="bg-gray-50 p-3 rounded-lg">
          <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Traffic delay</div>
          <div className="text-lg font-bold text-gray-900">{metrics.trafficDelayMinutes} min</div>
        </div>
        <div className="bg-gray-50 p-3 rounded-lg">
          <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Confidence</div>
          <div className="text-lg font-bold text-gray-900">
            {(metrics.historicalConfidenceScore * 100).toFixed(0)}%
          </div>
        </div>
      </div>
      <div className="mt-3 text-xs text-gray-500">
        Based on {metrics.gpsObservationCount} historical GPS observations
      </div>
    </div>
  );
}
