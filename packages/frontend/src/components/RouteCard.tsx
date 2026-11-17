'use client';

import type { JourneyOption } from '@/api/types';
import { TravelTimeDisplay } from './TravelTimeDisplay';
import { CrowdednessDisplay } from './CrowdednessDisplay';

interface RouteCardProps {
  route: JourneyOption;
  isSelected: boolean;
  onSelect: (id: string) => void;
}

const fareToRupees = (fare: number) => `₹${fare.toFixed(0)}`;

export function RouteCard({ route, isSelected, onSelect }: RouteCardProps) {
  return (
    <button
      onClick={() => onSelect(route.id)}
      className={`flex w-full gap-4 p-4 rounded-xl border transition-all duration-200 ${
        isSelected
          ? 'bg-delhi-50 border-delhi-200 shadow-sm'
          : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-md'
      }`}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-between justify-between mb-1">
          <h4 className="text-sm font-semibold text-gray-900">{route.summary}</h4>
          <span className="text-xs font-bold text-delhi-600 bg-delhi-50 px-2 py-0.5 rounded">
            {route.totalDurationMinutes} min
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-500 mb-3">
          <span>Transfers: {route.transfers}</span>
          <span>•</span>
          <span>Walking: {route.totalWalkingDistanceMeters} m</span>
          <span>•</span>
          <span>Fare: {fareToRupees(route.fareInRupees)}</span>
        </div>
        <div className="flex items-center gap-3">
          <TravelTimeDisplay metrics={route.problem1TravelTimeMetrics} />
        </div>
      </div>
      <div className="w-48">
        <CrowdednessDisplay metrics={route.problem2CrowdednessMetrics} />
      </div>
    </button>
  );
}
