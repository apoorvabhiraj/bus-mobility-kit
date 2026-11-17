'use client';

// Problem 2: Crowdedness level display
// Shows overall/peak crowding level, occupancy proxy, standing likelihood
// from Problem2CrowdednessMetrics, with the mandatory data caveat.

import type { Problem2CrowdednessMetrics } from '@/api/types';

interface CrowdednessDisplayProps {
  metrics: Problem2CrowdednessMetrics;
}

const crowdingColors: Record<string, string> = {
  low: 'bg-crowd-low text-crowd-low',
  moderate: 'bg-crowd-moderate text-crowd-moderate',
  high: 'bg-crowd-high text-crowd-high',
  very_high: 'bg-crowd-very_high text-crowd-very_high',
};

const crowdingLabels: Record<string, string> = {
  low: 'Low',
  moderate: 'Moderate',
  high: 'High',
  very_high: 'Very High',
};

export function CrowdednessDisplay({ metrics }: CrowdednessDisplayProps) {
  const colorClass = crowdingColors[metrics.overallCrowdingLevel] ?? 'bg-gray-200 text-gray-700';
  const label = crowdingLabels[metrics.overallCrowdingLevel] ?? metrics.overallCrowdingLevel;
  const occupancyPct = (metrics.averageOccupancyProxy * 100).toFixed(0);

  return (
    <div className="card p-4">
      <div className="flex items-between justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-900">Crowdedness (Problem 2)</h3>
        <span className="text-xs font-medium text-gray-600 bg-gray-50 px-2 py-0.5 rounded">
          Ticket proxy
        </span>
      </div>
      <div className="flex items-center gap-3 mb-4">
        <span className={`crowd-badge ${colorClass}`}>
          {label}
        </span>
        <div className="flex-1">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-500 ${
                metrics.overallCrowdingLevel === 'low'
                  ? 'bg-crowd-low'
                  : metrics.overallCrowdingLevel === 'moderate'
                  ? 'bg-crowd-moderate'
                  : metrics.overallCrowdingLevel === 'high'
                  ? 'bg-crowd-high'
                  : 'bg-crowd-very_high'
              }`}
              style={{ width: `${Math.min(metrics.averageOccupancyProxy * 100, 100)}%` }}
            />
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {occupancyPct}% average occupancy proxy
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 text-sm mb-3">
        <div className="bg-gray-50 p-3 rounded-lg">
          <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Peak crowding</div>
          <div className="text-lg font-bold text-gray-900">
            {crowdingLabels[metrics.peakCrowdingLevel] ?? metrics.peakCrowdingLevel}
          </div>
        </div>
        <div className="bg-gray-50 p-3 rounded-lg">
          <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Standing likelihood</div>
          <div className="text-lg font-bold text-gray-900">
            {metrics.standingLikelihood.charAt(0).toUpperCase() + metrics.standingLikelihood.slice(1)}
          </div>
        </div>
      </div>
      <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 text-xs text-amber-800">
        {metrics.dataCaveatNotice}
      </div>
    </div>
  );
}
